import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface DiceDisplayProps {
  d6: number;
  d4: number;
  purpose?: 'MOVE' | 'ATTACK' | 'EFFECT';
  rollingKey?: string | number;
  highlight?: boolean;
}

const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

export const DiceDisplay: React.FC<DiceDisplayProps> = ({
  d6,
  d4,
  purpose,
  rollingKey,
  highlight = false,
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [shownD6, setShownD6] = useState(d6);
  const [shownD4, setShownD4] = useState(d4);
  const prevKeyRef = useRef<string | number | undefined>(rollingKey);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearAll = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };

    if (rollingKey === prevKeyRef.current) {
      setShownD6(d6);
      setShownD4(d4);
      return;
    }

    prevKeyRef.current = rollingKey;
    clearAll();
    setIsRolling(true);

    // Decelerating physical tumble ticks: fast at start -> slowing down -> settle at ~600ms
    const tickDelays = [55, 115, 185, 270, 375, 490];
    tickDelays.forEach((delay, step) => {
      const t = setTimeout(() => {
        setShownD6(((d6 + step * 2) % 6) + 1);
        setShownD4(((d4 + step) % 4) + 1);
      }, delay);
      timersRef.current.push(t);
    });

    const settleTimer = setTimeout(() => {
      setShownD6(d6);
      setShownD4(d4);
      setIsRolling(false);
    }, 610);
    timersRef.current.push(settleTimer);

    return clearAll;
  }, [rollingKey, d6, d4]);

  const pips = PIP_POSITIONS[shownD6] ?? PIP_POSITIONS[1];
  const resultLabel = isRolling
    ? 'ダイス回転中...'
    : purpose === 'ATTACK'
    ? `6面[${d6}] − 4面[${d4}] = ダメージ ${Math.abs(d6 - d4)}`
    : purpose === 'EFFECT'
    ? `効果ダイス：${d6}`
    : `6面[${d6}] + 4面[${d4}] = 合計 ${d6 + d4}`;

  return (
    <div className="flex items-center justify-start gap-2 sm:gap-3 select-none py-0.5">
      {/* Fixed-position Dice Pair (never shifts horizontally when text length changes) */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Sculpted Ivory 6-sided Die with realistic tumbling, deceleration, and grounded shadow */}
        <motion.div
          key={`d6-${rollingKey}`}
          initial={{ x: -16, y: -10, rotate: -230, scale: 1.08 }}
          animate={{
            x: [null, 7, -3, 1, 0],
            y: [null, -10, -3, -2, 0],
            rotate: [null, -72, -16, 5, 0],
            scale: [null, 1.09, 1.02, 0.98, 1],
          }}
          transition={{
            duration: 0.62,
            times: [0, 0.32, 0.65, 0.85, 1],
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            filter: isRolling
              ? 'drop-shadow(7px 11px 7px rgba(5, 2, 1, 0.72))'
              : 'drop-shadow(4px 6px 5px rgba(5, 2, 1, 0.85))',
          }}
        >
          <svg
            className="w-9 h-9 sm:w-11 sm:h-11"
            viewBox="0 0 100 100"
            aria-label={`6面ダイス ${d6}`}
          >
            <defs>
              <linearGradient id="ivory-d6" x1="0.1" y1="0" x2="0.9" y2="1">
                <stop offset="0%" stopColor="#fffdf7" />
                <stop offset="55%" stopColor="#eee4cf" />
                <stop offset="100%" stopColor="#c4b28e" />
              </linearGradient>
            </defs>
            <rect
              x="8"
              y="8"
              width="84"
              height="84"
              rx="17"
              fill="url(#ivory-d6)"
              stroke="#8e7853"
              strokeWidth="3"
            />
            <rect
              x="14"
              y="14"
              width="72"
              height="72"
              rx="12"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.65"
              strokeWidth="1.5"
            />
            {pips.map(([cx, cy], idx) => (
              <circle key={idx} cx={cx} cy={cy} r="9" fill={shownD6 === 1 ? '#8b1d1d' : '#1c1613'} />
            ))}
          </svg>
        </motion.div>

        {/* Sculpted Ivory 4-sided Pyramid Die */}
        <motion.div
          key={`d4-${rollingKey}`}
          initial={{ x: -12, y: -12, rotate: 200, scale: 1.06 }}
          animate={{
            x: [null, 9, -4, 1.5, 0],
            y: [null, -12, -4, -1.5, 0],
            rotate: [null, 65, 14, -4, 0],
            scale: [null, 1.1, 1.02, 0.98, 1],
          }}
          transition={{
            duration: 0.64,
            times: [0, 0.34, 0.68, 0.86, 1],
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            filter: isRolling
              ? 'drop-shadow(7px 11px 7px rgba(5, 2, 1, 0.72))'
              : 'drop-shadow(4px 6px 5px rgba(5, 2, 1, 0.85))',
          }}
        >
          <svg
            className="w-[38px] h-9 sm:w-[46px] sm:h-11"
            viewBox="0 0 100 94"
            aria-label={`4面ダイス ${d4}`}
          >
            <defs>
              <linearGradient id="ivory-d4" x1="0.2" y1="0" x2="0.85" y2="1">
                <stop offset="0%" stopColor="#fffdf7" />
                <stop offset="60%" stopColor="#e7dcc4" />
                <stop offset="100%" stopColor="#b29f7a" />
              </linearGradient>
            </defs>
            <polygon
              points="50,6 94,84 6,84"
              fill="url(#ivory-d4)"
              stroke="#87714d"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <polygon points="50,6 94,84 71,84" fill="#6b5636" opacity="0.26" />
            <text x="48" y="67" textAnchor="middle" fontSize="33" fontWeight="900" fill="#1c1613">
              {shownD4}
            </text>
          </svg>
        </motion.div>
      </div>

      {purpose && (
        <div
          className={`gold-panel px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black tabular-nums tracking-wide whitespace-nowrap transition-colors ${
            isRolling
              ? 'border-[#c99e48]/70 text-amber-200/80'
              : highlight
              ? 'border-amber-300 text-amber-200'
              : 'text-amber-100'
          }`}
        >
          {resultLabel}
        </div>
      )}
    </div>
  );
};
