'use client';

import { useEffect, useState } from 'react';
import type { Child, Sex } from '@/lib/types';
import { createChild, getActiveChild, getAppState } from '@/lib/repo';
import { useToast } from '@/components/feedback/useToast';
import AppSelect from '@/components/forms/AppSelect';
import { useI18n } from '@/lib/i18n';

export default function ActiveChildGate({
  children,
}: {
  children: (child: Child) => React.ReactNode;
}) {
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const { show, Toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    (async () => {
      await getAppState();
      const c = await getActiveChild();
      setChild(c ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="small">{t('gate.loading')}</div>;
  }

  if (!child) {
    return (
      <>
        <div className="card stack">
          <div style={{ fontWeight: 800, fontSize: 16 }}>{t('gate.addChild')}</div>
          <AddChildForm
            onCreated={(c) => {
              setChild(c);
              show(t('gate.childAdded'));
            }}
          />
          <div className="small">{t('gate.localData')}</div>
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
  const { t } = useI18n();

  return (
    <div className="stack">
      <div className="field">
        <div className="label">{t('gate.name')}</div>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('gate.namePlaceholder')}
        />
      </div>
      <div className="field">
        <div className="label">{t('gate.dob')}</div>
        <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
      </div>
      <div className="field">
        <div className="label">{t('gate.sex')}</div>
        <AppSelect
          value={sex}
          onChange={(nextSex) => setSex(nextSex)}
          options={[
            { value: 'female', label: t('gate.sexFemale') },
            { value: 'male', label: t('gate.sexMale') },
          ]}
        />
      </div>
      <button
        className="button buttonPrimary buttonFull"
        disabled={saving || !dob}
        onClick={async () => {
          setSaving(true);
          const c = await createChild({ name, dob, sex });
          onCreated(c);
          setSaving(false);
        }}
      >
        {saving ? t('gate.saving') : t('gate.createProfile')}
      </button>
    </div>
  );
}
