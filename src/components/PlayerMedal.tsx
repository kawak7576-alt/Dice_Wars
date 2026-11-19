import React from 'react';

interface PlayerMedalProps {
  name: string;
  colorId?: string;
  colorHex: string;
  colorRing: string;
  size?: 'sm' | 'md';
  isAlive?: boolean;
  isActive?: boolean;
  isMe?: boolean;
  isTargetable?: boolean;
  isUnderAttack?: boolean;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const CrestMark: React.FC<{ colorId?: string }> = ({ colorId }) => {
  switch (colorId) {
    case 'amber':
      // Sun / Compass diamond
      return (
        <svg viewBox="0 0 24 24" className="w-[72%] h-[72%] opacity-30 pointer-events-none" aria-hidden="true">
          <polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9" fill="none" stroke="#fff4d4" strokeWidth="1.6" />
        </svg>
      );
    case 'azure':
      // Shield crest
      return (
        <svg viewBox="0 0 24 24" className="w-[70%] h-[70%] opacity-30 pointer-events-none" aria-hidden="true">
          <path d="M12 3 L19 6 V12 C19 16.5 16 19.5 12 21 C8 19.5 5 16.5 5 12 V6 Z" fill="none" stroke="#fff4d4" strokeWidth="1.6" />
        </svg>
      );
    case 'crimson':
      // Crossed blades / Spear diamond
      return (
        <svg viewBox="0 0 24 24" className="w-[70%] h-[70%] opacity-30 pointer-events-none" aria-hidden="true">
          <path d="M5 19 L19 5 M19 19 L5 5" stroke="#fff4d4" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'emerald':
      // Trefoil / Crown star
      return (
        <svg viewBox="0 0 24 24" className="w-[70%] h-[70%] opacity-30 pointer-events-none" aria-hidden="true">
          <circle cx="12" cy="7.5" r="3.2" fill="none" stroke="#fff4d4" strokeWidth="1.5" />
          <circle cx="8" cy="14.5" r="3.2" fill="none" stroke="#fff4d4" strokeWidth="1.5" />
          <circle cx="16" cy="14.5" r="3.2" fill="none" stroke="#fff4d4" strokeWidth="1.5" />
        </svg>
      );
    case 'violet':
      // Crescent / Crown
      return (
        <svg viewBox="0 0 24 24" className="w-[70%] h-[70%] opacity-30 pointer-events-none" aria-hidden="true">
          <path d="M5 16 L7 8 L12 12 L17 8 L19 16 Z" fill="none" stroke="#fff4d4" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    default:
      // Rose / 6-petal rosette
      return (
        <svg viewBox="0 0 24 24" className="w-[72%] h-[72%] opacity-30 pointer-events-none" aria-hidden="true">
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff4d4" strokeWidth="1.4" strokeDasharray="3 2" />
        </svg>
      );
  }
};

export const PlayerMedal: React.FC<PlayerMedalProps> = ({
  name,
  colorId,
  colorHex,
  colorRing,
  size = 'md',
  isAlive = true,
  isActive = false,
  isMe = false,
  isTargetable = false,
  isUnderAttack = false,
  title,
  onClick,
}) => {
  const initial = name.slice(0, 1);

  const outerSizeClass =
    size === 'sm'
      ? 'w-[19px] h-[19px] sm:w-[21px] sm:h-[21px]'
      : 'w-[28px] h-[28px] sm:w-[32px] sm:h-[32px]';

  const textSizeClass =
    size === 'sm'
      ? 'text-[8.5px] sm:text-[9.5px]'
      : 'text-[11px] sm:text-[12.5px]';

  const pedestalOffset = size === 'sm' ? 'translate-y-[2.5px]' : 'translate-y-[3.5px]';
  const paddingClass = size === 'sm' ? 'p-[2px]' : 'p-[2.5px]';

  const statusRing = isUnderAttack
    ? 'ring-2 ring-red-500 scale-110'
    : isTargetable
    ? 'ring-2 ring-red-400'
    : isActive
    ? 'ring-2 ring-amber-300 scale-110'
    : isMe
    ? 'ring-1 ring-amber-100/90'
    : '';

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`relative rounded-full shrink-0 transition-transform hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none ${outerSizeClass} ${
        !isAlive ? 'opacity-45 grayscale' : ''
      }`}
    >
      {/* Tabletop grounded contact shadow (bottom-right) */}
      <span
        className={`pointer-events-none absolute inset-0 rounded-full translate-x-[2px] ${
          size === 'sm' ? 'translate-y-[4px]' : 'translate-y-[5.5px]'
        }`}
        style={{
          background: 'rgba(5, 2, 1, 0.85)',
          filter: 'blur(2.5px)',
        }}
      />

      {/* Physical 3D cylindrical wood/bronze thickness pedestal underneath */}
      <span
        className={`pointer-events-none absolute inset-0 rounded-full ${pedestalOffset}`}
        style={{
          background: 'linear-gradient(180deg, #5c4016 0%, #2b1a09 65%, #160c04 100%)',
          border: '1px solid #1b0f05',
        }}
      />

      {/* Active turn engraved brass collar indicator (Board only) */}
      {isActive && size === 'md' && (
        <span
          className="pointer-events-none absolute -top-3.5 left-1/2 -translate-x-1/2 px-1 py-[1px] rounded bg-[#18120d]/95 border border-amber-300/85 text-[7px] font-black text-amber-200 leading-none whitespace-nowrap shadow"
        >
          手番
        </span>
      )}

      {/* Under-attack clear marker */}
      {isUnderAttack && size === 'md' && (
        <span
          className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 px-1 py-[1px] rounded bg-red-950/95 border border-red-400 text-[7px] font-black text-red-100 leading-none whitespace-nowrap shadow"
        >
          対象
        </span>
      )}

      {/* Top carved brass/wooden rim */}
      <span
        className={`relative w-full h-full rounded-full flex items-center justify-center ${paddingClass} ${statusRing}`}
        style={{
          background:
            'linear-gradient(145deg, #f3d78c 0%, #c69a3f 38%, #77551b 78%, #47300b 100%)',
          boxShadow:
            'inset 0 1px 1px rgba(255, 245, 210, 0.7), inset 0 -1px 1.5px rgba(28, 16, 4, 0.85)',
        }}
      >
        {/* Recessed lacquered wood / enamel face with engraved crest & initial */}
        <span
          className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
          style={{
            background: `radial-gradient(circle at 34% 28%, ${colorRing} 0%, ${colorHex} 56%, #140b07 100%)`,
            border: '1px solid rgba(248, 224, 158, 0.58)',
            boxShadow:
              'inset 0 1.5px 2.5px rgba(0, 0, 0, 0.65), inset 0 -1px 1px rgba(255, 240, 195, 0.22)',
          }}
        >
          {/* Engraved emblem crest per player color */}
          <span className="absolute inset-0 flex items-center justify-center">
            <CrestMark colorId={colorId} />
          </span>

          {/* Subtle inner concentric medal ring */}
          <span
            className="pointer-events-none absolute inset-[1.5px] rounded-full"
            style={{
              border: '0.5px solid rgba(255, 236, 179, 0.35)',
            }}
          />

          {/* Stamped antique serif initial */}
          <span
            className={`relative font-display-serif font-bold leading-none select-none ${textSizeClass}`}
            style={{
              color: '#fff6da',
              textShadow:
                '0 1px 1.5px rgba(10, 5, 2, 0.95), 0 -0.5px 0 rgba(255, 248, 220, 0.45)',
            }}
          >
            {initial}
          </span>
        </span>
      </span>
    </button>
  );
};
