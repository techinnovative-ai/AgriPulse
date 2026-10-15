import React, { useMemo, useState } from 'react';
import { Printer, ArrowRight, Ban } from 'lucide-react';
import { useAgriPulse } from '../../context/AgriPulseContext';
import type { DemoOrder, OrderStatus, StoreProduct } from '../../types';
import { Badge, Button, ConfirmDialog, Dialog, KeyValueList, Notice } from '../../components/ui';
import { formatDateTime } from '../../utils/formatters';
import { computeSellerMetrics, formatInr, isOwnListing, ORDER_STATUS_META, STOCK_META, stockState } from '../../services/sellerService';

/** Shared derived data for every Seller Central page. */
export function useSellerData() {
  const context = useAgriPulse();
  const isDemo = Boolean(context.session?.isDemo);
  const metrics = useMemo(
    () => computeSellerMetrics(context.products, context.orders, context.sellerProfile, isDemo),
    [context.products, context.orders, context.sellerProfile, isDemo]
  );
  const ownsListing = (product: StoreProduct) => isOwnListing(product, context.sellerProfile, isDemo);
  return { ...context, isDemo, metrics, ownsListing };
}

/**
 * Order workflow with confirmation. Status changes are saved to the workspace only —
 * no notification, payment capture or shipment is created.
 */
export function useOrderWorkflow(onApplied?: (order: DemoOrder, status: OrderStatus) => void) {
  const { updateOrderStatus } = useAgriPulse();
  const [pending, setPending] = useState<{ order: DemoOrder; target: OrderStatus } | null>(null);

  const requestAdvance = (order: DemoOrder) => {
    const next = ORDER_STATUS_META[order.orderStatus].next;
    if (next) setPending({ order, target: next.status });
  };
  const requestCancel = (order: DemoOrder) => setPending({ order, target: 'Cancelled' });

  const confirm = () => {
    if (!pending) return;
    updateOrderStatus(pending.order.id, pending.target);
    onApplied?.(pending.order, pending.target);
    setPending(null);
  };

  const next = pending ? ORDER_STATUS_META[pending.order.orderStatus].next : undefined;
  const isCancel = pending?.target === 'Cancelled';
  const workflowDialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      title={isCancel ? `Cancel order ${pending?.order.id}?` : next?.confirmTitle || 'Update order?'}
      description={
        isCancel
          ? 'The order is marked Cancelled in this workspace and the farmer sees it as cancelled in their order history. Stock is not returned automatically — adjust it in the catalogue if needed.'
          : next?.confirmBody || ''
      }
      confirmLabel={isCancel ? 'Cancel order' : next?.action || 'Confirm'}
      cancelLabel={isCancel ? 'Keep order' : 'Not now'}
      destructive={isCancel}
      onConfirm={confirm}
      onCancel={() => setPending(null)}
    />
  );

  return { requestAdvance, requestCancel, workflowDialog };
}

export const OrderStatusBadge: React.FC<{ status: OrderStatus; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const meta = ORDER_STATUS_META[status];
  return (
    <Badge tone={meta.tone} size={size} dot>
      {meta.label}
    </Badge>
  );
};

export const StockBadge: React.FC<{ product: StoreProduct; size?: 'sm' | 'md' }> = ({ product, size = 'sm' }) => {
  const state = stockState(product);
  return (
    <Badge tone={STOCK_META[state].tone} size={size} dot>
      {STOCK_META[state].label}
    </Badge>
  );
};

export const PaymentModeLabel: React.FC<{ mode: DemoOrder['paymentMode'] }> = ({ mode }) => <span>{mode.includes('UPI') ? 'UPI (demo workflow)' : 'Cash on delivery (demo)'}</span>;

interface OrderDetailDialogProps {
  order: DemoOrder | null;
  onClose: () => void;
  onAdvance?: (order: DemoOrder) => void;
  onCancel?: (order: DemoOrder) => void;
}

