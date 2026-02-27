'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type AppSelectProps<T extends string = string> = {
  value: T;
  onChange: (value: T) => void | Promise<void>;
  options: ReadonlyArray<SelectOption<T>>;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

export default function AppSelect<T extends string = string>({
  value,
  onChange,
  options,
  disabled,
  className = '',
  style,
  ariaLabel,
}: AppSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!open) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`customSelect ${open ? 'customSelectOpen' : ''}`} style={style}>
      <button
        type="button"
        className={`customSelectTrigger select ${className}`.trim()}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="customSelectLabel">{selected?.label ?? value}</span>
        <span className="customSelectChevron" aria-hidden />
      </button>

      {open ? (
        <div className="customSelectMenu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={`customSelectOption ${
                option.value === value ? 'customSelectOptionActive' : ''
              }`}
              onClick={async () => {
                if (option.disabled) return;
                await onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
