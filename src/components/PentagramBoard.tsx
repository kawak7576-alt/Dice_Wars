import React, { useEffect, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import pentagonBoardImg from '../assets/images/pentagon_fortress_board_1794834442226.jpg';
import { AREAS } from '../data/gameData.ts';
import type { AreaId, PublicPlayerView } from '../types/game.ts';
import { PlayerMedal } from './PlayerMedal.tsx';

interface PentagramBoardProps {
  players: PublicPlayerView[];
  activePlayerId: string | null;
  myPlayerId: string | null;
  highlightTargetIds?: Set<string>;
  combatTargetIds?: Set<string>;
  onSelectPlayer: (player: PublicPlayerView) => void;
  onSelectArea?: (areaId: AreaId) => void;
}

// Anchors aligned to the 5 spacious outer fortress districts + central airship plaza (preserved)
const AREA_ANCHORS: Record<
  AreaId,
  { left: string; top: string; pawnTop: string }
> = {
  detective: { left: '50%', top: '26%', pawnTop: '15%' },
  cathedral: { left: '74%', top: '46%', pawnTop: '34%' },
  underground: { left: '66%', top: '76%', pawnTop: '65%' },
  city_hall: { left: '34%', top: '76%', pawnTop: '65%' },
  thieves_guild: { left: '26%', top: '46%', pawnTop: '34%' },
  airship: { left: '50%', top: '53%', pawnTop: '43%' },
};

export const PentagramBoard: React.FC<PentagramBoardProps> = ({
  players,
  activePlayerId,
  myPlayerId,
  highlightTargetIds,
  combatTargetIds,
  onSelectPlayer,
  onSelectArea,
}) => {
  const activePlayer = players.find((p) => p.id === activePlayerId);
  const prevAreasRef = useRef<Record<string, AreaId | null>>({});
  const [movedIds, setMovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newlyMoved = new Set<string>();
    for (const p of players) {
      const prev = prevAreasRef.current[p.id];
      if (prev !== undefined && prev !== p.area && p.area !== null) {
        newlyMoved.add(p.id);
      }
      prevAreasRef.current[p.id] = p.area;
    }

    if (newlyMoved.size > 0) {
      setMovedIds(newlyMoved);
      const t = setTimeout(() => setMovedIds(new Set()), 650);
      return () => clearTimeout(t);
    }
  }, [players]);

  return (
    <div className="relative w-full max-w-[360px] sm:max-w-[440px] lg:max-w-[490px] aspect-square mx-auto select-none">
      {/* Grounded contact shadow on wooden tabletop (unified top-left light -> bottom-right shadow) */}
      <div
        className="absolute inset-0 translate-x-[5px] translate-y-[7px] pointer-events-none opacity-80"
        style={{
          clipPath: 'polygon(50% 0.5%, 99% 34%, 85% 93%, 15% 93%, 1% 34%)',
          background: 'rgba(6, 2, 1, 0.85)',
          filter: 'blur(6px)',
        }}
      />

      {/* Physical thick board bevel edge underneath */}
      <div
        className="absolute inset-0 translate-x-[2.5px] translate-y-[3.5px] pointer-events-none"
        style={{
          clipPath: 'polygon(50% 0.5%, 99% 34%, 85% 93%, 15% 93%, 1% 34%)',
          background: 'linear-gradient(135deg, #5c4322 0%, #2a1a0d 65%, #160c05 100%)',
        }}
      />

      {/* Physical Pentagon Fortress Map Artwork clipped cleanly to outer stone walls */}
      <div
        className="w-full h-full relative"
        style={{
          clipPath: 'polygon(50% 0.5%, 99% 34%, 85% 93%, 15% 93%, 1% 34%)',
        }}
      >
        <img
          src={pentagonBoardImg}
          alt="五角形の城塞エリアボード"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover pointer-events-none"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,235,190,0.06) 0%, transparent 45%, rgba(8,4,2,0.22) 100%)',
          }}
        />
      </div>

      {/* Compact Translucent Black Nameplates & Physical Player Pawns with Lift-Glide-Bounce */}
      <LayoutGroup id="area-board">
        {(Object.keys(AREA_ANCHORS) as AreaId[]).map((areaId) => {
          const areaDef = AREAS[areaId];
          const anchor = AREA_ANCHORS[areaId];
          const isActiveArea = activePlayer?.area === areaId;
          const areaPlayers = players.filter((p) => p.area === areaId && p.isAlive);

          return (
            <React.Fragment key={areaId}>
              {/* Physical Player Pawns resting on District */}
              {areaPlayers.length > 0 && (
                <div
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5 flex-wrap max-w-[116px]"
                  style={{ left: anchor.left, top: anchor.pawnTop }}
                >
                  {areaPlayers.map((p) => {
                    const isMe = p.id === myPlayerId;
                    const isActive = p.id === activePlayerId;
                    const isTargetable = highlightTargetIds?.has(p.id) ?? false;
                    const isUnderAttack = combatTargetIds?.has(p.id) ?? false;
                    const justMoved = movedIds.has(p.id);

                    return (
                      <motion.div
                        key={p.id}
                        layoutId={`area-pawn-${p.id}`}
                        initial={{ y: -20, scale: 1.18, opacity: 0.7 }}
                        animate={
                          justMoved
                            ? {
                                y: [0, -18, -12, 3, 0],
                                scale: [1, 1.18, 1.1, 0.96, 1],
                                opacity: 1,
                              }
                            : isUnderAttack
                            ? {
                                x: [0, -4, 4, -2, 2, 0],
                                y: 0,
                                scale: 1,
                                opacity: 1,
                              }
                            : { x: 0, y: 0, scale: 1, opacity: 1 }
                        }
                        transition={{
                          layout: { type: 'spring', stiffness: 200, damping: 20, mass: 1.1 },
                          duration: justMoved ? 0.58 : isUnderAttack ? 0.34 : 0.35,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={isActive || isUnderAttack ? 'relative z-30' : 'relative z-10'}
                      >
                        <PlayerMedal
                          name={p.name}
                          colorId={p.color.id}
                          colorHex={p.color.hex}
                          colorRing={p.color.ring}
                          size="md"
                          isAlive={p.isAlive}
                          isActive={isActive}
                          isMe={isMe}
                          isTargetable={isTargetable}
                          isUnderAttack={isUnderAttack}
                          title={`${p.name}（${areaDef.name}）`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPlayer(p);
                          }}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Compact Translucent Black Nameplate with Thin Gold Border (Text-only) */}
              <button
                type="button"
                onClick={() => onSelectArea?.(areaId)}
                style={{ left: anchor.left, top: anchor.top }}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center focus:outline-none"
              >
                <div
                  className={`px-1.5 py-[2px] sm:px-2 sm:py-[3px] rounded border flex flex-col items-center transition-colors ${
                    isActiveArea
                      ? 'bg-black/75 border-amber-300'
                      : 'bg-black/58 border-[#c99e48]/80 group-hover:bg-black/75'
                  }`}
                  style={{
                    boxShadow: '1.5px 2.5px 4px rgba(0,0,0,0.65)',
                  }}
                >
                  <span className="text-[9px] sm:text-[10.5px] font-bold tracking-wide text-amber-50 whitespace-nowrap leading-tight">
                    {areaDef.name}
                  </span>
                  <span className="text-[7.5px] sm:text-[8.5px] font-semibold text-amber-300/90 tabular-nums leading-tight whitespace-nowrap">
                    {areaDef.diceLabel}
                  </span>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </LayoutGroup>
    </div>
  );
};
