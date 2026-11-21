export type Faction = 'CITIZEN' | 'RAIDER' | 'SHADOW';

export type AreaId =
  | 'detective'
  | 'cathedral'
  | 'underground'
  | 'city_hall'
  | 'thieves_guild'
  | 'airship';

export type DeckType = 'GREEN' | 'WHITE' | 'BLACK';

export type GamePhase =
  | 'LOBBY'
  | 'TURN_START'
  | 'MOVE_ROLL'
  | 'AREA_ACTION'
  | 'ATTACK'
  | 'GAME_OVER';

export interface CharacterDef {
  id: string;
  name: string;
  kana: string;
  faction: Faction;
  maxHp: number;
  boardCode: string;
  abilityName: string;
  abilityDesc: string;
  abilityType: 'ACTIVE_ONCE' | 'PASSIVE' | 'TRIGGER';
  winConditionDesc: string;
  accentColor: string;
}

export interface CardDef {
  id: string;
  deck: DeckType;
  name: string;
  isEquipment: boolean;
  description: string;
  effectKey: string;
  countInDeck: number;
}

export interface CardInstance {
  uid: string;
  cardId: string;
  deck: DeckType;
  name: string;
  isEquipment: boolean;
  description: string;
  effectKey: string;
}

export type PendingPromptType =
  | 'MYSTIC_COMPASS_CHOICE'
  | 'EMMA_MOVE_CHOICE'
  | 'CATHEDRAL_DECK_CHOICE'
  | 'UNDERGROUND_DECK_CHOICE'
  | 'CITY_HALL_CHOICE'
  | 'THIEVES_GUILD_STEAL'
  | 'GREEN_TARGET_SELECT'
  | 'GREEN_ULRICH_BLUFF'
  | 'GREEN_EQUIPMENT_GIVE_OR_DISCARD'
  | 'CARD_TARGET_SELECT'
  | 'REAPERS_SCOPE_REROLL'
  | 'BYRON_ROBBERY_CHOICE'
  | 'WALPURGIS_COUNTERATTACK'
  | 'CRAIG_SECOND_ATTACK'
  | 'ACTIVE_ABILITY_TARGET';

export interface PendingPrompt {
  type: PendingPromptType;
  playerId: string;
  title: string;
  description: string;
  card?: CardInstance;
  diceOptionA?: { d6: number; d4: number; total: number; area: AreaId };
  diceOptionB?: { d6: number; d4: number; total: number; area: AreaId };
  targetPlayerIds?: string[];
  adjacentAreas?: AreaId[];
  attackContext?: {
    targetIds: string[];
    d6: number;
    d4: number;
    rawDamage: number;
    canReroll: boolean;
  };
  robberyContext?: {
    targetId: string;
    damage: number;
  };
  greenContext?: {
    sourcePlayerId: string;
    targetPlayerId: string;
    card: CardInstance;
    mode: 'GIVE_TO_SOURCE' | 'DISCARD';
  };
  abilityId?: string;
}

export interface PlayerColorTheme {
  id: string;
  label: string;
  hex: string;
  ring: string;
}

export interface PublicPlayerView {
  id: string;
  seatIndex: number;
  name: string;
  isHost: boolean;
  isCpu: boolean;
  connected: boolean;
  color: PlayerColorTheme;
  area: AreaId | null;
  damage: number;
  isAlive: boolean;
  isRevealed: boolean;
  equipment: CardInstance[];
  character: CharacterDef | null; // null if unrevealed
  guardianAngelActive: boolean;
  eimiShieldActive: boolean;
  abilityDisabled: boolean;
  usedOnceAbility: boolean;
  angelaDirection: 'RIGHT' | 'LEFT';
}

export interface PrivatePlayerInfo {
  playerId: string;
  character: CharacterDef;
  peekedPlayers: Record<string, CharacterDef>; // playerId -> CharacterDef (from Green Card #20 or Watchdog)
  drawnGreenCard: CardInstance | null; // temporarily held while choosing target
  receivedGreenCard: CardInstance | null; // temporarily shown to target
}

export interface LogEntry {
  id: string;
  turn: number;
  timestamp: number;
  text: string;
  tone: 'info' | 'damage' | 'heal' | 'card' | 'reveal' | 'victory';
}

export interface CardDrawEvent {
  id: string;
  deck: DeckType;
  playerId: string;
  card: CardInstance | null; // null if GREEN card viewed by non-drawer
  isEquipment: boolean;
  mode: 'EQUIP' | 'SINGLE_USE' | 'GREEN_SECRET';
}

export interface CombatEvent {
  id: string;
  attackerId: string;
  targetIds: string[];
}

export interface RoomView {
  roomCode: string;
  maxPlayers: 4 | 5 | 6;
  phase: GamePhase;
  turn: number;
  activePlayerId: string | null;
  players: PublicPlayerView[];
  myPlayerId: string | null;
  myPrivate: PrivatePlayerInfo | null;
  lastDice: {
    rollId?: string;
    d6: number;
    d4: number;
    total: number;
    purpose: 'MOVE' | 'ATTACK' | 'EFFECT';
  } | null;
  lastCardEvent?: CardDrawEvent | null;
  lastCombatEvent?: CombatEvent | null;
  deckCounts: {
    GREEN: number;
    WHITE: number;
    BLACK: number;
  };
  pendingPrompt: PendingPrompt | null; // sanitized: sensitive card text hidden unless playerId === myPlayerId
  logs: LogEntry[];
  winners: {
    playerId: string;
    name: string;
    character: CharacterDef;
    reason: string;
  }[];
  enabledCharacterIds: string[];
  guidanceText: string;
}

export interface RoomSummary {
  roomCode: string;
  playerCount: number;
  maxPlayers: 4 | 5 | 6;
  phase: GamePhase;
}

export type ClientMessage =
  | {
      type: 'CREATE_ROOM';
      playerName: string;
      maxPlayers: 4 | 5 | 6;
      sessionToken: string;
      enabledCharacterIds?: string[];
    }
  | { type: 'JOIN_ROOM'; roomCode: string; playerName: string; sessionToken: string }
  | {
      type: 'JOIN_FIXED_ROOM';
      roomCode: string;
      playerName: string;
      maxPlayers: 4 | 5 | 6;
      sessionToken: string;
      enabledCharacterIds?: string[];
    }
  | { type: 'SET_MAX_PLAYERS'; maxPlayers: 4 | 5 | 6 }
  | { type: 'SET_ENABLED_CHARACTERS'; characterIds: string[] }
  | { type: 'RECONNECT'; roomCode: string; sessionToken: string }
  | { type: 'ADD_CPU' }
  | { type: 'REMOVE_CPU'; playerId: string }
  | { type: 'START_GAME' }
  | { type: 'RESTART_GAME' }
  | { type: 'RESET_TO_LOBBY' }
  | { type: 'LEAVE_ROOM' }
  | { type: 'ROLL_MOVE_DICE' }
  | { type: 'REVEAL_IDENTITY' }
  | { type: 'USE_ABILITY'; targetId?: string }
  | { type: 'SWITCH_ANGELA_DIRECTION' }
  | { type: 'CHOOSE_ATTACK_TARGET'; targetId: string | null }
  | { type: 'RESPOND_PROMPT'; action: string; payload?: Record<string, unknown> };

export type ServerMessage =
  | { type: 'ROOM_STATE'; state: RoomView }
  | { type: 'ROOMS_SUMMARY'; rooms: RoomSummary[] }
  | { type: 'ERROR'; message: string }
  | { type: 'LEFT_ROOM' };
