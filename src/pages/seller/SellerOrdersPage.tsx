import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Ban, ClipboardList, Download, PackageCheck, PackageOpen, Truck } from 'lucide-react';
import type { DemoOrder, OrderStatus } from '../../types';
import { Button, DataTable, EmptyState, MetricCard, Notice, PageHeader, Panel, SearchInput, SourceTag, Tabs, type DataTableColumn } from '../../components/ui';
import { formatInr, ORDER_FLOW, ORDER_STATUS_META, ordersToCsvRows } from '../../services/sellerService';
import { downloadTextFile, slugify, toCsv } from '../../utils/csv';
import { formatDate } from '../../utils/formatters';
import { OrderDetailDialog, OrderStatusBadge, PaymentModeLabel, useOrderWorkflow, useSellerData } from './sellerShared';

type StatusFilter = 'all' | OrderStatus;
const STATUS_FILTERS: StatusFilter[] = ['all', 'Placed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];

const isStatusFilter = (value: string | null): value is StatusFilter => Boolean(value) && STATUS_FILTERS.includes(value as StatusFilter);

export const SellerOrdersPage: React.FC = () => {
  const { orders, metrics, sellerProfile, isDemo } = useSellerData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [detailOrder, setDetailOrder] = useState<DemoOrder | null>(null);

  const status: StatusFilter = isStatusFilter(searchParams.get('status')) ? (searchParams.get('status') as StatusFilter) : 'all';
  const setStatus = (next: StatusFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('status');
    else params.set('status', next);
    params.delete('order');
    setSearchParams(params, { replace: true });
  };

  // Deep link: /seller/orders?order=<id> opens the order.
  const requestedOrderId = searchParams.get('order');
  useEffect(() => {
    if (!requestedOrderId) return;
    const match = orders.find((order) => order.id === requestedOrderId);
    if (match) setDetailOrder(match);
  }, [requestedOrderId]); // orders are intentionally not a dependency: reopening on every status change would be disruptive

  const { requestAdvance, requestCancel, workflowDialog } = useOrderWorkflow(() => setDetailOrder(null));

  const sorted = useMemo(() => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [orders]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((order) => {
      if (status !== 'all' && order.orderStatus !== status) return false;
      if (!q) return true;
      return (
        order.id.toLowerCase().includes(q) ||
        order.deliveryDetails.customerName.toLowerCase().includes(q) ||
        order.deliveryDetails.district.toLowerCase().includes(q) ||
        order.items.some((item) => item.productName.toLowerCase().includes(q))
      );
    });
  }, [sorted, status, query]);

  const countFor = (filter: StatusFilter) => (filter === 'all' ? orders.length : orders.filter((order) => order.orderStatus === filter).length);

  const exportCsv = () => {
    downloadTextFile(`${slugify(sellerProfile.businessName)}-orders.csv`, toCsv(ordersToCsvRows(visible)), 'text/csv');
  };

  const columns: DataTableColumn<DemoOrder>[] = [
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
        <div className="max-w-[240px]">
          <div className="truncate text-slate-800">{order.items.map((item) => `${item.productName} ×${item.quantity}`).join(', ')}</div>
          <div className="text-[11px] text-slate-500">{order.items.reduce((sum, item) => sum + item.quantity, 0)} units</div>
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
      render: (order) => {
        const next = ORDER_STATUS_META[order.orderStatus].next;
        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setDetailOrder(order)}>
              View details
            </Button>
            {next && (
              <Button size="sm" variant="primary" onClick={() => requestAdvance(order)} trailingIcon={<ArrowRight size={13} />}>
                {next.action}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Orders"
        icon={<ClipboardList size={14} />}
        title="Orders"
        description="Accept new orders, mark them dispatched and confirm delivery. Each change is saved to your workspace and shown to the farmer in their order history."
        actions={
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={visible.length === 0} leadingIcon={<Download size={14} />}>
            Export CSV
          </Button>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <SourceTag source={isDemo ? 'demo' : 'saved_record'} />
            <span>{isDemo ? 'Sample orders from the simulated checkout. ' : ''}Payments and courier tracking are not connected — status changes are recorded manually.</span>
          </div>
        }
      />

      <section aria-label="Order pipeline" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={<ClipboardList />} label="Awaiting acceptance" value={metrics.awaitingAcceptance.length} note="Accept to start packing" tone={metrics.awaitingAcceptance.length > 0 ? 'amber' : 'forest'} onClick={() => setStatus('Placed')} ariaLabel="Filter orders awaiting acceptance" />
        <MetricCard icon={<PackageOpen />} label="Processing" value={metrics.processing.length} note="Being packed" tone="water" onClick={() => setStatus('Processing')} ariaLabel="Filter processing orders" />
        <MetricCard icon={<Truck />} label="Dispatched" value={metrics.dispatched.length} note="Awaiting delivery confirmation" tone="leaf" onClick={() => setStatus('Dispatched')} ariaLabel="Filter dispatched orders" />
        <MetricCard icon={<PackageCheck />} label="Delivered" value={metrics.delivered.length} note={`${formatInr(metrics.deliveredValuePaise)} order value`} tone="forest" onClick={() => setStatus('Delivered')} ariaLabel="Filter delivered orders" />
      </section>

      <Panel
        as="section"
        title={status === 'all' ? 'All orders' : `${ORDER_STATUS_META[status].label} orders`}
        subtitle={`${visible.length} shown`}
        actions={<SearchInput label="Search orders" placeholder="Order ID, customer, district or product" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full sm:w-72" />}
        flush
      >
        <div className="px-4 pt-4 pb-3 sm:px-5">
          <Tabs
            ariaLabel="Order status"
            value={status}
            onChange={setStatus}
            tabs={STATUS_FILTERS.map((filter) => ({ value: filter, label: filter === 'all' ? 'All' : ORDER_STATUS_META[filter].label, count: countFor(filter) }))}
          />
        </div>
        {orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="No orders yet"
            description={isDemo ? 'Place a sample order from the farmer-side store (Preview store in the header) and it will appear here for fulfilment.' : 'Orders placed by farmers will appear here. Routing orders from farmer accounts to individual seller accounts is not connected in this release.'}
          />
        ) : (
          <DataTable columns={columns} rows={visible} rowKey={(order) => order.id} caption="Orders" minWidth={820} emptyMessage="No orders match this filter." />
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel as="section" title="Fulfilment steps" subtitle="Every order moves through the same four stages">
          <ol className="grid gap-2 text-xs sm:grid-cols-2">
            {ORDER_FLOW.map((step, index) => (
              <li key={step} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-800 text-[10px] font-extrabold text-white">{index + 1}</span>
                <div>
                  <div className="font-bold text-slate-900">{ORDER_STATUS_META[step].label}</div>
                  <div className="text-[11px] text-slate-600">{ORDER_STATUS_META[step].description}{ORDER_STATUS_META[step].next ? ` Action: ${ORDER_STATUS_META[step].next?.action}.` : ''}</div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-600">
            <Ban size={12} aria-hidden="true" /> Orders can be cancelled while they are Placed or Processing. Cancelling does not restock items automatically.
          </p>
        </Panel>
        <Notice tone="neutral" title="What is not connected">
          <ul className="list-disc space-y-1 pl-4">
            <li>No payment is collected: payment modes are demonstration labels and no settlement occurs.</li>
            <li>No courier is booked and no tracking ID is generated when an order is marked dispatched.</li>
            <li>No SMS, WhatsApp or email notification is sent to the farmer on a status change.</li>
            <li>No GST invoice is generated — the printable statement is for interface review only.</li>
          </ul>
        </Notice>
      </div>

      <OrderDetailDialog order={detailOrder} onClose={() => setDetailOrder(null)} onAdvance={requestAdvance} onCancel={requestCancel} />
      {workflowDialog}
    </div>
  );
};

export default SellerOrdersPage;
