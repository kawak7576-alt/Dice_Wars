import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import blackCardImg from '../assets/images/card_back_black_1794830461900.jpg';
import greenCardImg from '../assets/images/card_back_green_1794830461226.jpg';
import whiteCardImg from '../assets/images/card_back_white_1794830461002.jpg';
import { getFactionLabel } from '../data/gameData.ts';
import type { CardDrawEvent, CharacterDef, PublicPlayerView } from '../types/game.ts';
import { CharacterAvatar } from './CharacterAvatar.tsx';

export interface RevealOverlayData {
  id: string;
  player: PublicPlayerView;
  character: CharacterDef;
}

interface CardDrawOverlayProps {
  event: CardDrawEvent | null;
  drawerName: string;
  isMine: boolean;
  onComplete: () => void;
}

export const CardDrawOverlay: React.FC<CardDrawOverlayProps> = ({
  event,
  drawerName,
  isMine,
  onComplete,
}) => {
  const [stage, setStage] = useState<'DRAW' | 'FLIP' | 'FLY'>('DRAW');

  useEffect(() => {
    if (!event) return;
    setStage('DRAW');
    const t1 = setTimeout(() => setStage('FLIP'), 210);
    const t2 = setTimeout(() => setStage('FLY'), 960);
    const t3 = setTimeout(() => onComplete(), 1380);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [event, onComplete]);

  if (!event) return null;

  const backImg =
    event.deck === 'GREEN'
      ? greenCardImg
      : event.deck === 'WHITE'
      ? whiteCardImg
      : blackCardImg;

  const deckLabel =
    event.deck === 'GREEN' ? '推理カード' : event.deck === 'WHITE' ? '白カード' : '黒カード';

  const frontClass =
    event.deck === 'WHITE'
      ? 'bg-gradient-to-b from-[#f7eed8] via-[#eadbc0] to-[#d4be94] border-[#9d7530] text-amber-950'
      : event.deck === 'BLACK'
      ? 'bg-gradient-to-b from-[#2b2321] via-[#1a1413] to-[#0f0b0a] border-[#c99e48] text-amber-50'
      : 'bg-gradient-to-b from-[#173623] via-[#102619] to-[#0a1810] border-emerald-400/75 text-emerald-50';

  const isFlipped = stage === 'FLIP' || stage === 'FLY';

  const targetTransform =
    stage === 'DRAW'
      ? { x: 115, y: -20, scale: 0.56, opacity: 1 }
      : stage === 'FLIP'
      ? { x: 0, y: -12, scale: 1, opacity: 1 }
      : event.isEquipment && isMine
      ? { x: -30, y: 210, scale: 0.34, opacity: 0 }
      : { x: isMine ? 0 : 85, y: 65, scale: 0.44, opacity: 0 };

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <motion.div
        key={event.id}
        initial={{ x: 125, y: -25, scale: 0.52, opacity: 0 }}
        animate={targetTransform}
        transition={{
          duration: stage === 'DRAW' ? 0.22 : stage === 'FLIP' ? 0.36 : 0.4,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{ perspective: 900 }}
      >
        {/* 3D Flip Card Container */}
        <motion.div
          animate={{ rotateY: isFlipped && event.card ? 0 : 180 }}
          initial={{ rotateY: 180 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-[132px] sm:w-[152px] aspect-[3/4]"
        >
          {/* Card Back (visible at 180deg) */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden border-2 border-[#c99e48]"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              boxShadow: '6px 10px 22px rgba(5, 2, 1, 0.85)',
            }}
          >
            <img
              src={backImg}
              alt={deckLabel}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover scale-[1.22]"
            />
            <div className="absolute inset-x-1.5 bottom-2 px-1.5 py-1 rounded bg-black/75 border border-[#c99e48]/70 text-center">
              <div className="text-[10px] font-bold text-amber-100 truncate">
                {drawerName} · {deckLabel}
              </div>
            </div>
          </div>

          {/* Card Front (visible at 0deg when card is public/visible) */}
          <div
            className={`absolute inset-0 rounded-xl border-2 p-2.5 flex flex-col justify-between ${frontClass}`}
            style={{
              backfaceVisibility: 'hidden',
              boxShadow: '6px 10px 22px rgba(5, 2, 1, 0.85)',
            }}
          >
            <div>
              <div className="flex items-center justify-between text-[9px] font-bold opacity-80 border-b border-current/25 pb-1">
                <span>{deckLabel}</span>
                <span>{event.isEquipment ? '装備' : '使い捨て'}</span>
              </div>
              <div className="font-display-serif text-xs sm:text-sm font-extrabold mt-1.5 leading-snug">
                {event.card?.name ?? '推理カード'}
              </div>
            </div>

            <div className="text-[10px] leading-relaxed opacity-90 line-clamp-5">
              {event.card?.description ?? `${drawerName} がカードを確認しています...`}
            </div>

            <div className="text-[9px] font-bold opacity-75 text-right truncate">
              {event.isEquipment ? `${drawerName} が装備` : drawerName}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

interface RevealCardOverlayProps {
  reveal: RevealOverlayData | null;
  onComplete: () => void;
}

export const RevealCardOverlay: React.FC<RevealCardOverlayProps> = ({ reveal, onComplete }) => {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!reveal) return;
    setFlipped(false);
    const t1 = setTimeout(() => setFlipped(true), 220);
    const t2 = setTimeout(() => onComplete(), 1950);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reveal, onComplete]);

  const factionFrame =
    reveal?.character.faction === 'CITIZEN'
      ? 'bg-gradient-to-b from-[#2b1a36] via-[#1c1124] to-[#110a16] border-[#c8a86b]'
      : reveal?.character.faction === 'RAIDER'
      ? 'bg-gradient-to-b from-[#17263c] via-[#101a2a] to-[#0a101b] border-[#d4aa52]'
      : 'bg-gradient-to-b from-[#331618] via-[#210e10] to-[#130809] border-[#b88642]';

  const factionTag =
    reveal?.character.faction === 'CITIZEN'
      ? 'text-purple-200 border-purple-400/50 bg-purple-950/60'
      : reveal?.character.faction === 'RAIDER'
      ? 'text-sky-200 border-sky-400/50 bg-sky-950/60'
      : 'text-rose-200 border-rose-400/50 bg-rose-950/60';

  return (
    <AnimatePresence>
      {reveal && (
        <motion.div
          key={reveal.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onComplete}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
        >
          <motion.div
            initial={{ y: 24, scale: 0.86 }}
            animate={{ y: -8, scale: 1 }}
            exit={{ y: 12, scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: 1000 }}
          >
            <motion.div
              initial={{ rotateY: 180 }}
              animate={{ rotateY: flipped ? 0 : 180 }}
              transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative w-[196px] sm:w-[220px] h-[272px] sm:h-[300px]"
            >
              {/* Face-down Leather & Brass Seal Back */}
              <div
                className="absolute inset-0 rounded-2xl border-2 border-[#d4aa52] bg-gradient-to-b from-[#231914] via-[#16100d] to-[#0e0907] p-4 flex flex-col items-center justify-center text-center gap-3"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  boxShadow: '8px 14px 28px rgba(4, 2, 1, 0.9)',
                }}
              >
                <div className="w-16 h-16 rounded-full border-2 border-[#c99e48]/80 flex items-center justify-center bg-[#1c1410]">
                  <span className="font-display-serif text-xl font-bold text-amber-200">
                    {reveal.player.name.slice(0, 1)}
                  </span>
                </div>
                <div className="text-xs font-bold tracking-widest text-amber-300/90">正体公開</div>
                <div className="text-sm font-extrabold text-amber-100">{reveal.player.name}</div>
              </div>

              {/* Face-up Character Card Front */}
              <div
                className={`absolute inset-0 rounded-2xl border-2 p-4 flex flex-col items-center justify-between text-center ${factionFrame}`}
                style={{
                  backfaceVisibility: 'hidden',
                  boxShadow: '8px 14px 28px rgba(4, 2, 1, 0.9)',
                }}
              >
                <div className="w-full flex items-center justify-between text-[10px] font-bold text-amber-200/80">
                  <span className="truncate">{reveal.player.name}</span>
                  <span className="tabular-nums">HP {reveal.character.maxHp}</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-full p-0.5 bg-gradient-to-b from-[#f3d78c] to-[#7d5b20] shadow-lg">
                    <CharacterAvatar character={reveal.character} size={76} />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded border text-[10px] font-extrabold ${factionTag}`}>
                    {getFactionLabel(reveal.character.faction)}
                  </span>
                  <div className="font-display-serif text-lg font-extrabold text-amber-100 leading-tight">
                    {reveal.character.name}
                  </div>
                </div>

                <div className="w-full pt-2 border-t border-amber-200/20 text-[11px] text-amber-100/90">
                  <span className="font-bold text-amber-300">特殊能力：</span>
                  {reveal.character.abilityName}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
