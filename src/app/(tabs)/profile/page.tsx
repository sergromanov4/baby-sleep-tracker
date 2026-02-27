'use client';

import { useEffect, useMemo, useState } from 'react';
import ActiveChildGate from '@/components/gates/ActiveChildGate';
import {
  createChild,
  getAppState,
  listChildren,
  listGrowthEntries,
  setActiveChild,
} from '@/lib/repo';
import { getAuthMode, getSession, setAuthMode, signOut } from '@/lib/auth/session';
import type { AppLanguage, Child, GrowthEntry, Sex } from '@/lib/types';
import { ageInMonths } from '@/lib/time';
import { exportAllToExcel } from '@/lib/exportExcel';
import { useToast } from '@/components/feedback/useToast';
import AppSelect from '@/components/forms/AppSelect';
import { useI18n } from '@/lib/i18n';

export default function ProfilePage() {
  return <ActiveChildGate>{(child) => <ProfileScreen child={child} />}</ActiveChildGate>;
}

function ProfileScreen({ child }: { child: Child }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [activeId, setActiveId] = useState(child.id);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex>('female');
  const [authMode, setAuthModeState] = useState<'local' | 'cloud'>('local');
  const [hasSession, setHasSession] = useState(false);
  const [lastGrowth, setLastGrowth] = useState<GrowthEntry | null>(null);
  const { show, Toast } = useToast();
  const { language, setLanguage, t, formatDateValue } = useI18n();
  const languageChangedMessage: Record<AppLanguage, string> = {
    ru: 'Язык интерфейса изменен',
    en: 'Interface language changed',
    fr: "Langue de l'interface modifiee",
    de: 'Sprache der Benutzeroberflaeche geaendert',
    es: 'Idioma de la interfaz cambiado',
    zh: '界面语言已更改',
  };

  useEffect(() => {
    (async () => {
      await getAppState();
      const list = await listChildren();
      setChildren(list);

      const mode = await getAuthMode();
      setAuthModeState(mode);
      setHasSession(!!(await getSession()));
    })();
  }, []);

  useEffect(() => {
    setActiveId(child.id);
  }, [child.id]);

  useEffect(() => {
    (async () => {
      const entries = await listGrowthEntries(child.id);
      const latestWithData =
        [...entries]
          .reverse()
          .find(
            (entry) => typeof entry.weightKg === 'number' || typeof entry.heightCm === 'number',
          ) ?? null;
      setLastGrowth(latestWithData);
    })();
  }, [child.id]);

  const ageMonths = useMemo(() => ageInMonths(child.dob), [child.dob]);
  const lastGrowthWeight = useMemo(
    () => (typeof lastGrowth?.weightKg === 'number' ? `${lastGrowth.weightKg} kg` : '—'),
    [lastGrowth],
  );
  const lastGrowthHeight = useMemo(
    () => (typeof lastGrowth?.heightCm === 'number' ? `${lastGrowth.heightCm} cm` : '—'),
    [lastGrowth],
  );

  return (
    <>
      <div className="stack">
        <div className="card stack">
          <div style={{ fontWeight: 900 }}>{t('profile.activeChild')}</div>
          <AppSelect
            value={activeId}
            onChange={async (id) => {
              setActiveId(id);
              await setActiveChild(id);
              location.reload();
            }}
            options={children.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small">{t('profile.birthDate')}</div>
            <div style={{ fontWeight: 700 }}>{child.dob}</div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small">{t('profile.age')}</div>
            <div style={{ fontWeight: 700 }}>{t('profile.ageMonths', { count: ageMonths })}</div>
          </div>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small">{t('profile.lastMeasurement')}</div>
            <div style={{ fontWeight: 700 }}>
              {lastGrowthWeight} · {lastGrowthHeight}
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small">{t('profile.measureDate')}</div>
            <div style={{ fontWeight: 700 }}>
              {lastGrowth ? formatDateValue(lastGrowth.date) : '—'}
            </div>
          </div>
        </div>

        <div className="card stack">
          <div style={{ fontWeight: 900 }}>{t('profile.language')}</div>
          <AppSelect
            value={language}
            onChange={async (nextLanguage: AppLanguage) => {
              await setLanguage(nextLanguage);
              show(languageChangedMessage[nextLanguage]);
            }}
            options={[
              { value: 'ru', label: '🇷🇺 Русский' },
              { value: 'en', label: '🇬🇧 English' },
              { value: 'fr', label: '🇫🇷 Français' },
              { value: 'de', label: '🇩🇪 Deutsch' },
              { value: 'es', label: '🇪🇸 Español' },
              { value: 'zh', label: '🇨🇳 中文' },
            ]}
          />
        </div>

        <div className="card stack">
          <div style={{ fontWeight: 900 }}>{t('profile.export')}</div>
          <button
            className="button buttonFull"
            onClick={async () => {
              await exportAllToExcel();
              show(t('profile.exportStarted'));
            }}
          >
            {t('profile.exportButton')}
          </button>
          <div className="small">{t('profile.exportHint')}</div>
        </div>

        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 900 }}>{t('profile.addChild')}</div>
            <button className="button" onClick={() => setAdding((v) => !v)}>
              {adding ? t('profile.hide') : t('profile.addButton')}
            </button>
          </div>

          {adding ? (
            <div className="stack">
              <div className="field">
                <div className="label">{t('profile.name')}</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <div className="label">{t('profile.dob')}</div>
                <input
                  className="input"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div className="field">
                <div className="label">{t('profile.sex')}</div>
                <AppSelect
                  value={sex}
                  onChange={(nextSex) => setSex(nextSex)}
                  options={[
                    { value: 'female', label: t('profile.sexFemale') },
                    { value: 'male', label: t('profile.sexMale') },
                  ]}
                />
              </div>
              <button
                className="button buttonPrimary buttonFull"
                disabled={!dob}
                onClick={async () => {
                  const c = await createChild({ name, dob, sex });
                  const list = await listChildren();
                  setChildren(list);
                  show(t('profile.childAdded', { name: c.name }));
                  setName('');
                  setDob('');
                  setSex('female');
                }}
              >
                {t('profile.add')}
              </button>
            </div>
          ) : null}
        </div>

        {/* <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>{t('profile.accountTitle')}</div>
          <div className="small" style={{ marginBottom: 10 }}>
            {t('profile.accountDesc')}
          </div>

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800 }}>{t('profile.dataMode')}</div>
              <div className="small">{t('profile.dataModeHint')}</div>
            </div>
            <AppSelect
              value={authMode}
              onChange={async (nextAuthMode) => {
                setAuthModeState(nextAuthMode);
                await setAuthMode(nextAuthMode);
                show(
                  nextAuthMode === 'cloud' ? t('profile.cloudEnabled') : t('profile.localEnabled'),
                );
              }}
              options={[
                { value: 'local', label: 'local' },
                { value: 'cloud', label: 'cloud' },
              ]}
              style={{ maxWidth: 150 }}
            />
          </div>

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <div className="pill">
              {t('profile.session')}:{' '}
              {hasSession ? t('profile.sessionYes') : t('profile.sessionNo')}
            </div>
            <button
              className="button"
              disabled={!hasSession}
              onClick={async () => {
                await signOut();
                setHasSession(false);
                setAuthModeState('local');
                show(t('profile.signedOut'));
              }}
            >
              {t('profile.signOut')}
            </button>
          </div>
        </div> */}
      </div>

      {Toast}
    </>
  );
}
