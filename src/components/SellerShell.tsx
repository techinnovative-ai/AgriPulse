import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Wallet,
  BarChart3,
  Store,
  Settings2,
  Tractor,
  Eye,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Leaf,
} from 'lucide-react';
import { PortalShell, type ShellNavGroup, type ShellNavItem, type ShellSearchResult } from './PortalShell';
import { useAgriPulse } from '../context/AgriPulseContext';
import { buildSellerAttentionItems, computeSellerMetrics } from '../services/sellerService';
import { markStorePreview } from '../utils/portalPreview';

interface SellerNavItem {
  to: string;
  label: string;
  icon: ShellNavItem['icon'];
  end?: boolean;
  badge?: 'orders' | 'stock';
}

export const SELLER_NAV_GROUPS: { id: string; label: string; items: SellerNavItem[] }[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { to: '/seller', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/seller/orders', label: 'Orders', icon: ClipboardList, badge: 'orders' },
    ],
  },
  {
    id: 'business',
    label: 'Store management',
    items: [
      { to: '/seller/catalog', label: 'Catalogue & inventory', icon: Package, badge: 'stock' },
      { to: '/seller/payouts', label: 'Payouts & settlements', icon: Wallet },
      { to: '/seller/reports', label: 'Reports & analytics', icon: BarChart3 },
    ],
  },
];

export const SELLER_NAV_ITEMS: SellerNavItem[] = [...SELLER_NAV_GROUPS.flatMap((group) => group.items), { to: '/seller/settings', label: 'Store settings', icon: Settings2 }];

const ROUTE_TITLES: Record<string, { title: string; section: string }> = {
  '/seller': { title: 'Seller dashboard', section: 'Overview' },
  '/seller/orders': { title: 'Orders', section: 'Overview' },
  '/seller/catalog': { title: 'Catalogue & inventory', section: 'Store management' },
  '/seller/payouts': { title: 'Payouts & settlements', section: 'Store management' },
  '/seller/reports': { title: 'Reports & analytics', section: 'Store management' },
  '/seller/settings': { title: 'Store settings & profile', section: 'Account' },
};

const NAV_STATE_KEY = 'AgriPulse:v1:sellerNavGroups';

