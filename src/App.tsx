import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dices, Hourglass, Menu, Users } from 'lucide-react';
import woodTabletopImg from './assets/images/tabletop_mahogany_wood_1794830458910.jpg';
import { AREAS, getFactionLabel } from './data/gameData.ts';
import { CardDecks, TurnOrderRoster } from './components/CardDecks.tsx';
import { DamageBoard } from './components/DamageBoard.tsx';
import { DiceDisplay } from './components/DiceDisplay.tsx';
import { LobbyScreen } from './components/LobbyScreen.tsx';
import { PentagramBoard } from './components/PentagramBoard.tsx';
import { PlayerPanel } from './components/PlayerPanel.tsx';
import {
  CardDrawOverlay,
  RevealCardOverlay,
  type RevealOverlayData,
} from './components/TabletopOverlays.tsx';
import { VictoryModal } from './components/VictoryModal.tsx';
import {
  AttackModal,
  CardInspectModal,
  CharacterDetailModal,
  DeckReferenceModal,
  MenuModal,
  PendingPromptModal,
  PublicPlayerModal,
} from './components/ActionModals.tsx';
import { soundFX } from './utils/sound.ts';
import type {
  AreaId,
  CardDrawEvent,
  CardInstance,
  ClientMessage,
  DeckType,
  PublicPlayerView,
  RoomSummary,
  RoomView,
  ServerMessage,
} from './types/game.ts';

function getOrCreateSessionToken(): string {
  const key = 'dice_wars_session_token';
  let token = sessionStorage.getItem(key);
  if (!token) {
    token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, token);
  }
  return token;
}

function computeAttackablePlayers(room: RoomView, me: PublicPlayerView | null): PublicPlayerView[] {
  if (!me || !me.isAlive || !me.area) return [];
  const others = room.players.filter((p) => p.id !== me.id && p.isAlive && p.area !== null);
  if (me.area === 'airship') return others;

  const areaDef = AREAS[me.area];
  const hasHandgun = me.equipment.some((e) => e.effectKey === 'HANDGUN_R');
  const hasCrossbow = me.equipment.some((e) => e.effectKey === 'CROSSBOW');

  if (hasHandgun) {
    const flipped = new Set<AreaId>(
      (['detective', 'cathedral', 'underground', 'city_hall', 'thieves_guild'] as AreaId[]).filter(
        (a) => a !== me.area && a !== areaDef.leftNeighbor
      )
    );
    return others.filter((p) => flipped.has(p.area!));
  }

  const range = new Set<AreaId>([me.area, areaDef.leftNeighbor!, 'airship']);
  if (hasCrossbow && areaDef.rightNeighbor) {
    range.add(areaDef.rightNeighbor);
  }
  return others.filter((p) => range.has(p.area!));
}

