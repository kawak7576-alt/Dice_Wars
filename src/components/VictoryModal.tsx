import React from 'react';
import { RotateCcw, Trophy, LogOut } from 'lucide-react';
import { getFactionLabel } from '../data/gameData.ts';
import type { RoomView } from '../types/game.ts';
import { CharacterAvatar } from './CharacterAvatar.tsx';

interface VictoryModalProps {
  room: RoomView;
  isHost: boolean;
  onRestart: () => void;
  onLeave: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ room, isHost, onRestart, onLeave }) => {
  const winnerIds = new Set(room.winners.map((w) => w.playerId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5">
      <div className="gold-panel w-full max-w-xl rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-b from-amber-900/70 to-[#141a28] px-5 py-4 border-b border-[#c59b47] text-center">
          <div className="inline-flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
            <Trophy className="w-5 h-5" /> GAME OVER
          </div>
          <h2 className="font-display-serif text-2xl sm:text-3xl font-extrabold text-amber-100">
            勝者決定！
          </h2>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto custom-scroll space-y-4">
          {/* Winners highlight */}
          <div className="space-y-2">
            {room.winners.map((w) => (
              <div
                key={w.playerId}
                className="p-3 rounded-xl bg-gradient-to-r from-amber-900/45 to-yellow-950/30 border border-amber-400 flex items-center gap-3"
              >
                <CharacterAvatar character={w.character} size={52} className="shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-extrabold text-amber-100">
                    {w.name}（{w.character.name} / {getFactionLabel(w.character.faction)}）
                  </div>
                  <div className="text-xs text-amber-200/90 mt-0.5">{w.reason}</div>
                </div>
              </div>
            ))}
          </div>

          {/* All Players Reveal */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-amber-300">全プレイヤーの正体</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {room.players.map((p) => {
                const won = winnerIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                      won
                        ? 'bg-amber-950/40 border-amber-400/70'
                        : 'bg-slate-900/75 border-slate-700/70 opacity-85'
                    }`}
                  >
                    <CharacterAvatar character={p.character} size={40} className="shrink-0" />
                    <div className="min-w-0 text-xs">
                      <div className="font-bold text-white truncate">
                        {p.name} {won ? '🏆' : ''}
                      </div>
                      <div className="text-amber-200/85">
                        {p.character ? `${p.character.name} (${getFactionLabel(p.character.faction)})` : '-'}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {p.isAlive ? '生存' : '脱落'} · ﾀﾞﾒｰｼﾞ {p.damage}/{p.character?.maxHp ?? '-'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={onLeave}
              className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-600 text-sm font-bold text-slate-200 flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              ロビーへ戻る
            </button>
            {isHost && (
              <button
                type="button"
                onClick={onRestart}
                className="gold-button flex-1 py-3 px-5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                同じメンバーでもう一度遊ぶ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
