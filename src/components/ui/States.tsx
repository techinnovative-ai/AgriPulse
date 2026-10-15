import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { Button } from './Button';

/* ---------- Empty state ---------- */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actions, compact, className }) => (
  <div className={['ap-empty', compact ? 'ap-empty--compact' : '', className || ''].filter(Boolean).join(' ')} role="status">
    {icon && <span className="ap-empty__icon">{icon}</span>}
    <p className="ap-empty__title">{title}</p>
    {description && <p className="ap-empty__description">{description}</p>}
    {actions && <div className="ap-empty__actions">{actions}</div>}
  </div>
);

/* ---------- Error state ---------- */

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title = 'Something went wrong', message, onRetry, retrying, compact }) => (
  <div className={['ap-empty', compact ? 'ap-empty--compact' : ''].filter(Boolean).join(' ')} role="alert" style={{ borderColor: '#efc9c4', background: '#fff8f7' }}>
    <span className="ap-empty__icon" style={{ color: '#a33b34', background: '#fde8e5' }}>
      <AlertCircle size={20} />
    </span>
    <p className="ap-empty__title">{title}</p>
    <p className="ap-empty__description">{message}</p>
    {onRetry && (
      <div className="ap-empty__actions">
        <Button variant="outline" size="sm" onClick={onRetry} loading={retrying} leadingIcon={<RefreshCw size={13} />}>
          Try again
        </Button>
      </div>
    )}
  </div>
);

/* ---------- Inline notice ---------- */

export type NoticeTone = 'info' | 'neutral' | 'warning' | 'danger' | 'success';

const NOTICE_ICON: Record<NoticeTone, React.ReactNode> = {
  info: <Info />,
  neutral: <Info />,
  warning: <AlertTriangle />,
  danger: <AlertCircle />,
  success: <CheckCircle2 />,
};

interface NoticeProps {
  tone?: NoticeTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  role?: 'status' | 'alert' | 'note';
}

export const Notice: React.FC<NoticeProps> = ({ tone = 'info', title, children, actions, className, role }) => (
  <div className={`ap-notice ap-notice--${tone} ${className || ''}`.trim()} role={role || (tone === 'danger' ? 'alert' : 'status')}>
    {NOTICE_ICON[tone]}
    <div className="min-w-0 flex-1">
      {title && <strong className="block">{title}</strong>}
      {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

/* ---------- Skeletons ---------- */

export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <span className={`ap-skeleton block ${className || ''}`.trim()} style={style} aria-hidden="true" />
);

export const SkeletonCard: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className }) => (
  <div className={`ap-panel p-5 ${className || ''}`.trim()} aria-hidden="true">
    <Skeleton className="h-3 w-1/3" />
    <Skeleton className="mt-4 h-7 w-1/2" />
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton key={index} className="mt-2.5 h-2.5" style={{ width: `${88 - index * 14}%` }} />
    ))}
  </div>
);

export const SkeletonList: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-2.5" aria-hidden="true">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="mt-2 h-2.5 w-4/5" />
        </div>
      </div>
    ))}
  </div>
);
