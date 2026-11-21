import {
  AREAS,
  BLACK_CARD_DEFS,
  CHARACTERS,
  GREEN_CARD_DEFS,
  PLAYER_COLORS,
  WHITE_CARD_DEFS,
  diceTotalToArea,
  getCharacterById,
  getFactionLabel,
} from '../src/data/gameData.ts';
import type {
  AreaId,
  CardDef,
  CardDrawEvent,
  CardInstance,
  CharacterDef,
  CombatEvent,
  DeckType,
  Faction,
  GamePhase,
  LogEntry,
  PendingPrompt,
  RoomView,
} from '../src/types/game.ts';

export interface InternalPlayer {
  id: string;
  sessionToken: string;
  seatIndex: number;
  name: string;
  isHost: boolean;
  isCpu: boolean;
  connected: boolean;
  color: (typeof PLAYER_COLORS)[number];
  character: CharacterDef | null;
  area: AreaId | null;
  damage: number;
  isAlive: boolean;
  isRevealed: boolean;
  equipment: CardInstance[];
  guardianAngelActive: boolean;
  eimiShieldActive: boolean;
  abilityDisabled: boolean;
  usedOnceAbility: boolean;
  usedAbilityThisTurn: boolean;
  angelaDirection: 'RIGHT' | 'LEFT';
  peekedPlayers: Record<string, CharacterDef>;
  drawnGreenCard: CardInstance | null;
  receivedGreenCard: CardInstance | null;
}

