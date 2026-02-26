'use client';

import StickyNowBar from '@/components/StickyNowBar';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <StickyNowBar />
    </>
  );
}
