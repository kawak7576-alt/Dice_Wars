import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  addCpuPlayer,
  addLog,
  createRoom,
  getSanitizedStateForPlayer,
  handleChooseAttackTarget,
  handleEmmaMoveStart,
  handlePromptResponse,
  handleRevealIdentityAction,
  handleRollMoveDice,
  handleUseAbility,
  joinRoom,
  removeCpuPlayer,
  resetRoomToLobby,
  runCpuStepIfNeeded,
  setEnabledCharacters,
  startGame,
  validateEnabledCharacterIds,
  type GameRoom,
} from './server/gameEngine.ts';
import { buildProjectZipBuffer } from './server/zipBuilder.ts';
import type { ClientMessage, RoomSummary, ServerMessage } from './src/types/game.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT || 3000) : 3000;
const isProd = process.env.NODE_ENV === 'production';

interface ClientConn {
  ws: WebSocket;
  roomCode: string | null;
  playerId: string | null;
  sessionToken: string | null;
}

const rooms = new Map<string, GameRoom>();
const connections = new Set<ClientConn>();
const cpuTimers = new Map<string, ReturnType<typeof setTimeout>>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function sendMsg(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

const FIXED_ROOM_CODES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

function getRoomsSummary(): RoomSummary[] {
  return FIXED_ROOM_CODES.map((code) => {
    const r = rooms.get(code);
    if (!r) {
      return { roomCode: code, playerCount: 0, maxPlayers: 5, phase: 'LOBBY' };
    }
    return {
      roomCode: code,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
      phase: r.phase,
    };
  });
}

function broadcastRoomsSummary(): void {
  const summary = getRoomsSummary();
  for (const conn of connections) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      sendMsg(conn.ws, { type: 'ROOMS_SUMMARY', rooms: summary });
    }
  }
}

function broadcastRoom(room: GameRoom): void {
  for (const conn of connections) {
    if (conn.roomCode === room.roomCode && conn.ws.readyState === WebSocket.OPEN) {
      const state = getSanitizedStateForPlayer(room, conn.playerId);
      sendMsg(conn.ws, { type: 'ROOM_STATE', state });
    }
  }
  broadcastRoomsSummary();
  scheduleCpuIfNeeded(room);
}

function scheduleCpuIfNeeded(room: GameRoom): void {
  const existingTimer = cpuTimers.get(room.roomCode);
  if (existingTimer) {
    clearTimeout(existingTimer);
    cpuTimers.delete(room.roomCode);
  }
  if (room.phase === 'LOBBY' || room.phase === 'GAME_OVER') return;

  const active = room.players[room.activePlayerIndex];
  const promptOwner = room.pendingPrompt
    ? room.players.find((p) => p.id === room.pendingPrompt!.playerId)
    : null;

  const needsCpu = (promptOwner && promptOwner.isCpu) || (!room.pendingPrompt && active?.isCpu);
  if (!needsCpu) return;

  const timer = setTimeout(() => {
    cpuTimers.delete(room.roomCode);
    const currentRoom = rooms.get(room.roomCode);
    if (!currentRoom) return;
    try {
      const acted = runCpuStepIfNeeded(currentRoom);
      if (acted) {
        broadcastRoom(currentRoom);
      }
    } catch (err) {
      console.error('CPU step error:', err);
    }
  }, 3000);

  cpuTimers.set(room.roomCode, timer);
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  app.get('/api/download-source.zip', (_req, res) => {
    try {
      const zipBuf = buildProjectZipBuffer(__dirname);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="dice-wars-source.zip"');
      res.setHeader('Content-Length', String(zipBuf.length));
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(200).end(zipBuf);
    } catch (err) {
      console.error('ZIP generation error:', err);
      res.status(500).json({ error: 'ZIPの生成に失敗しました。' });
    }
  });

  const httpServer = createHttpServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const conn: ClientConn = {
      ws,
      roomCode: null,
      playerId: null,
      sessionToken: null,
    };
    connections.add(conn);
    sendMsg(ws, { type: 'ROOMS_SUMMARY', rooms: getRoomsSummary() });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage;
        handleClientMessage(conn, msg);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'リクエスト処理エラーが発生しました。';
        sendMsg(ws, { type: 'ERROR', message });
      }
    });

    ws.on('close', () => {
      connections.delete(conn);
      if (conn.roomCode && conn.playerId) {
        const room = rooms.get(conn.roomCode);
        if (room) {
          const player = room.players.find((p) => p.id === conn.playerId);
          if (player) {
            player.connected = false;
            broadcastRoom(room);
          }
        }
      }
    });
  });

  if (!isProd) {
    const vitePromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      })
    );
    app.use((req, res, next) => {
      vitePromise
        .then((vite) => vite.middlewares(req, res, next))
        .catch(next);
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ダイスウォーズ server running on http://0.0.0.0:${PORT}`);
  });
}

