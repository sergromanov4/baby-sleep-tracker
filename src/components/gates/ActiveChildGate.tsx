'use client';

import { useEffect, useState } from 'react';
import type { Child, Sex } from '@/lib/types';
import { createChild, getActiveChild, getAppState } from '@/lib/repo';
import Header from '@/components/layout/Header';
import { useToast } from '@/components/feedback/useToast';
import AppSelect from '@/components/forms/AppSelect';

export default function ActiveChildGate({
  title,
  children,
}: {
  title: string;
  children: (child: Child) => React.ReactNode;
}) {
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const { show, Toast } = useToast();

  useEffect(() => {
    (async () => {
      await getAppState();
      const c = await getActiveChild();
      setChild(c ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <>
        <Header title={title} />
        <div className="small">Загрузка…</div>
      </>
    );
  }

  if (!child) {
    return (
      <>
        <Header title={title} />
        <div className="card stack">
          <div style={{ fontWeight: 800, fontSize: 16 }}>Добавьте ребенка</div>
          <AddChildForm
            onCreated={(c) => {
              setChild(c);
              show('Ребенок добавлен');
            }}
          />
          <div className="small">Данные сохраняются локально в браузере (IndexedDB).</div>
        </div>
        {Toast}
      </>
    );
  }

  return (
    <>
      {children(child)}
      {Toast}
    </>
  );
}

function AddChildForm({ onCreated }: { onCreated: (c: Child) => void }) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex>('female');
  const [saving, setSaving] = useState(false);

  return (
    <div className="stack">
      <div className="field">
        <div className="label">Имя</div>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, Маша"
        />
      </div>
      <div className="field">
        <div className="label">Дата рождения</div>
        <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
      </div>
      <div className="field">
        <div className="label">Пол</div>
        <AppSelect
          value={sex}
          onChange={(nextSex) => setSex(nextSex)}
          options={[
            { value: 'female', label: 'Девочка' },
            { value: 'male', label: 'Мальчик' },
          ]}
        />
      </div>
      <button
        className={`button buttonPrimary buttonFull`}
        disabled={saving || !dob}
        onClick={async () => {
          setSaving(true);
          const c = await createChild({ name, dob, sex });
          onCreated(c);
          setSaving(false);
        }}
      >
        {saving ? 'Сохраняю…' : 'Создать профиль'}
      </button>
    </div>
  );
}
