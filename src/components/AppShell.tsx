import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Tractor,
  CloudSun,
  BookOpen,
  Stethoscope,
  ShoppingBag,
  Newspaper,
  Landmark,
  UserCog,
  LogOut,
  ShoppingCart,
  Package,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  Calendar,
  RadioTower,
  Activity,
  Map,
  Sparkles,
  Droplets,
  Layers,
  Leaf,
  Bot,
  BellRing,
  BarChart3,
  Tag,
  Heart,
  Store,
  ChevronRight,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { AgriPulseLogo } from './AgriPulseLogo';
import { FloatingAIChat } from './FloatingAIChat';
import { useAgriPulse } from '../context/AgriPulseContext';
import { FarmIntelligenceProvider, useFarmIntelligence } from '../context/FarmIntelligenceContext';
import { Button, SeverityBadge, formatRelativeTime, RouteFallback } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'alerts' | 'devices' | 'orders' | 'cart';
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { to: '/home', label: 'Dashboard', icon: Home },
      { to: '/alerts', label: 'Alerts & notifications', icon: BellRing, badge: 'alerts' },
    ],
  },
  {
    id: 'intelligence',
    label: 'Farm intelligence',
    items: [
      { to: '/farm', label: 'Farms & field zones', icon: Tractor },
      { to: '/monitoring', label: 'Live monitoring', icon: Activity },
      { to: '/twin', label: 'Digital farm twin', icon: Map },
      { to: '/insights', label: 'AI insights', icon: Sparkles },
      { to: '/irrigation', label: 'Irrigation guidance', icon: Droplets },
      { to: '/soil', label: 'Soil health', icon: Layers },
      { to: '/crop-health', label: 'Crop health', icon: Leaf },
      { to: '/weather', label: 'Weather', icon: CloudSun },
      { to: '/devices', label: 'Devices & sensors', icon: RadioTower, badge: 'devices' },
      { to: '/reports', label: 'Reports & analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'knowledge',
    label: 'Assistant & knowledge',
    items: [
      { to: '/assistant', label: 'AI farming assistant', icon: Bot },
      { to: '/disease', label: 'Crop disease library', icon: Stethoscope },
      { to: '/dictionary', label: 'Dictionary', icon: BookOpen },
      { to: '/news', label: 'Farm news', icon: Newspaper },
      { to: '/schemes', label: 'Govt. schemes', icon: Landmark },
    ],
  },
  {
    id: 'market',
    label: 'Market',
    items: [
      { to: '/store', label: 'Agri store', icon: ShoppingBag },
      { to: '/offers', label: 'Seasonal offers', icon: Tag },
      { to: '/orders', label: 'Orders', icon: Package, badge: 'orders' },
      { to: '/wishlist', label: 'Wishlist', icon: Heart },
      { to: '/cart', label: 'Shopping cart', icon: ShoppingCart, badge: 'cart' },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

const ROUTE_TITLES: Record<string, { title: string; section: string }> = {
  '/home': { title: 'Farmer dashboard', section: 'Overview' },
  '/alerts': { title: 'Alerts & notifications', section: 'Overview' },
  '/farm': { title: 'Farms & field zones', section: 'Farm intelligence' },
  '/monitoring': { title: 'Live sensor monitoring', section: 'Farm intelligence' },
  '/twin': { title: 'Digital farm twin', section: 'Farm intelligence' },
  '/insights': { title: 'AI insights', section: 'Farm intelligence' },
  '/irrigation': { title: 'Irrigation guidance', section: 'Farm intelligence' },
  '/soil': { title: 'Soil health', section: 'Farm intelligence' },
  '/crop-health': { title: 'Crop health', section: 'Farm intelligence' },
  '/weather': { title: 'Weather intelligence', section: 'Farm intelligence' },
  '/devices': { title: 'Devices & sensors', section: 'Farm intelligence' },
  '/reports': { title: 'Reports & analytics', section: 'Farm intelligence' },
  '/assistant': { title: 'AI farming assistant', section: 'Assistant & knowledge' },
  '/dictionary': { title: 'Agricultural dictionary', section: 'Assistant & knowledge' },
  '/disease': { title: 'Crop disease library', section: 'Assistant & knowledge' },
  '/news': { title: 'Agricultural news & advisories', section: 'Assistant & knowledge' },
  '/schemes': { title: 'Government schemes', section: 'Assistant & knowledge' },
  '/store': { title: 'Agricultural store', section: 'Market' },
  '/cart': { title: 'Shopping cart', section: 'Market' },
  '/checkout': { title: 'Checkout (simulated)', section: 'Market' },
  '/orders': { title: 'Orders', section: 'Market' },
  '/offers': { title: 'Seasonal offers', section: 'Market' },
  '/wishlist': { title: 'Wishlist', section: 'Market' },
  '/account': { title: 'Farm settings & profile', section: 'Account' },
};

const NAV_STATE_KEY = 'AgriPulse:v1:navGroups';

function readCollapsedGroups(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(NAV_STATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

const MOBILE_BOTTOM_NAV = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/monitoring', label: 'Monitor', icon: Activity },
  { to: '/twin', label: 'Twin', icon: Map },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
];

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

const AppShellInner: React.FC = () => {
  const {
    session,
    switchPortal,
    workspaceSyncStatus,
    workspaceSyncError,
    profile,
    logout,
    weather,
    cart,
    orders,
    dictionary,
    products,
    devices,
    farms,
    activeFarm,
    setActiveFarmId,
  } = useAgriPulse();
  const { activeAlerts, acknowledgeAlert } = useFarmIntelligence();

  const location = useLocation();
  const navigate = useNavigate();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => readCollapsedGroups());

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
        window.localStorage.setItem(NAV_STATE_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  };

  const currentMeta =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/devices/')
      ? { title: 'Device details & telemetry', section: 'Devices & sensors' }
      : location.pathname.startsWith('/disease/')
        ? { title: 'Disease monograph', section: 'Crop disease library' }
        : location.pathname.startsWith('/store/')
          ? { title: 'Product details', section: 'Market' }
          : location.pathname.startsWith('/orders/')
            ? { title: 'Order details', section: 'Market' }
            : { title: 'AGRIPULSE workspace', section: 'Platform' });

  const cartItemCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const deviceBadgeCount = devices.filter(
    (device) => (!activeFarm || device.farmId === activeFarm.id) && (device.status === 'pending_pairing' || device.status === 'pending_gateway_assignment' || device.status === 'offline' || device.status === 'attention_required')
  ).length;
  const urgentAlertCount = activeAlerts.filter((alert) => alert.severity === 'critical' || alert.severity === 'high').length;
  const activeFarmsList = useMemo(() => farms.filter((farm) => !farm.isArchived), [farms]);

  const badgeCountFor = (badge?: NavItem['badge']) => {
    switch (badge) {
      case 'alerts':
        return activeAlerts.length;
      case 'devices':
        return deviceBadgeCount;
      case 'orders':
        return orders.filter((order) => order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled').length;
      case 'cart':
        return cartItemCount;
      default:
        return 0;
    }
  };

  const quickSearchResults = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return [];
    const results: { label: string; category: string; route: string }[] = [];
    for (const nav of NAV_ITEMS) {
      if (nav.label.toLowerCase().includes(q)) results.push({ label: `Go to ${nav.label}`, category: 'Page', route: nav.to });
    }
    for (const device of devices) {
      if (device.name.toLowerCase().includes(q)) results.push({ label: device.name, category: 'Device', route: `/devices/${device.id}` });
      if (results.length >= 6) break;
    }
    for (const prod of products) {
      if (prod.name.toLowerCase().includes(q) || prod.category.toLowerCase().includes(q)) {
        results.push({ label: prod.name, category: 'Store product', route: `/store?q=${encodeURIComponent(prod.name)}` });
        if (results.length >= 6) break;
      }
    }
    for (const term of dictionary) {
      if (term.term.toLowerCase().includes(q)) {
        results.push({ label: term.term, category: 'Dictionary term', route: `/dictionary?q=${encodeURIComponent(term.term)}` });
        if (results.length >= 8) break;
      }
    }
    return results.slice(0, 6);
  }, [quickSearch, products, dictionary, devices]);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    setMobileDrawerOpen(false);
    logout();
    navigate('/farmer/login', { replace: true });
  };

  const todayFormatted = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const farmerInitials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  const renderNavLink = (item: NavItem, onNavigate?: () => void, compact = false) => {
    const Icon = item.icon;
    const count = badgeCountFor(item.badge);
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={({ isActive }) => `app-nav-link flex items-center justify-between px-3 ${compact ? 'py-2' : 'py-2.5'} rounded-xl text-xs font-semibold transition-colors ${isActive ? 'is-active' : ''}`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <Icon className="w-[17px] h-[17px] shrink-0" />
          <span className="truncate">{item.label}</span>
        </span>
        {count > 0 && (
          <span className={`app-nav-count ${item.badge === 'devices' ? 'is-device' : item.badge === 'cart' ? 'is-cart' : item.badge === 'alerts' && urgentAlertCount > 0 ? 'is-alert' : ''}`} aria-label={`${count} items`}>
            {count}
          </span>
        )}
      </NavLink>
    );
  };

  const farmSwitcher = (
    <div className="app-farm-switcher">
      <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" aria-hidden="true" />
      <label htmlFor="global-farm-select" className="sr-only">
        Active farm
      </label>
      <select id="global-farm-select" value={activeFarm?.id || ''} onChange={(event) => setActiveFarmId(event.target.value)} aria-label="Select active farm">
        {activeFarmsList.length === 0 ? <option value="">No active farm</option> : activeFarmsList.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0 pointer-events-none" aria-hidden="true" />
    </div>
  );

  return (
    <div className="app-shell min-h-screen bg-warmbg text-slate-900 flex flex-col lg:flex-row">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Desktop sidebar */}
      <aside aria-label="Primary sidebar navigation" className="app-sidebar hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-forest-950 text-white border-r border-forest-900 z-30">
        <div className="app-sidebar-brand px-5 py-5 border-b border-forest-800/80 flex items-center justify-between">
          <NavLink to="/home" className="focus:outline-none" aria-label="AGRIPULSE dashboard">
            <AgriPulseLogo size="md" theme="light" />
          </NavLink>
        </div>

        <nav className="app-sidebar-nav flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Farmer portal navigation">
          {NAV_GROUPS.map((group) => {
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

          {session?.isDemo && (
            <button
              type="button"
              onClick={async () => {
                if (await switchPortal('seller')) navigate('/seller');
              }}
              className="app-seller-switch w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition my-2"
            >
              <span className="flex items-center gap-3">
                <Store className="w-[17px] h-[17px] shrink-0" />
                <span>Seller Central</span>
              </span>
              <span className="app-seller-switch-tag">Switch</span>
            </button>
          )}

          <div className="px-3 pt-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-300/80">Your account</div>
          <NavLink to="/account" className={({ isActive }) => `app-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${isActive ? 'is-active' : ''}`}>
            <UserCog className="w-[17px] h-[17px] shrink-0" />
            <span>Farm settings</span>
          </NavLink>
        </nav>

        <div className="app-sidebar-footer p-3 border-t border-forest-800/80 bg-forest-900/50">
          <div className="px-2.5 py-2 mb-2 rounded-lg bg-forest-900/90 border border-forest-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white truncate">{profile.name}</span>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-leaf-500/20 text-leaf-300 border border-leaf-500/30">{session?.isDemo ? 'Demo' : 'Account'}</span>
            </div>
            <p className="text-[10px] text-forest-300 truncate mt-0.5">
              {profile.district}, {profile.state}
            </p>
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
                  <span className="truncate">{currentMeta.section}</span>
                </div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">{currentMeta.title}</h1>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 min-w-0 flex-1 justify-center max-w-xl">
              {farmSwitcher}
              <div className="relative w-full max-w-[280px]">
                <label htmlFor="global-quick-search" className="sr-only">
                  Quick search pages, devices, products or dictionary terms
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="global-quick-search"
                    type="search"
                    value={quickSearch}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                    onChange={(event) => setQuickSearch(event.target.value)}
                    placeholder="Quick jump: pages, devices, terms…"
                    autoComplete="off"
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-600 focus:bg-white"
                  />
                </div>
                {searchFocused && quickSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50" role="listbox" aria-label="Search results">
                    {quickSearchResults.map((res) => (
                      <button
                        key={res.route + res.label}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onMouseDown={() => {
                          navigate(res.route);
                          setQuickSearch('');
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
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="hidden 2xl:flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-forest-700" />
                <span>{todayFormatted}</span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/weather')}
                title={`Weather (${weather.sourceType}): ${weather.locationLabel}`}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-forest-900 bg-forest-50 hover:bg-forest-100 border border-forest-200 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                <CloudSun className="w-4 h-4 text-harvest-600" />
                <span>{weather.tempC}°C</span>
                <span className="text-[10px] font-normal text-slate-600 hidden xl:inline">
                  {weather.district} · {weather.sourceType === 'Live API' ? 'Live' : 'Demo'}
                </span>
              </button>

              {session?.isDemo && (
                <button
                  type="button"
                  onClick={async () => {
                    if (await switchPortal('seller')) navigate('/seller');
                  }}
                  className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-950 hover:bg-forest-900 text-emerald-300 hover:text-white border border-forest-800 text-xs font-bold transition"
                  title="Switch to Seller Central"
                >
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Seller Portal</span>
                </button>
              )}

              <button type="button" onClick={() => navigate('/cart')} aria-label={`Shopping cart with ${cartItemCount} items`} className="relative p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors hidden sm:inline-flex">
                <ShoppingCart className="w-4 h-4" />
                {cartItemCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-harvest-500 text-forest-950 text-[10px] font-bold flex items-center justify-center">{cartItemCount}</span>}
              </button>

              {/* Alerts */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    setProfileMenuOpen(false);
                  }}
                  aria-label={`Alerts: ${activeAlerts.length} active`}
                  aria-expanded={notifOpen}
                  aria-haspopup="dialog"
                  className="relative p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {activeAlerts.length > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${urgentAlertCount > 0 ? 'bg-red-600 text-white' : 'bg-amber-400 text-forest-950'}`}>
                      {activeAlerts.length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50" role="dialog" aria-label="Recent alerts">
                    <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Active alerts ({activeAlerts.length})</span>
                      <Button variant="ghost" size="sm" to="/alerts" onClick={() => setNotifOpen(false)}>
                        View all
                      </Button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {activeAlerts.length === 0 ? (
                        <div className="p-5 text-xs text-slate-500 text-center">No active alerts for {activeFarm?.name || 'this farm'} right now.</div>
                      ) : (
                        activeAlerts.slice(0, 6).map((alert) => (
                          <div key={alert.id} className="px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-slate-50">
                            <button
                              type="button"
                              onClick={() => {
                                setNotifOpen(false);
                                navigate(alert.route);
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <SeverityBadge severity={alert.severity} size="sm" />
                                <span className="text-[10px] text-slate-500">{formatRelativeTime(alert.occurredAt)}</span>
                              </div>
                              <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-2">{alert.title}</p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">{alert.affected}</p>
                            </button>
                            <button type="button" onClick={() => acknowledgeAlert(alert.id)} aria-label={`Dismiss alert: ${alert.title}`} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
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
                  aria-label="Farmer profile menu"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-forest-800 text-white text-xs font-bold flex items-center justify-center">{farmerInitials || 'F'}</div>
                  <span className="hidden sm:inline text-xs font-semibold text-slate-800 max-w-[110px] truncate">{profile.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50" role="menu">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 truncate">{profile.name}</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-forest-50 text-forest-800 border border-forest-200">{session?.isDemo ? 'Demo' : 'Account'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{profile.email}</p>
                    </div>
                    <div className="py-1">
                      <button type="button" role="menuitem" onClick={() => navigate('/account')} className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-slate-500" />
                        <span>Farm settings & profile</span>
                      </button>
                      <button type="button" role="menuitem" onClick={() => navigate('/orders')} className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-500" />
                        <span>Orders ({orders.length})</span>
                      </button>
                      <button type="button" role="menuitem" onClick={() => navigate('/')} className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-slate-500" />
                        <span>Public website</span>
                      </button>
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

          {/* Mobile farm switcher row */}
          <div className="md:hidden mt-2.5 flex items-center gap-2">{farmSwitcher}</div>
        </header>

        {session?.portalType === 'seller' && (
          <div className="bg-emerald-950 text-emerald-100 px-4 py-2.5 border-b border-emerald-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Store className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">
                You are browsing the Farmer Portal as <strong className="text-white">{session.sellerName || 'Agro Seller'}</strong>.
              </span>
            </div>
            <button type="button" onClick={() => navigate('/seller')} className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-[11px] text-white transition whitespace-nowrap">
              Return to Seller Central →
            </button>
          </div>
        )}

        {session?.isDemo && (
          <div className="demo-workspace-banner" role="status">
            <Sparkles className="demo-workspace-icon" aria-hidden="true" />
            <p>
              <strong>Development demo · sample workspace.</strong> Farm records are sample data saved by the local development API. Device records are registrations only — no hardware is paired, so sensor readings show as “waiting” until a real node reports. Do not enter sensitive personal, financial, network or device credentials.
            </p>
          </div>
        )}

        {workspaceSyncError ? (
          <div role="alert" className="mx-4 mt-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-900 sm:mx-6 lg:mx-8">
            Workspace changes could not be saved: {workspaceSyncError}
          </div>
        ) : workspaceSyncStatus === 'saving' ? (
          <div role="status" className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 sm:mx-6 lg:mx-8">
            Saving workspace changes to the AGRIPULSE API…
          </div>
        ) : null}

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
              <AgriPulseLogo size="sm" theme="light" />
              <button type="button" onClick={() => setMobileDrawerOpen(false)} aria-label="Close navigation menu" className="p-1.5 rounded-lg text-forest-200 hover:text-white hover:bg-forest-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {NAV_GROUPS.map((group) => (
                <div key={group.id} className="app-nav-group">
                  <div className="px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-300/80">{group.label}</div>
                  {group.items.map((item) => renderNavLink(item, () => setMobileDrawerOpen(false), true))}
                </div>
              ))}
              <div className="app-nav-group">
                <div className="px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-300/80">Your account</div>
                {renderNavLink({ to: '/account', label: 'Farm settings', icon: UserCog }, () => setMobileDrawerOpen(false), true)}
                {session?.isDemo && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (await switchPortal('seller')) navigate('/seller');
                    }}
                    className="app-seller-switch w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition my-1"
                  >
                    <span className="flex items-center gap-3">
                      <Store className="w-[17px] h-[17px] shrink-0" />
                      <span>Seller Central</span>
                    </span>
                    <span className="app-seller-switch-tag">Switch</span>
                  </button>
                )}
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
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const count = item.to === '/alerts' ? activeAlerts.length : 0;
          return (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `relative flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold min-h-[44px] ${isActive ? 'text-forest-800 bg-forest-50' : 'text-slate-600'}`}>
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

      <FloatingAIChat />
    </div>
  );
};

export const AppShell: React.FC = () => (
  <FarmIntelligenceProvider>
    <AppShellInner />
  </FarmIntelligenceProvider>
);

