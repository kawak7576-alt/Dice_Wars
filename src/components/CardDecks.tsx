import React from 'react';
import blackCardImg from '../assets/images/card_back_black_1794830461900.jpg';
import greenCardImg from '../assets/images/card_back_green_1794830461226.jpg';
import whiteCardImg from '../assets/images/card_back_white_1794830461002.jpg';
import type { DeckType, PublicPlayerView } from '../types/game.ts';

interface CardDecksProps {
  counts: {
    GREEN: number;
    WHITE: number;
    BLACK: number;
  };
  highlightDeck?: DeckType | null;
  onInspectDeck: (deck: DeckType) => void;
  players?: PublicPlayerView[];
  activePlayerId?: string | null;
  myPlayerId?: string | null;
  onSelectPlayer?: (player: PublicPlayerView) => void;
}

const DECK_META: {
  deck: DeckType;
  jpLabel: string;
  image: string;
  paperEdgeHex: string;
  paperDarkHex: string;
  badgeStyle: string;
}[] = [
  {
    deck: 'GREEN',
    jpLabel: '緑カード',
    image: greenCardImg,
    paperEdgeHex: '#a3b39d',
    paperDarkHex: '#4f6149',
    badgeStyle: 'bg-[#0e2015]/88 border-emerald-400/70 text-emerald-100',
  },
  {
    deck: 'WHITE',
    jpLabel: '白カード',
    image: whiteCardImg,
    paperEdgeHex: '#e8dcc2',
    paperDarkHex: '#9d8964',
    badgeStyle: 'bg-[#f5ebd4]/92 border-[#9d7530] text-amber-950',
  },
  {
    deck: 'BLACK',
    jpLabel: '黒カード',
    image: blackCardImg,
    paperEdgeHex: '#8c8377',
    paperDarkHex: '#2f2924',
    badgeStyle: 'bg-[#120f0e]/90 border-[#c99e48]/75 text-amber-100',
  },
];

interface TurnOrderRosterProps {
  players: PublicPlayerView[];
  activePlayerId?: string | null;
  myPlayerId?: string | null;
  onSelectPlayer?: (player: PublicPlayerView) => void;
  className?: string;
}