export default function App() {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [visualPlayers, setVisualPlayers] = useState<PublicPlayerView[]>([]);
  const [roomsSummary, setRoomsSummary] = useState<RoomSummary[]>([]);
  const [connected, setConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hidePrivate, setHidePrivate] = useState(false);
  const [muted, setMuted] = useState(false);

  // Modal & Tabletop Overlay states
  const [showPromptModal, setShowPromptModal] = useState(true);
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [showCharDetail, setShowCharDetail] = useState(false);
  const [inspectedPlayer, setInspectedPlayer] = useState<PublicPlayerView | null>(null);
  const [inspectedCard, setInspectedCard] = useState<CardInstance | null>(null);
  const [inspectedDeck, setInspectedDeck] = useState<DeckType | null>(null);
  const [inspectedArea, setInspectedArea] = useState<AreaId | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [diceHighlight, setDiceHighlight] = useState(false);

  const [activeCardEvent, setActiveCardEvent] = useState<CardDrawEvent | null>(null);
  const [activeReveal, setActiveReveal] = useState<RevealOverlayData | null>(null);
  const [activeCombatTargetIds, setActiveCombatTargetIds] = useState<Set<string>>(new Set());
  const [damageShakeKey, setDamageShakeKey] = useState(0);
  const [isActionLocked, setIsActionLocked] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const prevLogLenRef = useRef<number>(0);
  const lastDiceSigRef = useRef<string | null>(null);
  const lastCardEventIdRef = useRef<string | null>(null);
  const lastCombatIdRef = useRef<string | null>(null);
  const prevRevealedRef = useRef<Record<string, boolean>>({});
  const visualPlayersRef = useRef<PublicPlayerView[]>([]);
  const prevVisualMyDamageRef = useRef<number | null>(null);

  const promptDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diceHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualStageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const combatTargetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionToken = useMemo(() => getOrCreateSessionToken(), []);

  const commitVisualPlayers = useCallback((players: PublicPlayerView[], myPlayerId: string | null) => {
    const myNext = myPlayerId ? players.find((p) => p.id === myPlayerId) : null;
    if (
      myNext &&
      prevVisualMyDamageRef.current !== null &&
      myNext.damage > prevVisualMyDamageRef.current
    ) {
      setDamageShakeKey((k) => k + 1);
    }
    prevVisualMyDamageRef.current = myNext ? myNext.damage : null;
    visualPlayersRef.current = players;
    setVisualPlayers(players);
  }, []);

  const lockActionsBriefly = useCallback((ms = 650) => {
    if (actionLockTimerRef.current) clearTimeout(actionLockTimerRef.current);
    setIsActionLocked(true);
    actionLockTimerRef.current = setTimeout(() => {
      setIsActionLocked(false);
    }, ms);
  }, []);

  const sendMessage = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      setErrorMsg('サーバーに接続されていません。再接続を待っています...');
    }
  }, []);

  useEffect(() => {
    let closedByCleanup = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        const savedRoom = sessionStorage.getItem('dice_wars_room_code');
        if (savedRoom) {
          ws.send(JSON.stringify({ type: 'RECONNECT', roomCode: savedRoom, sessionToken }));
        }
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as ServerMessage;
          if (data.type === 'ROOM_STATE') {
            const nextState = data.state;
            const d = nextState.lastDice;
            const nextDiceSig = d
              ? d.rollId ?? `${nextState.turn}-${d.purpose}-${d.d6}-${d.d4}-${nextState.logs.length}`
              : null;
            const diceChanged = Boolean(nextDiceSig && nextDiceSig !== lastDiceSigRef.current);
            if (nextDiceSig) {
              lastDiceSigRef.current = nextDiceSig;
            }

            const cardEv = nextState.lastCardEvent ?? null;
            const cardChanged = Boolean(cardEv && cardEv.id !== lastCardEventIdRef.current);
            if (cardEv) {
              lastCardEventIdRef.current = cardEv.id;
            }

            const combatEv = nextState.lastCombatEvent ?? null;
            const combatChanged = Boolean(combatEv && combatEv.id !== lastCombatIdRef.current);
            if (combatEv) {
              lastCombatIdRef.current = combatEv.id;
            }

            setRoom(nextState);
            sessionStorage.setItem('dice_wars_room_code', nextState.roomCode);

            if (nextState.phase === 'LOBBY') {
              lastDiceSigRef.current = null;
              lastCardEventIdRef.current = null;
              lastCombatIdRef.current = null;
              prevRevealedRef.current = {};
              prevVisualMyDamageRef.current = null;
              if (visualStageTimerRef.current) clearTimeout(visualStageTimerRef.current);
              if (combatTargetTimerRef.current) clearTimeout(combatTargetTimerRef.current);
              if (actionLockTimerRef.current) clearTimeout(actionLockTimerRef.current);
              setShowMenu(false);
              setShowAttackModal(false);
              setShowCharDetail(false);
              setInspectedPlayer(null);
              setInspectedCard(null);
              setInspectedDeck(null);
              setInspectedArea(null);
              setDiceHighlight(false);
              setActiveCardEvent(null);
              setActiveReveal(null);
              setActiveCombatTargetIds(new Set());
              setIsActionLocked(false);
              commitVisualPlayers(nextState.players, nextState.myPlayerId);
            } else {
              // Track character identity reveals (false -> true) for physical flip reveal overlay
              for (const p of nextState.players) {
                const wasRevealed = prevRevealedRef.current[p.id];
                if (wasRevealed === false && p.isRevealed && p.character && nextState.phase !== 'GAME_OVER') {
                  setActiveReveal({
                    id: `${p.id}-${nextState.turn}-${Date.now()}`,
                    player: p,
                    character: p.character,
                  });
                }
                prevRevealedRef.current[p.id] = p.isRevealed;
              }

              // Card draw physical flip animation
              if (cardChanged && cardEv) {
                setActiveCardEvent(cardEv);
              }

              // Combat target highlight across boards during attack resolution
              if (combatChanged && combatEv && combatEv.targetIds.length > 0) {
                if (combatTargetTimerRef.current) clearTimeout(combatTargetTimerRef.current);
                setActiveCombatTargetIds(new Set(combatEv.targetIds));
                combatTargetTimerRef.current = setTimeout(() => {
                  setActiveCombatTargetIds(new Set());
                }, 1700);
              }

              // Stage board pawn / damage marker / equipment updates so dice roll & card flight play first
              const prevVisual = visualPlayersRef.current;
              const sameRoster =
                prevVisual.length === nextState.players.length &&
                prevVisual.every((vp, idx) => vp.id === nextState.players[idx]?.id);

              const shouldStageEquip = Boolean(
                cardChanged && cardEv?.isEquipment && cardEv.card && cardEv.playerId === nextState.myPlayerId
              );

              if (visualStageTimerRef.current) clearTimeout(visualStageTimerRef.current);

              if (nextState.phase === 'GAME_OVER' || !sameRoster) {
                commitVisualPlayers(nextState.players, nextState.myPlayerId);
              } else if (diceChanged || shouldStageEquip) {
                const intermediatePlayers = nextState.players.map((np) => {
                  const vp = prevVisual.find((p) => p.id === np.id);
                  if (!vp) return np;
                  const heldEquipment =
                    shouldStageEquip && cardEv?.card && np.id === cardEv.playerId
                      ? np.equipment.filter((eq) => eq.uid !== cardEv.card!.uid)
                      : np.equipment;
                  return {
                    ...np,
                    area: diceChanged ? vp.area : np.area,
                    damage: diceChanged ? vp.damage : np.damage,
                    equipment: heldEquipment,
                  };
                });
                visualPlayersRef.current = intermediatePlayers;
                setVisualPlayers(intermediatePlayers);

                const stageDelay = shouldStageEquip ? 960 : 620;
                visualStageTimerRef.current = setTimeout(() => {
                  commitVisualPlayers(nextState.players, nextState.myPlayerId);
                }, stageDelay);
              } else {
                commitVisualPlayers(nextState.players, nextState.myPlayerId);
              }
            }

            if (diceChanged) {
              setDiceHighlight(true);
              if (diceHighlightTimerRef.current) clearTimeout(diceHighlightTimerRef.current);
              diceHighlightTimerRef.current = setTimeout(() => setDiceHighlight(false), 2200);
            }

            if (nextState.pendingPrompt && nextState.pendingPrompt.playerId === nextState.myPlayerId) {
              if (promptDelayTimerRef.current) clearTimeout(promptDelayTimerRef.current);
              const myCardOverlayPending = Boolean(
                cardChanged && cardEv && cardEv.playerId === nextState.myPlayerId
              );
              if (diceChanged) {
                // Pause briefly so the player sees the rolling dice & piece settle before the modal opens
                setShowPromptModal(false);
                promptDelayTimerRef.current = setTimeout(() => {
                  setShowPromptModal(true);
                }, 1350);
              } else if (myCardOverlayPending) {
                setShowPromptModal(false);
                promptDelayTimerRef.current = setTimeout(() => {
                  setShowPromptModal(true);
                }, 1150);
              } else {
                setShowPromptModal(true);
              }
            }
          } else if (data.type === 'ROOMS_SUMMARY') {
            setRoomsSummary(data.rooms);
          } else if (data.type === 'ERROR') {
            setErrorMsg(data.message);
            setIsActionLocked(false);
          } else if (data.type === 'LEFT_ROOM') {
            sessionStorage.removeItem('dice_wars_room_code');
            lastDiceSigRef.current = null;
            lastCardEventIdRef.current = null;
            lastCombatIdRef.current = null;
            prevRevealedRef.current = {};
            prevVisualMyDamageRef.current = null;
            visualPlayersRef.current = [];
            setVisualPlayers([]);
            setActiveCardEvent(null);
            setActiveReveal(null);
            setActiveCombatTargetIds(new Set());
            setIsActionLocked(false);
            setRoom(null);
          }
        } catch (err) {
          console.error('WS parse error', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closedByCleanup) {
          reconnectTimer = setTimeout(connect, 1500);
        }
      };
    };

    connect();
    return () => {
      closedByCleanup = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (promptDelayTimerRef.current) clearTimeout(promptDelayTimerRef.current);
      if (diceHighlightTimerRef.current) clearTimeout(diceHighlightTimerRef.current);
      if (visualStageTimerRef.current) clearTimeout(visualStageTimerRef.current);
      if (combatTargetTimerRef.current) clearTimeout(combatTargetTimerRef.current);
      if (actionLockTimerRef.current) clearTimeout(actionLockTimerRef.current);
      wsRef.current?.close();
    };
  }, [commitVisualPlayers, sessionToken]);

  // Subtle sound effects on new game logs
  useEffect(() => {
    if (!room) {
      prevLogLenRef.current = 0;
      return;
    }
    if (room.logs.length > prevLogLenRef.current) {
      const latest = room.logs[room.logs.length - 1];
      if (latest) {
        if (latest.tone === 'damage') soundFX.playHit();
        else if (latest.tone === 'heal') soundFX.playHeal();
        else if (latest.tone === 'card') soundFX.playCard();
        else if (latest.tone === 'victory') soundFX.playVictory();
      }
      prevLogLenRef.current = room.logs.length;
    }
  }, [room]);

  const handleCardOverlayComplete = useCallback(() => {
    setActiveCardEvent(null);
  }, []);

  const handleRevealOverlayComplete = useCallback(() => {
    setActiveReveal(null);
  }, []);

  const renderedPlayers = useMemo(() => {
    if (!room) return [];
    return visualPlayers.length === room.players.length ? visualPlayers : room.players;
  }, [room, visualPlayers]);

  const me = useMemo(
    () => room?.players.find((p) => p.id === room.myPlayerId) ?? null,
    [room]
  );

  const renderedMe = useMemo(
    () => renderedPlayers.find((p) => p.id === room?.myPlayerId) ?? me,
    [renderedPlayers, room?.myPlayerId, me]
  );

  const activePlayer = useMemo(
    () => room?.players.find((p) => p.id === room.activePlayerId) ?? null,
    [room]
  );

  const isMyTurn = Boolean(room && room.activePlayerId && room.activePlayerId === room.myPlayerId);

  const attackableTargets = useMemo(() => {
    if (!room || !me || !isMyTurn || room.phase !== 'ATTACK') return [];
    return computeAttackablePlayers(room, me);
  }, [room, me, isMyTurn]);

  const attackTargetIdSet = useMemo(
    () => new Set(attackableTargets.map((t) => t.id)),
    [attackableTargets]
  );

  // Lobby or Entry screen
  if (!room || room.phase === 'LOBBY') {
    return (
      <LobbyScreen
        room={room}
        roomsSummary={roomsSummary}
        connected={connected}
        muted={muted}
        errorMsg={errorMsg}
        onClearError={() => setErrorMsg(null)}
        onToggleMute={() => {
          const next = !muted;
          soundFX.muted = next;
          setMuted(next);
        }}
        onJoinFixedRoom={(roomCode, playerName, maxPlayers) =>
          sendMessage({ type: 'JOIN_FIXED_ROOM', roomCode, playerName, maxPlayers, sessionToken })
        }
        onSetMaxPlayers={(maxPlayers) => sendMessage({ type: 'SET_MAX_PLAYERS', maxPlayers })}
        onAddCpu={() => sendMessage({ type: 'ADD_CPU' })}
        onRemoveCpu={(playerId) => sendMessage({ type: 'REMOVE_CPU', playerId })}
        onStartGame={() => sendMessage({ type: 'START_GAME' })}
        onLeaveRoom={() => sendMessage({ type: 'LEAVE_ROOM' })}
      />
    );
  }

  const latestLog = room.logs[room.logs.length - 1];
  const myPendingPrompt =
    room.pendingPrompt && room.pendingPrompt.playerId === room.myPlayerId
      ? room.pendingPrompt
      : null;

  const highlightDeck: DeckType | null =
    myPendingPrompt?.type === 'CATHEDRAL_DECK_CHOICE'
      ? 'WHITE'
      : myPendingPrompt?.type === 'UNDERGROUND_DECK_CHOICE'
      ? 'BLACK'
      : myPendingPrompt?.type === 'GREEN_TARGET_SELECT'
      ? 'GREEN'
      : null;

  const hasGatling = Boolean(me?.equipment.some((e) => e.effectKey === 'GATLING'));
  const cardDrawer = activeCardEvent
    ? room.players.find((p) => p.id === activeCardEvent.playerId)
    : null;

  return (
    <div
      className="min-h-screen wood-tabletop flex flex-col justify-between overflow-x-hidden relative"
      style={{
        backgroundImage: `radial-gradient(ellipse at 50% 42%, rgba(25, 10, 4, 0.12) 0%, rgba(12, 5, 2, 0.65) 100%), url(${woodTabletopImg})`,
      }}
    >
      {/* Top HUD Bar */}
      <header className="sticky top-0 z-30 w-full px-2 pt-2 sm:px-4 sm:pt-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Turn Badge */}
          <div className="gold-panel rounded-lg px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-1.5 shrink-0">
            <Hourglass className="w-4 h-4 text-amber-300" />
            <span className="text-xs sm:text-sm font-bold text-amber-100 tabular-nums whitespace-nowrap">
              ターン {room.turn}
            </span>
          </div>

          {/* Center Active Player + Action Guidance Plaque */}
          <div
            className={`gold-panel rounded-lg px-2.5 py-1.5 sm:px-4 sm:py-2 flex items-center justify-center gap-2 flex-1 max-w-2xl min-w-0 ${
              isMyTurn ? 'ring-1 ring-[#f2d07b]/80' : ''
            }`}
          >
            {activePlayer && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] sm:text-xs font-extrabold shrink-0 ${
                  isMyTurn
                    ? 'bg-amber-900/75 border-amber-300/80 text-amber-100'
                    : 'bg-black/55 border-[#c59b47]/50 text-amber-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 border border-white/40"
                  style={{ backgroundColor: activePlayer.color.hex }}
                />
                {isMyTurn ? 'あなたの番' : `${activePlayer.name}の番`}
              </span>
            )}
            <Dices className="w-4 h-4 text-amber-300 shrink-0 hidden sm:block" />
            <span className="text-xs sm:text-sm font-bold text-amber-50 truncate">
              {room.guidanceText}
            </span>
          </div>

          {/* Menu Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setShowMenu(true)}
              className="gold-panel min-h-[40px] min-w-[40px] rounded-full flex items-center justify-center text-amber-200 hover:text-white"
              aria-label="メニュー"
              title="メニュー・行動履歴・ルールブック・設定"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Error Toast */}
      {errorMsg && (
        <div className="max-w-md mx-auto mt-2 px-3 w-full">
          <div className="p-2.5 rounded-xl bg-red-950/90 border border-red-400 text-xs text-red-100 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="underline ml-2">
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Main Tabletop Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-1.5 py-2 sm:px-4 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-3 lg:gap-6">
        {/* Board Trio: Mobile 2-col Grid (Damage left, Horizontal Decks + Larger Area Board right), Desktop 3-col Flex */}
        <div className="flex flex-col items-center flex-1 w-full max-w-3xl">
          <div className="w-full grid grid-cols-[86px_minmax(0,1fr)] gap-x-2 gap-y-2 items-center sm:flex sm:flex-row sm:items-center sm:justify-center sm:gap-4 lg:gap-6">
            {/* Left: Damage Board (0-14) */}
            <div className="col-start-1 row-start-1 row-span-2 self-center sm:order-1">
              <DamageBoard
                players={renderedPlayers}
                activePlayerId={room.activePlayerId}
                myPlayerId={room.myPlayerId}
                combatTargetIds={activeCombatTargetIds}
                onSelectPlayer={(p) => {
                  if (isMyTurn && room.phase === 'ATTACK' && attackTargetIdSet.has(p.id)) {
                    setShowAttackModal(true);
                  } else {
                    setInspectedPlayer(p);
                  }
                }}
              />
            </div>

            {/* Mobile Top-Right / Desktop Right: 3 Card Decks (Horizontal Green-White-Black on mobile, Vertical + Roster on sm+) */}
            <div className="col-start-2 row-start-1 flex justify-center sm:order-3 sm:block">
              <CardDecks
                counts={room.deckCounts}
                highlightDeck={highlightDeck}
                onInspectDeck={(deck) => setInspectedDeck(deck)}
                players={renderedPlayers}
                activePlayerId={room.activePlayerId}
                myPlayerId={room.myPlayerId}
                onSelectPlayer={(p) => setInspectedPlayer(p)}
              />
            </div>

            {/* Mobile Lower-Right (enlarged!) / Desktop Center: Pentagon Area Board */}
            <div className="col-start-2 row-start-2 min-w-0 w-full flex flex-col items-center sm:order-2 sm:flex-1">
              <PentagramBoard
                players={renderedPlayers}
                activePlayerId={room.activePlayerId}
                myPlayerId={room.myPlayerId}
                highlightTargetIds={attackTargetIdSet}
                combatTargetIds={activeCombatTargetIds}
                onSelectPlayer={(p) => {
                  if (isMyTurn && room.phase === 'ATTACK' && attackTargetIdSet.has(p.id)) {
                    setShowAttackModal(true);
                  } else {
                    setInspectedPlayer(p);
                  }
                }}
                onSelectArea={(aid) => setInspectedArea(aid)}
              />
            </div>
          </div>

          {/* Below Board: Mobile Bottom-Left (Dice + Calc + Action Log aligned left under DamageBoard) & Bottom-Right (Turn-Order Roster shifted slightly down) */}
          <div className="mt-1.5 sm:mt-2 w-full flex items-start justify-between gap-2 sm:flex-col sm:items-stretch">
            <div className="flex-1 min-w-0 flex flex-col items-start gap-1.5 sm:pl-[132px] lg:pl-[162px]">
              <div className="min-h-[44px] sm:min-h-[52px] flex items-start">
                {room.lastDice && (
                  <DiceDisplay
                    d6={room.lastDice.d6}
                    d4={room.lastDice.d4}
                    purpose={room.lastDice.purpose}
                    rollingKey={room.lastDice.rollId ?? `${room.turn}-${room.logs.length}`}
                    highlight={diceHighlight}
                  />
                )}
              </div>

              {latestLog && (
                <button
                  type="button"
                  onClick={() => setShowMenu(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-[#c59b47]/40 text-[11px] sm:text-xs text-amber-100/90 text-left max-w-full sm:max-w-lg line-clamp-2 sm:truncate hover:border-amber-400"
                >
                  {latestLog.text}
                </button>
              )}

              {inspectedArea && (
                <div className="gold-panel rounded-lg px-3 py-1.5 text-xs text-amber-100 flex items-center gap-2 max-w-full sm:max-w-md">
                  <span className="font-bold text-amber-300 shrink-0">{AREAS[inspectedArea].name}：</span>
                  <span className="min-w-0">{AREAS[inspectedArea].effectSummary}</span>
                  <button
                    type="button"
                    onClick={() => setInspectedArea(null)}
                    className="text-amber-300 underline ml-1 shrink-0"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Only: Turn-Order Players List placed slightly down on bottom-right */}
            <div className="sm:hidden shrink-0 pt-3 w-[104px]">
              <TurnOrderRoster
                players={renderedPlayers}
                activePlayerId={room.activePlayerId}
                myPlayerId={room.myPlayerId}
                onSelectPlayer={(p) => setInspectedPlayer(p)}
              />
            </div>
          </div>
        </div>

        {/* Desktop Sidebar: Public Players Roster & Live Log */}
        <aside className="hidden lg:flex flex-col gap-3 w-80 shrink-0">
          <div className="gold-panel rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-[#c59b47]/40 pb-2">
              <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-300" /> プレイヤー状況（公開情報）
              </span>
              <span className="text-[11px] text-amber-200/70">ルーム {room.roomCode}</span>
            </div>
            <div className="space-y-1.5">
              {renderedPlayers.map((p) => {
                const active = p.id === room.activePlayerId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setInspectedPlayer(p)}
                    className={`w-full p-2 rounded-lg border text-left transition-colors ${
                      active
                        ? 'bg-amber-950/50 border-amber-400'
                        : 'bg-black/35 border-[#c59b47]/25 hover:border-[#c59b47]/60'
                    } ${!p.isAlive ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color.hex }}
                        />
                        {p.name}
                        {p.id === room.myPlayerId ? '（自分）' : ''}
                      </span>
                      <span className="tabular-nums text-amber-200 font-bold shrink-0">
                        {p.isAlive ? `ﾀﾞﾒｰｼﾞ ${p.damage}` : '脱落'}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-100/70 mt-0.5 flex items-center justify-between">
                      <span>
                        {p.isRevealed && p.character
                          ? `${p.character.name} (${getFactionLabel(p.character.faction)})`
                          : '正体不明'}
                      </span>
                      <span>
                        {p.area ? AREAS[p.area].name : '-'} · 装備{p.equipment.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="gold-panel rounded-xl p-3 flex-1 flex flex-col max-h-64">
            <div className="text-xs font-bold text-amber-200 border-b border-[#c59b47]/40 pb-1.5 mb-2">
              対戦ログ
            </div>
            <div className="overflow-y-auto custom-scroll space-y-1.5 pr-1 flex-1">
              {[...room.logs].reverse().slice(0, 20).map((l) => (
                <div key={l.id} className="text-[11px] text-amber-50/85 leading-relaxed">
                  <span className="text-amber-300/70 mr-1">[T{l.turn}]</span>
                  {l.text}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Private Player HUD */}
      <PlayerPanel
        me={renderedMe}
        myPrivate={room.myPrivate}
        phase={room.phase}
        isMyTurn={isMyTurn}
        activePlayerName={activePlayer?.name ?? null}
        pendingPrompt={room.pendingPrompt}
        hidePrivate={hidePrivate}
        damageShakeKey={damageShakeKey}
        isActionLocked={isActionLocked}
        onToggleHidePrivate={() => setHidePrivate((v) => !v)}
        onRollDice={() => {
          if (isActionLocked) return;
          lockActionsBriefly(680);
          soundFX.playDice();
          sendMessage({ type: 'ROLL_MOVE_DICE' });
        }}
        onOpenAttackModal={() => setShowAttackModal(true)}
        onOpenCharacterDetail={() => setShowCharDetail(true)}
        onInspectCard={(card) => setInspectedCard(card)}
        onPromptOpen={() => setShowPromptModal(true)}
        onUseEmmaTeleport={() => {
          if (isActionLocked) return;
          lockActionsBriefly(500);
          sendMessage({ type: 'USE_ABILITY' });
        }}
      />

      {/* Physical Card Draw & Character Reveal Tabletop Overlays */}
      <CardDrawOverlay
        event={activeCardEvent}
        drawerName={cardDrawer?.name ?? 'プレイヤー'}
        isMine={Boolean(activeCardEvent && activeCardEvent.playerId === room.myPlayerId)}
        onComplete={handleCardOverlayComplete}
      />

      <RevealCardOverlay reveal={activeReveal} onComplete={handleRevealOverlayComplete} />

      {/* Interactive Modals */}
      {myPendingPrompt && showPromptModal && (
        <PendingPromptModal
          prompt={myPendingPrompt}
          room={room}
          onRespond={(action, payload) => {
            lockActionsBriefly(500);
            sendMessage({ type: 'RESPOND_PROMPT', action, payload });
          }}
          onCloseMinimize={() => setShowPromptModal(false)}
        />
      )}

      {showAttackModal && isMyTurn && room.phase === 'ATTACK' && (
        <AttackModal
          targets={attackableTargets}
          hasGatling={hasGatling}
          onAttack={(targetId) => {
            if (isActionLocked) return;
            lockActionsBriefly(680);
            soundFX.playDice();
            setShowAttackModal(false);
            sendMessage({ type: 'CHOOSE_ATTACK_TARGET', targetId });
          }}
          onClose={() => setShowAttackModal(false)}
        />
      )}

      {showCharDetail && me && room.myPrivate && (
        <CharacterDetailModal
          me={me}
          myPrivate={room.myPrivate}
          isMyTurn={isMyTurn}
          hasPendingPrompt={Boolean(room.pendingPrompt)}
          onReveal={() => {
            lockActionsBriefly(500);
            sendMessage({ type: 'REVEAL_IDENTITY' });
          }}
          onUseAbility={() => {
            lockActionsBriefly(500);
            sendMessage({ type: 'USE_ABILITY' });
          }}
          onClose={() => setShowCharDetail(false)}
        />
      )}

      {inspectedPlayer && (
        <PublicPlayerModal player={inspectedPlayer} onClose={() => setInspectedPlayer(null)} />
      )}

      {inspectedCard && (
        <CardInspectModal card={inspectedCard} onClose={() => setInspectedCard(null)} />
      )}

      {inspectedDeck && (
        <DeckReferenceModal
          deck={inspectedDeck}
          remaining={room.deckCounts[inspectedDeck]}
          onClose={() => setInspectedDeck(null)}
        />
      )}

      {showMenu && (
        <MenuModal
          room={room}
          logs={room.logs}
          muted={muted}
          onToggleMute={() => {
            const next = !muted;
            soundFX.muted = next;
            setMuted(next);
          }}
          onResetToLobby={() => {
            setShowMenu(false);
            sendMessage({ type: 'RESET_TO_LOBBY' });
          }}
          onLeaveRoom={() => {
            setShowMenu(false);
            sendMessage({ type: 'LEAVE_ROOM' });
          }}
          onClose={() => setShowMenu(false)}
        />
      )}

      {room.phase === 'GAME_OVER' && (
        <VictoryModal
          room={room}
          isHost={Boolean(me?.isHost)}
          onRestart={() => sendMessage({ type: 'RESTART_GAME' })}
          onLeave={() => sendMessage({ type: 'LEAVE_ROOM' })}
        />
      )}
    </div>
  );
}
