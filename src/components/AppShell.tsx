import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  ShoppingCart,
  Package,
  ChevronDown,
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
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { FloatingAIChat } from './FloatingAIChat';
import { PortalShell, type ShellNavGroup, type ShellNavItem, type ShellSearchResult } from './PortalShell';
import { useAgriPulse } from '../context/AgriPulseContext';
import { FarmIntelligenceProvider, useFarmIntelligence } from '../context/FarmIntelligenceContext';
import { isStorePreview, markStorePreview } from '../utils/portalPreview';

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

const MOBILE_BOTTOM_NAV = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/monitoring', label: 'Monitor', icon: Activity },
  { to: '/twin', label: 'Twin', icon: Map },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
];

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
  const [quickSearch, setQuickSearch] = useState('');
  const [storePreview, setStorePreview] = useState<boolean>(() => Boolean(session?.isDemo) && isStorePreview());

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
  const openOrderCount = orders.filter((order) => order.orderStatus !== 'Delivered' && order.orderStatus !== 'Cancelled').length;
  const activeFarmsList = useMemo(() => farms.filter((farm) => !farm.isArchived), [farms]);

  const toShellItem = (item: NavItem): ShellNavItem => {
    switch (item.badge) {
      case 'alerts':
        return { ...item, count: activeAlerts.length, countTone: urgentAlertCount > 0 ? 'alert' : 'default' };
      case 'devices':
        return { ...item, count: deviceBadgeCount, countTone: 'device' };
      case 'orders':
        return { ...item, count: openOrderCount };
      case 'cart':
        return { ...item, count: cartItemCount, countTone: 'cart' };
      default:
        return item;
    }
  };

  const shellGroups: ShellNavGroup[] = NAV_GROUPS.map((group) => ({ ...group, items: group.items.map(toShellItem) }));

  const quickSearchResults = useMemo<ShellSearchResult[]>(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return [];
    const results: ShellSearchResult[] = [];
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
    logout();
    navigate('/farmer/login', { replace: true });
  };

  const openSellerCentral = async () => {
    if (await switchPortal('seller')) {
      markStorePreview(false);
      setStorePreview(false);
      navigate('/seller');
    }
  };

  const endStorePreview = () => {
    markStorePreview(false);
    setStorePreview(false);
  };

  const farmerInitials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

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

  const sellerSwitch = session?.isDemo ? (
    <button type="button" onClick={openSellerCentral} className="app-seller-switch w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition my-2">
      <span className="flex items-center gap-3">
        <Store className="w-[17px] h-[17px] shrink-0" />
        <span>Seller Central</span>
      </span>
      <span className="app-seller-switch-tag">Switch</span>
    </button>
  ) : null;

  const headerActions = (
    <>
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
          onClick={openSellerCentral}
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
    </>
  );

  const banners = (
    <>
      {storePreview && session?.isDemo && (
        <div className="bg-emerald-950 text-emerald-100 px-4 py-2.5 border-b border-emerald-800 text-xs flex items-center justify-between gap-3" role="status">
          <div className="flex items-center gap-2 min-w-0">
            <Store className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              Store preview: you are seeing the Farmer Portal as a buyer would. Changes you make here are saved to the shared demo workspace.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={endStorePreview} className="px-2.5 py-1 rounded-lg border border-emerald-700 hover:bg-emerald-900 font-semibold text-[11px] text-emerald-100 transition whitespace-nowrap">
              Stay here
            </button>
            <button type="button" onClick={openSellerCentral} className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-[11px] text-white transition whitespace-nowrap">
              Return to Seller Central →
            </button>
          </div>
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
    </>
  );

  return (
    <PortalShell
      portalLabel="Farmer portal"
      homeRoute="/home"
      navGroups={shellGroups}
      accountItem={{ to: '/account', label: 'Farm settings', icon: UserCog }}
      sidebarExtra={sellerSwitch}
      identity={{
        name: profile.name,
        subtitle: `${profile.district}, ${profile.state}`,
        email: profile.email,
        initials: farmerInitials || 'F',
        isDemo: Boolean(session?.isDemo),
      }}
      breadcrumb={currentMeta}
      headerCenter={farmSwitcher}
      mobileHeaderRow={farmSwitcher}
      search={{
        label: 'Quick search pages, devices, products or dictionary terms',
        placeholder: 'Quick jump: pages, devices, terms…',
        query: quickSearch,
        onQueryChange: setQuickSearch,
        results: quickSearchResults,
      }}
      headerActions={headerActions}
      notifications={{
        label: 'Active alerts',
        items: activeAlerts.map((alert) => ({ id: alert.id, title: alert.title, detail: alert.affected, severity: alert.severity, occurredAt: alert.occurredAt, route: alert.route })),
        urgentCount: urgentAlertCount,
        viewAllRoute: '/alerts',
        emptyText: `No active alerts for ${activeFarm?.name || 'this farm'} right now.`,
        onDismiss: acknowledgeAlert,
      }}
      profileMenuItems={[
        { label: 'Farm settings & profile', icon: UserCog, onSelect: () => navigate('/account') },
        { label: `Orders (${orders.length})`, icon: Package, onSelect: () => navigate('/orders') },
        { label: 'Public website', icon: Leaf, onSelect: () => navigate('/') },
      ]}
      banners={banners}
      mobileBottomNav={MOBILE_BOTTOM_NAV.map((item) => (item.to === '/alerts' ? { ...item, count: activeAlerts.length } : item))}
      onLogout={handleLogout}
      navStorageKey={NAV_STATE_KEY}
    >
      <FloatingAIChat />
    </PortalShell>
  );
};

export const AppShell: React.FC = () => (
  <FarmIntelligenceProvider>
    <AppShellInner />
  </FarmIntelligenceProvider>
);