function handleClientMessage(conn: ClientConn, msg: ClientMessage): void {
  if (msg.type === 'CREATE_ROOM') {
    const validMaxPlayers: 4 | 5 | 6 = [4, 5, 6].includes(msg.maxPlayers) ? msg.maxPlayers : 5;
    const code = generateRoomCode();
    const room = createRoom(code, msg.playerName, msg.sessionToken, validMaxPlayers, msg.enabledCharacterIds);
    rooms.set(code, room);
    const host = room.players[0];
    conn.roomCode = code;
    conn.playerId = host.id;
    conn.sessionToken = msg.sessionToken;
    addLog(room, `${host.name} がルーム（${validMaxPlayers}人戦）を作成しました。`, 'info');
    broadcastRoom(room);
    return;
  }

  if (msg.type === 'JOIN_FIXED_ROOM') {
    const code = msg.roomCode.trim().padStart(2, '0');
    if (!FIXED_ROOM_CODES.includes(code)) {
      throw new Error('部屋番号は 01〜10 から選択してください。');
    }
    let room = rooms.get(code);
    if (!room) {
      const validMaxPlayers: 4 | 5 | 6 = [4, 5, 6].includes(msg.maxPlayers) ? msg.maxPlayers : 5;
      room = createRoom(code, msg.playerName, msg.sessionToken, validMaxPlayers, msg.enabledCharacterIds);
      rooms.set(code, room);
      const host = room.players[0];
      conn.roomCode = code;
      conn.playerId = host.id;
      conn.sessionToken = msg.sessionToken;
      addLog(room, `${host.name} が部屋 #${code}（${validMaxPlayers}人戦）に入室しました。`, 'info');
      broadcastRoom(room);
      return;
    }
    const player = joinRoom(room, msg.playerName, msg.sessionToken);
    conn.roomCode = code;
    conn.playerId = player.id;
    conn.sessionToken = msg.sessionToken;
    addLog(room, `${player.name} が部屋 #${code} に入室しました。`, 'info');
    broadcastRoom(room);
    return;
  }

  if (msg.type === 'JOIN_ROOM') {
    const code = msg.roomCode.trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      throw new Error(`ルーム「${code}」が見つかりません。`);
    }
    const player = joinRoom(room, msg.playerName, msg.sessionToken);
    conn.roomCode = code;
    conn.playerId = player.id;
    conn.sessionToken = msg.sessionToken;
    addLog(room, `${player.name} が入室しました。`, 'info');
    broadcastRoom(room);
    return;
  }

  if (msg.type === 'RECONNECT') {
    const code = msg.roomCode.trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      sendMsg(conn.ws, { type: 'LEFT_ROOM' });
      return;
    }
    const player = room.players.find((p) => p.sessionToken === msg.sessionToken);
    if (!player) {
      sendMsg(conn.ws, { type: 'LEFT_ROOM' });
      return;
    }
    player.connected = true;
    conn.roomCode = code;
    conn.playerId = player.id;
    conn.sessionToken = msg.sessionToken;
    broadcastRoom(room);
    return;
  }

  if (!conn.roomCode || !conn.playerId) {
    throw new Error('ルームに参加していません。');
  }

  const room = rooms.get(conn.roomCode);
  if (!room) {
    throw new Error('ルームが存在しません。');
  }

  const player = room.players.find((p) => p.id === conn.playerId);
  if (!player) {
    throw new Error('プレイヤー情報が見つかりません。');
  }

  switch (msg.type) {
    case 'LEAVE_ROOM': {
      const leavingId = conn.playerId;
      const leavingCode = conn.roomCode;
      conn.roomCode = null;
      conn.playerId = null;
      if (room.phase === 'LOBBY') {
        const idx = room.players.findIndex((p) => p.id === leavingId);
        if (idx !== -1) {
          room.players.splice(idx, 1);
          if (room.players.filter((p) => !p.isCpu).length === 0) {
            rooms.delete(leavingCode);
            sendMsg(conn.ws, { type: 'LEFT_ROOM' });
            broadcastRoomsSummary();
            return;
          }
          if (!room.players.some((p) => p.isHost)) {
            const firstHuman = room.players.find((p) => !p.isCpu);
            if (firstHuman) firstHuman.isHost = true;
          }
          room.players.forEach((p, i) => {
            p.seatIndex = i;
          });
        }
      } else {
        player.connected = false;
      }
      sendMsg(conn.ws, { type: 'LEFT_ROOM' });
      broadcastRoom(room);
      return;
    }

    case 'SET_MAX_PLAYERS': {
      if (!player.isHost) throw new Error('ホストのみ対戦人数を変更できます。');
      if (room.phase !== 'LOBBY') throw new Error('ゲーム開始後は人数を変更できません。');
      if (![4, 5, 6].includes(msg.maxPlayers)) {
        throw new Error('対戦人数は4〜6人から選択してください。');
      }
      if (room.players.length > msg.maxPlayers) {
        throw new Error(`すでに参加人数が${msg.maxPlayers}人を超えているため${msg.maxPlayers}人戦に変更できません。`);
      }
      validateEnabledCharacterIds(room.enabledCharacterIds, msg.maxPlayers);
      room.maxPlayers = msg.maxPlayers;
      broadcastRoom(room);
      return;
    }

    case 'SET_ENABLED_CHARACTERS': {
      if (!player.isHost) throw new Error('ホストのみ登場キャラクター設定を変更できます。');
      setEnabledCharacters(room, msg.characterIds);
      broadcastRoom(room);
      return;
    }

    case 'ADD_CPU': {
      if (!player.isHost) throw new Error('ホストのみCPUを追加できます。');
      addCpuPlayer(room);
      broadcastRoom(room);
      return;
    }

    case 'REMOVE_CPU': {
      if (!player.isHost) throw new Error('ホストのみCPUを削除できます。');
      removeCpuPlayer(room, msg.playerId);
      broadcastRoom(room);
      return;
    }

    case 'START_GAME':
    case 'RESTART_GAME': {
      if (!player.isHost) throw new Error('ホストのみゲームを開始できます。');
      startGame(room);
      broadcastRoom(room);
      return;
    }

    case 'RESET_TO_LOBBY': {
      resetRoomToLobby(room, player.name);
      broadcastRoom(room);
      return;
    }

    case 'ROLL_MOVE_DICE': {
      handleRollMoveDice(room, player.id);
      broadcastRoom(room);
      return;
    }

    case 'REVEAL_IDENTITY': {
      handleRevealIdentityAction(room, player.id);
      broadcastRoom(room);
      return;
    }

    case 'USE_ABILITY': {
      if (player.character?.id === 'emma' && room.phase === 'MOVE_ROLL' && !room.pendingPrompt) {
        handleEmmaMoveStart(room, player.id);
      } else {
        handleUseAbility(room, player.id, msg.targetId);
      }
      broadcastRoom(room);
      return;
    }

    case 'SWITCH_ANGELA_DIRECTION': {
      handleUseAbility(room, player.id);
      broadcastRoom(room);
      return;
    }

    case 'CHOOSE_ATTACK_TARGET': {
      handleChooseAttackTarget(room, player.id, msg.targetId);
      broadcastRoom(room);
      return;
    }

    case 'RESPOND_PROMPT': {
      handlePromptResponse(room, player.id, msg.action, msg.payload);
      broadcastRoom(room);
      return;
    }
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
