import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, ExternalLink, Minus, Package, PackageX, Pencil, Plus, Trash2 } from 'lucide-react';
import type { StoreProduct } from '../../types';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, MetricCard, Notice, PageHeader, Panel, SearchInput, SegmentedControl, SourceTag, Tabs, type DataTableColumn } from '../../components/ui';
import { availabilityForStock, formatInr, PRODUCT_CATEGORIES, productsToCsvRows, stockState, type StockState } from '../../services/sellerService';
import { downloadTextFile, slugify, toCsv } from '../../utils/csv';
import { markStorePreview } from '../../utils/portalPreview';
import { ProductFormDialog } from './ProductFormDialog';
import { StockBadge, useSellerData } from './sellerShared';

type Scope = 'mine' | 'all';
type StockFilter = 'all' | StockState;
const STOCK_FILTERS: StockFilter[] = ['all', 'in_stock', 'low_stock', 'out_of_stock'];
const STOCK_FILTER_LABEL: Record<StockFilter, string> = { all: 'All', in_stock: 'In stock', low_stock: 'Low stock', out_of_stock: 'Out of stock' };

interface FormState {
  open: boolean;
  mode: 'create' | 'edit';
  product: StoreProduct | null;
  focusStock?: boolean;
}

export const SellerCatalogPage: React.FC = () => {
  const { products, metrics, sellerProfile, isDemo, ownsListing, addProduct, updateProduct, deleteProduct, switchPortal } = useSellerData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [scope, setScope] = useState<Scope>('mine');
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [form, setForm] = useState<FormState>(() => ({ open: searchParams.get('action') === 'new', mode: 'create', product: null }));
  const [pendingDelete, setPendingDelete] = useState<StoreProduct | null>(null);

  const stockParam = searchParams.get('stock');
  const stockFilter: StockFilter = STOCK_FILTERS.includes(stockParam as StockFilter) ? (stockParam as StockFilter) : 'all';
  const setStockFilter = (next: StockFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('stock');
    else params.set('stock', next);
    params.delete('action');
    setSearchParams(params, { replace: true });
  };

  const closeForm = () => {
    setForm((current) => ({ ...current, open: false }));
    if (searchParams.get('action')) {
      const params = new URLSearchParams(searchParams);
      params.delete('action');
      setSearchParams(params, { replace: true });
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (scope === 'mine' && !ownsListing(product)) return false;
      if (category !== 'All' && product.category !== category) return false;
      if (stockFilter !== 'all' && stockState(product) !== stockFilter) return false;
      if (!q) return true;
      return product.name.toLowerCase().includes(q) || product.brand.toLowerCase().includes(q) || product.category.toLowerCase().includes(q) || product.sellerName.toLowerCase().includes(q);
    });
  }, [products, scope, category, stockFilter, query, ownsListing]);

  const scopedCount = (filter: StockFilter) => {
    const base = scope === 'mine' ? metrics.ownListings : products;
    return filter === 'all' ? base.length : base.filter((product) => stockState(product) === filter).length;
  };

  const adjustStock = (product: StoreProduct, delta: number) => {
    const stockCount = Math.max(0, product.stockCount + delta);
    updateProduct({ ...product, stockCount, availability: availabilityForStock(stockCount) });
  };

  const markOutOfStock = (product: StoreProduct) => updateProduct({ ...product, stockCount: 0, availability: 'Out of Stock' });

  const viewInStore = async (product: StoreProduct) => {
    markStorePreview(true);
    if (await switchPortal('farmer')) navigate(`/store/product/${product.id}`);
    else markStorePreview(false);
  };

  const exportCsv = () => downloadTextFile(`${slugify(sellerProfile.businessName)}-listings.csv`, toCsv(productsToCsvRows(visible)), 'text/csv');

  const columns: DataTableColumn<StoreProduct>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (product) => {
        const mine = ownsListing(product);
        return (
          <div className="max-w-[300px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-900">{product.name}</span>
              {!mine && <Badge tone="muted" size="sm">Another seller</Badge>}
              {mine && product.isDemoSeller && <Badge tone="warning" size="sm">Sample listing</Badge>}
            </div>
            <div className="text-[11px] text-slate-500">
              {product.brand} · {product.packSize}
              {scope === 'all' && !mine ? ` · ${product.sellerName}` : ''}
            </div>
          </div>
        );
      },
    },
    { key: 'category', header: 'Category', render: (product) => <span className="text-xs text-slate-700">{product.category}</span> },
    {
      key: 'price',
      header: 'Price',
      numeric: true,
      render: (product) => (
        <div>
          <div className="font-bold text-slate-900">{formatInr(product.pricePaise)}</div>
          {product.mrpPaise > product.pricePaise && (
            <div className="text-[11px] text-slate-500">
              <s>{formatInr(product.mrpPaise)}</s> · {Math.round(((product.mrpPaise - product.pricePaise) / product.mrpPaise) * 100)}% off
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      numeric: true,
      render: (product) => {
        const mine = ownsListing(product);
        return (
          <div className="flex items-center justify-end gap-1.5">
            {mine && (
              <Button size="sm" variant="ghost" iconOnly aria-label={`Reduce stock of ${product.name} by 5`} onClick={() => adjustStock(product, -5)} disabled={product.stockCount === 0}>
                <Minus size={13} />
              </Button>
            )}
            <span className="min-w-[3ch] text-center font-semibold tabular-nums text-slate-900">{product.stockCount}</span>
            {mine && (
              <Button size="sm" variant="ghost" iconOnly aria-label={`Increase stock of ${product.name} by 5`} onClick={() => adjustStock(product, 5)}>
                <Plus size={13} />
              </Button>
            )}
          </div>
        );
      },
    },
    { key: 'availability', header: 'Availability', render: (product) => <StockBadge product={product} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      numeric: true,
      render: (product) => {
        const mine = ownsListing(product);
        if (!mine) {
          return isDemo ? (
            <Button size="sm" variant="ghost" onClick={() => viewInStore(product)} trailingIcon={<ExternalLink size={12} />}>
              View in store
            </Button>
          ) : (
            <span className="text-[11px] text-slate-500">Read only</span>
          );
        }
        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            {product.stockCount === 0 ? (
              <Button size="sm" variant="secondary" onClick={() => setForm({ open: true, mode: 'edit', product, focusStock: true })}>
                Restock
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => markOutOfStock(product)} leadingIcon={<PackageX size={13} />}>
                Mark out of stock
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setForm({ open: true, mode: 'edit', product })} leadingIcon={<Pencil size={13} />}>
              Edit
            </Button>
            {isDemo && (
              <Button size="sm" variant="ghost" iconOnly aria-label={`View ${product.name} in the store`} title="View in store" onClick={() => viewInStore(product)}>
                <ExternalLink size={13} />
              </Button>
            )}
            <Button size="sm" variant="ghost" iconOnly aria-label={`Delete ${product.name}`} title="Delete listing" onClick={() => setPendingDelete(product)}>
              <Trash2 size={13} className="text-rose-700" />
            </Button>
          </div>
        );
      },
    },
  ];

  const categoriesInUse = useMemo(() => PRODUCT_CATEGORIES.filter((item) => products.some((product) => product.category === item)), [products]);

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="Catalogue & inventory"
        icon={<Package size={14} />}
        title="Catalogue & inventory"
        description="Manage the listings farmers see in the AGRIPULSE Store: prices, pack sizes, stock counts and availability. Other sellers' listings are shown read-only for price comparison."
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={exportCsv} disabled={visible.length === 0} leadingIcon={<Download size={14} />}>
              Export CSV
            </Button>
            <Button size="sm" variant="primary" onClick={() => setForm({ open: true, mode: 'create', product: null })} leadingIcon={<Plus size={14} />}>
              Add listing
            </Button>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <SourceTag source="saved_record" />
            <span>Stock counts are what you enter here — nothing is synchronised with a warehouse system. Listings marked “Sample listing” were seeded for the demo workspace.</span>
          </div>
        }
      />

      <section aria-label="Inventory summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={<Package />} label="My listings" value={metrics.ownListings.length} note={`${products.length} in the whole marketplace`} tone="forest" onClick={() => { setScope('mine'); setStockFilter('all'); }} ariaLabel="Show my listings" />
        <MetricCard icon={<Package />} label="In stock" value={metrics.ownListings.length - metrics.lowStock.length - metrics.outOfStock.length} note="Available to order" tone="leaf" onClick={() => { setScope('mine'); setStockFilter('in_stock'); }} ariaLabel="Show in-stock listings" />
        <MetricCard icon={<Package />} label="Low stock" value={metrics.lowStock.length} note="5 or fewer units, or marked low" tone="amber" onClick={() => { setScope('mine'); setStockFilter('low_stock'); }} ariaLabel="Show low-stock listings" />
        <MetricCard icon={<PackageX />} label="Out of stock" value={metrics.outOfStock.length} note="Hidden from ordering" tone="neutral" onClick={() => { setScope('mine'); setStockFilter('out_of_stock'); }} ariaLabel="Show out-of-stock listings" />
      </section>

      <Panel
        as="section"
        title={scope === 'mine' ? 'My listings' : 'Whole marketplace'}
        subtitle={`${visible.length} shown`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl ariaLabel="Listing scope" value={scope} onChange={setScope} options={[{ value: 'mine', label: `Mine (${metrics.ownListings.length})` }, { value: 'all', label: `All (${products.length})` }]} />
            <label className="sr-only" htmlFor="catalog-category">Category</label>
            <select id="catalog-category" className="ap-select w-full sm:w-56" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="All">All categories</option>
              {categoriesInUse.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <SearchInput label="Search listings" placeholder="Name, brand or category" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full sm:w-64" />
          </div>
        }
        flush
      >
        <div className="px-4 pt-4 pb-3 sm:px-5">
          <Tabs ariaLabel="Stock state" value={stockFilter} onChange={setStockFilter} tabs={STOCK_FILTERS.map((filter) => ({ value: filter, label: STOCK_FILTER_LABEL[filter], count: scopedCount(filter) }))} />
        </div>
        {scope === 'mine' && metrics.ownListings.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="No listings yet"
            description="Add your first product to make it visible in the AGRIPULSE Store."
            actions={
              <Button variant="primary" onClick={() => setForm({ open: true, mode: 'create', product: null })} leadingIcon={<Plus size={14} />}>
                Add listing
              </Button>
            }
          />
        ) : (
          <DataTable columns={columns} rows={visible} rowKey={(product) => product.id} caption="Product listings" minWidth={880} emptyMessage="No listings match these filters." />
        )}
      </Panel>

      <Notice tone="neutral" title="Listing rules">
        Describe products plainly and only claim certifications, licences or test results you can document. Listings are published immediately in this workspace; a production marketplace would require seller verification before a listing goes live.
      </Notice>

      <ProductFormDialog
        open={form.open}
        mode={form.mode}
        product={form.product}
        profile={sellerProfile}
        isDemo={isDemo}
        focusStock={form.focusStock}
        onClose={closeForm}
        onCreate={(product) => addProduct(product)}
        onUpdate={updateProduct}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete “${pendingDelete?.name}”?`}
        description="The listing is removed from the store immediately. Existing orders that include it keep their line items. This cannot be undone."
        confirmLabel="Delete listing"
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteProduct(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default SellerCatalogPage;
