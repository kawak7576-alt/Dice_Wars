import React from 'react';
import type { CharacterDef } from '../types/game.ts';

interface CharacterAvatarProps {
  character: CharacterDef | null;
  size?: number;
  className?: string;
}

const CHARACTER_VISUALS: Record<
  string,
  { bg1: string; bg2: string; hair: string; outfit: string; hat?: string; eyes: string; emblem: string }
> = {
  alice: { bg1: '#2e1f4d', bg2: '#553c7b', hair: '#b8a9e8', outfit: '#3b2d54', hat: '#2c223e', eyes: '#8b5cf6', emblem: '✦' },
  angela: { bg1: '#3d1d4a', bg2: '#7a357f', hair: '#f3d1e6', outfit: '#63295d', hat: '#8f3f7b', eyes: '#ec4899', emblem: '❀' },
  byron: { bg1: '#2b213a', bg2: '#563c6e', hair: '#524136', outfit: '#3b2b23', hat: '#231b16', eyes: '#f59e0b', emblem: '⚖' },
  craig: { bg1: '#3b152a', bg2: '#702043', hair: '#1e1b29', outfit: '#4b172a', eyes: '#e11d48', emblem: '⚔' },
  claire: { bg1: '#24224a', bg2: '#4b4588', hair: '#fef08a', outfit: '#e2e8f0', eyes: '#38bdf8', emblem: '✝' },
  daniel: { bg1: '#1e2038', bg2: '#3f3d6e', hair: '#94a3b8', outfit: '#334155', eyes: '#a855f7', emblem: '◈' },
  eimi: { bg1: '#13284d', bg2: '#234c8c', hair: '#1e293b', outfit: '#1d4ed8', eyes: '#60a5fa', emblem: '🛡' },
  emma: { bg1: '#0f2d4c', bg2: '#1e5c8e', hair: '#fb923c', outfit: '#1e40af', hat: '#172554', eyes: '#38bdf8', emblem: '✧' },
  felix: { bg1: '#122240', bg2: '#234173', hair: '#cbd5e1', outfit: '#1e3a8a', eyes: '#93c5fd', emblem: '⛓' },
  freddy: { bg1: '#172554', bg2: '#1d4ed8', hair: '#fde047', outfit: '#1e293b', eyes: '#38bdf8', emblem: '⚡' },
  gordon: { bg1: '#1b263b', bg2: '#324a6d', hair: '#78350f', outfit: '#475569', eyes: '#60a5fa', emblem: '⚒' },
  ulrich: { bg1: '#3a1118', bg2: '#6b1c26', hair: '#312e81', outfit: '#1f1624', hat: '#110d14', eyes: '#f87171', emblem: '🎭' },
  allister: { bg1: '#2e0b16', bg2: '#5f1428', hair: '#e2e8f0', outfit: '#3f0e1e', eyes: '#ef4444', emblem: '☽' },
  vampire: { bg1: '#2c090e', bg2: '#68101c', hair: '#0f172a', outfit: '#450a0a', eyes: '#dc2626', emblem: '🩸' },
  kodoku: { bg1: '#261421', bg2: '#521e3e', hair: '#3b0764', outfit: '#31102f', eyes: '#f43f5e', emblem: '☠' },
  walpurgis: { bg1: '#240b0e', bg2: '#64171c', hair: '#dc2626', outfit: '#1c1917', eyes: '#fbbf24', emblem: '🐺' },
};

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ character, size = 64, className = '' }) => {
  if (!character) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        className={`rounded-full ${className}`}
        aria-label="正体不明"
      >
        <defs>
          <radialGradient id="unk-bg" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="39" fill="url(#unk-bg)" stroke="#c59b47" strokeWidth="2" />
        <path d="M22 72 C22 50, 58 50, 58 72" fill="#1e293b" />
        <path d="M25 46 C25 22, 55 22, 55 46 L50 56 L30 56 Z" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
        <text x="40" y="45" textAnchor="middle" fill="#d4af5a" fontSize="22" fontWeight="700">
          ?
        </text>
      </svg>
    );
  }

  const v = CHARACTER_VISUALS[character.id] ?? CHARACTER_VISUALS.alice;
  const gradId = `char-bg-${character.id}`;
  const ringColor =
    character.faction === 'CITIZEN'
      ? '#a855f7'
      : character.faction === 'RAIDER'
      ? '#3b82f6'
      : '#ef4444';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={`rounded-full ${className}`}
      aria-label={character.name}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="32%" r="68%">
          <stop offset="0%" stopColor={v.bg2} />
          <stop offset="100%" stopColor={v.bg1} />
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="39" fill={`url(#${gradId})`} stroke={ringColor} strokeWidth="2.4" />
      <circle cx="40" cy="40" r="35.5" fill="none" stroke="#e2c074" strokeWidth="0.9" strokeOpacity="0.65" />

      {/* Shoulders / Cloak */}
      <path d="M16 74 C18 53, 62 53, 64 74 Z" fill={v.outfit} />
      <path d="M31 54 L40 65 L49 54" fill="none" stroke="#e2c074" strokeWidth="1.5" />

      {/* Back Hair */}
      <ellipse cx="40" cy="36" rx="18" ry="20" fill={v.hair} />

      {/* Face */}
      <path d="M26 35 C26 24, 54 24, 54 35 C54 47, 47 54, 40 54 C33 54, 26 47, 26 35 Z" fill="#fde6d8" />

      {/* Eyes */}
      <circle cx="34" cy="39" r="2.6" fill={v.eyes} />
      <circle cx="46" cy="39" r="2.6" fill={v.eyes} />
      <circle cx="34.8" cy="38.2" r="0.9" fill="#ffffff" />
      <circle cx="46.8" cy="38.2" r="0.9" fill="#ffffff" />

      {/* Mouth */}
      <path d="M37 46 Q40 48.5 43 46" fill="none" stroke="#c08070" strokeWidth="1.3" strokeLinecap="round" />

      {/* Front Bangs */}
      <path
        d="M23 34 C25 20, 55 20, 57 34 C51 27, 45 31, 40 27 C35 31, 29 27, 23 34 Z"
        fill={v.hair}
      />

      {/* Optional Hat (Alice, Angela, Byron, Emma, Ulrich) */}
      {v.hat && (
        <g>
          <ellipse cx="40" cy="23" rx="24" ry="5" fill={v.hat} stroke="#d4af5a" strokeWidth="1" />
          <path d="M27 23 C28 11, 52 11, 53 23 Z" fill={v.hat} stroke="#d4af5a" strokeWidth="1" />
          <path d="M27 21 Q40 24 53 21" fill="none" stroke="#a855f7" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
};
