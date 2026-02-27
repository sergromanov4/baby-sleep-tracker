import './globals.css';
import type { Metadata } from 'next';
import ClientShell from '@/components/layout/ClientShell';

export const metadata: Metadata = {
  title: 'Baby Sleep Tracker MVP',
  description: 'MVP для трекинга сна и роста ребенка (локально в браузере)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
