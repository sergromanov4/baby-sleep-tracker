'use client';

import { useEffect, useState } from 'react';
import ActiveChildGate from '@/components/gates/ActiveChildGate';
import Header from '@/components/layout/Header';
import { getAppState, updateAppState } from '@/lib/repo';
import type { Child } from '@/lib/types';

export default function TipsPage() {
  return (
    <ActiveChildGate title="Советы">{(child) => <TipsScreen child={child} />}</ActiveChildGate>
  );
}

function TipsScreen({ child }: { child: Child }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await getAppState();
      setEnabled(s.tipsEnabled);
    })();
  }, []);

  return (
    <>
      <Header title="Советы" />

      <div className="stack">
        <div className="card stack">
          {enabled ? (
            <>
              <div style={{ fontWeight: 800 }}>Сегодня</div>
              <div className="small">
                Если было несколько коротких снов — это может быть нормой для возраста. Следите за
                окнами бодрствования и общим сном за сутки.
              </div>
            </>
          ) : (
            <div className="small">Советы выключены.</div>
          )}

          <button
            className="button"
            onClick={async () => {
              const next = !enabled;
              setEnabled(next);
              await updateAppState({ tipsEnabled: next });
            }}
          >
            {enabled ? 'Не показывать советы' : 'Включить советы'}
          </button>

          <div className="small">Профиль: {child.name}</div>
        </div>
      </div>
    </>
  );
}
