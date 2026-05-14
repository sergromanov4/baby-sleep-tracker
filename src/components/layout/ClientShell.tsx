'use client';

import StickyNowBar from '@/components/layout/StickyNowBar';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegistration />
      {children}
      <StickyNowBar />
    </>
  );
}
