import type { DemoOrder, OrderStatus, ProductCategory, SellerProfile, StoreProduct } from '../types';
import type { BadgeTone, Severity } from '../components/ui';

/**
 * Seller Central helpers — pure functions over the workspace's products, orders and seller profile.
 * Everything here is derived from saved records; nothing is estimated or fabricated.
 */

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Seeds and planting material',
  'Fertilizers and soil nutrients',
  'Crop protection products',
  'Organic farming inputs',
  'Soil testing and farm-monitoring kits',
  'Irrigation equipment',
  'Sprayers and farm tools',
  'Hand tools and accessories',
  'Farm safety equipment',
  'Harvesting and storage supplies',
];

export const LOW_STOCK_THRESHOLD = 5;

/* ---------- Order status ---------- */

export interface OrderStatusMeta {
  label: string;
  tone: BadgeTone;
  description: string;
  /** The next step in the fulfilment workflow, when one exists. */
  next?: { status: OrderStatus; action: string; confirmTitle: string; confirmBody: string };
}

export const ORDER_FLOW: OrderStatus[] = ['Placed', 'Processing', 'Dispatched', 'Delivered'];

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  Placed: {
    label: 'Placed',
    tone: 'warning',
    description: 'Awaiting your acceptance.',
    next: { status: 'Processing', action: 'Accept & start packing', confirmTitle: 'Accept this order?', confirmBody: 'The order moves to Processing in this workspace. No notification, payment or shipment is created — the marketplace is a demonstration.' },
  },
  Processing: {
    label: 'Processing',
    tone: 'info',
    description: 'Being packed.',
    next: { status: 'Dispatched', action: 'Mark as dispatched', confirmTitle: 'Mark as dispatched?', confirmBody: 'The order moves to Dispatched. No courier is booked and no tracking ID exists because shipping is not connected.' },
  },
  Dispatched: {
    label: 'Dispatched',
    tone: 'forest',
    description: 'On its way (recorded manually).',
    next: { status: 'Delivered', action: 'Confirm delivery', confirmTitle: 'Confirm delivery?', confirmBody: 'The order is marked Delivered in this workspace. No settlement or payout follows because payments are not connected.' },
  },
  Delivered: { label: 'Delivered', tone: 'success', description: 'Completed.' },
  Cancelled: { label: 'Cancelled', tone: 'neutral', description: 'Cancelled — no further action.' },
};

export const OPEN_ORDER_STATUSES: OrderStatus[] = ['Placed', 'Processing', 'Dispatched'];

export function isOpenOrder(order: DemoOrder): boolean {
  return OPEN_ORDER_STATUSES.includes(order.orderStatus);
}

/* ---------- Listings ---------- */

export function normaliseSellerName(name: string | undefined): string {
  return (name || '').replace(/\(demo seller\)/i, '').trim().toLowerCase();
}

/**
 * Whether a catalogue entry belongs to the signed-in seller.
 * Own listings carry the seller's business name. The development demo seller additionally owns the
 * sample "Karnal" listings so the demo catalogue is not empty — those are labelled as sample listings.
 */
export function isOwnListing(product: StoreProduct, profile: SellerProfile, isDemo: boolean): boolean {
  const business = normaliseSellerName(profile.businessName);
  const sellerName = normaliseSellerName(product.sellerName);
  if (business && sellerName === business) return true;
  if (business && normaliseSellerName(product.seller?.name) === business) return true;
  if (isDemo && sellerName.includes('karnal')) return true;
  return false;
}

export type StockState = 'in_stock' | 'low_stock' | 'out_of_stock';

export function stockState(product: StoreProduct): StockState {
  if (product.availability === 'Out of Stock' || product.stockCount <= 0) return 'out_of_stock';
  if (product.stockCount <= LOW_STOCK_THRESHOLD || product.availability === 'Low Stock') return 'low_stock';
  return 'in_stock';
}

export const STOCK_META: Record<StockState, { label: string; tone: BadgeTone }> = {
  in_stock: { label: 'In stock', tone: 'success' },
  low_stock: { label: 'Low stock', tone: 'warning' },
  out_of_stock: { label: 'Out of stock', tone: 'danger' },
};

export function availabilityForStock(stockCount: number): StoreProduct['availability'] {
  if (stockCount <= 0) return 'Out of Stock';
  if (stockCount <= LOW_STOCK_THRESHOLD) return 'Low Stock';
  return 'In Stock';
}

/* ---------- Metrics ---------- */

export interface SellerMetrics {
  ownListings: StoreProduct[];
  lowStock: StoreProduct[];
  outOfStock: StoreProduct[];
  openOrders: DemoOrder[];
  awaitingAcceptance: DemoOrder[];
  processing: DemoOrder[];
  dispatched: DemoOrder[];
  delivered: DemoOrder[];
  cancelled: DemoOrder[];
  /** Sum of order totals by status, in paise. Order values, not settled funds. */
  valueByStatusPaise: Record<OrderStatus, number>;
  deliveredValuePaise: number;
  openValuePaise: number;
  unitsOrdered: number;
}

