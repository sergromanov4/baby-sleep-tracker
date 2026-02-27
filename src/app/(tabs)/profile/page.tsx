'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ActiveChildGate from '@/components/gates/ActiveChildGate';
import Header from '@/components/layout/Header';
import { createChild, getAppState, listChildren, setActiveChild } from '@/lib/repo';
import { getAuthMode, setAuthMode, getSession, signOut } from '@/lib/auth/session';
import type { Child, Sex } from '@/lib/types';
import { ageInMonths } from '@/lib/time';
import { exportAllToExcel } from '@/lib/exportExcel';
import { useToast } from '@/components/feedback/useToast';

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

  const ageMonths = useMemo(() => ageInMonths(child.dob), [child.dob]);

  return (
    <>
      <Header title="Профиль" />

      <div className="stack">
        <div className="card stack">
          <div style={{ fontWeight: 900 }}>Активный ребенок</div>
          <select
            className="select"
            value={activeId}
            onChange={async (e) => {
              const id = e.target.value;
              setActiveId(id);
              await setActiveChild(id);
              // Refresh by hard navigation
              location.reload();
            }}
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small">Дата рождения</div>
            <div style={{ fontWeight: 700 }}>{child.dob}</div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small">Возраст</div>
            <div style={{ fontWeight: 700 }}>{ageMonths} мес</div>
          </div>

          <Link className="button buttonFull" href="/growth">
            Рост и вес
          </Link>
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
                <select
                  className="select"
                  value={sex}
                  onChange={(e) => setSex(toSex(e.target.value))}
                >
                  <option value="female">Девочка</option>
                  <option value="male">Мальчик</option>
                </select>
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
            <select
              className="select"
              value={authMode}
              onChange={async (e) => {
                const v = toAuthMode(e.target.value);
                setAuthModeState(v);
                await setAuthMode(v);
                show(
                  v === 'cloud'
                    ? 'Cloud режим включён (пока без логина — работает как local)'
                    : 'Local режим включён',
                );
              }}
              style={{ maxWidth: 150 }}
            >
              <option value="local">local</option>
              <option value="cloud">cloud</option>
            </select>
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

function toSex(value: string): Sex {
  return value === 'male' ? 'male' : 'female';
}

function toAuthMode(value: string): 'local' | 'cloud' {
  return value === 'cloud' ? 'cloud' : 'local';
}