const MOBILE_BOTTOM_NAV = [
  { to: '/seller', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/seller/orders', label: 'Orders', icon: ClipboardList },
  { to: '/seller/catalog', label: 'Catalogue', icon: Package },
  { to: '/seller/reports', label: 'Reports', icon: BarChart3 },
];

export const SellerShell: React.FC = () => {
  const { session, switchPortal, workspaceSyncStatus, workspaceSyncError, sellerProfile, products, orders, logout } = useAgriPulse();
  const location = useLocation();
  const navigate = useNavigate();
  const [quickSearch, setQuickSearch] = useState('');
  const [dismissed, setDismissed] = useState<string[]>([]);

  const isDemo = Boolean(session?.isDemo);
  const metrics = useMemo(() => computeSellerMetrics(products, orders, sellerProfile, isDemo), [products, orders, sellerProfile, isDemo]);
  const attention = useMemo(() => buildSellerAttentionItems(metrics, sellerProfile).filter((item) => !dismissed.includes(item.id)), [metrics, sellerProfile, dismissed]);
  const urgentCount = attention.filter((item) => item.severity === 'critical' || item.severity === 'high').length;

  const currentMeta = ROUTE_TITLES[location.pathname] || { title: 'Seller Central', section: 'Platform' };

  const stockIssueCount = metrics.outOfStock.length + metrics.lowStock.length;
  const toShellItem = (item: SellerNavItem): ShellNavItem => {
    switch (item.badge) {
      case 'orders':
        return { ...item, count: metrics.openOrders.length, countTone: metrics.awaitingAcceptance.length > 0 ? 'alert' : 'default' };
      case 'stock':
        return { ...item, count: stockIssueCount, countTone: metrics.outOfStock.length > 0 ? 'alert' : 'device' };
      default:
        return item;
    }
  };
  const shellGroups: ShellNavGroup[] = SELLER_NAV_GROUPS.map((group) => ({ ...group, items: group.items.map(toShellItem) }));

  const quickSearchResults = useMemo<ShellSearchResult[]>(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return [];
    const results: ShellSearchResult[] = [];
    for (const nav of SELLER_NAV_ITEMS) {
      if (nav.label.toLowerCase().includes(q)) results.push({ label: `Go to ${nav.label}`, category: 'Page', route: nav.to });
    }
    for (const order of orders) {
      if (order.id.toLowerCase().includes(q) || order.deliveryDetails.customerName.toLowerCase().includes(q)) {
        results.push({ label: `${order.id} · ${order.deliveryDetails.customerName}`, category: 'Order', route: `/seller/orders?order=${encodeURIComponent(order.id)}` });
        if (results.length >= 6) break;
      }
    }
    for (const product of metrics.ownListings) {
      if (product.name.toLowerCase().includes(q) || product.category.toLowerCase().includes(q) || product.brand.toLowerCase().includes(q)) {
        results.push({ label: product.name, category: 'Listing', route: `/seller/catalog?q=${encodeURIComponent(product.name)}` });
        if (results.length >= 6) break;
      }
    }
    return results.slice(0, 6);
  }, [quickSearch, orders, metrics.ownListings]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const openFarmerPortal = async (route: string, preview = false) => {
    // Flag first: the farmer shell may mount (via the route guard) before the switch resolves.
    markStorePreview(preview);
    if (await switchPortal('farmer')) navigate(route);
    else markStorePreview(false);
  };

  const initials = sellerProfile.businessName
    .replace(/\(.*?\)/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const storeChip = (
    <div className="app-store-chip" title={sellerProfile.isVerified ? 'Seller account verified' : 'Seller verification has not been completed'}>
      <Store className="w-3.5 h-3.5 text-forest-700 shrink-0" aria-hidden="true" />
      <span className="app-store-chip__name">{sellerProfile.tradeName || sellerProfile.businessName}</span>
      {sellerProfile.isVerified ? (
        <span className="app-store-chip__status is-verified">
          <ShieldCheck className="w-3 h-3" aria-hidden="true" /> Verified
        </span>
      ) : (
        <span className="app-store-chip__status">
          <ShieldAlert className="w-3 h-3" aria-hidden="true" /> Not verified
        </span>
      )}
    </div>
  );

  const farmerSwitch = isDemo ? (
    <button type="button" onClick={() => openFarmerPortal('/home')} className="app-seller-switch w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition my-2">
      <span className="flex items-center gap-3">
        <Tractor className="w-[17px] h-[17px] shrink-0" />
        <span>Farmer Portal</span>
      </span>
      <span className="app-seller-switch-tag">Switch</span>
    </button>
  ) : null;

  const headerActions = isDemo ? (
    <>
      <button
        type="button"
        onClick={() => openFarmerPortal('/store', true)}
        className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-forest-900 bg-forest-50 hover:bg-forest-100 border border-forest-200 px-2.5 py-1.5 rounded-xl transition-colors"
        title="Open the farmer-facing store to see your listings as buyers do"
      >
        <Eye className="w-4 h-4 text-forest-700" />
        <span>Preview store</span>
      </button>
      <button
        type="button"
        onClick={() => openFarmerPortal('/home')}
        className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-950 hover:bg-forest-900 text-emerald-300 hover:text-white border border-forest-800 text-xs font-bold transition"
        title="Switch to the Farmer Portal"
      >
        <Tractor className="w-3.5 h-3.5 text-emerald-400" />
        <span>Farmer Portal</span>
      </button>
    </>
  ) : null;

  const banners = (
    <>
      {isDemo && (
        <div className="demo-workspace-banner" role="status">
          <Sparkles className="demo-workspace-icon" aria-hidden="true" />
          <p>
            <strong>Development demo · sample seller workspace.</strong> Listings and orders are sample records saved by the local development API. Payments, shipping, GST invoicing and settlements are not connected — status changes are recorded in this workspace only. Do not enter real bank, tax or personal details.
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
      portalLabel="Seller Central"
      homeRoute="/seller"
      brandSubtitle="Seller Central"
      navGroups={shellGroups}
      accountItem={{ to: '/seller/settings', label: 'Store settings', icon: Settings2 }}
      sidebarExtra={farmerSwitch}
      identity={{
        name: sellerProfile.businessName,
        subtitle: [sellerProfile.district, sellerProfile.state].filter(Boolean).join(', ') || sellerProfile.category,
        email: session?.email || sellerProfile.email,
        initials: initials || 'S',
        isDemo,
        badge: isDemo ? 'Demo seller' : 'Seller',
      }}
      breadcrumb={currentMeta}
      headerCenter={storeChip}
      mobileHeaderRow={storeChip}
      search={{
        label: 'Quick search pages, orders or listings',
        placeholder: 'Quick jump: pages, orders, listings…',
        query: quickSearch,
        onQueryChange: setQuickSearch,
        results: quickSearchResults,
      }}
      headerActions={headerActions}
      notifications={{
        label: 'Needs attention',
        items: attention.map((item) => ({ id: item.id, title: item.title, detail: item.detail, severity: item.severity, occurredAt: item.occurredAt, route: item.route })),
        urgentCount,
        viewAllRoute: '/seller',
        emptyText: 'Nothing needs your attention right now.',
        onDismiss: (id) => setDismissed((current) => [...current, id]),
      }}
      profileMenuItems={[
        { label: 'Store settings & profile', icon: Settings2, onSelect: () => navigate('/seller/settings') },
        { label: `Orders (${orders.length})`, icon: ClipboardList, onSelect: () => navigate('/seller/orders') },
        { label: 'Public website', icon: Leaf, onSelect: () => navigate('/') },
      ]}
      banners={banners}
      mobileBottomNav={MOBILE_BOTTOM_NAV.map((item) => (item.to === '/seller/orders' ? { ...item, count: metrics.openOrders.length } : item))}
      onLogout={handleLogout}
      navStorageKey={NAV_STATE_KEY}
    />
  );
};