/** Order detail + printable statement. Tax lines are intentionally absent: GST invoicing is not connected. */
export const OrderDetailDialog: React.FC<OrderDetailDialogProps> = ({ order, onClose, onAdvance, onCancel }) => {
  if (!order) return null;
  const meta = ORDER_STATUS_META[order.orderStatus];
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const canCancel = order.orderStatus === 'Placed' || order.orderStatus === 'Processing';
  return (
    <Dialog
      open={Boolean(order)}
      onClose={onClose}
      wide
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span>Order {order.id}</span>
          <OrderStatusBadge status={order.orderStatus} />
        </span>
      }
      description={`Placed ${formatDateTime(order.createdAt)} · ${order.items.length} line item${order.items.length === 1 ? '' : 's'} · ${units} units`}
      footer={
        <>
          <Button variant="outline" onClick={() => window.print()} leadingIcon={<Printer size={14} />}>
            Print statement
          </Button>
          {onCancel && canCancel && (
            <Button variant="ghost" onClick={() => onCancel(order)} leadingIcon={<Ban size={14} />}>
              Cancel order
            </Button>
          )}
          {onAdvance && meta.next ? (
            <Button variant="primary" onClick={() => onAdvance(order)} trailingIcon={<ArrowRight size={14} />}>
              {meta.next.action}
            </Button>
          ) : (
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 print-area">
        <Notice tone="warning" title="Demonstration order">
          This order was placed through the simulated checkout. No payment was collected and no shipment exists. The statement below is for interface review only and is not a tax invoice.
        </Notice>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-500">Deliver to</h4>
            <p className="mt-1 text-sm font-bold text-slate-900">{order.deliveryDetails.customerName}</p>
            <p className="text-xs text-slate-700">{order.deliveryDetails.deliveryAddress}</p>
            <p className="text-xs text-slate-700">
              {order.deliveryDetails.village}, {order.deliveryDetails.district}, {order.deliveryDetails.state} – {order.deliveryDetails.pinCode}
            </p>
            <p className="mt-1 text-xs text-slate-700">Mobile: {order.deliveryDetails.mobileNumber}</p>
            {order.deliveryDetails.deliveryInstructions && <p className="mt-1 text-xs italic text-slate-600">“{order.deliveryDetails.deliveryInstructions}”</p>}
          </div>
          <KeyValueList
            items={[
              { label: 'Payment', value: <PaymentModeLabel mode={order.paymentMode} /> },
              { label: 'Payment status', value: order.demoPaymentStatus },
              { label: 'Workflow stage', value: `${meta.label} — ${meta.description}` },
              ...(order.promoCodeApplied ? [{ label: 'Promo code', value: order.promoCodeApplied }] : []),
            ]}
          />
        </div>

        <div className="ap-table-wrap">
          <table className="ap-table" style={{ minWidth: 480 }}>
            <caption className="sr-only">Order line items</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Pack</th>
                <th scope="col" className="is-numeric">Qty</th>
                <th scope="col" className="is-numeric">Unit price</th>
                <th scope="col" className="is-numeric">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${order.id}-${item.productId}`}>
                  <td className="font-semibold text-slate-900">{item.productName}</td>
                  <td>{item.packSize}</td>
                  <td className="is-numeric">{item.quantity}</td>
                  <td className="is-numeric">{formatInr(item.unitPricePaise)}</td>
                  <td className="is-numeric font-semibold">{formatInr(item.lineTotalPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto grid w-full max-w-xs gap-1 text-xs">
          <div className="flex justify-between"><dt className="text-slate-600">Subtotal</dt><dd className="font-semibold">{formatInr(order.subtotalPaise)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-600">Shipping</dt><dd className="font-semibold">{order.shippingPaise === 0 ? 'Free' : formatInr(order.shippingPaise)}</dd></div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between"><dt className="text-slate-600">Discount</dt><dd className="font-semibold text-forest-800">− {formatInr(order.discountPaise)}</dd></div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm"><dt className="font-bold text-slate-900">Total payable</dt><dd className="font-extrabold text-slate-900">{formatInr(order.totalPayablePaise)}</dd></div>
          <p className="text-[10px] text-slate-500">GST is not calculated — tax invoicing requires a verified GSTIN and a connected billing service.</p>
        </dl>
      </div>
    </Dialog>
  );
};
