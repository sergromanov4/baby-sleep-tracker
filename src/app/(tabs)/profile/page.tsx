'use client';

import { useEffect, useMemo, useState } from 'react';
import ActiveChildGate from '@/components/gates/ActiveChildGate';
import Header from '@/components/layout/Header';
import {
  createChild,
  getAppState,
  listChildren,
  listGrowthEntries,
  setActiveChild,
} from '@/lib/repo';
import { getAuthMode, setAuthMode, getSession, signOut } from '@/lib/auth/session';
import type { Child, GrowthEntry, Sex } from '@/lib/types';
import { ageInMonths, formatDateRu } from '@/lib/time';
import { exportAllToExcel } from '@/lib/exportExcel';
import { useToast } from '@/components/feedback/useToast';
import AppSelect from '@/components/forms/AppSelect';

export default function ProfilePage() {
  return (
    <ActiveChildGate title="Профиль">{(child) => <ProfileScreen child={child} />}</ActiveChildGate>
  );
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
    () => (typeof lastGrowth?.weightKg === 'number' ? `${lastGrowth.weightKg} кг` : '—'),
    [lastGrowth],
  );
  const lastGrowthHeight = useMemo(
    () => (typeof lastGrowth?.heightCm === 'number' ? `${lastGrowth.heightCm} см` : '—'),
    [lastGrowth],
  );

  return (
    <>
      <Header title="Профиль" />

      <div className="stack">
        <div className="card stack">
          <div style={{ fontWeight: 900 }}>Активный ребенок</div>
          <AppSelect
            value={activeId}
            onChange={async (id) => {
              setActiveId(id);
              await setActiveChild(id);
              // Refresh by hard navigation
              location.reload();
            }}
            options={children.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small">Дата рождения</div>
            <div style={{ fontWeight: 700 }}>{child.dob}</div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small">Возраст</div>
            <div style={{ fontWeight: 700 }}>{ageMonths} мес</div>
          </div>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small">Последний замер</div>
            <div style={{ fontWeight: 700 }}>
              {lastGrowthWeight} · {lastGrowthHeight}
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small">Дата замера</div>
            <div style={{ fontWeight: 700 }}>
              {lastGrowth ? formatDateRu(lastGrowth.date) : '—'}
            </div>
          </div>
        </div>

        <div className="card stack">
          <div style={{ fontWeight: 900 }}>Экспорт</div>
          <button
            className="button buttonFull"
            onClick={async () => {
              await exportAllToExcel();
              show('Экспорт начался (скачивание файла)');
            }}
          >
            Выгрузить в Excel (.xlsx)
          </button>
          <div className="small">Файл содержит листы: Children, Sleep, Growth.</div>
        </div>

        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 900 }}>Добавить ребенка</div>
            <button className="button" onClick={() => setAdding((v) => !v)}>
              {adding ? 'Скрыть' : 'Открыть'}
            </button>
          </div>

          {adding ? (
            <div className="stack">
              <div className="field">
                <div className="label">Имя</div>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <div className="label">Дата рождения</div>
                <input
                  className="input"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
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
                className="button buttonPrimary buttonFull"
                disabled={!dob}
                onClick={async () => {
                  const c = await createChild({ name, dob, sex });
                  const list = await listChildren();
                  setChildren(list);
                  show(`Добавлен: ${c.name}`);
                  setName('');
                  setDob('');
                  setSex('female');
                }}
              >
                Добавить
              </button>
            </div>
          ) : null}
        </div>

        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            Аккаунт и синхронизация (архитектура готова)
          </div>
          <div className="small" style={{ marginBottom: 10 }}>
            Сейчас MVP работает без аккаунтов: все хранится локально в браузере (IndexedDB). Мы
            подготовили структуру для будущей авторизации: режимы <b>local</b> и <b>cloud</b>,
            сессия будет храниться в AppState.
          </div>

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800 }}>Режим данных</div>
              <div className="small">local — только устройство · cloud — синхронизация (позже)</div>
            </div>
            <AppSelect
              value={authMode}
              onChange={async (nextAuthMode) => {
                setAuthModeState(nextAuthMode);
                await setAuthMode(nextAuthMode);
                show(
                  nextAuthMode === 'cloud'
                    ? 'Cloud режим включён (пока без логина — работает как local)'
                    : 'Local режим включён',
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
            <div className="pill">Сессия: {hasSession ? 'есть' : 'нет'}</div>
            <button
              className="button"
              disabled={!hasSession}
              onClick={async () => {
                await signOut();
                setHasSession(false);
                setAuthModeState('local');
                show('Вышли из аккаунта');
              }}
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      {Toast}
    </>
  );
}
