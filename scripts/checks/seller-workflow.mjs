/**
 * Interaction check for Seller Central, run through the smoke harness:
 *
 *   node scripts/smoke-render.mjs --only /seller --script scripts/checks/seller-workflow.mjs
 *
 * Exercises: add-listing validation → publish → mark out of stock → restock → delete,
 * then order acceptance → dispatch → delivery confirmation on a sample order that the
 * check inserts into the development demo workspace (and removes again).
 */
export default async function sellerWorkflow({ window, navigate, text, waitFor, sleep, apiFetch, startDemoSession, failures }) {
  const doc = window.document;
  const problems = [];
  const check = (condition, message) => {
    if (!condition) problems.push(message);
    console.log(`${condition ? 'ok  ' : 'FAIL'} ${message}`);
  };
  const setValue = (el, value) => {
    const proto = el instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : el instanceof window.HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event(el instanceof window.HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  };
  // Last match wins so a confirmation dialog stacked above a detail dialog receives the click.
  const button = (label) => [...doc.querySelectorAll('button, a')].filter((el) => (el.getAttribute('aria-label') || el.textContent || '').trim() === label).pop();
  const click = async (label) => {
    const el = button(label);
    if (!el) throw new Error(`Button "${label}" not found`);
    el.click();
    await sleep(150);
  };
  const fieldByLabel = (label) => {
    const lab = [...doc.querySelectorAll('label')].find((el) => el.textContent.replace('*', '').trim() === label);
    return lab ? doc.getElementById(lab.htmlFor) : null;
  };

  if (!(await startDemoSession('seller'))) {
    console.log('Seller demo session unavailable; skipping seller workflow check.');
    return;
  }

  /* ---------- Catalogue ---------- */
  navigate('/seller/catalog');
  await waitFor(() => /Catalogue & inventory/.test(text()));
  await click('Add listing');
  await waitFor(() => doc.querySelector('[role="dialog"]'));
  await click('Publish listing');
  await sleep(100);
  check(/fields need attention/.test(text()), 'empty listing form is rejected with a validation summary');

  setValue(fieldByLabel('Product name'), 'Smoke-test Urea 45 kg');
  setValue(fieldByLabel('Pack size'), '45 kg bag');
  setValue(fieldByLabel('Units in stock'), '12');
  setValue(fieldByLabel('Selling price (₹ per pack)'), '266.5');
  setValue(fieldByLabel('MRP (₹ per pack)'), '100');
  await click('Publish listing');
  await sleep(100);
  check(/MRP cannot be lower/.test(text()), 'MRP lower than price is rejected');
  setValue(fieldByLabel('MRP (₹ per pack)'), '280');
  await click('Publish listing');
  await waitFor(() => !doc.querySelector('[role="dialog"]'));
  check(/Smoke-test Urea 45 kg/.test(text()), 'new listing appears in the catalogue');
  const row = () => [...doc.querySelectorAll('tbody tr')].find((tr) => /Smoke-test Urea/.test(tr.textContent));
  check(/In stock/.test(row()?.textContent || ''), 'new listing is In stock with 12 units');

  row().querySelector('button[aria-label^="Increase stock"]').click();
  await sleep(100);
  check(row().querySelector('.tabular-nums')?.textContent === '17', 'stock +5 updates the count to 17');

  [...row().querySelectorAll('button')].find((b) => b.textContent.trim() === 'Mark out of stock').click();
  await sleep(100);
  check(/Out of stock/.test(row().textContent) && /Restock/.test(row().textContent), 'mark out of stock sets the badge and offers Restock');

  [...row().querySelectorAll('button')].find((b) => b.textContent.trim() === 'Restock').click();
  await waitFor(() => doc.querySelector('[role="dialog"]'));
  await waitFor(() => doc.activeElement?.id === 'product-stock', 2000);
  check(doc.activeElement?.id === 'product-stock', 'restock dialog focuses the stock field');
  setValue(doc.getElementById('product-stock'), '3');
  await click('Save changes');
  await waitFor(() => !doc.querySelector('[role="dialog"]'));
  check(/Low stock/.test(row().textContent), 'restocking to 3 units shows Low stock');

  row().querySelector('button[aria-label^="Delete"]').click();
  await waitFor(() => doc.querySelector('[role="dialog"]'));
  check(/cannot be undone/.test(text()), 'delete asks for confirmation');
  await click('Delete listing');
  await waitFor(() => !doc.querySelector('[role="dialog"]'));
  check(!row(), 'deleted listing is removed from the catalogue');

  /* ---------- Orders ---------- */
  const workspace = await (await apiFetch('/api/workspace')).json();
  const sampleOrder = {
    id: 'ORD-SMOKE-0001',
    createdAt: new Date().toISOString(),
    items: [{ productId: 'prod-smoke', productName: 'Smoke-test item', packSize: '1 unit', category: 'Hand tools and accessories', unitPricePaise: 12500, quantity: 2, lineTotalPaise: 25000 }],
    subtotalPaise: 25000,
    shippingPaise: 0,
    discountPaise: 0,
    totalPayablePaise: 25000,
    paymentMode: 'Cash on Delivery (Demo)',
    demoPaymentStatus: 'Pending (Demo)',
    orderStatus: 'Placed',
    isDemoOrder: true,
    deliveryDetails: { customerName: 'Smoke Tester', mobileNumber: '9999999999', deliveryAddress: 'Test lane', village: 'Testpur', district: 'Karnal', state: 'Haryana', pinCode: '132001' },
  };
  const originalOrders = workspace.data.orders;
  const put = await apiFetch('/api/workspace', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ revision: workspace.revision, data: { ...workspace.data, orders: [sampleOrder, ...originalOrders] } }) });
  check(put.ok, 'sample Placed order inserted into the demo workspace');

  await startDemoSession('seller');
  check(/Awaitingacceptance1/.test(text().replace(/\s+/g, '')), 'dashboard counts the new order as awaiting acceptance');
  check(/ORD-SMOKE-0001 is waiting for acceptance/.test(text()), 'dashboard lists the order under Needs attention');

  navigate('/seller/orders?order=ORD-SMOKE-0001');
  await waitFor(() => doc.querySelector('[role="dialog"]'));
  check(/Order ORD-SMOKE-0001/.test(text()) && /Smoke Tester/.test(text()), 'deep link opens the order detail dialog');
  await click('Accept & start packing');
  await waitFor(() => /Accept this order\?/.test(text()));
  await click('Accept & start packing');
  await waitFor(() => !doc.querySelector('[role="dialog"]'));
  const orderRow = () => [...doc.querySelectorAll('tbody tr')].find((tr) => /ORD-SMOKE-0001/.test(tr.textContent));
  check(/Processing/.test(orderRow()?.textContent || ''), 'order moves to Processing after confirmation');

  [...orderRow().querySelectorAll('button')].find((b) => /Mark as dispatched/.test(b.textContent)).click();
  await waitFor(() => doc.querySelector('[role="dialog"]'));
  await click('Mark as dispatched');
  await waitFor(() => !doc.querySelector('[role="dialog"]'));
  check(/Dispatched/.test(orderRow().textContent), 'order moves to Dispatched');

  [...orderRow().querySelectorAll('button')].find((b) => /Confirm delivery/.test(b.textContent)).click();
  await waitFor(() => doc.querySelector('[role="dialog"]'));
  await click('Confirm delivery');
  await waitFor(() => !doc.querySelector('[role="dialog"]'));
  check(/Delivered/.test(orderRow().textContent), 'order moves to Delivered');
  check(!/Confirm delivery|Mark as dispatched|Accept & start packing/.test(orderRow().textContent), 'delivered order has no further workflow action');

  await sleep(1200); // allow the debounced workspace sync to flush

  /* ---------- Settings ---------- */
  navigate('/seller/settings');
  await waitFor(() => /Store settings & profile/.test(text()));
  setValue(fieldByLabel('GSTIN'), 'BADGSTIN');
  await click('Save profile');
  await sleep(100);
  check(/GSTIN must be 15 characters/.test(text()), 'invalid GSTIN is rejected on save');
  setValue(fieldByLabel('GSTIN'), '');
  await click('Discard changes');
  await sleep(100);
  check(!/Unsaved changes/.test(text()), 'discard restores the saved profile');

  /* ---------- Portal switch: preview store and come back ---------- */
  navigate('/seller');
  await waitFor(() => /Seller dashboard/.test(text()));
  await click('Preview store');
  await waitFor(() => /Store preview: you are seeing the Farmer Portal/.test(text()), 10000);
  check(/Store preview: you are seeing the Farmer Portal/.test(text()), 'Preview store opens the farmer-side store with the preview banner');
  check(window.location.pathname === '/store', 'preview lands on /store');
  await click('Return to Seller Central →');
  await waitFor(() => /Seller dashboard/.test(text()) && window.location.pathname === '/seller', 10000);
  check(window.location.pathname === '/seller', 'Return to Seller Central switches the portal back');

  /* ---------- Clean up ---------- */
  const latest = await (await apiFetch('/api/workspace')).json();
  const restore = await apiFetch('/api/workspace', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ revision: latest.revision, data: { ...latest.data, orders: latest.data.orders.filter((order) => order.id !== 'ORD-SMOKE-0001') } }) });
  check(restore.ok, 'sample order removed from the demo workspace');

  if (problems.length) failures.push({ route: 'seller-workflow', problems });
}
