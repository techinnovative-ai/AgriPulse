import React from 'react';

interface PanelProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Remove body padding (for tables, lists, maps). */
  flush?: boolean;
  /** Elevate on hover (for clickable panels). */
  interactive?: boolean;
  as?: 'section' | 'article' | 'div' | 'aside';
  bodyClassName?: string;
  children?: React.ReactNode;
}

/**
 * White rounded surface used for every content block inside the portal.
 * Mirrors the Farmer Portal's `bg-white rounded-2xl border border-slate-200 shadow-sm` cards.
 */
export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  actions,
  flush,
  interactive,
  as: Tag = 'section',
  className,
  bodyClassName,
  children,
  ...rest
}) => {
  const hasHeader = Boolean(title || subtitle || actions);
  return (
    <Tag className={['ap-panel', interactive ? 'ap-panel--interactive' : '', className || ''].filter(Boolean).join(' ')} {...rest}>
      {hasHeader && (
        <header className={`ap-panel__header${children ? '' : ' ap-panel__header--flush'}`}>
          <div className="min-w-0">
            {title && <h3 className="ap-panel__title">{title}</h3>}
            {subtitle && <p className="ap-panel__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      {children !== undefined && children !== null && (
        <div className={['ap-panel__body', flush ? 'ap-panel__body--flush' : '', bodyClassName || ''].filter(Boolean).join(' ')}>{children}</div>
      )}
    </Tag>
  );
};
