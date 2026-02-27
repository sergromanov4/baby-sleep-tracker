import './globals.css';
import type { Metadata } from 'next';
import ClientShell from '@/components/layout/ClientShell';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Baby Sleep Tracker MVP',
  description: 'MVP для трекинга сна и роста ребенка (локально в браузере)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <I18nProvider>
          <ClientShell>{children}</ClientShell>
        </I18nProvider>
      </body>
    </html>
  );
}
