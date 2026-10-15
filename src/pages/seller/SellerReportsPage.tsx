import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Download, Package, PackageCheck, ShoppingBag, XCircle } from 'lucide-react';
import { Button, CHART_AXIS_PROPS, CHART_COLORS, CHART_GRID_PROPS, ChartContainer, ChartTooltip, DataTable, MetricCard, Notice, PageHeader, Panel, SegmentedControl, SourceTag, type DataTableColumn } from '../../components/ui';
import { categoryMix, formatInr, ordersByWeek, ordersToCsvRows, productsToCsvRows, topProducts } from '../../services/sellerService';
import { downloadTextFile, slugify, toCsv } from '../../utils/csv';
import { useSellerData } from './sellerShared';

type Range = '4' | '8' | '12';

export const SellerReportsPage: React.FC = () => {
  const { orders, metrics, sellerProfile, isDemo } = useSellerData();
  const [range, setRange] = useState<Range>('8');
  const weeks = Number(range);

  const since = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);
    return start.getTime();
  }, [weeks]);

  const inRange = useMemo(() => orders.filter((order) => Date.parse(order.createdAt) >= since), [orders, since]);
  const weekly = useMemo(() => ordersByWeek(orders, weeks), [orders, weeks]);
  const top = useMemo(() => topProducts(inRange), [inRange]);
  const mix = useMemo(() => categoryMix(metrics.ownListings), [metrics.ownListings]);

  const units = inRange.reduce((sum, order) => sum + order.items.reduce((inner, item) => inner + item.quantity, 0), 0);
  const value = inRange.filter((order) => order.orderStatus !== 'Cancelled').reduce((sum, order) => sum + order.totalPayablePaise, 0);
  const cancelled = inRange.filter((order) => order.orderStatus === 'Cancelled').length;
  const cancelRate = inRange.length > 0 ? Math.round((cancelled / inRange.length) * 100) : 0;
  const hasOrders = weekly.some((point) => point.orders > 0);

  const prefix = slugify(sellerProfile.businessName);
  const exportOrders = () => downloadTextFile(`${prefix}-orders-${weeks}w.csv`, toCsv(ordersToCsvRows(inRange)), 'text/csv');
  const exportListings = () => downloadTextFile(`${prefix}-listings.csv`, toCsv(productsToCsvRows(metrics.ownListings)), 'text/csv');

  const topColumns: DataTableColumn<(typeof top)[number]>[] = [
    { key: 'name', header: 'Product', render: (row) => <span className="font-semibold text-slate-900">{row.name}</span> },
    { key: 'units', header: 'Units ordered', numeric: true, render: (row) => row.units },
    { key: 'value', header: 'Order value', numeric: true, render: (row) => formatInr(Math.round(row.valueInr * 100)) },
  ];
  const mixColumns: DataTableColumn<(typeof mix)[number]>[] = [
    { key: 'category', header: 'Category', render: (row) => row.category },
    { key: 'count', header: 'Listings', numeric: true, render: (row) => row.count },
  ];

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Reports & analytics"
        icon={<BarChart3 size={14} />}
        title="Reports & analytics"
        description="Order volume, order value and best-selling listings over recent weeks, with CSV export for your own records."
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={exportOrders} disabled={inRange.length === 0} leadingIcon={<Download size={14} />}>
              Export orders
            </Button>
            <Button size="sm" variant="secondary" onClick={exportListings} disabled={metrics.ownListings.length === 0} leadingIcon={<Download size={14} />}>
              Export listings
            </Button>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <SegmentedControl ariaLabel="Reporting window" value={range} onChange={setRange} options={[{ value: '4', label: '4 weeks' }, { value: '8', label: '8 weeks' }, { value: '12', label: '12 weeks' }]} />
            <span className="flex items-center gap-2">
              <SourceTag source={isDemo ? 'demo' : 'saved_record'} />
              Counted from workspace orders · weeks start on Sunday · missing weeks show as zero orders, not missing data.
            </span>
          </div>
        }
      />

      <section aria-label="Report summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={<ShoppingBag />} label="Orders" value={inRange.length} note={`Last ${weeks} weeks`} tone="forest" />
        <MetricCard icon={<Package />} label="Units ordered" value={units} note="All line items" tone="leaf" />
        <MetricCard icon={<PackageCheck />} label="Order value" value={formatInr(value)} note="Excludes cancelled · not settled funds" tone="store" />
        <MetricCard icon={<XCircle />} label="Cancellation rate" value={`${cancelRate}%`} note={`${cancelled} cancelled`} tone={cancelRate > 20 ? 'amber' : 'neutral'} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartContainer title="Orders per week" subtitle={`Last ${weeks} weeks`} source={isDemo ? 'demo' : 'saved_record'} isEmpty={!hasOrders} emptyTitle="No orders in this window" size="sm" summary={`${inRange.length} order${inRange.length === 1 ? '' : 's'} across the last ${weeks} weeks.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="label" {...CHART_AXIS_PROPS} />
              <YAxis allowDecimals={false} {...CHART_AXIS_PROPS} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="orders" name="Orders" fill={CHART_COLORS.forest} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        <ChartContainer title="Order value per week" subtitle={`Last ${weeks} weeks`} unit="₹" source={isDemo ? 'demo' : 'saved_record'} isEmpty={!hasOrders} emptyTitle="No order value in this window" size="sm" summary={`${formatInr(value)} of order value across the last ${weeks} weeks.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="label" {...CHART_AXIS_PROPS} />
              <YAxis {...CHART_AXIS_PROPS} tickFormatter={(tick: number) => (tick >= 1000 ? `${Math.round(tick / 1000)}k` : String(tick))} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="valueInr" name="Order value (₹)" fill={CHART_COLORS.leaf} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel as="section" title="Best-selling listings" subtitle={`By units ordered · last ${weeks} weeks · cancelled orders excluded`} flush>
          <DataTable columns={topColumns} rows={top} rowKey={(row) => row.productId} caption="Best-selling listings" minWidth={420} emptyMessage="No orders in this window yet." />
        </Panel>
        <Panel as="section" title="Listings by category" subtitle={`${metrics.ownListings.length} of your listings`} flush>
          <DataTable columns={mixColumns} rows={mix} rowKey={(row) => row.category} caption="Listings by category" minWidth={360} emptyMessage="No listings yet." />
        </Panel>
      </div>

      <Notice tone="neutral" title="About these figures">
        Reports are computed in your browser from the orders and listings saved to your workspace. Page views, search impressions and conversion rates are not tracked, so they are not shown.
      </Notice>
    </div>
  );
};

export default SellerReportsPage;
