import React from 'react';
import { Link } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'on-dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  iconOnly?: boolean;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

type ButtonAsButton = BaseProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { to?: undefined; href?: undefined };
type ButtonAsLink = BaseProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className' | 'href'> & { to: string; href?: undefined };
type ButtonAsAnchor = BaseProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className'> & { href: string; to?: undefined };

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor;

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  block,
  iconOnly,
  className,
}: Pick<BaseProps, 'variant' | 'size' | 'block' | 'iconOnly' | 'className'>): string {
  return [
    'ap-btn',
    `ap-btn--${variant}`,
    size !== 'md' ? `ap-btn--${size}` : '',
    block ? 'ap-btn--block' : '',
    iconOnly ? 'ap-btn--icon' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Shared button. Renders a router <Link> when `to` is supplied, an <a> when `href` is
 * supplied, otherwise a native <button type="button">.
 */
export const Button: React.FC<ButtonProps> = (props) => {
  const { variant, size, block, iconOnly, loading, leadingIcon, trailingIcon, className, children, ...rest } = props;
  const classes = buttonClassName({ variant, size, block, iconOnly, className });
  const content = (
    <>
      {loading ? <span className="ap-spinner" aria-hidden="true" /> : leadingIcon}
      {children && <span>{children}</span>}
      {!loading && trailingIcon}
    </>
  );

  if ('to' in rest && rest.to) {
    const { to, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link to={to} className={classes} aria-busy={loading || undefined} {...(linkRest as Omit<ButtonAsLink, 'to'>)}>
        {content}
      </Link>
    );
  }

  if ('href' in rest && rest.href) {
    const anchorRest = rest as ButtonAsAnchor;
    return (
      <a className={classes} aria-busy={loading || undefined} {...anchorRest}>
        {content}
      </a>
    );
  }

  const { type, disabled, ...buttonRest } = rest as ButtonAsButton;
  return (
    <button type={type || 'button'} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...buttonRest}>
      {content}
    </button>
  );
};