export const TurnOrderRoster: React.FC<TurnOrderRosterProps> = ({
  players,
  activePlayerId,
  myPlayerId,
  onSelectPlayer,
  className = '',
}) => {
  if (players.length === 0) return null;

  return (
    <div
      className={`gold-panel rounded-lg p-1.5 w-full ${className}`}
      style={{ boxShadow: '3px 4px 10px rgba(0,0,0,0.78)' }}
    >
      <div className="flex flex-col gap-1">
        {players.map((p) => {
          const isActive = p.id === activePlayerId;
          const isMe = p.id === myPlayerId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPlayer?.(p)}
              title={`${p.name}${isMe ? '（自分）' : ''}の詳細情報を見る`}
              className={`w-full px-1.5 py-1 rounded border text-left transition-colors flex items-center justify-between gap-1 ${
                isActive
                  ? 'bg-amber-950/80 border-amber-300'
                  : isMe
                  ? 'bg-slate-900/65 border-sky-300/55 hover:border-amber-300'
                  : 'bg-black/45 border-[#c99e48]/35 hover:border-amber-300'
              } ${!p.isAlive ? 'opacity-45 grayscale' : ''}`}
            >
              <span className="flex items-center gap-1 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 border ${
                    isActive ? 'border-amber-200 ring-1 ring-amber-300' : 'border-amber-100'
                  }`}
                  style={{ backgroundColor: p.color.hex }}
                />
                <span
                  className={`text-[9px] sm:text-[10px] font-bold truncate ${
                    isMe ? 'text-sky-100' : 'text-amber-50'
                  }`}
                >
                  {p.name}
                </span>
              </span>
              <span className="text-[9px] font-extrabold tabular-nums text-amber-300 shrink-0">
                {p.isAlive ? `${p.damage}` : '落'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const CardDecks: React.FC<CardDecksProps> = ({
  counts,
  highlightDeck,
  onInspectDeck,
  players = [],
  activePlayerId,
  myPlayerId,
  onSelectPlayer,
}) => {
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-[86px] lg:w-[98px] select-none">
      {/* Mobile (<sm): horizontal row (Green, White, Black) above Area Board. Desktop (sm+): vertical stack */}
      <div className="flex flex-row sm:flex-col items-center justify-center gap-3 sm:gap-3.5 w-full">
        {DECK_META.map((item) => {
          const isHighlighted = highlightDeck === item.deck;
          const count = counts[item.deck];
          // Stack visual thickness reflects cards remaining
          const stackPx = count <= 0 ? 1 : Math.min(8, Math.max(3, Math.ceil(count / 2.6)));

          return (
            <button
              key={item.deck}
              type="button"
              onClick={() => onInspectDeck(item.deck)}
              className="group relative w-[52px] sm:w-[74px] lg:w-[85px] text-left transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              title={`${item.jpLabel}一覧（残 ${count}枚）`}
            >
              {/* Grounded tabletop contact shadow beneath left-leaning deck base */}
              <div
                className="absolute inset-0 rounded-[7px] pointer-events-none"
                style={{
                  transform: `translate(${-stackPx + 1.5}px, ${stackPx + 4.5}px)`,
                  background: 'rgba(5, 2, 1, 0.82)',
                  filter: 'blur(4.5px)',
                }}
              />

              {/* Multi-sheet stacked cards with subtle analog misalignment & left-edge paper thickness */}
              {count > 6 && (
                <div
                  className="absolute inset-0 rounded-[7px] pointer-events-none"
                  style={{
                    transform: `translate(-${stackPx + 0.5}px, ${stackPx + 0.5}px) rotate(-1.6deg)`,
                    backgroundColor: item.paperDarkHex,
                    border: '1px solid #150c06',
                  }}
                />
              )}
              <div
                className="absolute inset-0 rounded-[7px] pointer-events-none"
                style={{
                  transform: `translate(-${stackPx}px, ${stackPx}px) rotate(0.9deg)`,
                  backgroundColor: item.paperDarkHex,
                  border: '1px solid #160e08',
                }}
              />
              <div
                className="absolute inset-0 rounded-[7px] pointer-events-none"
                style={{
                  transform: `translate(-${Math.max(2, stackPx - 2)}px, ${Math.max(2, stackPx - 2)}px)`,
                  backgroundImage: `repeating-linear-gradient(45deg, ${item.paperEdgeHex} 0px, ${item.paperEdgeHex} 1px, ${item.paperDarkHex} 1px, ${item.paperDarkHex} 2.2px)`,
                  border: `1px solid ${item.paperDarkHex}`,
                }}
              />
              <div
                className="absolute inset-0 rounded-[7px] pointer-events-none"
                style={{
                  transform: 'translate(-1.5px, 1.5px) rotate(-0.6deg)',
                  backgroundColor: item.paperEdgeHex,
                  border: `1px solid ${item.paperDarkHex}`,
                }}
              />

              {/* Top Card Face resting on stack */}
              <div
                className={`relative rounded-[7px] overflow-hidden aspect-[3/4] ${
                  isHighlighted ? 'ring-2 ring-amber-300' : ''
                }`}
                style={{
                  borderTop: '1.5px solid #e5c371',
                  borderLeft: '1.5px solid #c99e48',
                  borderRight: '1.5px solid #8a6725',
                  borderBottom: '1.5px solid #75551a',
                  boxShadow: '-1.5px 1.5px 3px rgba(0,0,0,0.72)',
                }}
              >
                <img
                  src={item.image}
                  alt={item.jpLabel}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-[1.24] pointer-events-none"
                />

                <div className="absolute inset-x-1 bottom-1 flex flex-col items-center pointer-events-none">
                  <div
                    className={`px-1.5 py-[2px] rounded border text-[8.5px] sm:text-[9.5px] font-extrabold tracking-tight leading-none whitespace-nowrap tabular-nums ${item.badgeStyle}`}
                    style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.65)' }}
                  >
                    残 {count}枚
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop/Tablet (sm+): Turn-Order Players List directly below Black Card Deck */}
      <TurnOrderRoster
        players={players}
        activePlayerId={activePlayerId}
        myPlayerId={myPlayerId}
        onSelectPlayer={onSelectPlayer}
        className="hidden sm:block mt-0.5"
      />
    </div>
  );
};
