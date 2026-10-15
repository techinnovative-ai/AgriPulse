import React from 'react';
import { Banknote, CreditCard, Landmark, PackageCheck, Wallet } from 'lucide-react';
import type { OrderStatus } from '../../types';
import { Badge, Button, DataTable, EmptyState, MetricCard, Notice, PageHeader, Panel, SourceTag, type DataTableColumn } from '../../components/ui';
import { formatInr, ORDER_STATUS_META } from '../../services/sellerService';
import { OrderStatusBadge, useSellerData } from './sellerShared';

interface StatusRow {
  status: OrderStatus;
  count: number;
  valuePaise: number;
}

export const SellerPayoutsPage: React.FC = () => {
  const { orders, metrics, isDemo } = useSellerData();

  const rows: StatusRow[] = (Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((status) => ({
    status,
    count: orders.filter((order) => order.orderStatus === status).length,
    valuePaise: metrics.valueByStatusPaise[status],
  }));
  const codCount = orders.filter((order) => !order.paymentMode.includes('UPI')).length;
  const upiCount = orders.length - codCount;

  const columns: DataTableColumn<StatusRow>[] = [
    { key: 'status', header: 'Order status', render: (row) => <OrderStatusBadge status={row.status} /> },
    { key: 'count', header: 'Orders', numeric: true, render: (row) => row.count },
    { key: 'value', header: 'Order value', numeric: true, render: (row) => <span className="font-semibold">{formatInr(row.valuePaise)}</span> },
    {
      key: 'settlement',
      header: 'Settlement',
      render: (row) => (row.status === 'Delivered' ? <Badge tone="neutral" size="sm">Would be eligible once payments are connected</Badge> : <span className="text-[11px] text-slate-500">—</span>),
    },
  ];

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Payouts & settlements"
        icon={<Wallet size={14} />}
        title="Payouts & settlements"
        description="Where your money would be tracked. No payment provider is connected in this release, so no funds are collected, held or transferred."
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <SourceTag source="unavailable" label="Payments not connected" />
            <SourceTag source={isDemo ? 'demo' : 'saved_record'} />
            <span>Values below are totals of orders saved in this workspace — not collected or settled amounts.</span>
          </div>
        }
      />

      <Notice tone="warning" title="Payments are not connected">
        Orders show “Cash on delivery (demo)” or “UPI (demo workflow)” as labels only. Nothing is charged to farmers and nothing is owed to you through AGRIPULSE. Settlements require a verified seller account and a licensed payment provider.
      </Notice>

      <section aria-label="Order value summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={<PackageCheck />} label="Delivered order value" value={formatInr(metrics.deliveredValuePaise)} note={`${metrics.delivered.length} delivered order${metrics.delivered.length === 1 ? '' : 's'}`} tone="forest" source={isDemo ? 'demo' : 'saved_record'} />
        <MetricCard icon={<Wallet />} label="Open order value" value={formatInr(metrics.openValuePaise)} note={`${metrics.openOrders.length} order${metrics.openOrders.length === 1 ? '' : 's'} in progress`} tone="water" />
        <MetricCard icon={<Banknote />} label="Cash on delivery" value={codCount} note="Orders · demo label" tone="amber" />
        <MetricCard icon={<CreditCard />} label="UPI" value={upiCount} note="Orders · demo workflow" tone="neutral" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel as="section" className="lg:col-span-2" title="Order value by status" subtitle="Counted from your workspace orders" flush>
          <DataTable columns={columns} rows={rows} rowKey={(row) => row.status} caption="Order value by status" minWidth={560} />
        </Panel>

        <Panel as="section" title="Integration status" subtitle="What a production seller account needs">
          <dl className="ap-kv">
            <div>
              <dt>Payment gateway</dt>
              <dd>Not connected</dd>
            </div>
            <div>
              <dt>Settlement schedule</dt>
              <dd>Not configured</dd>
            </div>
            <div>
              <dt>Bank account</dt>
              <dd>Not collected — captured during seller verification with the payment provider, never in this form.</dd>
            </div>
            <div>
              <dt>GST invoicing</dt>
              <dd>Not connected</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-slate-600">
            Keep your business profile complete so verification can start once a provider is available.
          </p>
          <div className="mt-3">
            <Button size="sm" variant="outline" to="/seller/settings">Open store settings</Button>
          </div>
        </Panel>
      </div>

      <Panel as="section" title="Settlement ledger" subtitle="Payout records will appear here once a provider is connected">
        <EmptyState compact icon={<Landmark />} title="No settlements" description="There are no payout records because no payment has been collected. This ledger will list settlement date, period, gross order value, fees and net payout when payments go live." />
      </Panel>
    </div>
  );
};

export default SellerPayoutsPage;
