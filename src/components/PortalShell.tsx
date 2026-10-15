import React, { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Calendar, ChevronDown, ChevronRight, LogOut, Menu, Search, X, type LucideIcon } from 'lucide-react';
import { AgriPulseLogo } from './AgriPulseLogo';
import { Button, SeverityBadge, formatRelativeTime, RouteFallback, type Severity } from './ui';

/**
 * PortalShell — the single application frame shared by the Farmer Portal and Seller Central.
 *
 * It owns layout and behaviour only (sidebar with collapsible groups, sticky header, quick search,
 * notification popover, profile menu, mobile drawer, bottom navigation, skip link, print rules).
 * Each portal supplies its navigation, identity, notifications and header widgets, so both portals
 * look and behave identically while showing different data.
 */

export interface ShellNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Count shown at the right edge of the link (hidden when 0). */
  count?: number;
  /** Visual treatment for the count pill. */
  countTone?: 'default' | 'alert' | 'device' | 'cart';
  /** Match only the exact path (used for index routes such as /seller). */
  end?: boolean;
}

export interface ShellNavGroup {
  id: string;
  label: string;
  items: ShellNavItem[];
}

export interface ShellNotification {
  id: string;
  title: string;
  detail?: string;
  severity: Severity;
  /** When the condition arose. Omit for standing conditions (e.g. low stock) that have no event time. */
  occurredAt?: string;
  route: string;
}

export interface ShellSearchResult {
  label: string;
  category: string;
  route: string;
}

export interface ShellProfileMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
}

export interface PortalShellProps {
  /** Used for aria-labels, e.g. "Farmer portal" or "Seller Central". */
  portalLabel: string;
  /** Where the logo links to. */
  homeRoute: string;
  /** Caption under the logo wordmark (defaults to the product caption). */
  brandSubtitle?: string;
  navGroups: ShellNavGroup[];
  /** The "Your account" link rendered after the groups. */
  accountItem: ShellNavItem;
  /** Optional extra control rendered in the sidebar and drawer (e.g. a portal switch). */
  sidebarExtra?: React.ReactNode;
  identity: {
    name: string;
    subtitle: string;
    email: string;
    initials: string;
    isDemo: boolean;
    /** Short badge text next to the name in the sidebar footer, defaults to Demo / Account. */
    badge?: string;
  };
  breadcrumb: { section: string; title: string };
  /** Rendered in the header centre on md+ screens (e.g. the farm switcher). */
  headerCenter?: React.ReactNode;
  /** Rendered as a second header row on small screens. */
  mobileHeaderRow?: React.ReactNode;
  search?: {
    label: string;
    placeholder: string;
    query: string;
    onQueryChange: (query: string) => void;
    results: ShellSearchResult[];
  };
  /** Right-hand header widgets placed before the bell (weather chip, cart, portal switch…). */
  headerActions?: React.ReactNode;
  notifications: {
    label: string;
    items: ShellNotification[];
    urgentCount: number;
    viewAllRoute: string;
    emptyText: string;
    onDismiss?: (id: string) => void;
  };
  profileMenuItems: ShellProfileMenuItem[];
  /** Status rows rendered between the header and the main content. */
  banners?: React.ReactNode;
  mobileBottomNav: { to: string; label: string; icon: LucideIcon; count?: number; end?: boolean }[];
  onLogout: () => void;
  /** localStorage key that remembers collapsed sidebar groups. */
  navStorageKey: string;
  /** Floating elements rendered after the frame (e.g. the assistant launcher). */
  children?: React.ReactNode;
}

