'use client';

import React from 'react';

function GradientDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-g1`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6d5efc" />
        <stop offset="1" stopColor="#2ea9ff" />
      </linearGradient>
      <linearGradient id={`${id}-g2`} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a558ff" />
        <stop offset="1" stopColor="#6d5efc" />
      </linearGradient>
    </defs>
  );
}

export function SleepingBabyArt({ title = 'Спящий ребёнок' }: { title?: string }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 120 120" width="72" height="72" role="img" aria-label={title}>
      <GradientDefs id={id} />
      <rect x="10" y="16" width="100" height="84" rx="26" fill={`url(#${id}-g2)`} opacity="0.35" />
      <path
        d="M30 76c10-18 24-28 42-28 9 0 16 2 22 6-7 1-12 4-15 9 6 0 11 2 15 6-4 10-14 20-29 24-15 4-28 0-35-7z"
        fill={`url(#${id}-g1)`}
        opacity="0.95"
      />
      <circle cx="56" cy="60" r="16" fill="rgba(255,255,255,0.85)" />
      <path d="M49 60c3 2 6 2 9 0" stroke="#0b1026" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 56c2-2 4-2 6 0" stroke="#0b1026" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 56c2-2 4-2 6 0" stroke="#0b1026" strokeWidth="3" strokeLinecap="round" />
      <path d="M80 34c4 2 6 5 6 9-3-2-6-2-9 0 1-4 2-6 3-9z" fill="rgba(255,255,255,0.75)" />
      <text x="82" y="30" fontSize="14" fill="rgba(255,255,255,0.9)">
        Z
      </text>
      <text x="92" y="24" fontSize="12" fill="rgba(255,255,255,0.75)">
        z
      </text>
    </svg>
  );
}

export function AwakeBabyArt({ title = 'Бодрствующий ребёнок' }: { title?: string }) {
  const id = React.useId();
  return (
    <svg viewBox="0 0 120 120" width="72" height="72" role="img" aria-label={title}>
      <GradientDefs id={id} />
      <rect x="10" y="16" width="100" height="84" rx="26" fill={`url(#${id}-g1)`} opacity="0.30" />
      <circle cx="60" cy="62" r="22" fill="rgba(255,255,255,0.88)" />
      <circle cx="52" cy="60" r="3" fill="#0b1026" />
      <circle cx="68" cy="60" r="3" fill="#0b1026" />
      <path d="M54 70c4 4 8 4 12 0" stroke="#0b1026" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M60 40c-10 0-18 6-20 14 6-5 12-7 20-7 8 0 14 2 20 7-2-8-10-14-20-14z"
        fill={`url(#${id}-g2)`}
      />
      <path
        d="M30 86c8-8 18-12 30-12s22 4 30 12"
        stroke={`url(#${id}-g1)`}
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="92" cy="34" r="10" fill="rgba(255,255,255,0.25)" />
      <path
        d="M92 28v12M86 34h12"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
