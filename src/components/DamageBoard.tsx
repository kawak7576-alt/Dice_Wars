import React, { useEffect, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { Maximize2 } from 'lucide-react';
import damageBoardImg from '../assets/images/damage_track_board_1794830461204.jpg';
import type { PublicPlayerView } from '../types/game.ts';
import { PlayerMedal } from './PlayerMedal.tsx';

interface DamageBoardProps {
  players: PublicPlayerView[];
  activePlayerId: string | null;
  myPlayerId: string | null;
  combatTargetIds?: Set<string>;
  onOpenExpanded?: () => void;
}

const STAGES = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

export const DamageBoard: React.FC<DamageBoardProps> = ({
  players,
  activePlayerId,
  myPlayerId,
  combatTargetIds,
  onOpenExpanded,
}) => {
  const prevDamagesRef = useRef<Record<string, number>>({});
  const [deltaMap, setDeltaMap] = useState<Record<string, 'UP' | 'DOWN'>>({});

  useEffect(() => {
    const changed: Record<string, 'UP' | 'DOWN'> = {};
    for (const p of players) {
      const prev = prevDamagesRef.current[p.id];
      if (prev !== undefined && prev !== p.damage) {
        changed[p.id] = p.damage > prev ? 'UP' : 'DOWN';
      }
      prevDamagesRef.current[p.id] = p.damage;
    }

    if (Object.keys(changed).length > 0) {
      setDeltaMap(changed);
      const t = setTimeout(() => setDeltaMap({}), 650);
      return () => clearTimeout(t);
    }
  }, [players]);

  return (
    <button
      type="button"
      onClick={() => onOpenExpanded?.()}
      title="タップして拡大ダメージボードを表示"
      aria-label="ダメージボードを拡大表示"
      className="flex flex-col shrink-0 select-none w-[78px] sm:w-[116px] lg:w-[138px] text-left group focus:outline-none cursor-pointer"
    >
      {/* Physical thick board wrapper with unified bottom-right tabletop contact shadow */}
      <div className="relative w-full">
        {/* Soft tabletop ambient + contact shadow */}
        <div
          className="absolute inset-0 translate-x-[5px] translate-y-[7px] rounded-xl pointer-events-none"
          style={{
            background: 'rgba(5, 2, 1, 0.78)',
            filter: 'blur(5px)',
          }}
        />
        {/* Thick chipboard / wooden board side wall (bottom + right thickness) */}
        <div
          className="absolute inset-0 translate-x-[3px] translate-y-[4px] rounded-xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, #634624 0%, #312010 55%, #170d06 100%)',
            border: '1px solid #120904',
          }}
        />

        {/* Board Top Surface with Sculpted 3D Beveled Frame */}
        <div
          className="relative rounded-xl overflow-hidden bg-[#160e09] transition-transform group-active:scale-[0.99]"
          style={{
            borderTop: '2.5px solid #e2bc68',
            borderLeft: '2.5px solid #cfa54e',
            borderRight: '2.5px solid #7d5b20',
            borderBottom: '2.5px solid #634615',
            boxShadow:
              'inset 0 0 0 1px rgba(255, 232, 175, 0.22), inset 0 2px 6px rgba(0, 0, 0, 0.65)',
          }}
        >
          {/* Physical Stained-Glass & Sculpted Gold Track Artwork */}
          <img
            src={damageBoardImg}
            alt="ダメージボード"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover scale-[1.48] pointer-events-none opacity-95"
          />
          {/* Subtle top-left sheen & dark contrast scrim for crisp legibility */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(10,6,4,0.78) 0%, rgba(12,8,6,0.4) 48%, rgba(10,6,4,0.74) 100%)',
            }}
          />

          {/* Header Wood/Brass Plaque */}
          <div className="relative z-10 bg-gradient-to-b from-[#2f2217]/95 to-[#17100b]/95 border-b-2 border-[#b98f3e] py-0.5 sm:py-1 px-1 flex items-center justify-center gap-0.5">
            <span className="text-[9px] sm:text-xs font-extrabold tracking-tight sm:tracking-wider text-amber-200 whitespace-nowrap drop-shadow">
              ダメージ
            </span>
            <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300/80 shrink-0" />
          </div>

          {/* Dynamic 15 Stages (14 down to 0) showing ONLY numerals and colored player pawns */}
          <LayoutGroup id="damage-board">
            <div className="relative z-10 flex flex-col divide-y divide-[#dfba64]/35">
              {STAGES.map((stage) => {
                const playersHere = players.filter((p) => p.damage === stage);

                return (
                  <div
                    key={stage}
                    className="relative flex items-center justify-between px-1 sm:px-1.5 py-[1.5px] sm:py-[3px] min-h-[18.5px] sm:min-h-[24px]"
                  >
                    {/* Engraved Stage Numeral */}
                    <span className="text-[10.5px] sm:text-xs font-black tabular-nums text-amber-100 w-4 sm:w-5 text-right shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                      {stage}
                    </span>

                    {/* Sliding Physical Player Markers */}
                    <div className="flex items-center justify-end gap-0.5 flex-wrap flex-1 pl-1">
                      {playersHere.map((p) => {
                        const isActive = p.id === activePlayerId;
                        const isMe = p.id === myPlayerId;
                        const isUnderAttack = combatTargetIds?.has(p.id) ?? false;
                        const moveDir = deltaMap[p.id];

                        return (
                          <motion.div
                            key={p.id}
                            layoutId={`dmg-marker-${p.id}`}
                            animate={
                              moveDir
                                ? {
                                    scale: [1, 1.24, 0.96, 1],
                                    x: moveDir === 'UP' ? [0, -3, 0] : [0, 3, 0],
                                  }
                                : { scale: 1, x: 0 }
                            }
                            transition={{
                              layout: { type: 'spring', stiffness: 240, damping: 23, mass: 1 },
                              duration: 0.48,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className={moveDir || isActive ? 'relative z-20' : 'relative z-10'}
                          >
                            <PlayerMedal
                              name={p.name}
                              colorId={p.color.id}
                              colorHex={p.color.hex}
                              colorRing={p.color.ring}
                              size="sm"
                              isAlive={p.isAlive}
                              isActive={isActive}
                              isMe={isMe}
                              isUnderAttack={isUnderAttack}
                              title={`${p.name}（ダメージ ${p.damage}）`}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </LayoutGroup>
        </div>
      </div>
    </button>
  );
};