export function computeSellerMetrics(products: StoreProduct[], orders: DemoOrder[], profile: SellerProfile, isDemo: boolean): SellerMetrics {
  const ownListings = products.filter((product) => isOwnListing(product, profile, isDemo));
  const valueByStatusPaise: Record<OrderStatus, number> = { Placed: 0, Processing: 0, Dispatched: 0, Delivered: 0, Cancelled: 0 };
  for (const order of orders) valueByStatusPaise[order.orderStatus] += order.totalPayablePaise;
  const byStatus = (status: OrderStatus) => orders.filter((order) => order.orderStatus === status);
  return {
    ownListings,
    lowStock: ownListings.filter((product) => stockState(product) === 'low_stock'),
    outOfStock: ownListings.filter((product) => stockState(product) === 'out_of_stock'),
    openOrders: orders.filter(isOpenOrder),
    awaitingAcceptance: byStatus('Placed'),
    processing: byStatus('Processing'),
    dispatched: byStatus('Dispatched'),
    delivered: byStatus('Delivered'),
    cancelled: byStatus('Cancelled'),
    valueByStatusPaise,
    deliveredValuePaise: valueByStatusPaise.Delivered,
    openValuePaise: valueByStatusPaise.Placed + valueByStatusPaise.Processing + valueByStatusPaise.Dispatched,
    unitsOrdered: orders.reduce((sum, order) => sum + order.items.reduce((inner, item) => inner + item.quantity, 0), 0),
  };
}

/* ---------- Attention items (seller notifications) ---------- */

export interface SellerAttentionItem {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  nextStep: string;
  route: string;
  actionLabel: string;
  /** Event time for order items; standing conditions (stock, profile) have none. */
  occurredAt?: string;
  category: 'orders' | 'inventory' | 'profile';
}

export function buildSellerAttentionItems(metrics: SellerMetrics, profile: SellerProfile, now: number = Date.now()): SellerAttentionItem[] {
  const items: SellerAttentionItem[] = [];

  for (const order of metrics.awaitingAcceptance) {
    const ageDays = (now - Date.parse(order.createdAt)) / 86400000;
    items.push({
      id: `order-placed-${order.id}`,
      severity: ageDays >= 2 ? 'high' : 'medium',
      title: `Order ${order.id} is waiting for acceptance`,
      detail: `${order.deliveryDetails.customerName} · ${order.items.length} line item${order.items.length === 1 ? '' : 's'} · ${formatInr(order.totalPayablePaise)}`,
      nextStep: 'Open the order, check stock for each line and accept it to start packing.',
      route: `/seller/orders?status=Placed&order=${encodeURIComponent(order.id)}`,
      actionLabel: 'Review order',
      occurredAt: order.createdAt,
      category: 'orders',
    });
  }
  for (const order of metrics.processing) {
    items.push({
      id: `order-processing-${order.id}`,
      severity: 'low',
      title: `Order ${order.id} is being packed`,
      detail: `${order.deliveryDetails.customerName} · ${order.deliveryDetails.district}`,
      nextStep: 'Mark it as dispatched once it leaves your premises.',
      route: `/seller/orders?status=Processing&order=${encodeURIComponent(order.id)}`,
      actionLabel: 'Open order',
      occurredAt: order.createdAt,
      category: 'orders',
    });
  }
  if (metrics.outOfStock.length > 0) {
    items.push({
      id: 'inventory-out',
      severity: 'medium',
      title: `${metrics.outOfStock.length} listing${metrics.outOfStock.length === 1 ? ' is' : 's are'} out of stock`,
      detail: metrics.outOfStock.slice(0, 3).map((product) => product.name).join(', ') + (metrics.outOfStock.length > 3 ? '…' : ''),
      nextStep: 'Restock or pause the listing so farmers do not order unavailable items.',
      route: '/seller/catalog?stock=out_of_stock',
      actionLabel: 'Review stock',
      category: 'inventory',
    });
  }
  if (metrics.lowStock.length > 0) {
    items.push({
      id: 'inventory-low',
      severity: 'low',
      title: `${metrics.lowStock.length} listing${metrics.lowStock.length === 1 ? ' is' : 's are'} running low`,
      detail: metrics.lowStock.slice(0, 3).map((product) => `${product.name} (${product.stockCount})`).join(', ') + (metrics.lowStock.length > 3 ? '…' : ''),
      nextStep: 'Update stock counts after your next inward delivery.',
      route: '/seller/catalog?stock=low_stock',
      actionLabel: 'Update stock',
      category: 'inventory',
    });
  }
  const completeness = profileCompleteness(profile);
  if (completeness.missing.length > 0) {
    items.push({
      id: 'profile-incomplete',
      severity: 'info',
      title: 'Store profile is incomplete',
      detail: `Missing: ${completeness.missing.join(', ')}`,
      nextStep: 'Complete the profile so invoices and listings show correct business details.',
      route: '/seller/settings',
      actionLabel: 'Open store settings',
      category: 'profile',
    });
  }

  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return items.sort((a, b) => order[a.severity] - order[b.severity] || (b.occurredAt || '').localeCompare(a.occurredAt || ''));
}

