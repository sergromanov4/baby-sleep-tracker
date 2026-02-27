'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

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
  const { t } = useI18n();

  return (
    <div className="header">
      {back ? (
        <button className="button" onClick={() => router.back()} aria-label={t('header.back')}>
          &larr;
        </button>
      ) : null}
      <div className="headerTitle">{title}</div>
      <div style={{ marginLeft: 'auto' }}>{right}</div>
    </div>
  );
}
