import React from 'react';

interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Secondary row rendered under the header (filters, farm scope chips, source notes). */
  meta?: React.ReactNode;
}

/** Consistent page title block used by every portal module. */
export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, icon, title, description, actions, meta }) => (
  <div className="flex flex-col gap-3">
    <header className="ap-page-header">
      <div className="min-w-0">
        {eyebrow && (
          <div className="ap-page-header__eyebrow">
            {icon}
            <span>{eyebrow}</span>
          </div>
        )}
        <h2 className="ap-page-header__title">{title}</h2>
        {description && <p className="ap-page-header__description">{description}</p>}
      </div>
      {actions && <div className="ap-page-header__actions">{actions}</div>}
    </header>
    {meta && <div className="flex flex-wrap items-center gap-2">{meta}</div>}
  </div>
);
