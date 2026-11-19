import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Eye,
  LogOut,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AREAS, BLACK_CARD_DEFS, GREEN_CARD_DEFS, WHITE_CARD_DEFS, getFactionLabel } from '../data/gameData.ts';
import type {
  AreaId,
  CardInstance,
  DeckType,
  LogEntry,
  PendingPrompt,
  PrivatePlayerInfo,
  PublicPlayerView,
  RoomView,
} from '../types/game.ts';
import { CharacterAvatar } from './CharacterAvatar.tsx';
import { RulebookContent } from './RulebookContent.tsx';

interface ModalBackdropProps {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
}

const ModalBackdrop: React.FC<ModalBackdropProps> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
    <div className="gold-panel w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[88vh] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#c59b47]/50 bg-[#141a28]">
        <h3 className="text-base sm:text-lg font-bold text-amber-200 truncate">{title}</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-amber-200/80 hover:text-white hover:bg-white/10"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="p-4 overflow-y-auto custom-scroll space-y-3">{children}</div>
    </div>
  </div>
);

interface PendingPromptModalProps {
  prompt: PendingPrompt;
  room: RoomView;
  onRespond: (action: string, payload?: Record<string, unknown>) => void;
  onCloseMinimize: () => void;
}

export const PendingPromptModal: React.FC<PendingPromptModalProps> = ({
  prompt,
  room,
  onRespond,
  onCloseMinimize,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>(prompt.targetPlayerIds?.[0] ?? '');
  const [selectedEquip, setSelectedEquip] = useState<string>('');
  const me = room.players.find((p) => p.id === room.myPlayerId);

  const getPlayer = (id: string) => room.players.find((p) => p.id === id);

  return (
    <ModalBackdrop title={prompt.title} onClose={onCloseMinimize}>
      {room.lastDice && (
        <div className="px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-400/55 flex items-center justify-between text-xs font-bold text-amber-100 tabular-nums">
          <span>直前のダイス結果</span>
          <span className="text-amber-300">
            {room.lastDice.purpose === 'ATTACK'
              ? `6面[${room.lastDice.d6}] − 4面[${room.lastDice.d4}] = ダメージ ${room.lastDice.total}`
              : room.lastDice.purpose === 'EFFECT'
              ? `出目：${room.lastDice.d6}`
              : `6面[${room.lastDice.d6}] ＋ 4面[${room.lastDice.d4}] ＝ 合計 ${room.lastDice.total}`}
          </span>
        </div>
      )}

      <p className="text-sm text-amber-50/95 leading-relaxed">{prompt.description}</p>

      {prompt.card && (
        <div
          className={`p-3 rounded-xl border ${
            prompt.card.deck === 'GREEN'
              ? 'bg-emerald-950/60 border-emerald-500/60'
              : prompt.card.deck === 'WHITE'
              ? 'bg-amber-50/10 border-amber-300/60'
              : 'bg-stone-900/80 border-red-400/50'
          }`}
        >
          <div className="text-xs font-bold text-amber-300 mb-1">{prompt.card.name}</div>
          <div className="text-sm text-white leading-relaxed">{prompt.card.description}</div>
        </div>
      )}

      {prompt.type === 'MYSTIC_COMPASS_CHOICE' && prompt.diceOptionA && prompt.diceOptionB && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {[
            { key: 'CHOOSE_A', opt: prompt.diceOptionA, label: '結果A' },
            { key: 'CHOOSE_B', opt: prompt.diceOptionB, label: '結果B' },
          ].map(({ key, opt, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onRespond(key)}
              className="gold-button p-3 rounded-xl text-left flex flex-col gap-1"
            >
              <span className="text-xs text-amber-300 font-bold">
                {label}：{opt.d6} + {opt.d4} = {opt.total}
              </span>
              <span className="text-base font-bold text-white">{AREAS[opt.area].name}</span>
              <span className="text-xs text-amber-100/80">{AREAS[opt.area].effectSummary}</span>
            </button>
          ))}
        </div>
      )}

      {prompt.type === 'EMMA_MOVE_CHOICE' && prompt.adjacentAreas && (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {prompt.adjacentAreas.map((aid) => (
            <button
              key={aid}
              type="button"
              onClick={() => onRespond('CHOOSE', { area: aid })}
              className="gold-button p-3 rounded-xl text-center"
            >
              <div className="text-base font-bold text-white">{AREAS[aid].name}</div>
              <div className="text-xs text-amber-200/80 mt-1">{AREAS[aid].effectSummary}</div>
            </button>
          ))}
        </div>
      )}

      {prompt.type === 'CATHEDRAL_DECK_CHOICE' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onRespond('GREEN')}
            className="p-3.5 rounded-xl bg-emerald-900/80 border border-emerald-400/70 text-left hover:bg-emerald-800/80"
          >
            <div className="text-sm font-bold text-emerald-100">推理カード（緑）を引く</div>
            <div className="text-xs text-emerald-200/80 mt-1">相手の正体を探る（残 {room.deckCounts.GREEN}枚）</div>
          </button>
          <button
            type="button"
            onClick={() => onRespond('WHITE')}
            className="p-3.5 rounded-xl bg-amber-100/90 border border-amber-400 text-left hover:bg-amber-50 text-amber-950"
          >
            <div className="text-sm font-bold">白カードを引く</div>
            <div className="text-xs opacity-80 mt-1">回復や防御装備を得る（残 {room.deckCounts.WHITE}枚）</div>
          </button>
          <button
            type="button"
            onClick={() => onRespond('SKIP')}
            className="sm:col-span-2 py-2.5 rounded-lg bg-slate-800/80 border border-slate-600 text-xs font-semibold text-slate-200"
          >
            カードを引かずに進む
          </button>
        </div>
      )}

      {prompt.type === 'UNDERGROUND_DECK_CHOICE' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onRespond('GREEN')}
            className="p-3.5 rounded-xl bg-emerald-900/80 border border-emerald-400/70 text-left hover:bg-emerald-800/80"
          >
            <div className="text-sm font-bold text-emerald-100">推理カード（緑）を引く</div>
            <div className="text-xs text-emerald-200/80 mt-1">相手の正体を探る（残 {room.deckCounts.GREEN}枚）</div>
          </button>
          <button
            type="button"
            onClick={() => onRespond('BLACK')}
            className="p-3.5 rounded-xl bg-stone-900 border border-red-400/70 text-left hover:bg-stone-800"
          >
            <div className="text-sm font-bold text-amber-100">黒カードを引く</div>
            <div className="text-xs text-amber-200/75 mt-1">強力な武器や妨害効果（残 {room.deckCounts.BLACK}枚）</div>
          </button>
          <button
            type="button"
            onClick={() => onRespond('SKIP')}
            className="sm:col-span-2 py-2.5 rounded-lg bg-slate-800/80 border border-slate-600 text-xs font-semibold text-slate-200"
          >
            カードを引かずに進む
          </button>
        </div>
      )}

      {prompt.type === 'CITY_HALL_CHOICE' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onRespond('HEAL')}
            className="w-full p-3 rounded-xl bg-emerald-900/80 border border-emerald-400/70 text-sm font-bold text-emerald-50 hover:bg-emerald-800"
          >
            自分のダメージを 1 回復する（現在ダメージ：{me?.damage ?? 0}）
          </button>

          <div className="border-t border-[#c59b47]/30 pt-2">
            <div className="text-xs font-bold text-amber-200 mb-2">または、他のプレイヤー1人に 2 ダメージ：</div>
            <div className="grid grid-cols-2 gap-2">
              {prompt.targetPlayerIds?.map((tid) => {
                const t = getPlayer(tid);
                if (!t) return null;
                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => onRespond('DAMAGE', { targetId: tid })}
                    className="p-2.5 rounded-lg bg-red-950/75 border border-red-400/60 hover:bg-red-900/80 text-left"
                  >
                    <div className="text-sm font-bold text-white truncate">{t.name}</div>
                    <div className="text-[11px] text-red-200">現在ダメージ {t.damage}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {(prompt.type === 'THIEVES_GUILD_STEAL' ||
        prompt.type === 'GREEN_TARGET_SELECT' ||
        prompt.type === 'CARD_TARGET_SELECT' ||
        prompt.type === 'ACTIVE_ABILITY_TARGET') && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prompt.targetPlayerIds?.map((tid) => {
              const t = getPlayer(tid);
              if (!t) return null;
              const isSelected = selectedTarget === tid;
              return (
                <button
                  key={tid}
                  type="button"
                  onClick={() => {
                    setSelectedTarget(tid);
                    setSelectedEquip(t.equipment[0]?.uid ?? '');
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'bg-amber-900/50 border-amber-300 ring-1 ring-amber-300'
                      : 'bg-slate-900/75 border-slate-700 hover:border-amber-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{t.name}</span>
                    <span className="text-xs text-amber-200/80">
                      {t.area ? AREAS[t.area].name : '未配置'} · ﾀﾞﾒｰｼﾞ {t.damage}
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-100/75 mt-1">
                    {t.isRevealed && t.character ? `${t.character.name}（${getFactionLabel(t.character.faction)}）` : '正体不明'}
                    {t.equipment.length > 0 ? ` · 装備 ${t.equipment.length}枚` : ''}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Specific Equipment selector for Steal */}
          {(prompt.type === 'THIEVES_GUILD_STEAL' || prompt.card?.effectKey === 'HENCHMAN') &&
            selectedTarget &&
            (getPlayer(selectedTarget)?.equipment.length ?? 0) > 1 && (
              <div className="p-2.5 rounded-lg bg-black/40 border border-amber-500/40 space-y-1.5">
                <div className="text-xs font-bold text-amber-200">奪う装備を選択：</div>
                <div className="flex flex-wrap gap-1.5">
                  {getPlayer(selectedTarget)?.equipment.map((eq) => (
                    <button
                      key={eq.uid}
                      type="button"
                      onClick={() => setSelectedEquip(eq.uid)}
                      className={`px-2.5 py-1.5 rounded text-xs font-bold border ${
                        selectedEquip === eq.uid
                          ? 'bg-amber-500 text-slate-950 border-amber-200'
                          : 'bg-slate-800 text-amber-100 border-slate-600'
                      }`}
                    >
                      {eq.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Specific Equipment selector for Banana Peel */}
          {prompt.card?.effectKey === 'BANANA_PEEL' && (me?.equipment.length ?? 0) > 1 && (
            <div className="p-2.5 rounded-lg bg-black/40 border border-amber-500/40 space-y-1.5">
              <div className="text-xs font-bold text-amber-200">渡す自分の装備を選択：</div>
              <div className="flex flex-wrap gap-1.5">
                {me?.equipment.map((eq) => (
                  <button
                    key={eq.uid}
                    type="button"
                    onClick={() => setSelectedEquip(eq.uid)}
                    className={`px-2.5 py-1.5 rounded text-xs font-bold border ${
                      selectedEquip === eq.uid
                        ? 'bg-amber-500 text-slate-950 border-amber-200'
                        : 'bg-slate-800 text-amber-100 border-slate-600'
                    }`}
                  >
                    {eq.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedTarget}
            onClick={() =>
              onRespond('SELECT', {
                targetId: selectedTarget,
                equipUid: selectedEquip || undefined,
              })
            }
            className="gold-button w-full min-h-[46px] rounded-xl text-sm font-bold text-white disabled:opacity-45"
          >
            決定する
          </button>
        </div>
      )}

      {prompt.type === 'GREEN_ULRICH_BLUFF' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onRespond('TRUTH')}
            className="gold-button p-3 rounded-xl text-sm font-bold text-white"
          >
            正直に判定を受ける
          </button>
          <button
            type="button"
            onClick={() => onRespond('BLUFF')}
            className="crimson-button p-3 rounded-xl text-sm font-bold text-white"
          >
            嘘をつく（効果なしにする）
          </button>
        </div>
      )}

      {prompt.type === 'GREEN_EQUIPMENT_GIVE_OR_DISCARD' && me && (
        <div className="space-y-2">
          {me.equipment.map((eq) => (
            <button
              key={eq.uid}
              type="button"
              onClick={() => onRespond('SELECT', { equipUid: eq.uid })}
              className="w-full p-3 rounded-xl bg-slate-900 border border-amber-400/60 text-left hover:bg-slate-800"
            >
              <div className="text-sm font-bold text-amber-200">{eq.name}</div>
              <div className="text-xs text-slate-300 mt-0.5">{eq.description}</div>
            </button>
          ))}
        </div>
      )}

      {prompt.type === 'REAPERS_SCOPE_REROLL' && prompt.attackContext && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onRespond('REROLL_D6')}
            className="gold-button p-3 rounded-xl text-xs font-bold text-white"
          >
            6面ダイスを振り直す（現在 {prompt.attackContext.d6}）
          </button>
          <button
            type="button"
            onClick={() => onRespond('REROLL_D4')}
            className="gold-button p-3 rounded-xl text-xs font-bold text-white"
          >
            4面ダイスを振り直す（現在 {prompt.attackContext.d4}）
          </button>
          <button
            type="button"
            onClick={() => onRespond('KEEP')}
            className="p-3 rounded-xl bg-slate-800 border border-slate-500 text-xs font-bold text-amber-100"
          >
            このまま確定（{prompt.attackContext.rawDamage}ダメージ）
          </button>
        </div>
      )}

      {prompt.type === 'BYRON_ROBBERY_CHOICE' && prompt.robberyContext && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onRespond('STEAL')}
            className="gold-button p-3 rounded-xl text-sm font-bold text-white"
          >
            装備を1枚奪う（ダメージなし）
          </button>
          <button
            type="button"
            onClick={() => onRespond('DAMAGE')}
            className="crimson-button p-3 rounded-xl text-sm font-bold text-white"
          >
            そのまま {prompt.robberyContext.damage} ダメージを与える
          </button>
        </div>
      )}

      {prompt.type === 'WALPURGIS_COUNTERATTACK' && (
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onRespond('COUNTER')}
            className="crimson-button p-3 rounded-xl text-sm font-bold text-white"
          >
            反撃する！
          </button>
          <button
            type="button"
            onClick={() => onRespond('SKIP')}
            className="p-3 rounded-xl bg-slate-800 border border-slate-600 text-sm font-bold text-slate-200"
          >
            反撃しない
          </button>
        </div>
      )}

      {prompt.type === 'CRAIG_SECOND_ATTACK' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            {prompt.targetPlayerIds?.map((tid) => {
              const t = getPlayer(tid);
              if (!t) return null;
              return (
                <button
                  key={tid}
                  type="button"
                  onClick={() => onRespond('ATTACK', { targetId: tid })}
                  className="crimson-button p-2.5 rounded-xl text-left"
                >
                  <div className="text-sm font-bold text-white">{t.name} を攻撃</div>
                  <div className="text-[11px] text-amber-200">現在ダメージ {t.damage}</div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => onRespond('SKIP')}
            className="w-full py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-xs font-bold text-slate-200"
          >
            追加攻撃せずにターン終了
          </button>
        </div>
      )}
    </ModalBackdrop>
  );
};

interface AttackModalProps {
  targets: PublicPlayerView[];
  hasGatling: boolean;
  onAttack: (targetId: string | null) => void;
  onClose: () => void;
}

export const AttackModal: React.FC<AttackModalProps> = ({
  targets,
  hasGatling,
  onAttack,
  onClose,
}) => {
  const [confirmTarget, setConfirmTarget] = useState<PublicPlayerView | null>(null);

  return (
    <ModalBackdrop title="攻撃フェイズ" onClose={onClose}>
      {confirmTarget ? (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-400/60 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-50 leading-relaxed">
              {hasGatling
                ? '「ガトリング」装備中のため、攻撃範囲内の全プレイヤーに攻撃ダイスを振ります。実行しますか？'
                : `${confirmTarget.name} に攻撃します。よろしいですか？`}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              className="py-3 rounded-xl bg-slate-800 border border-slate-600 text-sm font-bold text-slate-200"
            >
              戻る
            </button>
            <button
              type="button"
              onClick={() => onAttack(confirmTarget.id)}
              className="crimson-button py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5"
            >
              <Swords className="w-4 h-4" />
              攻撃を実行
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs sm:text-sm text-amber-100/85">
            {hasGatling
              ? 'ガトリング効果で範囲内の全員を同時に攻撃します。基準となる相手をタップしてください。'
              : '攻撃可能なプレイヤーを選択してください（6面と4面ダイスの差がダメージになります）。'}
          </p>

          <div className="grid grid-cols-1 gap-2">
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setConfirmTarget(t)}
                className="p-3 rounded-xl bg-slate-900/85 border border-red-400/50 hover:border-red-300 flex items-center justify-between text-left"
              >
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: t.color.hex }}
                    />
                    {t.name}
                    {t.isRevealed && t.character && (
                      <span className="text-xs text-amber-300 font-normal">
                        （{t.character.name}）
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-amber-200/75 mt-0.5">
                    場所：{t.area ? AREAS[t.area].name : '-'} · ダメージ：{t.damage}
                    {t.equipment.length > 0 ? ` · 装備 ${t.equipment.length}枚` : ''}
                  </div>
                </div>
                <Swords className="w-5 h-5 text-red-400 shrink-0" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onAttack(null)}
            className="w-full py-3 rounded-xl bg-slate-800/90 border border-slate-600 text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            攻撃せずにターンを終了する
          </button>
        </div>
      )}
    </ModalBackdrop>
  );
};

interface CharacterDetailModalProps {
  me: PublicPlayerView;
  myPrivate: PrivatePlayerInfo;
  isMyTurn: boolean;
  hasPendingPrompt: boolean;
  onReveal: () => void;
  onUseAbility: () => void;
  onClose: () => void;
}

export const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  me,
  myPrivate,
  isMyTurn,
  hasPendingPrompt,
  onReveal,
  onUseAbility,
  onClose,
}) => {
  const [confirmAction, setConfirmAction] = useState<'REVEAL' | 'ABILITY' | null>(null);
  const char = myPrivate.character;
  const peekedList = Object.entries(myPrivate.peekedPlayers);

  const canUseActiveAbility =
    isMyTurn &&
    me.isAlive &&
    !me.abilityDisabled &&
    !hasPendingPrompt &&
    ['alice', 'angela', 'eimi', 'felix', 'freddy', 'gordon', 'allister'].includes(char.id) &&
    !(char.id !== 'allister' && me.usedOnceAbility);

  return (
    <ModalBackdrop title="あなたのキャラクター情報（非公開）" onClose={onClose}>
      <div className="flex items-center gap-3.5">
        <CharacterAvatar character={char} size={74} className="shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-bold text-amber-300">
            {getFactionLabel(char.faction)} · ボード記号 {char.boardCode}
          </div>
          <div className="text-xl font-extrabold text-white">{char.name}</div>
          <div className="text-sm text-amber-100 tabular-nums">
            残りHP：{Math.max(0, char.maxHp - me.damage)} / {char.maxHp}（累計ダメージ {me.damage}）
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-black/45 border border-[#c59b47]/45 space-y-1">
        <div className="text-xs font-bold text-amber-300">勝利条件</div>
        <p className="text-sm text-amber-50 leading-relaxed">{char.winConditionDesc}</p>
        {char.id === 'angela' && (
          <p className="text-xs text-purple-300 mt-1">
            現在の指定対象：{me.angelaDirection === 'RIGHT' ? '右隣' : '左隣'}のプレイヤー
          </p>
        )}
      </div>

      <div className="p-3 rounded-xl bg-black/45 border border-[#c59b47]/45 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-300">特殊能力：{char.abilityName}</span>
          {me.abilityDisabled && <span className="text-xs font-bold text-red-400">封印済み</span>}
        </div>
        <p className="text-sm text-amber-50 leading-relaxed">{char.abilityDesc}</p>
      </div>

      {peekedList.length > 0 && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/45 space-y-1.5">
          <div className="text-xs font-bold text-emerald-300 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> 秘密裏に確認したプレイヤーの正体
          </div>
          {peekedList.map(([pid, c]) => (
            <div key={pid} className="text-xs text-emerald-100">
              ・{c.name}（{getFactionLabel(c.faction)} / HP {c.maxHp}）
            </div>
          ))}
        </div>
      )}

      {confirmAction ? (
        <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-400/70 space-y-2.5">
          <div className="text-sm font-bold text-amber-100">
            {confirmAction === 'REVEAL'
              ? '全プレイヤーにあなたの正体を公開しますか？（一度公開すると戻せません）'
              : `特殊能力「${char.abilityName}」を発動しますか？`}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="py-2.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-200"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirmAction === 'REVEAL') onReveal();
                else onUseAbility();
                setConfirmAction(null);
                onClose();
              }}
              className="gold-button py-2.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> 実行する
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {!me.isRevealed && me.isAlive && (
            <button
              type="button"
              onClick={() => setConfirmAction('REVEAL')}
              className="py-3 rounded-xl bg-slate-800 border border-amber-400/70 text-sm font-bold text-amber-100 hover:bg-slate-700"
            >
              正体を公開する
            </button>
          )}
          {canUseActiveAbility && (
            <button
              type="button"
              onClick={() => setConfirmAction('ABILITY')}
              className="gold-button py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              能力を発動する
            </button>
          )}
        </div>
      )}
    </ModalBackdrop>
  );
};

interface PublicPlayerModalProps {
  player: PublicPlayerView;
  onClose: () => void;
}

export const PublicPlayerModal: React.FC<PublicPlayerModalProps> = ({ player, onClose }) => (
  <ModalBackdrop title={`${player.name} の公開情報`} onClose={onClose}>
    <div className="flex items-center gap-3">
      <CharacterAvatar character={player.isRevealed ? player.character : null} size={68} />
      <div>
        <div className="text-lg font-bold text-white">{player.name}</div>
        <div className="text-xs text-amber-200">
          {player.isRevealed && player.character
            ? `${player.character.name}（${getFactionLabel(player.character.faction)} / HP ${player.character.maxHp}）`
            : '正体不明'}
        </div>
        <div className="text-xs text-slate-300 mt-1">
          状態：{player.isAlive ? '生存' : '脱落'} · 累計ダメージ：{player.damage}
        </div>
        <div className="text-xs text-slate-300">
          現在位置：{player.area ? AREAS[player.area].name : '初期配置前'}
        </div>
      </div>
    </div>

    {(player.guardianAngelActive || player.eimiShieldActive) && (
      <div className="p-2.5 rounded-lg bg-sky-950/60 border border-sky-400/50 text-xs text-sky-200 flex items-center gap-1.5">
        <Shield className="w-4 h-4" /> 防御効果発動中（攻撃ダメージ無効）
      </div>
    )}

    <div className="space-y-1.5">
      <div className="text-xs font-bold text-amber-300">装備中のカード（{player.equipment.length}枚）</div>
      {player.equipment.length === 0 ? (
        <div className="text-xs text-slate-400">装備カードはありません。</div>
      ) : (
        player.equipment.map((eq) => (
          <div key={eq.uid} className="p-2.5 rounded-lg bg-black/45 border border-[#c59b47]/40">
            <div className="text-xs font-bold text-amber-200">{eq.name}</div>
            <div className="text-xs text-slate-200 mt-0.5">{eq.description}</div>
          </div>
        ))
      )}
    </div>
  </ModalBackdrop>
);

interface CardInspectModalProps {
  card: CardInstance;
  onClose: () => void;
}

export const CardInspectModal: React.FC<CardInspectModalProps> = ({ card, onClose }) => (
  <ModalBackdrop title={card.name} onClose={onClose}>
    <div className="text-xs font-bold text-amber-300">
      {card.deck === 'WHITE' ? '白カード' : card.deck === 'BLACK' ? '黒カード' : '推理カード'} ·{' '}
      {card.isEquipment ? '装備カード' : '使い捨てカード'}
    </div>
    <p className="text-sm text-white leading-relaxed">{card.description}</p>
  </ModalBackdrop>
);

interface DeckReferenceModalProps {
  deck: DeckType;
  remaining: number;
  onClose: () => void;
}

export const DeckReferenceModal: React.FC<DeckReferenceModalProps> = ({ deck, remaining, onClose }) => {
  const defs = deck === 'GREEN' ? GREEN_CARD_DEFS : deck === 'WHITE' ? WHITE_CARD_DEFS : BLACK_CARD_DEFS;
  const title =
    deck === 'GREEN'
      ? `推理カード（緑）一覧 · 山札残 ${remaining}枚`
      : deck === 'WHITE'
      ? `白カード一覧（12種15枚）· 山札残 ${remaining}枚`
      : `黒カード一覧（12種15枚）· 山札残 ${remaining}枚`;

  return (
    <ModalBackdrop title={title} onClose={onClose}>
      <div className="space-y-2">
        {defs.map((c) => (
          <div key={c.id} className="p-2.5 rounded-lg bg-black/40 border border-[#c59b47]/35">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-200">{c.name}</span>
              <span className="text-[11px] text-slate-300">
                {c.isEquipment ? '装備' : '使い捨て'} · {c.countInDeck}枚
              </span>
            </div>
            <div className="text-xs text-slate-200 mt-1 leading-relaxed">{c.description}</div>
          </div>
        ))}
      </div>
    </ModalBackdrop>
  );
};

interface MenuModalProps {
  room: RoomView;
  logs: LogEntry[];
  muted: boolean;
  onToggleMute: () => void;
  onResetToLobby: () => void;
  onLeaveRoom: () => void;
  onClose: () => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  room,
  logs,
  muted,
  onToggleMute,
  onResetToLobby,
  onLeaveRoom,
  onClose,
}) => {
  const [tab, setTab] = useState<'LOG' | 'RULES' | 'SETTINGS'>('LOG');
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <ModalBackdrop title={`ルーム ${room.roomCode} · メニュー`} onClose={onClose}>
      <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/50 border border-[#c59b47]/35">
        {(
          [
            ['LOG', '行動履歴'],
            ['RULES', 'ルールブック'],
            ['SETTINGS', '設定'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k);
              setConfirmReset(false);
            }}
            className={`py-2 rounded-md text-xs font-bold transition-colors ${
              tab === k ? 'bg-amber-500 text-slate-950' : 'text-amber-100/80 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'LOG' && (
        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto custom-scroll pr-1">
          {[...logs].reverse().map((l) => (
            <div
              key={l.id}
              className={`p-2 rounded-lg text-xs leading-relaxed border ${
                l.tone === 'damage'
                  ? 'bg-red-950/45 border-red-500/35 text-red-100'
                  : l.tone === 'heal'
                  ? 'bg-emerald-950/45 border-emerald-500/35 text-emerald-100'
                  : l.tone === 'reveal'
                  ? 'bg-amber-950/50 border-amber-400/45 text-amber-100'
                  : l.tone === 'victory'
                  ? 'bg-yellow-900/50 border-yellow-400 text-yellow-100 font-bold'
                  : 'bg-slate-900/60 border-slate-700/60 text-slate-200'
              }`}
            >
              <span className="text-[10px] opacity-65 mr-1.5 tabular-nums">[T{l.turn}]</span>
              {l.text}
            </div>
          ))}
        </div>
      )}

      {tab === 'RULES' && (
        <div className="max-h-[58vh] overflow-y-auto custom-scroll pr-1">
          <RulebookContent />
        </div>
      )}

      {tab === 'SETTINGS' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={onToggleMute}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between text-sm font-bold text-amber-100"
          >
            <span className="flex items-center gap-2">
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              効果音（SE）
            </span>
            <span>{muted ? 'OFF' : 'ON'}</span>
          </button>

          {confirmReset ? (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-400/70 space-y-2.5">
              <div className="text-xs sm:text-sm font-bold text-amber-100 leading-relaxed">
                プレイ中のゲームを初めからリセットし、参加者全員でロビー画面に戻りますか？
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-xs font-bold text-slate-200 hover:bg-slate-700"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmReset(false);
                    onResetToLobby();
                  }}
                  className="py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 border border-amber-300 text-xs font-extrabold text-slate-950 flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  リセット実行
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onLeaveRoom}
                className="p-3 rounded-xl bg-red-950/75 border border-red-500/60 hover:bg-red-900/75 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-red-100"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>ルーム退出</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="p-3 rounded-xl bg-amber-950/75 border border-amber-400/65 hover:bg-amber-900/75 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-amber-100"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>ゲームリセット</span>
              </button>
            </div>
          )}
        </div>
      )}
    </ModalBackdrop>
  );
};
