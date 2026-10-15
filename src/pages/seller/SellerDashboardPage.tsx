import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCheck, ClipboardList, Eye, LayoutDashboard, Package, PackageOpen, Plus, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react';
import type { DemoOrder } from '../../types';
import { Badge, Button, DataTable, EmptyState, MetricCard, Notice, PageHeader, Panel, SeverityBadge, SourceTag, Timestamp, type DataTableColumn } from '../../components/ui';
import { buildSellerAttentionItems, formatInr, profileCompleteness, type SellerAttentionItem } from '../../services/sellerService';
import { formatDate, getTimeOfDayGreeting } from '../../utils/formatters';
import { markStorePreview } from '../../utils/portalPreview';
import { OrderDetailDialog, OrderStatusBadge, PaymentModeLabel, useOrderWorkflow, useSellerData } from './sellerShared';

const AttentionRow: React.FC<{ item: SellerAttentionItem }> = ({ item }) => (
  <li className={`ap-insight ${item.severity === 'critical' || item.severity === 'high' ? 'ap-insight--high' : item.severity === 'medium' ? 'ap-insight--medium' : 'ap-insight--low'}`}>
    <div className="flex flex-wrap items-center gap-2">
      <SeverityBadge severity={item.severity} size="sm" />
      <Badge tone="neutral" size="sm">{item.category === 'orders' ? 'Orders' : item.category === 'inventory' ? 'Inventory' : 'Store profile'}</Badge>
      {item.occurredAt && <span className="ml-auto"><Timestamp iso={item.occurredAt} /></span>}
    </div>
    <div>
      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
      <p className="mt-1 text-xs text-slate-700">{item.detail}</p>
    </div>
    <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 text-xs">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Next step</span>
      <p className="mt-0.5 text-slate-800">{item.nextStep}</p>
    </div>
    <div>
      <Button size="sm" variant="secondary" to={item.route} trailingIcon={<ArrowRight size={13} />}>{item.actionLabel}</Button>
    </div>
  </li>
);