/* ---------- Profile ---------- */

export function profileCompleteness(profile: SellerProfile): { missing: string[]; percent: number } {
  const checks: { label: string; ok: boolean }[] = [
    { label: 'business name', ok: Boolean(profile.businessName.trim()) },
    { label: 'contact person', ok: Boolean(profile.contactPerson.trim()) },
    { label: 'mobile', ok: Boolean(profile.mobile.trim()) },
    { label: 'category', ok: Boolean(profile.category.trim()) },
    { label: 'GSTIN', ok: Boolean(profile.gstin.trim()) },
    { label: 'address', ok: Boolean(profile.address.trim()) },
    { label: 'district', ok: Boolean(profile.district.trim()) },
    { label: 'state', ok: Boolean(profile.state.trim()) },
    { label: 'PIN code', ok: Boolean(profile.pincode.trim()) },
  ];
  const missing = checks.filter((check) => !check.ok).map((check) => check.label);
  return { missing, percent: Math.round(((checks.length - missing.length) / checks.length) * 100) };
}

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function validateGstin(value: string): string | null {
  const v = value.trim().toUpperCase();
  if (!v) return null;
  if (v.length !== 15) return 'GSTIN must be 15 characters.';
  if (!GSTIN_PATTERN.test(v)) return 'GSTIN format looks wrong (e.g. 06ABCDE1234F1Z5).';
  return null;
}

export function validatePincode(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return /^[1-9][0-9]{5}$/.test(v) ? null : 'PIN code must be 6 digits.';
}

export function validateMobile(value: string): string | null {
  const v = value.trim().replace(/[\s-]/g, '');
  if (!v) return null;
  return /^(\+91)?[6-9][0-9]{9}$/.test(v) ? null : 'Enter a 10-digit Indian mobile number.';
}

/* ---------- Formatting & export ---------- */

export function formatInr(paise: number): string {
  const rupees = Math.round(paise) / 100;
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: rupees % 1 === 0 ? 0 : 2 })}`;
}

export function productsToCsvRows(products: StoreProduct[]) {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    packSize: product.packSize,
    priceInr: product.pricePaise / 100,
    mrpInr: product.mrpPaise / 100,
    stockCount: product.stockCount,
    availability: product.availability,
    seller: product.sellerName,
    demoListing: product.isDemoSeller ? 'yes' : 'no',
  }));
}

export function ordersToCsvRows(orders: DemoOrder[]) {
  return orders.flatMap((order) =>
    order.items.map((item) => ({
      orderId: order.id,
      placedAt: order.createdAt,
      status: order.orderStatus,
      customer: order.deliveryDetails.customerName,
      district: order.deliveryDetails.district,
      state: order.deliveryDetails.state,
      product: item.productName,
      packSize: item.packSize,
      quantity: item.quantity,
      unitPriceInr: item.unitPricePaise / 100,
      lineTotalInr: item.lineTotalPaise / 100,
      orderTotalInr: order.totalPayablePaise / 100,
      paymentMode: order.paymentMode,
      demoOrder: 'yes',
    }))
  );
}

/* ---------- Analytics ---------- */

export interface WeeklyOrderPoint {
  weekStart: string;
  label: string;
  orders: number;
  units: number;
  valueInr: number;
}

export function ordersByWeek(orders: DemoOrder[], weeks = 8, now: number = Date.now()): WeeklyOrderPoint[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);
  const points: WeeklyOrderPoint[] = [];
  for (let i = 0; i < weeks; i += 1) {
    const weekStart = new Date(start.getTime() + i * 7 * 86400000);
    points.push({ weekStart: weekStart.toISOString(), label: weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), orders: 0, units: 0, valueInr: 0 });
  }
  for (const order of orders) {
    const t = Date.parse(order.createdAt);
    const index = Math.floor((t - start.getTime()) / (7 * 86400000));
    if (index < 0 || index >= weeks) continue;
    points[index].orders += 1;
    points[index].units += order.items.reduce((sum, item) => sum + item.quantity, 0);
    points[index].valueInr += order.totalPayablePaise / 100;
  }
  return points;
}

export function topProducts(orders: DemoOrder[], limit = 6): { productId: string; name: string; units: number; valueInr: number }[] {
  const map = new Map<string, { productId: string; name: string; units: number; valueInr: number }>();
  for (const order of orders) {
    if (order.orderStatus === 'Cancelled') continue;
    for (const item of order.items) {
      const entry = map.get(item.productId) || { productId: item.productId, name: item.productName, units: 0, valueInr: 0 };
      entry.units += item.quantity;
      entry.valueInr += item.lineTotalPaise / 100;
      map.set(item.productId, entry);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.units - a.units).slice(0, limit);
}

export function categoryMix(products: StoreProduct[]): { category: string; count: number }[] {
  const map = new Map<string, number>();
  for (const product of products) map.set(product.category, (map.get(product.category) || 0) + 1);
  return Array.from(map.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}