function readCollapsedGroups(key: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

const GROUP_LABEL_CLASS = 'px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-300/80';

export const PortalShell: React.FC<PortalShellProps> = ({
  portalLabel,
  brandSubtitle,
  homeRoute,
  navGroups,
  accountItem,
  sidebarExtra,
  identity,
  breadcrumb,
  headerCenter,
  mobileHeaderRow,
  search,
  headerActions,
  notifications,
  profileMenuItems,
  banners,
  mobileBottomNav,
  onLogout,
  navStorageKey,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => readCollapsedGroups(navStorageKey));

  const notifRef = useOutsideClose(notifOpen, () => setNotifOpen(false));
  const profileRef = useOutsideClose(profileMenuOpen, () => setProfileMenuOpen(false));

  useEffect(() => {
    setMobileDrawerOpen(false);
    setNotifOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileDrawerOpen]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((current) => {
      const next = { ...current, [groupId]: !current[groupId] };
      try {
        window.localStorage.setItem(navStorageKey, JSON.stringify(next));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  };

  const handleLogout = () => {
    setProfileMenuOpen(false);
    setMobileDrawerOpen(false);
    onLogout();
  };

  const todayFormatted = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const urgent = notifications.urgentCount > 0;

  const renderNavLink = (item: ShellNavItem, onNavigate?: () => void, compact = false) => {
    const Icon = item.icon;
    const count = item.count || 0;
    const toneClass = item.countTone === 'device' ? 'is-device' : item.countTone === 'cart' ? 'is-cart' : item.countTone === 'alert' ? 'is-alert' : '';
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        className={({ isActive }) => `app-nav-link flex items-center justify-between px-3 ${compact ? 'py-2' : 'py-2.5'} rounded-xl text-xs font-semibold transition-colors ${isActive ? 'is-active' : ''}`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <Icon className="w-[17px] h-[17px] shrink-0" />
          <span className="truncate">{item.label}</span>
        </span>
        {count > 0 && (
          <span className={`app-nav-count ${toneClass}`} aria-label={`${count} items`}>
            {count}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="app-shell min-h-screen bg-warmbg text-slate-900 flex flex-col lg:flex-row">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Desktop sidebar */}
      <aside aria-label="Primary sidebar navigation" className="app-sidebar hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-forest-950 text-white border-r border-forest-900 z-30">
        <div className="app-sidebar-brand px-5 py-5 border-b border-forest-800/80 flex items-center justify-between">
          <NavLink to={homeRoute} className="focus:outline-none" aria-label={`AGRIPULSE ${portalLabel} home`}>
            <AgriPulseLogo size="md" theme="light" subtitle={brandSubtitle} />
          </NavLink>
        </div>

        <nav className="app-sidebar-nav flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label={`${portalLabel} navigation`}>
          {navGroups.map((group) => {
            const collapsed = Boolean(collapsedGroups[group.id]);
            const groupHasActive = group.items.some((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
            return (
              <div key={group.id} className="app-nav-group">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!collapsed}
                  aria-controls={`nav-group-${group.id}`}
                  className="app-nav-group-toggle w-full flex items-center justify-between px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-300/80 hover:text-forest-100"
                >
                  <span>{group.label}</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`} aria-hidden="true" />
                </button>
                <div id={`nav-group-${group.id}`} hidden={collapsed && !groupHasActive}>
                  {group.items.map((item) => renderNavLink(item))}
                </div>
              </div>
            );
          })}

          {sidebarExtra}

          <div className="px-3 pt-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-300/80">Your account</div>
          {renderNavLink(accountItem)}
        </nav>

        <div className="app-sidebar-footer p-3 border-t border-forest-800/80 bg-forest-900/50">
          <div className="px-2.5 py-2 mb-2 rounded-lg bg-forest-900/90 border border-forest-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-white truncate">{identity.name}</span>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-leaf-500/20 text-leaf-300 border border-leaf-500/30 shrink-0">{identity.badge || (identity.isDemo ? 'Demo' : 'Account')}</span>
            </div>
            <p className="text-[10px] text-forest-300 truncate mt-0.5">{identity.subtitle}</p>
          </div>
          <button type="button" onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-200 hover:text-white hover:bg-red-900/50 border border-transparent hover:border-red-700/50 transition-colors">
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="app-main-column flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        <header className="app-header sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" onClick={() => setMobileDrawerOpen(true)} aria-label="Open navigation menu" aria-expanded={mobileDrawerOpen} className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200">
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-forest-700">
                  <span>AGRIPULSE</span>
                  <span aria-hidden="true">/</span>
                  <span className="truncate">{breadcrumb.section}</span>
                </div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">{breadcrumb.title}</h1>
              </div>
            </div>

            {(headerCenter || search) && (
              <div className="hidden md:flex items-center gap-2 min-w-0 flex-1 justify-center max-w-xl">
                {headerCenter}
                {search && (
                  <div className="relative w-full max-w-[280px]">
                    <label htmlFor="global-quick-search" className="sr-only">
                      {search.label}
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="global-quick-search"
                        type="search"
                        value={search.query}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                        onChange={(event) => search.onQueryChange(event.target.value)}
                        placeholder={search.placeholder}
                        autoComplete="off"
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:bg-white"
                      />
                    </div>
                    {searchFocused && search.results.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50" role="listbox" aria-label="Search results">
                        {search.results.map((res) => (
                          <button
                            key={res.route + res.label}
                            type="button"
                            role="option"
                            aria-selected={false}
                            onMouseDown={() => {
                              navigate(res.route);
                              search.onQueryChange('');
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-forest-50 flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-medium text-slate-800 truncate">{res.label}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">{res.category}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="hidden 2xl:flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-forest-700" />
                <span>{todayFormatted}</span>
              </div>

              {headerActions}

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setProfileMenuOpen(false);
                  }}
                  aria-label={`${notifications.label}: ${notifications.items.length} active`}
                  aria-expanded={notifOpen}
                  aria-haspopup="dialog"
                  className="relative p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.items.length > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${urgent ? 'bg-red-600 text-white' : 'bg-amber-400 text-forest-950'}`}>
                      {notifications.items.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50" role="dialog" aria-label={notifications.label}>
                    <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{notifications.label} ({notifications.items.length})</span>
                      <Button variant="ghost" size="sm" to={notifications.viewAllRoute} onClick={() => setNotifOpen(false)}>
                        View all
                      </Button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.items.length === 0 ? (
                        <div className="p-5 text-xs text-slate-500 text-center">{notifications.emptyText}</div>
                      ) : (
                        notifications.items.slice(0, 6).map((item) => (
                          <div key={item.id} className="px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-slate-50">
                            <button
                              type="button"
                              onClick={() => {
                                setNotifOpen(false);
                                navigate(item.route);
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <SeverityBadge severity={item.severity} size="sm" />
                                {item.occurredAt && <span className="text-[10px] text-slate-500">{formatRelativeTime(item.occurredAt)}</span>}
                              </div>
                              <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-2">{item.title}</p>
                              {item.detail && <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.detail}</p>}
                            </button>
                            {notifications.onDismiss && (
                              <button type="button" onClick={() => notifications.onDismiss?.(item.id)} aria-label={`Dismiss: ${item.title}`} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                  }}
                  aria-label="Account menu"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-forest-800 text-white text-xs font-bold flex items-center justify-center">{identity.initials || 'A'}</div>
                  <span className="hidden sm:inline text-xs font-semibold text-slate-800 max-w-[110px] truncate">{identity.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50" role="menu">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{identity.name}</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-forest-50 text-forest-800 border border-forest-200 shrink-0">{identity.isDemo ? 'Demo' : 'Account'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{identity.email}</p>
                    </div>
                    <div className="py-1">
                      {profileMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setProfileMenuOpen(false);
                              item.onSelect();
                            }}
                            className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Icon className="w-4 h-4 text-slate-500" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-slate-100 pt-1">
                      <button type="button" role="menuitem" onClick={handleLogout} className="w-full px-4 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {mobileHeaderRow && <div className="md:hidden mt-2.5 flex items-center gap-2">{mobileHeaderRow}</div>}
        </header>

        {banners}

        <main id="main-content" tabIndex={-1} className="app-content flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-7 pb-24 lg:pb-10 max-w-[1440px] w-full mx-auto focus:outline-none">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative w-80 max-w-[86vw] bg-forest-950 text-white h-full flex flex-col z-10 shadow-2xl app-mobile-drawer">
            <div className="p-4 border-b border-forest-800 flex items-center justify-between">
              <AgriPulseLogo size="sm" theme="light" subtitle={brandSubtitle} />
              <button type="button" onClick={() => setMobileDrawerOpen(false)} aria-label="Close navigation menu" className="p-1.5 rounded-lg text-forest-200 hover:text-white hover:bg-forest-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {navGroups.map((group) => (
                <div key={group.id} className="app-nav-group">
                  <div className={GROUP_LABEL_CLASS}>{group.label}</div>
                  {group.items.map((item) => renderNavLink(item, () => setMobileDrawerOpen(false), true))}
                </div>
              ))}
              <div className="app-nav-group">
                <div className={GROUP_LABEL_CLASS}>Your account</div>
                {renderNavLink(accountItem, () => setMobileDrawerOpen(false), true)}
                {sidebarExtra}
              </div>
            </div>

            <div className="p-3 border-t border-forest-800">
              <button type="button" onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-red-900/40 text-red-200 hover:bg-red-900/70">
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav aria-label="Mobile bottom navigation" className="app-mobile-bottom-nav lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 grid grid-cols-5 gap-1 shadow-lg">
        {mobileBottomNav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const count = item.count || 0;
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `relative flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold min-h-[44px] ${isActive ? 'text-forest-800 bg-forest-50' : 'text-slate-600'}`}>
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
              {count > 0 && <span className="absolute top-0.5 right-[18%] min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-forest-950 text-[9px] font-bold flex items-center justify-center">{count}</span>}
            </NavLink>
          );
        })}
        <button type="button" onClick={() => setMobileDrawerOpen(true)} className="flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold text-slate-600 min-h-[44px]" aria-label="Open all modules">
          <Menu className="w-4 h-4 mb-0.5" />
          <span>All</span>
        </button>
      </nav>

      {children}
    </div>
  );
};

export default PortalShell;
