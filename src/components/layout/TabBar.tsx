'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

const tabs = [
  { href: '/sleep', key: 'tab.sleep', icon: '🌙' },
  { href: '/day', key: 'tab.day', icon: '🗓️' },
  { href: '/stats', key: 'tab.stats', icon: '📊' },
  { href: '/growth', key: 'tab.growth', icon: '📏' },
  { href: '/profile', key: 'tab.profile', icon: '👤' },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="tabbar" aria-label={t('tabbar.aria')}>
      <div className="tabbarInner">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`tabItem ${active ? 'tabItemActive' : ''}`}
            >
              <div className="tabIcon" aria-hidden>
                {tab.icon}
              </div>
              <div>{t(tab.key)}</div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
