import React from 'react';
import { motion } from 'motion/react';
import { Dices, Eye, EyeOff, Shield, Sparkles, Swords } from 'lucide-react';
import { getFactionLabel } from '../data/gameData.ts';
import type { CardInstance, GamePhase, PendingPrompt, PrivatePlayerInfo, PublicPlayerView } from '../types/game.ts';
import { CharacterAvatar } from './CharacterAvatar.tsx';

interface PlayerPanelProps {
  me: PublicPlayerView | null;
  myPrivate: PrivatePlayerInfo | null;
  phase: GamePhase;
  isMyTurn: boolean;
  activePlayerName?: string | null;
  pendingPrompt: PendingPrompt | null;
  hidePrivate: boolean;
  damageShakeKey?: string | number;
  isActionLocked?: boolean;
  onToggleHidePrivate: () => void;
  onRollDice: () => void;
  onOpenAttackModal: () => void;
  onOpenCharacterDetail: () => void;
  onInspectCard: (card: CardInstance) => void;
  onPromptOpen: () => void;
  onUseEmmaTeleport: () => void;
}

function getEquipIcon(effectKey: string): string {
  switch (effectKey) {
    case 'MYSTIC_COMPASS':
      return '🧭';
    case 'SAGE_ROBE':
      return '👘';
    case 'SILVER_ROSARY':
      return '📿';
    case 'RAINBOW_PARASOL':
      return '☂';
    case 'FORTUNE_BROOCH':
      return '💎';
    case 'EXCALIBUR':
      return '🗡';
    case 'GATLING':
      return '⚙';
    case 'CROSSBOW':
      return '🏹';
    case 'HANDGUN_R':
      return '🔫';
    case 'SABER':
      return '⚔';
    case 'REAPER_SCOPE':
      return '🎯';
    default:
      return '📜';
  }
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  me,
  myPrivate,
  phase,
  isMyTurn,
  activePlayerName,
  pendingPrompt,
  hidePrivate,
  damageShakeKey,
  isActionLocked = false,
  onToggleHidePrivate,
  onRollDice,
  onOpenAttackModal,
  onOpenCharacterDetail,
  onInspectCard,
  onPromptOpen,
  onUseEmmaTeleport,
}) => {
  if (!me || !myPrivate) return null;

  const char = myPrivate.character;
  const remainingHp = Math.max(0, char.maxHp - me.damage);
  const hpPercent = Math.round((remainingHp / char.maxHp) * 100);
  const factionBadge =
    char.faction === 'CITIZEN'
      ? 'from-purple-800 via-purple-900 to-purple-950 border-purple-300 text-purple-100'
      : char.faction === 'RAIDER'
      ? 'from-blue-700 via-blue-900 to-blue-950 border-sky-300 text-sky-100'
      : 'from-red-700 via-red-900 to-red-950 border-rose-300 text-rose-100';

  const barGradient =
    hpPercent > 50
      ? 'from-emerald-400 to-emerald-600'
      : hpPercent > 25
      ? 'from-amber-400 to-amber-600'
      : 'from-red-400 to-red-700';

  const hasMyPrompt = pendingPrompt && pendingPrompt.playerId === me.id;
  const canEmmaTeleport =
    isMyTurn &&
    phase === 'MOVE_ROLL' &&
    !pendingPrompt &&
    char.id === 'emma' &&
    me.isRevealed &&
    !me.abilityDisabled &&
    me.area !== null &&
    me.area !== 'airship';

  const slotCount = Math.max(4, me.equipment.length);

  return (
    <div className="w-full max-w-4xl mx-auto px-1.5 pb-1.5 sm:px-4 sm:pb-3.5 relative z-20">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-3">
        {/* Left: Leather & Antique Gold Character Sheet with restrained damage shudder & clear turn emphasis */}
        <motion.div
          key={`hud-${damageShakeKey ?? 0}`}
          initial={damageShakeKey ? { x: 0 } : false}
          animate={damageShakeKey ? { x: [0, -5, 5, -3, 2, 0] } : { x: 0 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className={`leather-hud-panel rounded-xl sm:rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:gap-3.5 flex-1 min-w-0 relative transition-colors ${
            isMyTurn ? 'ring-2 ring-[#ecd07d]/85' : ''
          }`}
        >
          {/* Decorative Corner Rivets */}
          <span className="pointer-events-none absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#dfba64]/75" />
          <span className="pointer-events-none absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#dfba64]/75" />
          <span className="pointer-events-none absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-[#dfba64]/75" />
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#dfba64]/75" />

          {/* Active Turn Brass Corner Plaque */}
          {isMyTurn && (
            <span className="pointer-events-none absolute -top-2 left-3 sm:left-4 px-1.5 sm:px-2 py-[1px] rounded bg-gradient-to-b from-[#f0cf7b] to-[#b58732] border border-[#241608] text-[8.5px] sm:text-[9px] font-black text-[#1a1005] shadow">
              あなたの手番
            </span>
          )}

          {/* Character Medallion + Faction Crest */}
          <button
            type="button"
            onClick={onOpenCharacterDetail}
            className="relative flex flex-col items-center shrink-0 group focus:outline-none"
            title="キャラクター詳細・勝利条件を確認"
          >
            <div className="relative rounded-full p-0.5 bg-gradient-to-b from-[#f6dc93] to-[#8a6522] shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
              <CharacterAvatar
                character={hidePrivate ? null : char}
                size={56}
                className="w-11 h-11 sm:w-14 sm:h-14"
              />
              {!me.isAlive && (
                <div className="absolute inset-0 rounded-full bg-black/80 flex items-center justify-center text-[10px] font-bold text-red-300">
                  脱落
                </div>
              )}
            </div>
            <span
              className={`relative z-10 mt-0.5 sm:mt-1 px-1.5 sm:px-2.5 py-[1px] sm:py-0.5 rounded-sm border text-[9px] sm:text-[10px] font-extrabold bg-gradient-to-b shadow-md whitespace-nowrap ${
                hidePrivate ? 'from-slate-800 to-slate-950 border-slate-500 text-slate-200' : factionBadge
              }`}
            >
              {hidePrivate ? '非表示中' : getFactionLabel(char.faction)}
            </span>
          </button>

          {/* Character Name, HP Gauge, Status (synchronized with DamageBoard marker motion) */}
          <div className="flex flex-col justify-center min-w-[84px] sm:min-w-[126px]">
            <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={onOpenCharacterDetail}
                className="font-display-serif text-xs sm:text-base font-extrabold text-amber-100 hover:text-amber-300 truncate text-left drop-shadow"
              >
                {hidePrivate ? '自分（非公開）' : char.name}
              </button>
              <button
                type="button"
                onClick={onToggleHidePrivate}
                className="p-1 rounded text-amber-300/80 hover:text-amber-100 hover:bg-white/10"
                title={hidePrivate ? '正体を表示する' : '正体を一時的に隠す（覗き見防止）'}
              >
                {hidePrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-300/85">HP</span>
              <span className="text-sm sm:text-lg font-black tabular-nums text-white leading-none drop-shadow">
                {hidePrivate ? '? / ?' : `${remainingHp} / ${char.maxHp}`}
              </span>
            </div>

            <div className="w-full h-2 sm:h-2.5 rounded-full bg-[#090808] border border-[#c99e48]/70 overflow-hidden mt-0.5 sm:mt-1 shadow-inner">
              <div
                className={`h-full bg-gradient-to-r ${barGradient} transition-all duration-500 ease-out`}
                style={{ width: hidePrivate ? '100%' : `${hpPercent}%` }}
              />
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1 text-[9.5px] sm:text-[10px] text-amber-200/80 font-medium">
              <span>{me.isRevealed ? '正体公開中' : '正体非公開'}</span>
              {(me.guardianAngelActive || me.eimiShieldActive) && (
                <span className="inline-flex items-center gap-0.5 text-sky-300 font-bold">
                  <Shield className="w-3 h-3" /> 防御
                </span>
              )}
            </div>
          </div>

          {/* Physical Equipment Cards Tray */}
          <div className="flex-1 min-w-0 border-l border-[#c99e48]/35 pl-2 sm:pl-3">
            <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1">
              <span className="text-[9.5px] sm:text-xs font-bold text-amber-200 whitespace-nowrap">
                装備（{me.equipment.length}）
              </span>
              <button
                type="button"
                onClick={onOpenCharacterDetail}
                className="text-[9.5px] sm:text-xs font-bold text-sky-300 hover:text-sky-200 underline underline-offset-2 whitespace-nowrap"
              >
                能力・勝利
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5">
              {Array.from({ length: slotCount }).map((_, idx) => {
                const eq = me.equipment[idx];
                if (!eq) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="w-8 h-[42px] sm:w-11 sm:h-14 rounded-md border border-dashed border-[#c99e48]/35 bg-black/45 shrink-0 flex items-center justify-center text-[9px] sm:text-[10px] text-amber-400/35 shadow-inner"
                    >
                      空
                    </div>
                  );
                }
                return (
                  <motion.button
                    key={eq.uid}
                    type="button"
                    initial={{ scale: 0.72, y: -12, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => onInspectCard(eq)}
                    title={`${eq.name}: ${eq.description}`}
                    className={`w-8 h-[42px] sm:w-11 sm:h-14 rounded-md shrink-0 flex flex-col items-center justify-center p-0.5 sm:p-1 transition-transform hover:-translate-y-0.5 active:scale-95 ${
                      eq.deck === 'WHITE' ? 'parchment-card text-amber-950' : 'obsidian-card text-amber-100'
                    }`}
                  >
                    <span className="text-xs sm:text-base leading-none drop-shadow">
                      {getEquipIcon(eq.effectKey)}
                    </span>
                    <span className="text-[7.5px] sm:text-[8px] font-extrabold leading-tight mt-0.5 sm:mt-1 truncate w-full text-center">
                      {eq.name.slice(0, 4)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Right: Sculpted Action Plaque Button(s) */}
        <div className="flex sm:flex-col gap-1.5 sm:gap-2 shrink-0 sm:w-[184px]">
          {hasMyPrompt ? (
            <button
              type="button"
              disabled={isActionLocked}
              onClick={onPromptOpen}
              className="gold-button flex-1 min-h-[42px] sm:min-h-[50px] px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-extrabold text-amber-50 flex items-center justify-center gap-2 whitespace-nowrap ring-1 ring-amber-300/75 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
              選択を実行する
            </button>
          ) : isMyTurn && phase === 'MOVE_ROLL' && me.isAlive ? (
            <>
              <button
                type="button"
                disabled={isActionLocked}
                onClick={onRollDice}
                className="gold-button flex-1 min-h-[42px] sm:min-h-[50px] px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-extrabold text-amber-50 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
              >
                <Dices className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
                ダイスを振る
              </button>
              {canEmmaTeleport && (
                <button
                  type="button"
                  disabled={isActionLocked}
                  onClick={onUseEmmaTeleport}
                  className="px-3 py-2 rounded-xl bg-gradient-to-b from-indigo-800 to-indigo-950 border-2 border-[#c99e48] text-xs font-extrabold text-amber-100 hover:brightness-110 shadow-md whitespace-nowrap disabled:opacity-60"
                >
                  テレポート移動
                </button>
              )}
            </>
          ) : isMyTurn && phase === 'ATTACK' && me.isAlive ? (
            <button
              type="button"
              disabled={isActionLocked}
              onClick={onOpenAttackModal}
              className="crimson-button flex-1 min-h-[42px] sm:min-h-[50px] px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-extrabold text-amber-50 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
            >
              <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
              攻撃・ターン終了
            </button>
          ) : (
            <div className="gold-panel flex-1 min-h-[42px] sm:min-h-[50px] px-3 py-1.5 sm:py-2 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold text-amber-200/85 text-center">
              {!me.isAlive
                ? '観戦中（脱落）'
                : activePlayerName
                ? `${activePlayerName} の番`
                : '他プレイヤーの番です'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