export interface GameRoom {
  roomCode: string;
  maxPlayers: 4 | 5 | 6;
  phase: GamePhase;
  turn: number;
  activePlayerIndex: number;
  players: InternalPlayer[];
  decks: {
    GREEN: CardInstance[];
    WHITE: CardInstance[];
    BLACK: CardInstance[];
  };
  discards: {
    GREEN: CardInstance[];
    WHITE: CardInstance[];
    BLACK: CardInstance[];
  };
  lastDice: { rollId: string; d6: number; d4: number; total: number; purpose: 'MOVE' | 'ATTACK' | 'EFFECT' } | null;
  lastCardEvent: CardDrawEvent | null;
  lastCombatEvent: CombatEvent | null;
  pendingPrompt: PendingPrompt | null;
  logs: LogEntry[];
  firstEliminatedPlayerId: string | null;
  winners: {
    playerId: string;
    name: string;
    character: CharacterDef;
    reason: string;
  }[];
  lastAttackKillByCraig: boolean;
  craigSecondAttackUsed: boolean;
  attackPhaseResumeAfterPrompt: boolean;
  enabledCharacterIds: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function rollD4(): number {
  return Math.floor(Math.random() * 4) + 1;
}

function buildDeck(defs: CardDef[]): CardInstance[] {
  const cards: CardInstance[] = [];
  let seq = 1;
  for (const def of defs) {
    for (let i = 0; i < def.countInDeck; i++) {
      cards.push({
        uid: `${def.id}_${seq++}_${Math.random().toString(36).slice(2, 6)}`,
        cardId: def.id,
        deck: def.deck,
        name: def.name,
        isEquipment: def.isEquipment,
        description: def.description,
        effectKey: def.effectKey,
      });
    }
  }
  return shuffle(cards);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function addLog(room: GameRoom, text: string, tone: LogEntry['tone'] = 'info'): void {
  room.logs.push({
    id: uid(),
    turn: room.turn,
    timestamp: Date.now(),
    text,
    tone,
  });
  if (room.logs.length > 150) {
    room.logs = room.logs.slice(-150);
  }
}

export function getRequiredCitizenCount(maxPlayers: 4 | 5 | 6): number {
  return maxPlayers === 6 ? 2 : maxPlayers === 5 ? 1 : 0;
}

export function validateEnabledCharacterIds(characterIds: unknown, maxPlayers: 4 | 5 | 6): string[] {
  if (!Array.isArray(characterIds)) {
    throw new Error('登場キャラクターの設定形式が不正です。');
  }
  const requestedSet = new Set(characterIds.filter((id): id is string => typeof id === 'string'));
  const validChars = CHARACTERS.filter((c) => requestedSet.has(c.id));

  const raidersCount = validChars.filter((c) => c.faction === 'RAIDER').length;
  const shadowsCount = validChars.filter((c) => c.faction === 'SHADOW').length;
  const citizensCount = validChars.filter((c) => c.faction === 'CITIZEN').length;
  const requiredCitizens = getRequiredCitizenCount(maxPlayers);

  if (raidersCount < 2 || shadowsCount < 2 || citizensCount < requiredCitizens) {
    throw new Error(
      `${maxPlayers}人戦ではレイダー2人以上、シャドウ2人以上${
        requiredCitizens > 0 ? `、シチズン${requiredCitizens}人以上` : ''
      }を有効にしてください。`
    );
  }

  return validChars.map((c) => c.id);
}

export function createRoom(
  roomCode: string,
  hostName: string,
  sessionToken: string,
  maxPlayers: 4 | 5 | 6,
  initialEnabledCharacterIds?: string[]
): GameRoom {
  const host: InternalPlayer = {
    id: uid(),
    sessionToken,
    seatIndex: 0,
    name: hostName.trim() || 'プレイヤー1',
    isHost: true,
    isCpu: false,
    connected: true,
    color: PLAYER_COLORS[0],
    character: null,
    area: null,
    damage: 0,
    isAlive: true,
    isRevealed: false,
    equipment: [],
    guardianAngelActive: false,
    eimiShieldActive: false,
    abilityDisabled: false,
    usedOnceAbility: false,
    usedAbilityThisTurn: false,
    angelaDirection: 'RIGHT',
    peekedPlayers: {},
    drawnGreenCard: null,
    receivedGreenCard: null,
  };

  const enabledCharacterIds =
    Array.isArray(initialEnabledCharacterIds) && initialEnabledCharacterIds.length > 0
      ? validateEnabledCharacterIds(initialEnabledCharacterIds, maxPlayers)
      : CHARACTERS.map((c) => c.id);

  return {
    roomCode,
    maxPlayers,
    phase: 'LOBBY',
    turn: 0,
    activePlayerIndex: 0,
    players: [host],
    decks: { GREEN: [], WHITE: [], BLACK: [] },
    discards: { GREEN: [], WHITE: [], BLACK: [] },
    lastDice: null,
    lastCardEvent: null,
    lastCombatEvent: null,
    pendingPrompt: null,
    logs: [],
    firstEliminatedPlayerId: null,
    winners: [],
    lastAttackKillByCraig: false,
    craigSecondAttackUsed: false,
    attackPhaseResumeAfterPrompt: false,
    enabledCharacterIds,
  };
}

export function setEnabledCharacters(room: GameRoom, characterIds: unknown): void {
  if (room.phase !== 'LOBBY') {
    throw new Error('ゲーム開始後は登場キャラクター設定を変更できません。');
  }
  room.enabledCharacterIds = validateEnabledCharacterIds(characterIds, room.maxPlayers);
}

export function joinRoom(room: GameRoom, playerName: string, sessionToken: string): InternalPlayer {
  const existing = room.players.find((p) => p.sessionToken === sessionToken);
  if (existing) {
    existing.connected = true;
    if (playerName.trim()) existing.name = playerName.trim();
    return existing;
  }

  if (room.phase !== 'LOBBY') {
    throw new Error('このルームはすでにゲームが開始されています。');
  }
  if (room.players.length >= room.maxPlayers) {
    throw new Error('ルームが満員です。');
  }

  const usedColorIds = new Set(room.players.map((p) => p.color.id));
  const color = PLAYER_COLORS.find((c) => !usedColorIds.has(c.id)) ?? PLAYER_COLORS[room.players.length % 6];

  const player: InternalPlayer = {
    id: uid(),
    sessionToken,
    seatIndex: room.players.length,
    name: playerName.trim() || `プレイヤー${room.players.length + 1}`,
    isHost: false,
    isCpu: false,
    connected: true,
    color,
    character: null,
    area: null,
    damage: 0,
    isAlive: true,
    isRevealed: false,
    equipment: [],
    guardianAngelActive: false,
    eimiShieldActive: false,
    abilityDisabled: false,
    usedOnceAbility: false,
    usedAbilityThisTurn: false,
    angelaDirection: 'RIGHT',
    peekedPlayers: {},
    drawnGreenCard: null,
    receivedGreenCard: null,
  };

  room.players.push(player);
  return player;
}

export function addCpuPlayer(room: GameRoom): void {
  if (room.phase !== 'LOBBY') throw new Error('ゲーム中はCPUを追加できません。');
  if (room.players.length >= room.maxPlayers) throw new Error('これ以上プレイヤーを追加できません。');

  const cpuNames = ['レオン(CPU)', 'セレス(CPU)', 'ノア(CPU)', 'ミア(CPU)', 'カイン(CPU)', 'イヴ(CPU)'];
  const usedNames = new Set(room.players.map((p) => p.name));
  const name = cpuNames.find((n) => !usedNames.has(n)) ?? `CPU_${room.players.length + 1}`;
  const usedColorIds = new Set(room.players.map((p) => p.color.id));
  const color = PLAYER_COLORS.find((c) => !usedColorIds.has(c.id)) ?? PLAYER_COLORS[room.players.length % 6];

  room.players.push({
    id: uid(),
    sessionToken: `cpu_${uid()}`,
    seatIndex: room.players.length,
    name,
    isHost: false,
    isCpu: true,
    connected: true,
    color,
    character: null,
    area: null,
    damage: 0,
    isAlive: true,
    isRevealed: false,
    equipment: [],
    guardianAngelActive: false,
    eimiShieldActive: false,
    abilityDisabled: false,
    usedOnceAbility: false,
    usedAbilityThisTurn: false,
    angelaDirection: 'RIGHT',
    peekedPlayers: {},
    drawnGreenCard: null,
    receivedGreenCard: null,
  });
}

export function removeCpuPlayer(room: GameRoom, playerId: string): void {
  if (room.phase !== 'LOBBY') return;
  const idx = room.players.findIndex((p) => p.id === playerId && p.isCpu);
  if (idx !== -1) {
    room.players.splice(idx, 1);
    room.players.forEach((p, i) => {
      p.seatIndex = i;
    });
  }
}

export function startGame(room: GameRoom): void {
  if (room.players.length !== room.maxPlayers) {
    throw new Error(`${room.maxPlayers}人揃ってからゲームを開始してください。`);
  }

  // Faction setup: 4p -> 2 Raider, 2 Shadow, 0 Citizen; 5p -> 2 Raider, 2 Shadow, 1 Citizen; 6p -> 2 Raider, 2 Shadow, 2 Citizen
  const enabledSet = new Set(room.enabledCharacterIds);
  const enabledPool = CHARACTERS.filter((c) => enabledSet.has(c.id));
  const availableRaiders = enabledPool.filter((c) => c.faction === 'RAIDER');
  const availableShadows = enabledPool.filter((c) => c.faction === 'SHADOW');
  const availableCitizens = enabledPool.filter((c) => c.faction === 'CITIZEN');
  const citizenCount = getRequiredCitizenCount(room.maxPlayers);

  if (
    availableRaiders.length < 2 ||
    availableShadows.length < 2 ||
    availableCitizens.length < citizenCount
  ) {
    throw new Error(
      `登場キャラクター設定が不足しています（${room.maxPlayers}人戦ではレイダー2人以上、シャドウ2人以上${
        citizenCount > 0 ? `、シチズン${citizenCount}人以上` : ''
      }が必要です）。`
    );
  }

  const raiders = shuffle(availableRaiders).slice(0, 2);
  const shadows = shuffle(availableShadows).slice(0, 2);
  const citizens = citizenCount > 0 ? shuffle(availableCitizens).slice(0, citizenCount) : [];
  const dealtChars = shuffle([...raiders, ...shadows, ...citizens]);

  room.players = shuffle(room.players).map((p, idx) => ({
    ...p,
    seatIndex: idx,
    character: dealtChars[idx],
    area: null,
    damage: 0,
    isAlive: true,
    isRevealed: false,
    equipment: [],
    guardianAngelActive: false,
    eimiShieldActive: false,
    abilityDisabled: false,
    usedOnceAbility: false,
    usedAbilityThisTurn: false,
    angelaDirection: 'RIGHT',
    peekedPlayers: {},
    drawnGreenCard: null,
    receivedGreenCard: null,
  }));

  room.decks = {
    GREEN: buildDeck(GREEN_CARD_DEFS),
    WHITE: buildDeck(WHITE_CARD_DEFS),
    BLACK: buildDeck(BLACK_CARD_DEFS),
  };
  room.discards = { GREEN: [], WHITE: [], BLACK: [] };
  room.turn = 1;
  room.activePlayerIndex = 0;
  room.phase = 'MOVE_ROLL';
  room.lastDice = null;
  room.lastCardEvent = null;
  room.lastCombatEvent = null;
  room.pendingPrompt = null;
  room.logs = [];
  room.firstEliminatedPlayerId = null;
  room.winners = [];
  room.lastAttackKillByCraig = false;
  room.craigSecondAttackUsed = false;
  room.attackPhaseResumeAfterPrompt = false;

  addLog(
    room,
    `ゲーム開始！（${room.maxPlayers}人対戦：レイダー2 / シャドウ2${citizenCount > 0 ? ` / シチズン${citizenCount}` : ' / シチズンなし'}）`,
    'info'
  );
  beginPlayerTurn(room);
}

export function resetRoomToLobby(room: GameRoom, actorName: string): void {
  room.phase = 'LOBBY';
  room.turn = 0;
  room.activePlayerIndex = 0;
  room.decks = { GREEN: [], WHITE: [], BLACK: [] };
  room.discards = { GREEN: [], WHITE: [], BLACK: [] };
  room.lastDice = null;
  room.lastCardEvent = null;
  room.lastCombatEvent = null;
  room.pendingPrompt = null;
  room.logs = [];
  room.firstEliminatedPlayerId = null;
  room.winners = [];
  room.lastAttackKillByCraig = false;
  room.craigSecondAttackUsed = false;
  room.attackPhaseResumeAfterPrompt = false;

  room.players = room.players.map((p, idx) => ({
    ...p,
    seatIndex: idx,
    character: null,
    area: null,
    damage: 0,
    isAlive: true,
    isRevealed: false,
    equipment: [],
    guardianAngelActive: false,
    eimiShieldActive: false,
    abilityDisabled: false,
    usedOnceAbility: false,
    usedAbilityThisTurn: false,
    angelaDirection: 'RIGHT',
    peekedPlayers: {},
    drawnGreenCard: null,
    receivedGreenCard: null,
  }));

  addLog(room, `${actorName} がゲームをリセットし、全員でロビー画面に戻りました。`, 'info');
}

function getActivePlayer(room: GameRoom): InternalPlayer {
  return room.players[room.activePlayerIndex];
}

function drawCardFromDeck(room: GameRoom, deck: DeckType): CardInstance {
  if (room.decks[deck].length === 0) {
    if (room.discards[deck].length === 0) {
      const defs =
        deck === 'GREEN' ? GREEN_CARD_DEFS : deck === 'WHITE' ? WHITE_CARD_DEFS : BLACK_CARD_DEFS;
      room.decks[deck] = buildDeck(defs);
    } else {
      room.decks[deck] = shuffle(room.discards[deck]);
      room.discards[deck] = [];
    }
    const label = deck === 'GREEN' ? '推理カード(緑)' : deck === 'WHITE' ? '白カード' : '黒カード';
    addLog(room, `${label}の山札が尽きたため、捨て札をシャッフルしました。`, 'card');
  }
  return room.decks[deck].pop()!;
}

export function revealPlayerIdentity(room: GameRoom, player: InternalPlayer, reason?: string): void {
  if (player.isRevealed || !player.character) return;
  player.isRevealed = true;
  addLog(
    room,
    `${player.name} が正体を公開しました！【${player.character.name} / ${getFactionLabel(player.character.faction)}】${reason ? `（${reason}）` : ''}`,
    'reveal'
  );
}

export function hasEquip(player: InternalPlayer, effectKey: string): boolean {
  return player.equipment.some((e) => e.effectKey === effectKey);
}

export function applyDamage(
  room: GameRoom,
  target: InternalPlayer,
  amount: number,
  sourceLabel: string,
  options?: { isAttack?: boolean; isBlackCard?: boolean; isCityHall?: boolean; attacker?: InternalPlayer }
): number {
  if (!target.isAlive || !target.character || amount <= 0) return 0;

  // Protection checks
  if (options?.isAttack && (target.guardianAngelActive || target.eimiShieldActive)) {
    addLog(room, `${target.name} は防御効果によりダメージを受けませんでした。`, 'info');
    return 0;
  }
  if (!options?.isAttack && target.eimiShieldActive) {
    addLog(room, `${target.name} は「霊盾」によりダメージを受けませんでした。`, 'info');
    return 0;
  }
  if (options?.isBlackCard && hasEquip(target, 'RAINBOW_PARASOL')) {
    addLog(room, `${target.name} は「虹色のパラソル」で黒カードの効果を無効化しました。`, 'info');
    return 0;
  }
  if (options?.isCityHall && hasEquip(target, 'FORTUNE_BROOCH')) {
    addLog(room, `${target.name} は「幸運のブローチ」で市庁舎のダメージを防ぎました。`, 'info');
    return 0;
  }

  target.damage = Math.min(14, target.damage + amount);
  addLog(room, `${target.name} は ${sourceLabel} により ${amount} ダメージを受けました。`, 'damage');

  if (target.damage >= target.character.maxHp) {
    handleElimination(room, target, options?.attacker, options?.isAttack ?? false);
  }

  return amount;
}

export function healDamage(room: GameRoom, target: InternalPlayer, amount: number, sourceLabel: string): void {
  if (!target.isAlive || !target.character) return;
  const prev = target.damage;
  target.damage = Math.max(0, target.damage - amount);
  const healed = prev - target.damage;
  addLog(
    room,
    healed > 0
      ? `${target.name} は ${sourceLabel} によりダメージを ${healed} 回復しました。`
      : `${target.name} に ${sourceLabel} が使われましたが、すでにダメージ0でした。`,
    'heal'
  );
}

function handleElimination(
  room: GameRoom,
  victim: InternalPlayer,
  attacker?: InternalPlayer,
  byAttack = false
): void {
  if (!victim.isAlive || !victim.character) return;
  victim.isAlive = false;
  if (!room.firstEliminatedPlayerId) {
    room.firstEliminatedPlayerId = victim.id;
  }
  if (!victim.isRevealed) {
    victim.isRevealed = true;
  }
  addLog(
    room,
    `${victim.name}（${victim.character.name} / ${getFactionLabel(victim.character.faction)}）が脱落しました！`,
    'reveal'
  );

  // Silver Rosary check
  if (byAttack && attacker && attacker.isAlive && hasEquip(attacker, 'SILVER_ROSARY') && victim.equipment.length > 0) {
    const stolen = [...victim.equipment];
    victim.equipment = [];
    attacker.equipment.push(...stolen);
    addLog(
      room,
      `${attacker.name} は「銀のロザリオ」の効果で ${victim.name} の装備をすべて奪いました！`,
      'card'
    );
  } else if (victim.equipment.length > 0) {
    for (const eq of victim.equipment) {
      room.discards[eq.deck].push(eq);
    }
    victim.equipment = [];
  }

  // Daniel's Scream trigger
  for (const p of room.players) {
    if (p.isAlive && p.id !== victim.id && p.character?.id === 'daniel' && !p.isRevealed && !p.abilityDisabled) {
      revealPlayerIdentity(room, p, '絶叫');
    }
  }

  // Craig's kill check
  if (byAttack && attacker && attacker.character?.id === 'craig' && !attacker.abilityDisabled) {
    const deadCount = room.players.filter((p) => !p.isAlive).length;
    if (deadCount >= 3) {
      room.lastAttackKillByCraig = true;
    }
  }
}

export function checkVictoryConditions(room: GameRoom): boolean {
  if (room.phase === 'GAME_OVER') return true;

  const baseWinners: { player: InternalPlayer; reason: string }[] = [];

  // 1. Byron immediate equipment victory (4+ equipment while alive)
  for (const p of room.players) {
    if (p.isAlive && p.character?.id === 'byron' && !p.abilityDisabled && p.equipment.length >= 4) {
      if (!p.isRevealed) revealPlayerIdentity(room, p, '勝利達成');
      baseWinners.push({ player: p, reason: '装備カードを4枚以上集めた（バイロン勝利条件）' });
    }
  }

  // 2. Craig attack kill with 3+ dead
  if (room.lastAttackKillByCraig) {
    const craig = room.players.find((p) => p.character?.id === 'craig');
    if (craig && craig.isAlive) {
      if (!craig.isRevealed) revealPlayerIdentity(room, craig, '勝利達成');
      baseWinners.push({ player: craig, reason: '脱落者3人以上の状態で攻撃により撃破（クレイグ勝利条件）' });
    }
  }

  // 3. Raiders win if all Shadows eliminated
  const shadowsAlive = room.players.filter((p) => p.character?.faction === 'SHADOW' && p.isAlive).length;
  if (shadowsAlive === 0) {
    for (const p of room.players) {
      if (p.character?.faction === 'RAIDER') {
        baseWinners.push({ player: p, reason: '全てのシャドウが脱落（レイダー陣営勝利）' });
      }
    }
  }

  // 4. Shadows win if all Raiders eliminated
  const raidersAlive = room.players.filter((p) => p.character?.faction === 'RAIDER' && p.isAlive).length;
  if (raidersAlive === 0) {
    for (const p of room.players) {
      if (p.character?.faction === 'SHADOW') {
        baseWinners.push({
          player: p,
          reason: '全てのレイダーが脱落（シャドウ陣営勝利）',
        });
      }
    }
  }

  if (baseWinners.length === 0) {
    return false;
  }

  // Reveal all remaining players and evaluate co-winning Citizens
  const winnerMap = new Map<string, { player: InternalPlayer; reason: string }>();
  for (const w of baseWinners) {
    winnerMap.set(w.player.id, w);
  }

  const aliveCount = room.players.filter((p) => p.isAlive).length;

  for (const p of room.players) {
    if (!p.character) continue;
    if (p.character.id === 'alice' && p.isAlive) {
      winnerMap.set(p.id, { player: p, reason: 'ゲーム終了時まで生存（アリス勝利条件）' });
    }
    if (p.character.id === 'claire') {
      if (room.firstEliminatedPlayerId === p.id) {
        winnerMap.set(p.id, { player: p, reason: '最初の脱落者になった（クレア勝利条件）' });
      } else if (p.isAlive && aliveCount <= 2) {
        winnerMap.set(p.id, { player: p, reason: '最後の生存者2人以下に残った（クレア勝利条件）' });
      }
    }
    if (p.character.id === 'daniel') {
      if (room.firstEliminatedPlayerId === p.id) {
        winnerMap.set(p.id, { player: p, reason: '最初の脱落者になった（ダニエル勝利条件）' });
      } else if (p.isAlive && shadowsAlive === 0) {
        winnerMap.set(p.id, { player: p, reason: 'シャドウ全滅時に生存（ダニエル勝利条件）' });
      }
    }
  }

  // Angela checks designated neighbor (iterative in case neighbor is also a Citizen co-winner)
  const angela = room.players.find((p) => p.character?.id === 'angela');
  if (angela) {
    const n = room.players.length;
    const neighborIdx =
      angela.angelaDirection === 'RIGHT'
        ? (angela.seatIndex + 1) % n
        : (angela.seatIndex - 1 + n) % n;
    const neighbor = room.players[neighborIdx];
    if (neighbor && winnerMap.has(neighbor.id)) {
      winnerMap.set(angela.id, {
        player: angela,
        reason: `${angela.angelaDirection === 'RIGHT' ? '右隣' : '左隣'}の ${neighbor.name} が勝利（アンジェラ勝利条件）`,
      });
    }
  }

  room.phase = 'GAME_OVER';
  room.pendingPrompt = null;
  for (const p of room.players) {
    p.isRevealed = true;
  }

  room.winners = Array.from(winnerMap.values()).map((w) => ({
    playerId: w.player.id,
    name: w.player.name,
    character: w.player.character!,
    reason: w.reason,
  }));

  addLog(
    room,
    `ゲーム終了！勝者：${room.winners.map((w) => `${w.name}（${w.character.name}）`).join('・')}`,
    'victory'
  );
  return true;
}

function beginPlayerTurn(room: GameRoom): void {
  const player = getActivePlayer(room);
  player.guardianAngelActive = false;
  player.eimiShieldActive = false;
  player.usedAbilityThisTurn = false;
  room.craigSecondAttackUsed = false;
  room.attackPhaseResumeAfterPrompt = false;
  room.lastCardEvent = null;
  room.lastCombatEvent = null;

  // Claire passive heal at turn start
  if (player.character?.id === 'claire' && player.isRevealed && !player.abilityDisabled && player.damage > 0) {
    healDamage(room, player, 1, 'クレアの能力「聖なる祈り」');
  }

  room.phase = 'MOVE_ROLL';
  addLog(room, `--- ターン ${room.turn}：${player.name} の番 ---`, 'info');
}

export function advanceTurn(room: GameRoom): void {
  if (checkVictoryConditions(room)) return;

  const n = room.players.length;
  let nextIdx = (room.activePlayerIndex + 1) % n;
  let guard = 0;
  while (!room.players[nextIdx].isAlive && guard < n) {
    nextIdx = (nextIdx + 1) % n;
    guard++;
  }
  if (nextIdx <= room.activePlayerIndex) {
    room.turn += 1;
  }
  room.activePlayerIndex = nextIdx;
  room.pendingPrompt = null;
  beginPlayerTurn(room);
}

export function getAttackableTargets(room: GameRoom, attacker: InternalPlayer): InternalPlayer[] {
  if (!attacker.area) return [];
  const others = room.players.filter((p) => p.id !== attacker.id && p.isAlive && p.area !== null);
  if (attacker.area === 'airship') {
    // From 王の飛行船, all areas (and airship) are in range!
    return others;
  }

  const areaDef = AREAS[attacker.area];
  const normalRange = new Set<AreaId>([attacker.area, areaDef.leftNeighbor!, 'airship']);

  if (hasEquip(attacker, 'HANDGUN_R')) {
    // Handgun(R): all areas EXCEPT normal area & left neighbor (plus airship remains reachable or flipped)
    const flipped = new Set<AreaId>(
      (['detective', 'cathedral', 'underground', 'city_hall', 'thieves_guild'] as AreaId[]).filter(
        (a) => a !== attacker.area && a !== areaDef.leftNeighbor
      )
    );
    return others.filter((p) => flipped.has(p.area!));
  }

  if (hasEquip(attacker, 'CROSSBOW')) {
    normalRange.add(areaDef.rightNeighbor!);
  }

  return others.filter((p) => normalRange.has(p.area!));
}

function enterAttackPhase(room: GameRoom): void {
  if (checkVictoryConditions(room)) return;
  const active = getActivePlayer(room);
  const targets = getAttackableTargets(room, active);
  if (targets.length === 0) {
    addLog(room, `${active.name} の攻撃範囲内に他のプレイヤーがいないため、攻撃フェイズを終了します。`, 'info');
    advanceTurn(room);
    return;
  }
  room.phase = 'ATTACK';
}

function movePlayerWithRoll(room: GameRoom, player: InternalPlayer, d6: number, d4: number, area: AreaId): void {
  room.lastDice = { rollId: uid(), d6, d4, total: d6 + d4, purpose: 'MOVE' };
  player.area = area;
  addLog(room, `${player.name} はダイスで ${d6}+${d4}=${d6 + d4} を出し、「${AREAS[area].name}」へ移動しました。`, 'info');
  enterAreaAction(room, player, area);
}

function rollValidMove(currentArea: AreaId | null): { d6: number; d4: number; total: number; area: AreaId } {
  for (let i = 0; i < 30; i++) {
    const d6 = rollD6();
    const d4 = rollD4();
    const total = d6 + d4;
    const area = diceTotalToArea(total);
    if (area !== currentArea) {
      return { d6, d4, total, area };
    }
  }
  const d6 = rollD6();
  const d4 = rollD4();
  const total = d6 + d4;
  return { d6, d4, total, area: diceTotalToArea(total) };
}

export function handleRollMoveDice(room: GameRoom, playerId: string): void {
  const active = getActivePlayer(room);
  if (active.id !== playerId || room.phase !== 'MOVE_ROLL' || room.pendingPrompt) {
    throw new Error('現在は移動ダイスを振れません。');
  }

  // Check Mystic Compass
  if (hasEquip(active, 'MYSTIC_COMPASS')) {
    const optA = rollValidMove(active.area);
    const optB = rollValidMove(active.area);
    room.pendingPrompt = {
      type: 'MYSTIC_COMPASS_CHOICE',
      playerId: active.id,
      title: '神秘のコンパス',
      description: '2回振ったダイスから、移動先とする結果を選んでください。',
      diceOptionA: optA,
      diceOptionB: optB,
    };
    return;
  }

  const roll = rollValidMove(active.area);
  movePlayerWithRoll(room, active, roll.d6, roll.d4, roll.area);
}

export function handleEmmaMoveStart(room: GameRoom, playerId: string): void {
  const active = getActivePlayer(room);
  if (
    active.id !== playerId ||
    room.phase !== 'MOVE_ROLL' ||
    active.character?.id !== 'emma' ||
    !active.isRevealed ||
    active.abilityDisabled ||
    !active.area ||
    active.area === 'airship'
  ) {
    throw new Error('テレポートを使用できません。');
  }
  const areaDef = AREAS[active.area];
  room.pendingPrompt = {
    type: 'EMMA_MOVE_CHOICE',
    playerId: active.id,
    title: 'エマ：テレポート',
    description: '隣接するどちらのエリアに移動しますか？',
    adjacentAreas: [areaDef.leftNeighbor!, areaDef.rightNeighbor!],
  };
}

function enterAreaAction(room: GameRoom, player: InternalPlayer, area: AreaId): void {
  room.phase = 'AREA_ACTION';

  if (area === 'airship') {
    addLog(room, `${player.name} は「王の飛行船」に搭乗！今ターンの攻撃は全エリアを対象にできます。`, 'info');
    enterAttackPhase(room);
    return;
  }

  if (area === 'detective') {
    const card = drawCardFromDeck(room, 'GREEN');
    player.drawnGreenCard = card;
    room.lastCardEvent = {
      id: uid(),
      deck: 'GREEN',
      playerId: player.id,
      card,
      isEquipment: false,
      mode: 'GREEN_SECRET',
    };
    addLog(room, `${player.name} は「探偵事務所」で推理カードを1枚引きました。`, 'card');
    const targets = room.players.filter((p) => p.id !== player.id && p.isAlive).map((p) => p.id);
    room.pendingPrompt = {
      type: 'GREEN_TARGET_SELECT',
      playerId: player.id,
      title: '推理カードを渡す相手を選択',
      description: card.description,
      card,
      targetPlayerIds: targets,
    };
    return;
  }

  if (area === 'cathedral') {
    room.pendingPrompt = {
      type: 'CATHEDRAL_DECK_CHOICE',
      playerId: player.id,
      title: '大聖堂のエリア効果',
      description: '推理カード（緑）または白カードのどちらを引きますか？',
    };
    return;
  }

  if (area === 'underground') {
    room.pendingPrompt = {
      type: 'UNDERGROUND_DECK_CHOICE',
      playerId: player.id,
      title: '地下通路のエリア効果',
      description: '推理カード（緑）または黒カードのどちらを引きますか？',
    };
    return;
  }

  if (area === 'city_hall') {
    const targets = room.players.filter((p) => p.id !== player.id && p.isAlive).map((p) => p.id);
    room.pendingPrompt = {
      type: 'CITY_HALL_CHOICE',
      playerId: player.id,
      title: '市庁舎のエリア効果',
      description: '他のプレイヤー1人に2ダメージを与えるか、自分のダメージを1回復できます。',
      targetPlayerIds: targets,
    };
    return;
  }

  if (area === 'thieves_guild') {
    const targets = room.players
      .filter((p) => p.id !== player.id && p.isAlive && p.equipment.length > 0)
      .map((p) => p.id);
    if (targets.length === 0) {
      addLog(room, `${player.name} は「盗賊ギルド」に到着しましたが、装備を持っている他プレイヤーがいませんでした。`, 'info');
      enterAttackPhase(room);
      return;
    }
    room.pendingPrompt = {
      type: 'THIEVES_GUILD_STEAL',
      playerId: player.id,
      title: '盗賊ギルド：装備を奪う',
      description: '装備カードを1枚奪うプレイヤーを選んでください。',
      targetPlayerIds: targets,
    };
  }
}

function drawAndResolveColorCard(room: GameRoom, player: InternalPlayer, deck: 'WHITE' | 'BLACK'): void {
  const card = drawCardFromDeck(room, deck);
  const deckLabel = deck === 'WHITE' ? '白カード' : '黒カード';
  room.lastCardEvent = {
    id: uid(),
    deck,
    playerId: player.id,
    card,
    isEquipment: card.isEquipment,
    mode: card.isEquipment ? 'EQUIP' : 'SINGLE_USE',
  };
  addLog(room, `${player.name} は${deckLabel}「${card.name}」を引きました！`, 'card');

  if (card.isEquipment) {
    player.equipment.push(card);
    addLog(room, `${player.name} は装備「${card.name}」を装着しました。`, 'card');
    if (checkVictoryConditions(room)) return;
    enterAttackPhase(room);
    return;
  }

  // Single-use White / Black cards
  switch (card.effectKey) {
    case 'HOLY_WATER': {
      healDamage(room, player, 2, 'いやしの聖水');
      room.discards.WHITE.push(card);
      enterAttackPhase(room);
      return;
    }
    case 'MERMAID_TEARS': {
      if (player.character && player.character.maxHp <= 10) {
        revealPlayerIdentity(room, player, '人魚の涙');
        healDamage(room, player, 14, '人魚の涙');
      } else {
        addLog(room, `${player.name} は「人魚の涙」の条件を満たさなかったため効果がありませんでした。`, 'info');
      }
      room.discards.WHITE.push(card);
      enterAttackPhase(room);
      return;
    }
    case 'ADVENT': {
      if (player.character?.faction === 'RAIDER') {
        revealPlayerIdentity(room, player, '光臨');
        healDamage(room, player, 14, '光臨');
      } else {
        addLog(room, `${player.name} は「光臨」の条件を満たさなかったため効果がありませんでした。`, 'info');
      }
      room.discards.WHITE.push(card);
      enterAttackPhase(room);
      return;
    }
    case 'DIABOLIC_RITUAL': {
      if (player.character?.faction === 'SHADOW') {
        revealPlayerIdentity(room, player, '戦慄の闇儀式');
        healDamage(room, player, 14, '戦慄の闇儀式');
      } else {
        addLog(room, `${player.name} は「戦慄の闇儀式」の条件を満たさなかったため効果がありませんでした。`, 'info');
      }
      room.discards.BLACK.push(card);
      enterAttackPhase(room);
      return;
    }
    case 'GUARDIAN_ANGEL': {
      player.guardianAngelActive = true;
      addLog(room, `${player.name} は「守護天使」の加護を得ました！（次の自ターン開始まで攻撃ダメージ無効）`, 'info');
      room.discards.WHITE.push(card);
      enterAttackPhase(room);
      return;
    }
    case 'JUDGEMENT_FLARE': {
      addLog(room, `「裁きの閃光」発動！ ${player.name} 以外の全員に2ダメージ！`, 'damage');
      for (const other of room.players) {
        if (other.id !== player.id && other.isAlive) {
          applyDamage(room, other, 2, '裁きの閃光');
        }
      }
      room.discards.WHITE.push(card);
      if (checkVictoryConditions(room)) return;
      enterAttackPhase(room);
      return;
    }
    case 'RIOT': {
      const d6 = rollD6();
      const d4 = rollD4();
      const total = d6 + d4;
      const targetArea = diceTotalToArea(total);
      room.lastDice = { rollId: uid(), d6, d4, total, purpose: 'EFFECT' };
      addLog(room, `「暴動」発生！出目 ${d6}+${d4}=${total}（${AREAS[targetArea].name}）の全員に3ダメージ！`, 'damage');
      for (const p of room.players) {
        if (p.isAlive && p.area === targetArea) {
          applyDamage(room, p, 3, '暴動', { isBlackCard: p.id !== player.id });
        }
      }
      room.discards.BLACK.push(card);
      if (checkVictoryConditions(room)) return;
      enterAttackPhase(room);
      return;
    }
    case 'BANANA_PEEL': {
      if (player.equipment.length === 0) {
        applyDamage(room, player, 1, 'バナナの皮');
        room.discards.BLACK.push(card);
        if (checkVictoryConditions(room)) return;
        enterAttackPhase(room);
        return;
      }
      const targets = room.players.filter((p) => p.id !== player.id && p.isAlive).map((p) => p.id);
      room.pendingPrompt = {
        type: 'CARD_TARGET_SELECT',
        playerId: player.id,
        title: 'バナナの皮：装備を渡す相手を選択',
        description: card.description,
        card,
        targetPlayerIds: targets,
      };
      return;
    }
    case 'HENCHMAN': {
      const targets = room.players
        .filter((p) => p.id !== player.id && p.isAlive && p.equipment.length > 0)
        .map((p) => p.id);
      if (targets.length === 0) {
        addLog(room, `装備を持つ他プレイヤーがいないため「オリバーの子分」は不発に終わりました。`, 'info');
        room.discards.BLACK.push(card);
        enterAttackPhase(room);
        return;
      }
      room.pendingPrompt = {
        type: 'CARD_TARGET_SELECT',
        playerId: player.id,
        title: 'オリバーの子分：装備を奪う相手を選択',
        description: card.description,
        card,
        targetPlayerIds: targets,
      };
      return;
    }
    case 'BLESSING':
    case 'VAMPIRE_BAT':
    case 'CURSED_DOLL':
    case 'WATCHDOG': {
      const targets = room.players.filter((p) => p.id !== player.id && p.isAlive).map((p) => p.id);
      room.pendingPrompt = {
        type: 'CARD_TARGET_SELECT',
        playerId: player.id,
        title: `${card.name}：対象を選択`,
        description: card.description,
        card,
        targetPlayerIds: targets,
      };
      return;
    }
    default: {
      room.discards[deck].push(card);
      enterAttackPhase(room);
    }
  }
}

function matchesGreenCondition(target: InternalPlayer, effectKey: string): boolean {
  if (!target.character) return false;
  const f = target.character.faction;
  const hp = target.character.maxHp;
  switch (effectKey) {
    case 'RAIDER_DMG_1':
    case 'RAIDER_DISCARD_EQUIP':
    case 'RAIDER_DMG_2':
    case 'RAIDER_HEAL_1':
    case 'RAIDER_GIVE_EQUIP':
      return f === 'RAIDER';
    case 'SHADOW_DMG_1':
    case 'SHADOW_DISCARD_EQUIP':
    case 'SHADOW_DMG_2':
    case 'SHADOW_HEAL_1':
      return f === 'SHADOW';
    case 'CITIZEN_HEAL_1':
    case 'CITIZEN_GIVE_EQUIP':
    case 'CITIZEN_DMG_2':
      return f === 'CITIZEN';
    case 'RAIDER_OR_SHADOW_DMG_1':
      return f === 'RAIDER' || f === 'SHADOW';
    case 'RAIDER_OR_CITIZEN_DMG_1':
    case 'RAIDER_OR_CITIZEN_HEAL_1':
      return f === 'RAIDER' || f === 'CITIZEN';
    case 'SHADOW_OR_CITIZEN_DMG_1':
    case 'SHADOW_OR_CITIZEN_HEAL_1':
      return f === 'SHADOW' || f === 'CITIZEN';
    case 'HP_LE_11_DMG_1':
      return hp <= 11;
    case 'HP_GE_12_DMG_2':
      return hp >= 12;
    case 'REVEAL_TO_DRAWER':
      return true;
    default:
      return false;
  }
}

function resolveGreenCardOnTarget(
  room: GameRoom,
  source: InternalPlayer,
  target: InternalPlayer,
  card: CardInstance,
  forceBluffResult?: 'NO_EFFECT' | 'TRUTH'
): void {
  source.drawnGreenCard = null;
  target.receivedGreenCard = null;

  // Ulrich Bluff check if unrevealed & ability active & not forced yet
  if (
    forceBluffResult === undefined &&
    target.character?.id === 'ulrich' &&
    !target.isRevealed &&
    !target.abilityDisabled &&
    card.effectKey !== 'REVEAL_TO_DRAWER'
  ) {
    target.receivedGreenCard = card;
    room.pendingPrompt = {
      type: 'GREEN_ULRICH_BLUFF',
      playerId: target.id,
      title: 'ウルリッヒの能力：偽装工作',
      description: `${source.name} から推理カードを受け取りました。正直に判定を受けるか、嘘をついて「何も起きなかった」ことにしますか？`,
      card,
      greenContext: {
        sourcePlayerId: source.id,
        targetPlayerId: target.id,
        card,
        mode: 'DISCARD',
      },
    };
    return;
  }

  if (forceBluffResult === 'NO_EFFECT') {
    addLog(room, `${target.name} は推理カードを確認しました。（効果は発生しませんでした）`, 'card');
    room.discards.GREEN.push(card);
    if (checkVictoryConditions(room)) return;
    enterAttackPhase(room);
    return;
  }

  const matched = matchesGreenCondition(target, card.effectKey);
  if (!matched) {
    addLog(room, `${target.name} は推理カードを確認しました。（条件に該当せず、何も起きませんでした）`, 'card');
    room.discards.GREEN.push(card);
    enterAttackPhase(room);
    return;
  }

  switch (card.effectKey) {
    case 'RAIDER_DMG_1':
    case 'SHADOW_DMG_1':
    case 'RAIDER_OR_SHADOW_DMG_1':
    case 'RAIDER_OR_CITIZEN_DMG_1':
    case 'SHADOW_OR_CITIZEN_DMG_1':
    case 'HP_LE_11_DMG_1': {
      applyDamage(room, target, 1, '推理カード');
      break;
    }
    case 'RAIDER_DMG_2':
    case 'SHADOW_DMG_2':
    case 'CITIZEN_DMG_2':
    case 'HP_GE_12_DMG_2': {
      applyDamage(room, target, 2, '推理カード');
      break;
    }
    case 'CITIZEN_HEAL_1':
    case 'RAIDER_HEAL_1':
    case 'SHADOW_HEAL_1':
    case 'RAIDER_OR_CITIZEN_HEAL_1':
    case 'SHADOW_OR_CITIZEN_HEAL_1': {
      if (target.damage === 0) {
        applyDamage(room, target, 1, '推理カード（ダメージ0のため反転）');
      } else {
        healDamage(room, target, 1, '推理カード');
      }
      break;
    }
    case 'RAIDER_DISCARD_EQUIP':
    case 'SHADOW_DISCARD_EQUIP': {
      if (target.equipment.length === 0) {
        applyDamage(room, target, 1, '推理カード（装備なし）');
      } else if (target.equipment.length === 1) {
        const lost = target.equipment.pop()!;
        room.discards[lost.deck].push(lost);
        addLog(room, `${target.name} は推理カードの効果で装備「${lost.name}」を捨てました。`, 'card');
      } else {
        room.pendingPrompt = {
          type: 'GREEN_EQUIPMENT_GIVE_OR_DISCARD',
          playerId: target.id,
          title: '推理カード：捨てる装備を選択',
          description: '捨てる装備カードを1枚選んでください。',
          card,
          greenContext: {
            sourcePlayerId: source.id,
            targetPlayerId: target.id,
            card,
            mode: 'DISCARD',
          },
        };
        return;
      }
      break;
    }
    case 'CITIZEN_GIVE_EQUIP':
    case 'RAIDER_GIVE_EQUIP': {
      if (target.equipment.length === 0) {
        applyDamage(room, target, 1, '推理カード（装備なし）');
      } else if (target.equipment.length === 1) {
        const given = target.equipment.pop()!;
        source.equipment.push(given);
        addLog(room, `${target.name} は推理カードの効果で装備「${given.name}」を ${source.name} に渡しました。`, 'card');
      } else {
        room.pendingPrompt = {
          type: 'GREEN_EQUIPMENT_GIVE_OR_DISCARD',
          playerId: target.id,
          title: '推理カード：渡す装備を選択',
          description: `${source.name} に渡す装備カードを1枚選んでください。`,
          card,
          greenContext: {
            sourcePlayerId: source.id,
            targetPlayerId: target.id,
            card,
            mode: 'GIVE_TO_SOURCE',
          },
        };
        return;
      }
      break;
    }
    case 'REVEAL_TO_DRAWER': {
      if (target.character) {
        source.peekedPlayers[target.id] = target.character;
        addLog(room, `${target.name} は ${source.name} だけに自分の正体を見せました！`, 'reveal');
      }
      break;
    }
  }

  room.discards.GREEN.push(card);
  if (checkVictoryConditions(room)) return;
  enterAttackPhase(room);
}

export function handleChooseAttackTarget(room: GameRoom, playerId: string, targetId: string | null): void {
  const active = getActivePlayer(room);
  if (active.id !== playerId || room.phase !== 'ATTACK' || room.pendingPrompt) {
    throw new Error('現在は攻撃対象を選べません。');
  }

  if (targetId === null) {
    addLog(room, `${active.name} は攻撃せずにターンを終了しました。`, 'info');
    advanceTurn(room);
    return;
  }

  const validTargets = getAttackableTargets(room, active);
  const chosen = validTargets.find((p) => p.id === targetId);
  if (!chosen) {
    throw new Error('指定した相手は攻撃範囲外です。');
  }

  const targetIds = hasEquip(active, 'GATLING') ? validTargets.map((t) => t.id) : [chosen.id];
  const d6 = rollD6();
  const d4 = rollD4();
  const rawDamage = Math.abs(d6 - d4);
  room.lastDice = { rollId: uid(), d6, d4, total: rawDamage, purpose: 'ATTACK' };
  room.lastCombatEvent = { id: uid(), attackerId: active.id, targetIds };

  if (hasEquip(active, 'REAPER_SCOPE')) {
    room.pendingPrompt = {
      type: 'REAPERS_SCOPE_REROLL',
      playerId: active.id,
      title: '死神のスコープ',
      description: `攻撃ダイス：6面=${d6}・4面=${d4}（基礎ダメージ ${rawDamage}）。どちらか1つを振り直しますか？`,
      attackContext: {
        targetIds,
        d6,
        d4,
        rawDamage,
        canReroll: true,
      },
    };
    return;
  }

  resolveAttackHit(room, active, targetIds, d6, d4);
}

function resolveAttackHit(
  room: GameRoom,
  attacker: InternalPlayer,
  targetIds: string[],
  d6: number,
  d4: number
): void {
  const rawDamage = Math.abs(d6 - d4);
  room.lastCombatEvent = { id: uid(), attackerId: attacker.id, targetIds };
  addLog(
    room,
    `${attacker.name} の攻撃ダイス！ 6面=${d6}, 4面=${d4} → 基礎ダメージ ${rawDamage}`,
    'damage'
  );

  // Byron Robbery check (single-target or first target with equip if >=2 damage)
  if (
    rawDamage >= 2 &&
    attacker.character?.id === 'byron' &&
    attacker.isRevealed &&
    !attacker.abilityDisabled &&
    targetIds.length === 1
  ) {
    const t = room.players.find((p) => p.id === targetIds[0]);
    if (t && t.isAlive && t.equipment.length > 0 && !t.guardianAngelActive && !t.eimiShieldActive) {
      let dmg = rawDamage;
      if (hasEquip(attacker, 'SABER')) dmg += 1;
      if (hasEquip(attacker, 'SAGE_ROBE')) dmg = Math.max(0, dmg - 1);
      if (hasEquip(t, 'SAGE_ROBE')) dmg = Math.max(0, dmg - 1);
      if (dmg >= 2) {
        room.pendingPrompt = {
          type: 'BYRON_ROBBERY_CHOICE',
          playerId: attacker.id,
          title: 'バイロン：強奪',
          description: `${t.name} に ${dmg} ダメージを与える代わりに、装備カードを1枚奪いますか？`,
          robberyContext: { targetId: t.id, damage: dmg },
        };
        return;
      }
    }
  }

  let dealtAnyDamage = false;
  const survivingWalpurgis: InternalPlayer[] = [];

  for (const tid of targetIds) {
    const target = room.players.find((p) => p.id === tid);
    if (!target || !target.isAlive) continue;

    let dmg = rawDamage;
    if (dmg > 0) {
      if (hasEquip(attacker, 'SABER')) dmg += 1;
      if (hasEquip(attacker, 'EXCALIBUR') && attacker.character?.faction === 'RAIDER' && attacker.isRevealed) {
        dmg += 2;
      }
      if (hasEquip(attacker, 'SAGE_ROBE')) dmg = Math.max(0, dmg - 1);
      if (hasEquip(target, 'SAGE_ROBE')) dmg = Math.max(0, dmg - 1);
      if (attacker.character?.id === 'kodoku' && attacker.isRevealed && !attacker.abilityDisabled && dmg > 0) {
        dmg += 1;
        addLog(room, `${attacker.name} の「蠱毒の呪い」でダメージ+1！`, 'damage');
      }
    }

    if (dmg > 0) {
      const applied = applyDamage(room, target, dmg, `${attacker.name} の攻撃`, {
        isAttack: true,
        attacker,
      });
      if (applied > 0) dealtAnyDamage = true;
    } else {
      addLog(room, `${attacker.name} の ${target.name} への攻撃は0ダメージでした。`, 'info');
    }

    if (
      target.isAlive &&
      target.character?.id === 'walpurgis' &&
      target.isRevealed &&
      !target.abilityDisabled &&
      attacker.isAlive
    ) {
      survivingWalpurgis.push(target);
    }
  }

  // Vampire Bloodsuck heal
  if (dealtAnyDamage && attacker.character?.id === 'vampire' && attacker.isRevealed && !attacker.abilityDisabled) {
    healDamage(room, attacker, 2, 'ヴァンパイアの「吸血」');
  }

  if (checkVictoryConditions(room)) return;

  // Walpurgis counterattack check
  if (survivingWalpurgis.length > 0 && attacker.isAlive) {
    const walp = survivingWalpurgis[0];
    room.pendingPrompt = {
      type: 'WALPURGIS_COUNTERATTACK',
      playerId: walp.id,
      title: 'ワルプルギス：反撃の狼牙',
      description: `${attacker.name} から攻撃を受けました！即座に反撃しますか？`,
      targetPlayerIds: [attacker.id],
    };
    return;
  }

  finishAttackStep(room, attacker);
}

function finishAttackStep(room: GameRoom, attacker: InternalPlayer): void {
  if (checkVictoryConditions(room)) return;

  // Craig Bloodfest second attack option
  if (
    attacker.isAlive &&
    attacker.character?.id === 'craig' &&
    attacker.isRevealed &&
    !attacker.abilityDisabled &&
    !room.craigSecondAttackUsed &&
    attacker.damage + 2 < attacker.character.maxHp
  ) {
    const targets = getAttackableTargets(room, attacker);
    if (targets.length > 0) {
      room.pendingPrompt = {
        type: 'CRAIG_SECOND_ATTACK',
        playerId: attacker.id,
        title: 'クレイグ：血の宴',
        description: '自分に2ダメージを受けて、攻撃範囲内の相手にもう1回攻撃しますか？',
        targetPlayerIds: targets.map((t) => t.id),
      };
      return;
    }
  }

  advanceTurn(room);
}

export function handleRevealIdentityAction(room: GameRoom, playerId: string): void {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || !player.isAlive || player.isRevealed) {
    throw new Error('正体を公開できません。');
  }
  revealPlayerIdentity(room, player);
}

export function handleUseAbility(room: GameRoom, playerId: string, targetId?: string): void {
  const active = getActivePlayer(room);
  if (active.id !== playerId || !active.character || active.abilityDisabled || room.pendingPrompt) {
    throw new Error('現在この特殊能力は使用できません。');
  }

  const cid = active.character.id;
  if (cid === 'alice') {
    if (active.usedOnceAbility) throw new Error('この能力はすでに使用済みです。');
    revealPlayerIdentity(room, active, '慈愛の光');
    active.usedOnceAbility = true;
    healDamage(room, active, 14, 'アリスの能力「慈愛の光」');
    return;
  }

  if (cid === 'angela') {
    if (active.usedOnceAbility) throw new Error('この能力はすでに使用済みです。');
    revealPlayerIdentity(room, active, '気まぐれな風');
    active.usedOnceAbility = true;
    active.angelaDirection = active.angelaDirection === 'RIGHT' ? 'LEFT' : 'RIGHT';
    addLog(
      room,
      `${active.name} は勝利対象を「${active.angelaDirection === 'RIGHT' ? '右隣' : '左隣'}」のプレイヤーに切り替えました！`,
      'info'
    );
    return;
  }

  if (cid === 'eimi') {
    if (active.usedOnceAbility) throw new Error('この能力はすでに使用済みです。');
    revealPlayerIdentity(room, active, '霊盾');
    active.usedOnceAbility = true;
    active.eimiShieldActive = true;
    addLog(room, `${active.name} は「霊盾」を展開しました！（次の自ターン開始まで全ダメージ無効）`, 'info');
    return;
  }

  if (cid === 'felix' || cid === 'freddy' || cid === 'gordon' || cid === 'allister') {
    if (cid !== 'allister' && active.usedOnceAbility) throw new Error('この能力はすでに使用済みです。');
    if (cid === 'allister' && active.usedAbilityThisTurn) throw new Error('このターンはすでに使用しました。');

    const candidates =
      cid === 'allister'
        ? room.players.filter((p) => p.id !== active.id && p.isAlive && p.area === 'underground').map((p) => p.id)
        : room.players.filter((p) => p.id !== active.id && p.isAlive).map((p) => p.id);

    if (candidates.length === 0) {
      throw new Error(cid === 'allister' ? '地下通路にいる他プレイヤーがいません。' : '対象となるプレイヤーがいません。');
    }

    if (targetId && candidates.includes(targetId)) {
      executeTargetedAbility(room, active, targetId);
      return;
    }

    room.pendingPrompt = {
      type: 'ACTIVE_ABILITY_TARGET',
      playerId: active.id,
      title: `${active.character.name}：${active.character.abilityName}`,
      description: active.character.abilityDesc,
      targetPlayerIds: candidates,
      abilityId: cid,
    };
    return;
  }

  throw new Error('このキャラクターの能力はパッシブまたは自動発動です。');
}

function executeTargetedAbility(room: GameRoom, active: InternalPlayer, targetId: string): void {
  const target = room.players.find((p) => p.id === targetId && p.isAlive);
  if (!target || !active.character) return;

  const cid = active.character.id;
  revealPlayerIdentity(room, active, active.character.abilityName);

  if (cid === 'felix') {
    active.usedOnceAbility = true;
    target.abilityDisabled = true;
    addLog(room, `${active.name} の「封印の鎖」により、${target.name} の特殊能力が封印されました！`, 'reveal');
  } else if (cid === 'freddy') {
    active.usedOnceAbility = true;
    const d6 = rollD6();
    room.lastDice = { rollId: uid(), d6, d4: 1, total: d6, purpose: 'EFFECT' };
    addLog(room, `${active.name} の「落雷」！ 6面ダイスの出目は ${d6}！`, 'damage');
    applyDamage(room, target, d6, 'フレディの落雷');
  } else if (cid === 'gordon') {
    active.usedOnceAbility = true;
    const d4 = rollD4();
    room.lastDice = { rollId: uid(), d6: 1, d4, total: d4, purpose: 'EFFECT' };
    addLog(room, `${active.name} の「粉砕鉄槌」！ 4面ダイスの出目は ${d4}！`, 'damage');
    applyDamage(room, target, d4, 'ゴードンの粉砕鉄槌');
  } else if (cid === 'allister') {
    active.usedAbilityThisTurn = true;
    addLog(room, `${active.name} の「冥界の魔光」が地下通路の ${target.name} を襲う！`, 'damage');
    applyDamage(room, target, 3, 'アルスターの冥界の魔光');
  }

  checkVictoryConditions(room);
}

export function handlePromptResponse(
  room: GameRoom,
  playerId: string,
  action: string,
  payload: Record<string, unknown> = {}
): void {
  const prompt = room.pendingPrompt;
  if (!prompt || prompt.playerId !== playerId) {
    throw new Error('現在この操作は行えません。');
  }
  const player = room.players.find((p) => p.id === playerId)!;

  switch (prompt.type) {
    case 'MYSTIC_COMPASS_CHOICE': {
      const opt = action === 'CHOOSE_B' ? prompt.diceOptionB! : prompt.diceOptionA!;
      room.pendingPrompt = null;
      movePlayerWithRoll(room, player, opt.d6, opt.d4, opt.area);
      return;
    }

    case 'EMMA_MOVE_CHOICE': {
      const area = payload.area as AreaId;
      if (!prompt.adjacentAreas?.includes(area)) throw new Error('無効な移動先です。');
      room.pendingPrompt = null;
      player.area = area;
      addLog(room, `${player.name} は「テレポート」で「${AREAS[area].name}」へ移動しました。`, 'info');
      enterAreaAction(room, player, area);
      return;
    }

    case 'CATHEDRAL_DECK_CHOICE': {
      room.pendingPrompt = null;
      if (action === 'SKIP') {
        addLog(room, `${player.name} は大聖堂でカードを引きませんでした。`, 'info');
        enterAttackPhase(room);
        return;
      }
      if (action === 'GREEN') {
        enterAreaAction(room, player, 'detective');
        return;
      }
      drawAndResolveColorCard(room, player, 'WHITE');
      return;
    }

    case 'UNDERGROUND_DECK_CHOICE': {
      room.pendingPrompt = null;
      if (action === 'SKIP') {
        addLog(room, `${player.name} は地下通路でカードを引きませんでした。`, 'info');
        enterAttackPhase(room);
        return;
      }
      if (action === 'GREEN') {
        enterAreaAction(room, player, 'detective');
        return;
      }
      drawAndResolveColorCard(room, player, 'BLACK');
      return;
    }

    case 'CITY_HALL_CHOICE': {
      room.pendingPrompt = null;
      if (action === 'HEAL') {
        healDamage(room, player, 1, '市庁舎');
        enterAttackPhase(room);
        return;
      }
      if (action === 'DAMAGE') {
        const targetId = payload.targetId as string;
        const target = room.players.find((p) => p.id === targetId && p.isAlive && p.id !== player.id);
        if (!target) throw new Error('有効な対象を選んでください。');
        applyDamage(room, target, 2, '市庁舎のエリア効果', { isCityHall: true });
        if (checkVictoryConditions(room)) return;
        enterAttackPhase(room);
        return;
      }
      enterAttackPhase(room);
      return;
    }

    case 'THIEVES_GUILD_STEAL': {
      const targetId = payload.targetId as string;
      const equipUid = payload.equipUid as string | undefined;
      const target = room.players.find((p) => p.id === targetId && p.isAlive && p.equipment.length > 0);
      if (!target) {
        room.pendingPrompt = null;
        enterAttackPhase(room);
        return;
      }
      const eqIdx = equipUid ? target.equipment.findIndex((e) => e.uid === equipUid) : 0;
      const stolen = target.equipment.splice(eqIdx >= 0 ? eqIdx : 0, 1)[0];
      player.equipment.push(stolen);
      room.pendingPrompt = null;
      addLog(room, `${player.name} は「盗賊ギルド」で ${target.name} から「${stolen.name}」を奪いました！`, 'card');
      if (checkVictoryConditions(room)) return;
      enterAttackPhase(room);
      return;
    }

    case 'GREEN_TARGET_SELECT': {
      const targetId = payload.targetId as string;
      const target = room.players.find((p) => p.id === targetId && p.isAlive && p.id !== player.id);
      if (!target || !prompt.card) throw new Error('有効な対象を選んでください。');
      room.pendingPrompt = null;
      addLog(room, `${player.name} は推理カードを ${target.name} に渡しました。`, 'card');
      resolveGreenCardOnTarget(room, player, target, prompt.card);
      return;
    }

    case 'GREEN_ULRICH_BLUFF': {
      const ctx = prompt.greenContext!;
      const source = room.players.find((p) => p.id === ctx.sourcePlayerId)!;
      room.pendingPrompt = null;
      resolveGreenCardOnTarget(
        room,
        source,
        player,
        ctx.card,
        action === 'BLUFF' ? 'NO_EFFECT' : 'TRUTH'
      );
      return;
    }

    case 'GREEN_EQUIPMENT_GIVE_OR_DISCARD': {
      const ctx = prompt.greenContext!;
      const source = room.players.find((p) => p.id === ctx.sourcePlayerId)!;
      const equipUid = payload.equipUid as string;
      const idx = player.equipment.findIndex((e) => e.uid === equipUid);
      const chosen = player.equipment.splice(idx >= 0 ? idx : 0, 1)[0];
      room.pendingPrompt = null;
      if (ctx.mode === 'GIVE_TO_SOURCE') {
        source.equipment.push(chosen);
        addLog(room, `${player.name} は推理カードの効果で装備「${chosen.name}」を ${source.name} に渡しました。`, 'card');
      } else {
        room.discards[chosen.deck].push(chosen);
        addLog(room, `${player.name} は推理カードの効果で装備「${chosen.name}」を捨てました。`, 'card');
      }
      room.discards.GREEN.push(ctx.card);
      if (checkVictoryConditions(room)) return;
      enterAttackPhase(room);
      return;
    }

    case 'CARD_TARGET_SELECT': {
      const card = prompt.card!;
      const targetId = payload.targetId as string;
      const target = room.players.find((p) => p.id === targetId && p.isAlive && p.id !== player.id);
      if (!target) throw new Error('有効な対象を選んでください。');
      room.pendingPrompt = null;

      if (card.effectKey === 'BLESSING') {
        const d6 = rollD6();
        room.lastDice = { rollId: uid(), d6, d4: 1, total: d6, purpose: 'EFFECT' };
        healDamage(room, target, d6, `恩恵（出目${d6}）`);
      } else if (card.effectKey === 'VAMPIRE_BAT') {
        const dealt = applyDamage(room, target, 2, '吸血コウモリ', { isBlackCard: true });
        if (dealt > 0) healDamage(room, player, 1, '吸血コウモリ');
      } else if (card.effectKey === 'CURSED_DOLL') {
        const d6 = rollD6();
        room.lastDice = { rollId: uid(), d6, d4: 1, total: d6, purpose: 'EFFECT' };
        if (d6 <= 4) {
          addLog(room, `「呪いの人形」の出目は ${d6}！ ${target.name} に3ダメージ！`, 'damage');
          applyDamage(room, target, 3, '呪いの人形', { isBlackCard: true });
        } else {
          addLog(room, `「呪いの人形」の出目は ${d6}！ 自分に跳ね返り ${player.name} に3ダメージ！`, 'damage');
          applyDamage(room, player, 3, '呪いの人形（反動）');
        }
      } else if (card.effectKey === 'WATCHDOG') {
        applyDamage(room, target, 2, '三つ目の番犬', { isBlackCard: true });
        applyDamage(room, player, 2, '三つ目の番犬（反動）');
      } else if (card.effectKey === 'HENCHMAN') {
        if (hasEquip(target, 'RAINBOW_PARASOL')) {
          addLog(room, `${target.name} は「虹色のパラソル」で「オリバーの子分」を防ぎました！`, 'info');
        } else if (target.equipment.length > 0) {
          const equipUid = payload.equipUid as string | undefined;
          const idx = equipUid ? target.equipment.findIndex((e) => e.uid === equipUid) : 0;
          const stolen = target.equipment.splice(idx >= 0 ? idx : 0, 1)[0];
          player.equipment.push(stolen);
          addLog(room, `${player.name} は「オリバーの子分」で ${target.name} から「${stolen.name}」を奪いました！`, 'card');
        }
      } else if (card.effectKey === 'BANANA_PEEL') {
        const equipUid = payload.equipUid as string | undefined;
        const idx = equipUid ? player.equipment.findIndex((e) => e.uid === equipUid) : 0;
        const given = player.equipment.splice(idx >= 0 ? idx : 0, 1)[0];
        target.equipment.push(given);
        addLog(room, `${player.name} は「バナナの皮」で「${given.name}」を ${target.name} に渡しました。`, 'card');
      }

      room.discards[card.deck].push(card);
      if (checkVictoryConditions(room)) return;
      enterAttackPhase(room);
      return;
    }

    case 'REAPERS_SCOPE_REROLL': {
      const ctx = prompt.attackContext!;
      let { d6, d4 } = ctx;
      if (action === 'REROLL_D6') d6 = rollD6();
      if (action === 'REROLL_D4') d4 = rollD4();
      if (action === 'REROLL_D6' || action === 'REROLL_D4') {
        room.lastDice = { rollId: uid(), d6, d4, total: Math.abs(d6 - d4), purpose: 'ATTACK' };
        addLog(room, `${player.name} は「死神のスコープ」でダイスを振り直しました！（6面=${d6}・4面=${d4}）`, 'info');
      }
      room.pendingPrompt = null;
      resolveAttackHit(room, player, ctx.targetIds, d6, d4);
      return;
    }

    case 'BYRON_ROBBERY_CHOICE': {
      const ctx = prompt.robberyContext!;
      const target = room.players.find((p) => p.id === ctx.targetId)!;
      room.pendingPrompt = null;
      if (action === 'STEAL' && target.equipment.length > 0) {
        const equipUid = payload.equipUid as string | undefined;
        const idx = equipUid ? target.equipment.findIndex((e) => e.uid === equipUid) : 0;
        const stolen = target.equipment.splice(idx >= 0 ? idx : 0, 1)[0];
        player.equipment.push(stolen);
        addLog(room, `${player.name} は「強奪」でダメージの代わりに ${target.name} の「${stolen.name}」を奪いました！`, 'card');
        if (checkVictoryConditions(room)) return;
        finishAttackStep(room, player);
        return;
      }
      applyDamage(room, target, ctx.damage, `${player.name} の攻撃`, { isAttack: true, attacker: player });
      if (checkVictoryConditions(room)) return;
      finishAttackStep(room, player);
      return;
    }

    case 'WALPURGIS_COUNTERATTACK': {
      const attackerId = prompt.targetPlayerIds![0];
      const originalAttacker = room.players.find((p) => p.id === attackerId);
      const turnActive = getActivePlayer(room);
      room.pendingPrompt = null;
      if (action === 'COUNTER' && originalAttacker && originalAttacker.isAlive) {
        const d6 = rollD6();
        const d4 = rollD4();
        const raw = Math.abs(d6 - d4);
        room.lastDice = { rollId: uid(), d6, d4, total: raw, purpose: 'ATTACK' };
        room.lastCombatEvent = { id: uid(), attackerId: player.id, targetIds: [originalAttacker.id] };
        addLog(room, `${player.name} が「反撃の狼牙」発動！ 6面=${d6}・4面=${d4}（基礎ダメージ ${raw}）`, 'damage');
        let dmg = raw;
        if (dmg > 0) {
          if (hasEquip(player, 'SABER')) dmg += 1;
          if (hasEquip(player, 'SAGE_ROBE')) dmg = Math.max(0, dmg - 1);
          if (hasEquip(originalAttacker, 'SAGE_ROBE')) dmg = Math.max(0, dmg - 1);
          applyDamage(room, originalAttacker, dmg, `${player.name} の反撃`, { isAttack: true, attacker: player });
        }
        if (checkVictoryConditions(room)) return;
      }
      finishAttackStep(room, turnActive);
      return;
    }

    case 'CRAIG_SECOND_ATTACK': {
      room.pendingPrompt = null;
      if (action === 'ATTACK') {
        const targetId = payload.targetId as string;
        const target = room.players.find((p) => p.id === targetId && p.isAlive);
        if (target) {
          room.craigSecondAttackUsed = true;
          applyDamage(room, player, 2, 'クレイグ「血の宴」の代償');
          if (checkVictoryConditions(room)) return;
          if (player.isAlive) {
            const d6 = rollD6();
            const d4 = rollD4();
            room.lastDice = { rollId: uid(), d6, d4, total: Math.abs(d6 - d4), purpose: 'ATTACK' };
            resolveAttackHit(room, player, [target.id], d6, d4);
            return;
          }
        }
      }
      advanceTurn(room);
      return;
    }

    case 'ACTIVE_ABILITY_TARGET': {
      const targetId = payload.targetId as string;
      room.pendingPrompt = null;
      executeTargetedAbility(room, player, targetId);
      return;
    }
  }
}

export function runCpuStepIfNeeded(room: GameRoom): boolean {
  if (room.phase === 'LOBBY' || room.phase === 'GAME_OVER') return false;

  // Handle pending prompt owned by a CPU
  if (room.pendingPrompt) {
    const promptOwner = room.players.find((p) => p.id === room.pendingPrompt!.playerId);
    if (!promptOwner || !promptOwner.isCpu) return false;

    const p = room.pendingPrompt;
    switch (p.type) {
      case 'MYSTIC_COMPASS_CHOICE':
        handlePromptResponse(room, promptOwner.id, Math.random() < 0.5 ? 'CHOOSE_A' : 'CHOOSE_B');
        return true;
      case 'EMMA_MOVE_CHOICE':
        handlePromptResponse(room, promptOwner.id, 'CHOOSE', { area: p.adjacentAreas![0] });
        return true;
      case 'CATHEDRAL_DECK_CHOICE':
        handlePromptResponse(room, promptOwner.id, promptOwner.damage >= 3 ? 'WHITE' : 'GREEN');
        return true;
      case 'UNDERGROUND_DECK_CHOICE':
        handlePromptResponse(room, promptOwner.id, Math.random() < 0.55 ? 'BLACK' : 'GREEN');
        return true;
      case 'CITY_HALL_CHOICE': {
        if (promptOwner.damage >= 2 || !p.targetPlayerIds?.length) {
          handlePromptResponse(room, promptOwner.id, 'HEAL');
        } else {
          const tid = p.targetPlayerIds[Math.floor(Math.random() * p.targetPlayerIds.length)];
          handlePromptResponse(room, promptOwner.id, 'DAMAGE', { targetId: tid });
        }
        return true;
      }
      case 'THIEVES_GUILD_STEAL':
      case 'GREEN_TARGET_SELECT':
      case 'CARD_TARGET_SELECT':
      case 'ACTIVE_ABILITY_TARGET': {
        const tid = p.targetPlayerIds![Math.floor(Math.random() * p.targetPlayerIds!.length)];
        handlePromptResponse(room, promptOwner.id, 'SELECT', { targetId: tid });
        return true;
      }
      case 'GREEN_ULRICH_BLUFF':
        handlePromptResponse(room, promptOwner.id, Math.random() < 0.6 ? 'BLUFF' : 'TRUTH');
        return true;
      case 'GREEN_EQUIPMENT_GIVE_OR_DISCARD':
        handlePromptResponse(room, promptOwner.id, 'SELECT', { equipUid: promptOwner.equipment[0]?.uid });
        return true;
      case 'REAPERS_SCOPE_REROLL': {
        const ctx = p.attackContext!;
        if (ctx.rawDamage <= 1) {
          handlePromptResponse(room, promptOwner.id, ctx.d6 < ctx.d4 ? 'REROLL_D6' : 'REROLL_D4');
        } else {
          handlePromptResponse(room, promptOwner.id, 'KEEP');
        }
        return true;
      }
      case 'BYRON_ROBBERY_CHOICE':
        handlePromptResponse(room, promptOwner.id, 'STEAL');
        return true;
      case 'WALPURGIS_COUNTERATTACK':
        handlePromptResponse(room, promptOwner.id, 'COUNTER');
        return true;
      case 'CRAIG_SECOND_ATTACK':
        handlePromptResponse(room, promptOwner.id, 'SKIP');
        return true;
    }
  }

  const active = getActivePlayer(room);
  if (!active || !active.isCpu) return false;

  if (room.phase === 'MOVE_ROLL') {
    // CPU reveals & uses Alice heal if low HP
    if (active.character?.id === 'alice' && !active.usedOnceAbility && active.damage >= 5) {
      handleUseAbility(room, active.id);
      return true;
    }
    handleRollMoveDice(room, active.id);
    return true;
  }

  if (room.phase === 'ATTACK') {
    const targets = getAttackableTargets(room, active);
    if (targets.length === 0) {
      handleChooseAttackTarget(room, active.id, null);
      return true;
    }
    // Avoid attacking known teammates
    const enemies = targets.filter((t) => {
      if (!t.isRevealed || !t.character || !active.character) return true;
      if (active.character.faction === 'RAIDER' && t.character.faction === 'RAIDER') return false;
      if (active.character.faction === 'SHADOW' && t.character.faction === 'SHADOW') return false;
      return true;
    });
    const pool = enemies.length > 0 ? enemies : targets;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    handleChooseAttackTarget(room, active.id, pick.id);
    return true;
  }

  return false;
}

function buildGuidanceText(room: GameRoom, viewerId: string | null): string {
  if (room.phase === 'LOBBY') return 'プレイヤーの参加を待っています';
  if (room.phase === 'GAME_OVER') return 'ゲーム終了！勝利結果を確認してください';

  if (room.pendingPrompt) {
    const owner = room.players.find((p) => p.id === room.pendingPrompt!.playerId);
    if (owner?.id === viewerId) {
      return room.pendingPrompt.title;
    }
    return `${owner?.name ?? 'プレイヤー'} が選択中...`;
  }

  const active = getActivePlayer(room);
  const isMe = active?.id === viewerId;
  if (room.phase === 'MOVE_ROLL') {
    return isMe ? 'ダイスを振って移動してください' : `${active.name} が移動ダイスを振る番です`;
  }
  if (room.phase === 'AREA_ACTION') {
    return isMe ? 'エリア効果を実行してください' : `${active.name} がエリア効果を実行中...`;
  }
  if (room.phase === 'ATTACK') {
    return isMe ? '攻撃する相手を選ぶか、ターンを終了してください' : `${active.name} が攻撃対象を選択中...`;
  }
  return '';
}

export function getSanitizedStateForPlayer(room: GameRoom, viewerPlayerId: string | null): RoomView {
  const viewer = room.players.find((p) => p.id === viewerPlayerId) ?? null;

  // Sanitize pending prompt so private card descriptions aren't leaked to non-owners
  let sanitizedPrompt: PendingPrompt | null = null;
  if (room.pendingPrompt) {
    if (room.pendingPrompt.playerId === viewerPlayerId) {
      sanitizedPrompt = room.pendingPrompt;
    } else {
      sanitizedPrompt = {
        type: room.pendingPrompt.type,
        playerId: room.pendingPrompt.playerId,
        title: room.pendingPrompt.title,
        description: '他のプレイヤーが行動を選択しています...',
      };
    }
  }

  const active = room.players[room.activePlayerIndex] ?? null;

  return {
    roomCode: room.roomCode,
    maxPlayers: room.maxPlayers,
    phase: room.phase,
    turn: room.turn,
    activePlayerId: active ? active.id : null,
    players: room.players.map((p) => ({
      id: p.id,
      seatIndex: p.seatIndex,
      name: p.name,
      isHost: p.isHost,
      isCpu: p.isCpu,
      connected: p.connected,
      color: p.color,
      area: p.area,
      damage: p.damage,
      isAlive: p.isAlive,
      isRevealed: p.isRevealed,
      equipment: p.equipment,
      character: p.isRevealed ? p.character : null,
      guardianAngelActive: p.guardianAngelActive,
      eimiShieldActive: p.eimiShieldActive,
      abilityDisabled: p.abilityDisabled,
      usedOnceAbility: p.usedOnceAbility,
      angelaDirection: p.angelaDirection,
    })),
    myPlayerId: viewer?.id ?? null,
    myPrivate:
      viewer && viewer.character
        ? {
            playerId: viewer.id,
            character: viewer.character,
            peekedPlayers: viewer.peekedPlayers,
            drawnGreenCard: viewer.drawnGreenCard,
            receivedGreenCard: viewer.receivedGreenCard,
          }
        : null,
    lastDice: room.lastDice,
    lastCardEvent: room.lastCardEvent
      ? {
          ...room.lastCardEvent,
          card:
            room.lastCardEvent.deck === 'GREEN' && room.lastCardEvent.playerId !== viewerPlayerId
              ? null
              : room.lastCardEvent.card,
        }
      : null,
    lastCombatEvent: room.lastCombatEvent,
    deckCounts: {
      GREEN: room.decks.GREEN.length,
      WHITE: room.decks.WHITE.length,
      BLACK: room.decks.BLACK.length,
    },
    pendingPrompt: sanitizedPrompt,
    logs: room.logs.slice(-50),
    winners: room.winners,
    enabledCharacterIds: [...room.enabledCharacterIds],
    guidanceText: buildGuidanceText(room, viewerPlayerId),
  };
}