export const SellerDashboardPage: React.FC = () => {
  const { sellerProfile, orders, metrics, isDemo, switchPortal } = useSellerData();
  const navigate = useNavigate();
  const [detailOrder, setDetailOrder] = useState<DemoOrder | null>(null);
  const { requestAdvance, workflowDialog } = useOrderWorkflow();

  const attention = useMemo(() => buildSellerAttentionItems(metrics, sellerProfile), [metrics, sellerProfile]);
  const completeness = profileCompleteness(sellerProfile);
  const recentOrders = useMemo(() => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [orders]);
  const inventoryWatch = [...metrics.outOfStock, ...metrics.lowStock].slice(0, 5);

  const previewStore = async () => {
    markStorePreview(true);
    if (await switchPortal('farmer')) navigate('/store');
    else markStorePreview(false);
  };

  const advance = (order: DemoOrder) => {
    setDetailOrder(null);
    requestAdvance(order);
  };

  const orderColumns: DataTableColumn<DemoOrder>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (order) => (
        <div>
          <div className="font-mono text-xs font-bold text-slate-900">{order.id}</div>
          <div className="text-[11px] text-slate-500">{formatDate(order.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <div>
          <div className="font-semibold text-slate-900">{order.deliveryDetails.customerName}</div>
          <div className="text-[11px] text-slate-500">{order.deliveryDetails.village}, {order.deliveryDetails.district}</div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order) => (
        <div className="max-w-[260px]">
          <div className="truncate text-slate-800">{order.items.map((item) => `${item.productName} ×${item.quantity}`).join(', ')}</div>
          <div className="text-[11px] text-slate-500">{order.items.length} line item{order.items.length === 1 ? '' : 's'}</div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      numeric: true,
      render: (order) => (
        <div>
          <div className="font-bold text-slate-900">{formatInr(order.totalPayablePaise)}</div>
          <div className="text-[11px] font-normal text-slate-500"><PaymentModeLabel mode={order.paymentMode} /></div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (order) => <OrderStatusBadge status={order.orderStatus} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      numeric: true,
      render: (order) => (
        <Button size="sm" variant="outline" onClick={() => setDetailOrder(order)}>
          View details
        </Button>
      ),
    },
  ];

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Seller dashboard"
        icon={<LayoutDashboard size={14} />}
        title="Seller dashboard"
        description={`${getTimeOfDayGreeting()}. Orders, inventory and store status for ${sellerProfile.businessName} — the most urgent items are listed first.`}
        actions={
          <>
            {isDemo && (
              <Button size="sm" variant="secondary" onClick={previewStore} leadingIcon={<Eye size={14} />}>
                Preview store
              </Button>
            )}
            <Button size="sm" variant="primary" to="/seller/catalog?action=new" leadingIcon={<Plus size={14} />}>
              Add listing
            </Button>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <SourceTag source="saved_record" />
            <span>Figures are counted from the listings and orders saved in this workspace. They are order values, not collected or settled funds.</span>
          </div>
        }
      />

      <section aria-label="Store summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          icon={<ClipboardList />}
          label="Awaiting acceptance"
          value={metrics.awaitingAcceptance.length}
          note={metrics.awaitingAcceptance.length > 0 ? 'Accept to start packing' : 'No new orders waiting'}
          tone={metrics.awaitingAcceptance.length > 0 ? 'amber' : 'forest'}
          onClick={() => navigate('/seller/orders?status=Placed')}
          ariaLabel="Open orders awaiting acceptance"
        />
        <MetricCard
          icon={<PackageOpen />}
          label="Orders in progress"
          value={metrics.openOrders.length}
          note={`${metrics.processing.length} packing · ${metrics.dispatched.length} dispatched`}
          tone="water"
          onClick={() => navigate('/seller/orders')}
          ariaLabel="Open the orders list"
        />
        <MetricCard
          icon={<Package />}
          label="Active listings"
          value={metrics.ownListings.length}
          note={metrics.outOfStock.length + metrics.lowStock.length > 0 ? `${metrics.outOfStock.length} out of stock · ${metrics.lowStock.length} low` : 'Stock levels healthy'}
          tone={metrics.outOfStock.length > 0 ? 'amber' : 'leaf'}
          onClick={() => navigate('/seller/catalog')}
          ariaLabel="Open the catalogue"
        />
        <MetricCard
          icon={<Wallet />}
          label="Delivered order value"
          value={formatInr(metrics.deliveredValuePaise)}
          note={`${metrics.delivered.length} delivered · ${formatInr(metrics.openValuePaise)} open`}
          tone="store"
          source={isDemo ? 'demo' : 'saved_record'}
          onClick={() => navigate('/seller/payouts')}
          ariaLabel="Open payouts and settlements"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel as="section" className="xl:col-span-2" title="Needs attention" subtitle={attention.length === 0 ? 'Nothing is waiting on you right now.' : `${attention.length} item${attention.length === 1 ? '' : 's'}, most urgent first`}>
          {attention.length === 0 ? (
            <EmptyState compact icon={<CheckCheck />} title="All clear" description="New orders, stock problems and missing profile details will appear here." />
          ) : (
            <ul className="grid gap-3">
              {attention.map((item) => (
                <AttentionRow key={item.id} item={item} />
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel as="section" title="Store status" subtitle="What is connected and what is not">
            <dl className="ap-kv">
              <div>
                <dt>Verification</dt>
                <dd className="flex items-center gap-1.5">
                  {sellerProfile.isVerified ? <ShieldCheck size={14} className="text-forest-700" aria-hidden="true" /> : <ShieldAlert size={14} className="text-amber-700" aria-hidden="true" />}
                  {sellerProfile.isVerified ? 'Verified seller' : 'Not verified'}
                </dd>
              </div>
              <div>
                <dt>Profile complete</dt>
                <dd>{completeness.percent}%{completeness.missing.length > 0 ? ` · missing ${completeness.missing.slice(0, 2).join(', ')}${completeness.missing.length > 2 ? '…' : ''}` : ''}</dd>
              </div>
              <div>
                <dt>Payments</dt>
                <dd>Not connected</dd>
              </div>
              <div>
                <dt>Shipping partner</dt>
                <dd>Not connected</dd>
              </div>
              <div>
                <dt>GST invoicing</dt>
                <dd>Not connected</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{formatDate(sellerProfile.joinedDate)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" to="/seller/settings">Store settings</Button>
              <Button size="sm" variant="ghost" to="/seller/payouts">Payout status</Button>
            </div>
          </Panel>

          <Panel as="section" title="Inventory watch" subtitle={inventoryWatch.length === 0 ? 'No listings are low or out of stock.' : 'Lowest stock first'}>
            {inventoryWatch.length === 0 ? (
              <p className="text-xs text-slate-600">Stock counts update when you edit a listing or adjust stock from the catalogue.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {inventoryWatch.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">{product.name}</div>
                      <div className="text-[11px] text-slate-500">{product.packSize} · {product.stockCount} unit{product.stockCount === 1 ? '' : 's'} left</div>
                    </div>
                    <Badge tone={product.stockCount <= 0 ? 'danger' : 'warning'} size="sm">{product.stockCount <= 0 ? 'Out' : 'Low'}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Button size="sm" variant="outline" to="/seller/catalog?stock=out_of_stock">Review stock</Button>
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        as="section"
        title="Recent orders"
        subtitle={orders.length === 0 ? 'Orders placed in the AGRIPULSE Store appear here.' : `Latest ${recentOrders.length} of ${orders.length}`}
        actions={
          <Button size="sm" variant="ghost" to="/seller/orders" trailingIcon={<ArrowRight size={13} />}>
            View all orders
          </Button>
        }
        flush
      >
        <DataTable
          columns={orderColumns}
          rows={recentOrders}
          rowKey={(order) => order.id}
          caption="Recent orders"
          minWidth={720}
          emptyMessage={isDemo ? 'No orders yet. Place a sample order from the farmer-side store (Preview store) to see the fulfilment workflow.' : 'No orders yet. Order routing from farmer accounts to seller accounts is not connected in this release.'}
        />
      </Panel>

      {isDemo && (
        <Notice tone="neutral" title="Demonstration marketplace">
          Orders, payments and shipments are simulated so you can review the seller workflow end to end. Real payments, courier booking and GST invoices require a verified seller account and connected providers — see <strong>Payouts & settlements</strong> for the current integration status.
        </Notice>
      )}

      <OrderDetailDialog order={detailOrder} onClose={() => setDetailOrder(null)} onAdvance={advance} />
      {workflowDialog}
    </div>
  );
};

export default SellerDashboardPage;
