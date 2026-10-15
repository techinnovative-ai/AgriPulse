import React, { useId } from 'react';
import { Search } from 'lucide-react';

/* ---------- Segmented control ---------- */

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, className }: SegmentedControlProps<T>) {
  return (
    <div className={`ap-segmented ${className || ''}`.trim()} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="ap-segmented__option"
          aria-pressed={option.value === value}
          disabled={option.disabled}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Tabs ---------- */

export interface TabOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  tabs: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs<T extends string>({ tabs, value, onChange, ariaLabel, className }: TabsProps<T>) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.value === value);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onChange(tabs[(index + 1) % tabs.length].value);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onChange(tabs[(index - 1 + tabs.length) % tabs.length].value);
    }
  };
  return (
    <div className={`ap-tabs ${className || ''}`.trim()} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          className="ap-tab"
          aria-selected={tab.value === value}
          tabIndex={tab.value === value ? 0 : -1}
          onClick={() => onChange(tab.value)}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {typeof tab.count === 'number' && <span className="ap-tab__count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Form field ---------- */

interface FieldProps {
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}

/**
 * Labelled control wrapper. Supplies a stable id, aria-describedby and aria-invalid
 * to the control it wraps so every form field is accessible by construction.
 */
export const Field: React.FC<FieldProps> = ({ label, required, hint, error, htmlFor, className, children }) => {
  const generated = useId();
  const id = htmlFor || `field-${generated}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`ap-field ${className || ''}`.trim()}>
      <label className="ap-field__label" htmlFor={id}>
        {label}
        {required && <abbr title="Required">*</abbr>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="ap-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="ap-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

/* ---------- Search input ---------- */

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  label: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ label, className, id, ...rest }) => {
  const generated = useId();
  const inputId = id || `search-${generated}`;
  return (
    <div className={`ap-search ${className || ''}`.trim()}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search aria-hidden="true" />
      <input id={inputId} type="search" className="ap-input" {...rest} />
    </div>
  );
};

/* ---------- Key-value list ---------- */

export const KeyValueList: React.FC<{ items: { label: string; value: React.ReactNode }[]; className?: string }> = ({ items, className }) => (
  <dl className={`ap-kv ${className || ''}`.trim()}>
    {items.map((item) => (
      <div key={item.label}>
        <dt>{item.label}</dt>
        <dd>{item.value}</dd>
      </div>
    ))}
  </dl>
);

/* ---------- Chart legend ---------- */

export const Legend: React.FC<{ items: { label: string; color: string; shape?: 'square' | 'line' | 'dot' }[]; className?: string }> = ({ items, className }) => (
  <div className={`ap-legend ${className || ''}`.trim()} aria-label="Legend">
    {items.map((item) => (
      <span key={item.label}>
        <i
          style={{
            background: item.color,
            borderRadius: item.shape === 'dot' ? '50%' : item.shape === 'line' ? 1 : 3,
            height: item.shape === 'line' ? 3 : 10,
          }}
          aria-hidden="true"
        />
        {item.label}
      </span>
    ))}
  </div>
);
