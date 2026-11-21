import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  Check,
  Copy,
  Crown,
  DoorOpen,
  Download,
  Hash,
  HelpCircle,
  LogOut,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Shuffle,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CHARACTERS } from '../data/gameData.ts';
import type { Faction, RoomSummary, RoomView } from '../types/game.ts';
import { CharacterAvatar } from './CharacterAvatar.tsx';
import { RulebookContent } from './RulebookContent.tsx';

interface LobbyScreenProps {
  room: RoomView | null;
  roomsSummary: RoomSummary[];
  connected: boolean;
  muted: boolean;
  errorMsg: string | null;
  onClearError: () => void;
  onToggleMute: () => void;
  onJoinFixedRoom: (
    roomCode: string,
    playerName: string,
    maxPlayers: 4 | 5 | 6,
    enabledCharacterIds: string[]
  ) => void;
  onSetMaxPlayers: (maxPlayers: 4 | 5 | 6) => void;
  onSetEnabledCharacters: (characterIds: string[]) => void;
  onAddCpu: () => void;
  onRemoveCpu: (playerId: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const ALL_CHARACTER_IDS = CHARACTERS.map((c) => c.id);

const FACTION_GROUPS: {
  faction: Faction;
  title: string;
  badgeClass: string;
  borderClass: string;
}[] = [
  {
    faction: 'RAIDER',
    title: 'レイダー陣営',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
    borderClass: 'border-sky-500/30',
  },
  {
    faction: 'SHADOW',
    title: 'シャドウ陣営',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-400/40',
    borderClass: 'border-red-500/30',
  },
  {
    faction: 'CITIZEN',
    title: 'シチズン陣営',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
    borderClass: 'border-purple-500/30',
  },
];

const DEFAULT_ROOMS: RoomSummary[] = Array.from({ length: 10 }, (_, i) => ({
  roomCode: String(i + 1).padStart(2, '0'),
  playerCount: 0,
  maxPlayers: 5,
  phase: 'LOBBY',
}));

const CrestEmblem: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80"
    className="rounded-xl shadow-[0_6px_18px_rgba(0,0,0,0.65)] shrink-0"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="crest-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e222d" />
        <stop offset="100%" stopColor="#0b0c10" />
      </linearGradient>
      <linearGradient id="crest-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f6dc93" />
        <stop offset="50%" stopColor="#c59b47" />
        <stop offset="100%" stopColor="#856321" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="76" height="76" rx="14" fill="url(#crest-bg)" stroke="url(#crest-gold)" strokeWidth="2.5" />
    <rect x="7" y="7" width="66" height="66" rx="10" fill="none" stroke="url(#crest-gold)" strokeWidth="0.9" strokeOpacity="0.55" />
    {/* Crossed Swords */}
    <path d="M20,60 L58,22 M54,18 L62,26 M24,56 L18,62" stroke="#d8b35a" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M60,60 L22,22 M26,18 L18,26 M56,56 L62,62" stroke="#d8b35a" strokeWidth="2.5" strokeLinecap="round" />
    {/* Center Shield + Pentagram Accent */}
    <path d="M40,18 L56,26 L53,48 L40,61 L27,48 L24,26 Z" fill="#141822" stroke="url(#crest-gold)" strokeWidth="2" />
    <polygon
      points="40,26 43.5,35 53,35.5 45.5,41 48,50 40,45 32,50 34.5,41 27,35.5 36.5,35"
      fill="#d8b35a"
      opacity="0.9"
    />
  </svg>
);

const CornerBrackets: React.FC = () => (
  <>
    <span className="pointer-events-none absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#c59b47]/70" />
    <span className="pointer-events-none absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#c59b47]/70" />
    <span className="pointer-events-none absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#c59b47]/70" />
    <span className="pointer-events-none absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#c59b47]/70" />
  </>
);

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  room,
  roomsSummary,
  connected,
  muted,
  errorMsg,
  onClearError,
  onToggleMute,
  onJoinFixedRoom,
  onSetMaxPlayers,
  onSetEnabledCharacters,
  onAddCpu,
  onRemoveCpu,
  onStartGame,
  onLeaveRoom,
}) => {
  const initialRoomParam = useMemo(() => {
    if (typeof window === 'undefined') return '01';
    const raw = new URLSearchParams(window.location.search).get('room') ?? '';
    const padded = raw.trim().padStart(2, '0');
    return /^0[1-9]|10$/.test(padded) ? padded : '01';
  }, []);

  const [playerName, setPlayerName] = useState<string>('アーサー');
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>(initialRoomParam);
  const [maxPlayers, setMaxPlayers] = useState<4 | 5 | 6>(5);
  const [localEnabledCharacterIds, setLocalEnabledCharacterIds] = useState<string[]>(ALL_CHARACTER_IDS);
  const [copied, setCopied] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsWarning, setSettingsWarning] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  const handleDownloadZip = async () => {
    if (downloadingZip) return;
    setDownloadingZip(true);
    setZipError(null);
    try {
      const res = await fetch(`/api/download-source.zip?t=${Date.now()}`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      if (bytes.length < 100 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
        throw new Error('受信したZIPデータが空または不正です');
      }
      const blob = new Blob([bytes], { type: 'application/zip' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'dice-wars-source.zip';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    } catch (err) {
      console.error('ZIP download failed:', err);
      setZipError('ZIPファイルの取得に失敗しました。もう一度お試しください。');
    } finally {
      setDownloadingZip(false);
    }
  };

  const roomsList = roomsSummary.length === 10 ? roomsSummary : DEFAULT_ROOMS;
  const selectedRoomSummary =
    roomsList.find((r) => r.roomCode === selectedRoomCode) ?? DEFAULT_ROOMS[0];

  const activeRoomDisplayCode = room ? room.roomCode : selectedRoomCode;
  const headerCountText = room
    ? `${room.players.length}/${room.maxPlayers}`
    : `${selectedRoomSummary.playerCount}/${selectedRoomSummary.maxPlayers}`;

  const effectiveMaxPlayers: 4 | 5 | 6 = room ? room.maxPlayers : maxPlayers;
  const effectiveEnabledIds = room ? room.enabledCharacterIds : localEnabledCharacterIds;
  const enabledIdSet = useMemo(() => new Set(effectiveEnabledIds), [effectiveEnabledIds]);

  const meInRoom = room ? room.players.find((p) => p.id === room.myPlayerId) ?? null : null;
  const isHostInRoom = meInRoom?.isHost ?? false;
  const canEditSettings = room ? isHostInRoom : selectedRoomSummary.playerCount === 0;

  const requiredCitizens = effectiveMaxPlayers === 6 ? 2 : effectiveMaxPlayers === 5 ? 1 : 0;
  const enabledRaiderCount = CHARACTERS.filter(
    (c) => c.faction === 'RAIDER' && enabledIdSet.has(c.id)
  ).length;
  const enabledShadowCount = CHARACTERS.filter(
    (c) => c.faction === 'SHADOW' && enabledIdSet.has(c.id)
  ).length;
  const enabledCitizenCount = CHARACTERS.filter(
    (c) => c.faction === 'CITIZEN' && enabledIdSet.has(c.id)
  ).length;

  const entryPoolNeedsCitizen =
    !room && selectedRoomSummary.playerCount === 0 && enabledCitizenCount < requiredCitizens;

  const applyNewEnabledIds = (nextIds: string[]) => {
    if (room) {
      if (!isHostInRoom) return;
      onSetEnabledCharacters(nextIds);
    } else {
      setLocalEnabledCharacterIds(nextIds);
    }
  };

  const handleToggleCharacter = (charId: string) => {
    if (!canEditSettings) return;
    setSettingsWarning(null);
    const char = CHARACTERS.find((c) => c.id === charId);
    if (!char) return;

    const currentlyChecked = enabledIdSet.has(charId);
    if (currentlyChecked) {
      if (char.faction === 'RAIDER' && enabledRaiderCount <= 2) {
        setSettingsWarning('レイダーは最低2人以上選択されている必要があります。');
        return;
      }
      if (char.faction === 'SHADOW' && enabledShadowCount <= 2) {
        setSettingsWarning('シャドウは最低2人以上選択されている必要があります。');
        return;
      }
      if (char.faction === 'CITIZEN' && enabledCitizenCount <= requiredCitizens) {
        setSettingsWarning(
          `${effectiveMaxPlayers}人戦ではシチズンは最低${requiredCitizens}人以上必要です。`
        );
        return;
      }
      const next = effectiveEnabledIds.filter((id) => id !== charId);
      applyNewEnabledIds(next);
    } else {
      const nextSet = new Set(effectiveEnabledIds);
      nextSet.add(charId);
      const canonical = CHARACTERS.filter((c) => nextSet.has(c.id)).map((c) => c.id);
      applyNewEnabledIds(canonical);
    }
  };

  const handleSelectAllCharacters = () => {
    if (!canEditSettings) return;
    setSettingsWarning(null);
    applyNewEnabledIds(ALL_CHARACTER_IDS);
  };

  const openSettingsModal = () => {
    setSettingsWarning(null);
    setShowSettingsModal(true);
  };

  const handleCopyInvite = () => {
    const url = `${window.location.origin}/?room=${activeRoomDisplayCode}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleRandomRoom = () => {
    const available = roomsList.filter((r) => r.phase === 'LOBBY' && r.playerCount < r.maxPlayers);
    const pool = available.length > 0 ? available : roomsList;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSelectedRoomCode(pick.roomCode);
  };

  const renderRoomStatusBadge = (r: RoomSummary) => {
    if (r.phase !== 'LOBBY') return '対戦中';
    if (r.playerCount === 0) return '空';
    return `${r.playerCount}/${r.maxPlayers}`;
  };

  const HeaderBar = (
    <header className="w-full bg-[#111216]/95 border-b border-[#c59b47]/25 px-3 sm:px-6 py-2.5 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Emblem + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <CrestEmblem size={38} />
          <div className="min-w-0">
            <div className="font-display-serif text-base sm:text-lg font-extrabold text-[#e2bc62] leading-tight truncate">
              ダイスウォーズ
            </div>
            <div className="text-[11px] text-amber-200/65 truncate">
              正体隠匿 × 飛行船バトル
            </div>
          </div>
        </div>

        {/* Right: 招待, 人数, 設定, ルール, 音量 */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyInvite}
            className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#191a20] border border-[#c59b47]/55 text-xs font-bold text-[#e2bc62] hover:bg-[#24262e] flex items-center gap-1.5 whitespace-nowrap"
            title={`部屋 #${activeRoomDisplayCode} の招待リンクをコピー`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'コピー済' : '招待'}</span>
          </button>

          <div
            className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#191a20] border border-[#343742] text-xs font-bold text-amber-100 tabular-nums flex items-center gap-1.5 whitespace-nowrap"
            title="参加人数"
          >
            <Users className="w-3.5 h-3.5 text-amber-200/75" />
            <span>{headerCountText}</span>
          </div>

          <button
            type="button"
            onClick={openSettingsModal}
            className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-[#191a20] border border-[#c59b47]/45 hover:border-[#e2bc62] text-amber-100 flex items-center justify-center gap-1 text-xs font-bold whitespace-nowrap"
            aria-label="マッチング設定"
            title="マッチング設定（出現キャラ）"
          >
            <Settings className="w-4 h-4 text-[#e2bc62]" />
            <span className="hidden sm:inline">設定</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-xl bg-[#191a20] border border-[#343742] hover:border-[#c59b47]/60 text-amber-100 flex items-center justify-center gap-1 text-xs font-bold whitespace-nowrap"
            aria-label="ルールと役職一覧"
            title="ルール・役職一覧"
          >
            <BookOpen className="w-4 h-4 text-[#e2bc62]" />
            <span className="hidden sm:inline">ルール</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-[#191a20] border border-[#343742] hover:border-[#c59b47]/60 text-amber-100 flex items-center justify-center"
            aria-label={muted ? '効果音をオンにする' : '効果音をオフにする'}
            title={muted ? '効果音 OFF' : '効果音 ON'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>
    </header>
  );

  const RulesAndCharsModal = showRulesModal ? (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-[#14151a] border border-[#c59b47]/60 rounded-t-2xl sm:rounded-2xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#c59b47]/35 bg-[#101115]">
          <h3 className="text-base font-bold text-[#e2bc62]">掟と役職一覧（ダイスウォーズ）</h3>
          <button
            type="button"
            onClick={() => setShowRulesModal(false)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-amber-200/80 hover:text-white"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scroll">
          <RulebookContent />
        </div>
      </div>
    </div>
  ) : null;

  const CharacterSettingsModal = showSettingsModal ? (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-[#14151a] border border-[#c59b47]/65 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#c59b47]/35 bg-[#101115]">
          <div className="flex items-center gap-2 min-w-0">
            <Settings className="w-4 h-4 text-[#e2bc62] shrink-0" />
            <h3 className="text-base font-bold text-[#e2bc62] truncate">
              マッチング設定（出現キャラクター）
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowSettingsModal(false)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-amber-200/80 hover:text-white"
            aria-label="設定を閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary & Controls */}
        <div className="px-4 py-3 border-b border-[#c59b47]/20 bg-[#0e0f13] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-amber-100/90">
              チェックが入っているキャラの中から試合開始時にランダムで配られます。
            </div>
            {canEditSettings && (
              <button
                type="button"
                onClick={handleSelectAllCharacters}
                disabled={effectiveEnabledIds.length === CHARACTERS.length}
                className="px-3 py-1.5 rounded-lg bg-[#1c1e26] border border-[#c59b47]/50 hover:bg-[#252833] text-xs font-bold text-[#e2bc62] flex items-center gap-1.5 disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                すべて選択（全16人）
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded-md bg-[#191b22] border border-[#c59b47]/40 text-[#e2bc62]">
              有効：{effectiveEnabledIds.length} / {CHARACTERS.length} 人
            </span>
            <span className="px-2.5 py-1 rounded-md bg-sky-950/50 border border-sky-400/35 text-sky-200">
              レイダー {enabledRaiderCount}/5（最低2）
            </span>
            <span className="px-2.5 py-1 rounded-md bg-red-950/50 border border-red-400/35 text-red-200">
              シャドウ {enabledShadowCount}/5（最低2）
            </span>
            <span className="px-2.5 py-1 rounded-md bg-purple-950/50 border border-purple-400/35 text-purple-200">
              シチズン {enabledCitizenCount}/6（{requiredCitizens > 0 ? `最低${requiredCitizens}` : '4人戦不要'}）
            </span>
          </div>

          {!canEditSettings && (
            <div className="px-3 py-2 rounded-lg bg-amber-950/50 border border-amber-400/35 text-xs text-amber-200">
              {room
                ? '※登場キャラクター設定はホストのみ変更できます（現在は確認専用です）。'
                : '※すでにプレイヤーが入室中の部屋に参加するため、部屋側の設定が適用されます。'}
            </div>
          )}

          {settingsWarning && (
            <div className="px-3 py-2 rounded-lg bg-red-950/75 border border-red-400/60 text-xs text-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
              <span>{settingsWarning}</span>
            </div>
          )}
        </div>

        {/* Character Checkbox List */}
        <div className="p-4 overflow-y-auto custom-scroll space-y-4">
          {FACTION_GROUPS.map((group) => {
            const chars = CHARACTERS.filter((c) => c.faction === group.faction);
            return (
              <section key={group.faction} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${group.badgeClass}`}
                  >
                    {group.title}（{chars.filter((c) => enabledIdSet.has(c.id)).length}/{chars.length}）
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {chars.map((char) => {
                    const checked = enabledIdSet.has(char.id);
                    return (
                      <label
                        key={char.id}
                        className={`relative flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                          canEditSettings ? 'cursor-pointer' : 'cursor-default'
                        } ${
                          checked
                            ? `bg-[#191b22] ${group.borderClass} hover:border-[#e2bc62]/65`
                            : 'bg-[#0f1014] border-[#262831] opacity-55'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canEditSettings}
                          onChange={() => handleToggleCharacter(char.id)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            checked
                              ? 'bg-[#d9b45a] border-[#f6dc93] text-[#141519]'
                              : 'bg-[#0b0c0f] border-[#4b5060] text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>

                        <CharacterAvatar character={char} size={40} className="shrink-0" />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-sm font-bold text-amber-50 truncate">
                              {char.name}
                            </span>
                            <span className="text-[11px] font-bold text-amber-200/75 tabular-nums shrink-0">
                              HP {char.maxHp}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#e2bc62] font-semibold truncate">
                            {char.abilityName}
                          </div>
                          <p className="text-[11px] text-slate-300/85 line-clamp-2 leading-snug mt-0.5">
                            {char.abilityDesc}
                          </p>
                          {!checked && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-red-950/70 border border-red-400/40 text-[10px] font-bold text-red-200">
                              この試合では配られません
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#c59b47]/30 bg-[#101115] flex items-center justify-between gap-3">
          <span className="text-[11px] text-amber-200/70">
            チェックを外したキャラはこの試合で配られなくなります
          </span>
          <button
            type="button"
            onClick={() => setShowSettingsModal(false)}
            className="px-5 py-2 rounded-xl bg-[#d9b45a] hover:bg-[#e5c26b] text-[#141519] text-xs sm:text-sm font-extrabold shrink-0"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Waiting Room inside Room 01-10
  if (room) {
    const me = room.players.find((p) => p.id === room.myPlayerId);
    const isHost = me?.isHost ?? false;
    const canStart = room.players.length === room.maxPlayers;
    const enabledCount = room.enabledCharacterIds.length;

    return (
      <div className="min-h-screen bg-[#0c0d10] bg-[radial-gradient(ellipse_at_top,rgba(197,155,71,0.08),transparent_65%)] flex flex-col">
        {HeaderBar}

        <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-xl bg-[#131418] border border-[#c59b47]/45 rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xl">
            <CornerBrackets />

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c59b47]/25 pb-4">
              <div>
                <div className="text-xs font-bold text-[#d8b35a]">待機ロビー</div>
                <h1 className="font-display-serif text-2xl font-extrabold text-amber-100">
                  部屋 #{room.roomCode} 号室
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isHost && (
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0c0d10] border border-[#c59b47]/35">
                    {([4, 5, 6] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={room.players.length > n}
                        onClick={() => onSetMaxPlayers(n)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors disabled:opacity-40 ${
                          room.maxPlayers === n ? 'bg-[#d9b45a] text-[#141519]' : 'text-amber-100'
                        }`}
                      >
                        {n}人戦
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={openSettingsModal}
                  className="px-3 py-2 rounded-lg bg-[#1b1d24] border border-[#c59b47]/55 hover:bg-[#252833] text-xs font-bold text-[#e2bc62] flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>設定（{enabledCount}/{CHARACTERS.length}）</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/75 border border-red-400/60 flex items-center justify-between text-xs text-red-100">
                <span>{errorMsg}</span>
                <button type="button" onClick={onClearError} className="underline ml-2">
                  閉じる
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200/80 bg-[#0d0e12] px-3.5 py-2.5 rounded-xl border border-[#c59b47]/25">
              <span className="font-bold text-amber-100">
                参加人数：{room.players.length} / {room.maxPlayers} 人
              </span>
              <span>
                レイダー2 · シャドウ2 · {room.maxPlayers === 4 ? 'シチズンなし' : `シチズン${room.maxPlayers === 6 ? 2 : 1}`}
                {enabledCount < CHARACTERS.length && (
                  <span className="ml-2 text-[#e2bc62] font-bold">
                    · 出現キャラ {enabledCount}/{CHARACTERS.length}
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Array.from({ length: room.maxPlayers }).map((_, idx) => {
                const p = room.players[idx];
                if (!p) {
                  return (
                    <div
                      key={`seat-${idx}`}
                      className="p-3 rounded-xl border border-dashed border-[#c59b47]/30 bg-[#0d0e12]/70 flex items-center justify-between min-h-[58px]"
                    >
                      <span className="text-xs text-amber-200/45">空席（参加待ち）</span>
                      {isHost && (
                        <button
                          type="button"
                          onClick={onAddCpu}
                          className="px-2.5 py-1.5 rounded-lg bg-[#1d2028] border border-[#c59b47]/45 text-xs font-bold text-[#e2bc62] hover:bg-[#262a34] flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> CPU追加
                        </button>
                      )}
                    </div>
                  );
                }
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-[#c59b47]/50 bg-[#191b22] flex items-center justify-between min-h-[58px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 border border-amber-200"
                        style={{ backgroundColor: p.color.hex }}
                      >
                        {p.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                          {p.name}
                          {p.isHost && <Crown className="w-3.5 h-3.5 text-[#e2bc62] shrink-0" />}
                          {p.isCpu && <Bot className="w-3.5 h-3.5 text-sky-300 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-amber-200/70">
                          {p.id === room.myPlayerId ? 'あなた' : p.isCpu ? 'CPU' : p.connected ? '接続中' : '切断中'}
                        </div>
                      </div>
                    </div>
                    {isHost && p.isCpu && (
                      <button
                        type="button"
                        onClick={() => onRemoveCpu(p.id)}
                        className="p-2 rounded-lg text-red-300 hover:bg-red-950/60"
                        title="CPUを削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={onLeaveRoom}
                className="py-3 px-4 rounded-xl bg-[#1b1d23] border border-[#343742] text-sm font-bold text-amber-100 flex items-center justify-center gap-1.5 hover:bg-[#242730]"
              >
                <LogOut className="w-4 h-4" />
                部屋を出る
              </button>

              {isHost ? (
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={onStartGame}
                  className="flex-1 min-h-[48px] py-3 px-5 rounded-xl bg-[#d9b45a] hover:bg-[#e5c26b] text-[#141519] text-base font-extrabold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Play className="w-5 h-5" />
                  {canStart ? 'ゲームを開始する' : `あと ${room.maxPlayers - room.players.length} 人必要です`}
                </button>
              ) : (
                <div className="flex-1 min-h-[48px] py-3 px-4 rounded-xl bg-[#0d0e12] border border-[#c59b47]/25 flex items-center justify-center text-sm font-semibold text-[#e2bc62]">
                  ホストの開始を待っています...
                </div>
              )}
            </div>
          </div>
        </main>

        {RulesAndCharsModal}
        {CharacterSettingsModal}
      </div>
    );
  }

  // Title / Matching Screen
  return (
    <div className="min-h-screen bg-[#0c0d10] bg-[radial-gradient(ellipse_at_top,rgba(197,155,71,0.09),transparent_65%)] flex flex-col justify-between">
      {HeaderBar}

      <main className="flex-1 flex flex-col items-center justify-center px-3 py-5 sm:px-6 sm:py-8 gap-4">
        <div className="relative w-full max-w-[520px] bg-[#131418] border border-[#c59b47]/45 rounded-2xl px-5 py-6 sm:px-8 sm:py-8 space-y-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <CornerBrackets />

          {/* Crest & Display Title */}
          <div className="flex flex-col items-center text-center space-y-2">
            <CrestEmblem size={68} />
            <h1 className="font-display-serif text-3xl sm:text-4xl font-extrabold text-[#e2bc62] tracking-wider pt-1">
              ダイスウォーズ
            </h1>
            <div className="text-xs sm:text-sm font-medium text-[#b9984c] tracking-[0.18em]">
              – 影と光と飛行船の心理戦 –
            </div>
            <p className="text-xs text-amber-100/70 leading-relaxed pt-1">
              正体隠匿 × 陣営サバイバル × 飛行船バトル
              <br />
              レイダー・シャドウ・シチズンの騙し合いを制し、勝利を掴め。
            </p>
          </div>

          {!connected && (
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/45 text-center text-xs text-amber-200">
              サーバーへ接続中...
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/75 border border-red-400/60 flex items-center justify-between text-xs text-red-100">
              <span>{errorMsg}</span>
              <button type="button" onClick={onClearError} className="underline ml-2 shrink-0">
                閉じる
              </button>
            </div>
          )}

          {/* Player Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="player-name-input" className="block text-xs font-bold text-[#d8b35a]">
              あなたの名前
            </label>
            <input
              id="player-name-input"
              type="text"
              maxLength={12}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="名前を入力"
              className="w-full h-12 px-4 rounded-xl bg-[#0c0d10] border border-[#c59b47]/35 text-sm font-medium text-amber-50 placeholder:text-slate-500 focus:outline-none focus:border-[#e2bc62]"
            />
          </div>

          {/* Room Number Selection (01 - 10) */}
          <div className="rounded-xl bg-[#0e0f13] border border-[#c59b47]/30 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-[#d8b35a] flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                部屋番号の選択（01〜10）
              </span>
              <button
                type="button"
                onClick={handleRandomRoom}
                className="text-xs font-bold text-[#d8b35a] hover:text-[#f3d485] flex items-center gap-1 underline underline-offset-4"
              >
                <Shuffle className="w-3.5 h-3.5" />
                ランダム
              </button>
            </div>

            {/* Selected Room Status Strip */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#090a0d] border border-[#c59b47]/25 text-xs">
              <span className="text-amber-100/70">選択中の部屋：</span>
              <div className="flex items-center gap-2 font-bold text-amber-100 tabular-nums">
                <span className="text-amber-200/60">#</span>
                <span className="px-2.5 py-0.5 rounded bg-[#191b22] border border-[#c59b47]/65 text-white">
                  {selectedRoomCode}
                </span>
                <span className="text-amber-100/80">号室</span>
                <span className="text-amber-200/70">{renderRoomStatusBadge(selectedRoomSummary)}</span>
              </div>
            </div>

            {/* 4 vs 5 vs 6 Player Mode Selector + Matching Settings when creating/entering an empty room */}
            {selectedRoomSummary.playerCount === 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-amber-100/70">対戦人数設定：</span>
                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-[#16181f] border border-[#343742]">
                    {([4, 5, 6] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxPlayers(n)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                          maxPlayers === n ? 'bg-[#d9b45a] text-[#141519]' : 'text-amber-100/80'
                        }`}
                      >
                        {n}人戦
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-amber-100/70">登場キャラ設定：</span>
                  <button
                    type="button"
                    onClick={openSettingsModal}
                    className="px-3 py-1.5 rounded-lg bg-[#16181f] border border-[#c59b47]/55 hover:border-[#e2bc62] hover:bg-[#1e212b] text-xs font-bold text-[#e2bc62] flex items-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>設定（{localEnabledCharacterIds.length}/{CHARACTERS.length}人）</span>
                  </button>
                </div>

                {entryPoolNeedsCitizen && (
                  <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-400/50 text-[11px] text-amber-200 flex items-center justify-between gap-2">
                    <span>
                      {maxPlayers}人戦ではシチズンが最低{requiredCitizens}人必要です。
                    </span>
                    <button
                      type="button"
                      onClick={openSettingsModal}
                      className="underline font-bold text-[#f3d485] shrink-0"
                    >
                      設定を開く
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] text-amber-100/65">番号をタップして選択：</div>

            {/* 5x2 Grid of Rooms 01-10 */}
            <div className="grid grid-cols-5 gap-2">
              {roomsList.map((r) => {
                const isSelected = r.roomCode === selectedRoomCode;
                return (
                  <button
                    key={r.roomCode}
                    type="button"
                    onClick={() => setSelectedRoomCode(r.roomCode)}
                    className={`min-h-[54px] rounded-xl border flex flex-col items-center justify-center transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#d9b45a] text-[#141519] border-[#f6dc93] shadow-[0_0_14px_rgba(217,180,90,0.35)]'
                        : 'bg-[#1a1c22] text-amber-50 border-[#2e313b] hover:border-[#c59b47]/65'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-extrabold tabular-nums">
                      #{r.roomCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold mt-0.5 ${
                        isSelected
                          ? 'text-[#141519]/80'
                          : r.phase !== 'LOBBY'
                          ? 'text-red-300'
                          : r.playerCount > 0
                          ? 'text-emerald-300'
                          : 'text-amber-200/50'
                      }`}
                    >
                      {renderRoomStatusBadge(r)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Join Room CTA */}
          <button
            type="button"
            disabled={!connected || entryPoolNeedsCitizen}
            onClick={() =>
              onJoinFixedRoom(
                selectedRoomCode,
                playerName || 'アーサー',
                maxPlayers,
                localEnabledCharacterIds
              )
            }
            className="w-full min-h-[52px] rounded-xl bg-[#d9b45a] hover:bg-[#e5c26b] active:scale-[0.99] text-[#141519] font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-45"
          >
            <DoorOpen className="w-5 h-5" />
            <span>部屋 #{selectedRoomCode} に参加する</span>
          </button>

          {/* Bottom Card Links */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="text-[#d8b35a] hover:text-[#f3d485] flex items-center gap-1.5 underline underline-offset-4 font-medium"
            >
              <HelpCircle className="w-4 h-4" />
              <span>掟と役職一覧</span>
            </button>

            <button
              type="button"
              onClick={openSettingsModal}
              className="text-[#d8b35a] hover:text-[#f3d485] flex items-center gap-1.5 underline underline-offset-4 font-medium"
            >
              <Settings className="w-4 h-4" />
              <span>設定</span>
            </button>
          </div>
        </div>

        {/* Bottom ZIP Download Button */}
        <div className="w-full max-w-[520px] flex flex-col items-center gap-2 pb-2">
          <button
            type="button"
            disabled={downloadingZip}
            onClick={handleDownloadZip}
            className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-xl bg-[#16181f] border border-[#c59b47]/55 hover:border-[#e2bc62] hover:bg-[#1e212b] disabled:opacity-60 text-xs sm:text-sm font-bold text-[#e2bc62] flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <Download className={`w-4 h-4 ${downloadingZip ? 'animate-bounce' : ''}`} />
            <span>{downloadingZip ? 'ZIPを作成中...' : 'ZIPファイルをダウンロード'}</span>
          </button>
          {zipError && (
            <p className="text-xs text-red-300 bg-red-950/70 border border-red-400/50 rounded-lg px-3 py-1.5">
              {zipError}
            </p>
          )}
        </div>
      </main>

      {RulesAndCharsModal}
      {CharacterSettingsModal}
    </div>
  );
};
