'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/sleep', label: 'Сон', icon: '🌙' },
  { href: '/day', label: 'День', icon: '🗓️' },
  { href: '/stats', label: 'Статистика', icon: '📊' },
  { href: '/growth', label: 'Рост/вес', icon: '📏' },
  { href: '/profile', label: 'Профиль', icon: '👤' },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Навигация">
      <div className="tabbarInner">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link key={t.href} href={t.href} className={`tabItem ${active ? 'tabItemActive' : ''}`}>
              <div className="tabIcon" aria-hidden>
                {t.icon}
              </div>
              <div>{t.label}</div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
