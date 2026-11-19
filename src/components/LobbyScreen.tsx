import React, { useMemo, useState } from 'react';
import {
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
  Shuffle,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { RoomSummary, RoomView } from '../types/game.ts';
import { RulebookContent } from './RulebookContent.tsx';

interface LobbyScreenProps {
  room: RoomView | null;
  roomsSummary: RoomSummary[];
  connected: boolean;
  muted: boolean;
  errorMsg: string | null;
  onClearError: () => void;
  onToggleMute: () => void;
  onJoinFixedRoom: (roomCode: string, playerName: string, maxPlayers: 4 | 5 | 6) => void;
  onSetMaxPlayers: (maxPlayers: 4 | 5 | 6) => void;
  onAddCpu: () => void;
  onRemoveCpu: (playerId: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

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
  const [copied, setCopied] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
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
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
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

        {/* Right: 招待, 人数, ルール, 音量 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyInvite}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#191a20] border border-[#c59b47]/55 text-xs font-bold text-[#e2bc62] hover:bg-[#24262e] flex items-center gap-1.5 whitespace-nowrap"
            title={`部屋 #${activeRoomDisplayCode} の招待リンクをコピー`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'コピー済' : '招待'}</span>
          </button>

          <div
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#191a20] border border-[#343742] text-xs font-bold text-amber-100 tabular-nums flex items-center gap-1.5 whitespace-nowrap"
            title="参加人数"
          >
            <Users className="w-3.5 h-3.5 text-amber-200/75" />
            <span>{headerCountText}</span>
          </div>

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

  // Waiting Room inside Room 01-10
  if (room) {
    const me = room.players.find((p) => p.id === room.myPlayerId);
    const isHost = me?.isHost ?? false;
    const canStart = room.players.length === room.maxPlayers;

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
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/75 border border-red-400/60 flex items-center justify-between text-xs text-red-100">
                <span>{errorMsg}</span>
                <button type="button" onClick={onClearError} className="underline ml-2">
                  閉じる
                </button>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-amber-200/80 bg-[#0d0e12] px-3.5 py-2.5 rounded-xl border border-[#c59b47]/25">
              <span className="font-bold text-amber-100">
                参加人数：{room.players.length} / {room.maxPlayers} 人
              </span>
              <span>
                レイダー2 · シャドウ2 · {room.maxPlayers === 4 ? 'シチズンなし' : `シチズン${room.maxPlayers === 6 ? 2 : 1}`}
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
      </div>
    );
  }

  // Title Screen (matching reference image_724ed436.png)
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

            {/* 4 vs 5 vs 6 Player Mode Selector when creating/entering an empty room */}
            {selectedRoomSummary.playerCount === 0 && (
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
            disabled={!connected}
            onClick={() => onJoinFixedRoom(selectedRoomCode, playerName || 'アーサー', maxPlayers)}
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
            <span className="text-amber-100/50">4〜6人オンライン対戦</span>
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
    </div>
  );
};
