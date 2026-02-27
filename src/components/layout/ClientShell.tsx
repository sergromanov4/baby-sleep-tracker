'use client';

import StickyNowBar from '@/components/layout/StickyNowBar';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <StickyNowBar />
    </>
  );
}
