'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export default function Header({
  title,
  back,
  right,
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="header">
      {back ? (
        <button className="button" onClick={() => router.back()} aria-label="Назад">
          ←
        </button>
      ) : null}
      <div className="headerTitle">{title}</div>
      <div style={{ marginLeft: 'auto' }}>{right}</div>
    </div>
  );
}
