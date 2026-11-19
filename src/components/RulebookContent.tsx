import React, { useState } from 'react';
import { AREAS, CHARACTERS, getFactionLabel } from '../data/gameData.ts';
import { CharacterAvatar } from './CharacterAvatar.tsx';

export const RulebookContent: React.FC = () => {
  const [rulesTab, setRulesTab] = useState<'RULES' | 'CHARACTERS'>('RULES');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-black/55 border border-[#c59b47]/30">
        <button
          type="button"
          onClick={() => setRulesTab('RULES')}
          className={`py-2 rounded-md text-xs font-bold transition-colors ${
            rulesTab === 'RULES' ? 'bg-[#d9b45a] text-[#141519]' : 'text-amber-100/80 hover:text-white'
          }`}
        >
          基本ルール・エリア効果
        </button>
        <button
          type="button"
          onClick={() => setRulesTab('CHARACTERS')}
          className={`py-2 rounded-md text-xs font-bold transition-colors ${
            rulesTab === 'CHARACTERS' ? 'bg-[#d9b45a] text-[#141519]' : 'text-amber-100/80 hover:text-white'
          }`}
        >
          登場キャラクター16人
        </button>
      </div>

      <div className="space-y-3 text-xs text-amber-50/90 leading-relaxed">
        {rulesTab === 'RULES' ? (
          <>
            <div className="p-3 rounded-xl bg-black/40 border border-[#c59b47]/30 space-y-1">
              <div className="font-bold text-[#e2bc62]">陣営構成と勝利条件（4〜6人戦）</div>
              <p>・レイダー（2人）：全てのシャドウを倒す。</p>
              <p>・シャドウ（2人）：全てのレイダーを倒す。</p>
              <p>・シチズン（4人戦なし / 5人戦1人 / 6人戦2人）：各キャラクター固有の勝利条件を達成する。</p>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-[#c59b47]/30 space-y-1">
              <div className="font-bold text-[#e2bc62]">移動と6つのエリア効果（6面＋4面ダイス）</div>
              {(Object.keys(AREAS) as Array<keyof typeof AREAS>).map((aid) => (
                <p key={aid}>
                  ・<span className="font-bold text-amber-200">{AREAS[aid].name}</span>（{AREAS[aid].diceLabel}）：{AREAS[aid].effectSummary}
                </p>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-[#c59b47]/30 space-y-1">
              <div className="font-bold text-[#e2bc62]">攻撃ルールと王の飛行船</div>
              <p>・通常エリアの攻撃範囲は「自分のエリア」「左隣のエリア」「王の飛行船」。</p>
              <p>・王の飛行船にいる間は、全ての通常エリアを攻撃対象にできる。</p>
              <p>・攻撃時は6面と4面ダイスを振り、「大きい出目 − 小さい出目」がダメージとなる。</p>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {CHARACTERS.map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-xl bg-black/45 border border-[#c59b47]/30 flex items-start gap-2.5"
              >
                <CharacterAvatar character={c} size={44} className="shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-amber-100">
                    {c.name}（{getFactionLabel(c.faction)} · HP {c.maxHp}）
                  </div>
                  <div className="text-amber-300/90 mt-0.5">
                    {c.abilityName}：{c.abilityDesc}
                  </div>
                  <div className="text-slate-300 mt-0.5">勝利条件：{c.winConditionDesc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
