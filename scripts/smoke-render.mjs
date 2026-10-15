#!/usr/bin/env node
/**
 * Headless render smoke test.
 *
 * Bundles the React app with esbuild, mounts it inside jsdom and visits every public and
 * farmer-portal route against a running API (default http://127.0.0.1:4000). It fails when a
 * route throws, renders the 404 page unexpectedly, or logs a React error.
 *
 *   npm run dev:api            # in another terminal
 *   node scripts/smoke-render.mjs [--api http://127.0.0.1:4000] [--public-only] [--only /a,/b] [--dump] [--find <regex>] [--script <file.mjs>]
 *
 * `--script` imports an ES module after the route sweep and calls its default export with
 * `{ window, navigate, text, waitFor, sleep, apiFetch, visit, startDemoSession, failures }`
 * so interaction checks (clicking through a workflow) can reuse the same environment.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const args = process.argv.slice(2);
const apiBase = (args.includes('--api') ? args[args.indexOf('--api') + 1] : process.env.SMOKE_API_URL) || 'http://127.0.0.1:4000';
const publicOnly = args.includes('--public-only');
const dump = args.includes('--dump');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const find = args.includes('--find') ? new RegExp(args[args.indexOf('--find') + 1], 'i') : null;
const scriptPath = args.includes('--script') ? path.resolve(args[args.indexOf('--script') + 1]) : null;
const origWarn = console.warn;
console.warn = (...parts) => {
  if (/width\(0\) and height\(0\) of chart/.test(String(parts[0]))) return; // jsdom has no layout
  origWarn(...parts);
};

const PUBLIC_ROUTES = ['/', '/platform', '/digital-twin', '/ai-capabilities', '/how-it-works', '/technology', '/impact', '/roadmap', '/about', '/faq', '/contact', '/farmer/login', '/farmer/signup', '/login', '/signup', '/this-route-does-not-exist'];
const SELLER_ROUTES = ['/seller', '/seller/dashboard', '/seller/orders', '/seller/orders?status=Placed', '/seller/catalog', '/seller/catalog?action=new', '/seller/catalog?stock=out_of_stock', '/seller/payouts', '/seller/reports', '/seller/settings'];
const PORTAL_ROUTES = ['/home', '/alerts', '/farm', '/farm?tab=observations', '/farm?tab=crops', '/monitoring', '/twin', '/insights', '/irrigation', '/soil', '/crop-health', '/crop-health?action=report', '/weather', '/devices', '/reports', '/assistant', '/dictionary', '/disease', '/news', '/schemes', '/store', '/cart', '/orders', '/wishlist', '/offers', '/account'];

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = await mkdtemp(path.join(tmpdir(), 'agripulse-smoke-'));
const entry = path.join(root, 'node_modules', '.agripulse-smoke-entry.tsx');
await writeFile(
  entry,
  `import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '${path.join(root, 'src/App.tsx').replace(/\\/g, '/')}';
(globalThis as any).__mountApp = (el: HTMLElement) => { const r = createRoot(el); r.render(React.createElement(App)); return r; };
`
);

await build({
  entryPoints: [entry],
  absWorkingDir: root,
  nodePaths: [path.join(root, 'node_modules')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  outfile: path.join(outDir, 'bundle.mjs'),
  loader: { '.css': 'empty', '.svg': 'dataurl', '.png': 'dataurl' },
  define: {
    'import.meta.env.DEV': 'true',
    'import.meta.env.PROD': 'false',
    'import.meta.env.MODE': '"development"',
    'import.meta.env.VITE_WEATHER_API_URL': '""',
    'import.meta.env': '{"DEV":true,"PROD":false,"MODE":"development"}',
    'process.env.NODE_ENV': '"development"',
  },
  logLevel: 'silent',
  jsx: 'automatic',
});

// ---- jsdom environment -------------------------------------------------------------------
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000/',
  pretendToBeVisual: true,
});
const { window } = dom;
const consoleErrors = [];
const origError = console.error;
console.error = (...parts) => {
  const text = parts.map((p) => (p instanceof Error ? p.stack || p.message : typeof p === 'string' ? p : JSON.stringify(p))).join(' ');
  consoleErrors.push(text);
  if (dump) origError(...parts);
};

for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLAnchorElement', 'HTMLButtonElement', 'HTMLFormElement', 'SVGElement', 'Element', 'Node', 'Text', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'PopStateEvent', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage', 'sessionStorage', 'location', 'history', 'DOMParser', 'Blob', 'FileReader', 'Image', 'matchMedia']) {
  if (key in window && !(key in globalThis)) {
    try { Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true }); } catch { /* ignore */ }
  }
}
const define = (key, value) => { try { Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }); } catch { /* read-only */ } };
define('window', window);
define('document', window.document);
define('navigator', window.navigator);
define('self', window);
if (!window.matchMedia) {
  window.matchMedia = () => ({ matches: false, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });
  globalThis.matchMedia = window.matchMedia;
}
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.scrollTo = () => {};
class RO { observe() {} unobserve() {} disconnect() {} }
window.ResizeObserver = RO;
globalThis.ResizeObserver = RO;
class IO { observe() {} unobserve() {} disconnect() {} }
window.IntersectionObserver = IO;
globalThis.IntersectionObserver = IO;
window.URL.createObjectURL = () => 'blob:mock';
window.URL.revokeObjectURL = () => {};
globalThis.URL.createObjectURL = window.URL.createObjectURL;
globalThis.URL.revokeObjectURL = window.URL.revokeObjectURL;
window.open = () => null;
window.print = () => {};

// ---- fetch with cookie jar forwarded to the real API -------------------------------------
const cookieJar = new Map();
const nodeFetch = globalThis.fetch;
async function apiFetch(input, init = {}) {
  let url = typeof input === 'string' ? input : input.url;
  if (url.startsWith('/')) url = apiBase + url;
  const headers = new Headers(init.headers || {});
  if (cookieJar.size) headers.set('cookie', Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; '));
  const response = await nodeFetch(url, { ...init, headers, redirect: 'manual' });
  const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  for (const raw of setCookies) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(raw)) cookieJar.delete(name);
      else cookieJar.set(name, value);
    }
  }
  return response;
}
globalThis.fetch = apiFetch;
window.fetch = apiFetch;

// ---- helpers ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const text = () => window.document.body.textContent.replace(/\s+/g, ' ').trim();
async function waitFor(predicate, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await sleep(60);
  }
  return predicate();
}
function navigate(to) {
  window.history.pushState({}, '', to);
  window.dispatchEvent(new window.PopStateEvent('popstate'));
}

// ---- run -------------------------------------------------------------------------------
const health = await apiFetch('/api/health').then((r) => r.ok).catch(() => false);
if (!health) {
  console.log(`API not reachable at ${apiBase}; start it with "npm run dev:api".`);
  process.exit(2);
}

const { default: _unused } = await import(pathToFileURL(path.join(outDir, 'bundle.mjs')).href).catch(async () => {
  await import(pathToFileURL(path.join(outDir, 'bundle.mjs')).href);
  return { default: null };
});
void _unused;

const mount = globalThis.__mountApp;
let reactRoot = mount(window.document.getElementById('root'));

const failures = [];
async function visit(route, { expectNotFound = false, expectPortal = false } = {}) {
  const before = consoleErrors.length;
  navigate(route);
  await waitFor(() => !/Loading secure AGRIPULSE session|Loading page…/.test(text()), 10000);
  await sleep(expectPortal ? 900 : 350);
  const body = text();
  const notFound = /Page not found/.test(body);
  const errs = consoleErrors.slice(before).filter((e) => !/act\(\.\.\.\)|not wrapped in act|Warning: ReactDOM.render|Each child in a list should have a unique "key"/.test(e));
  const redirectedToLogin = expectPortal && /Farmer Portal Sign In|Sign in to AGRIPULSE|Seller Portal Sign In/.test(body) && !/Dashboard/.test(body);
  const problems = [];
  if (notFound !== expectNotFound) problems.push(notFound ? 'rendered 404' : 'did not render 404');
  if (redirectedToLogin) problems.push('redirected to login (session missing)');
  if (errs.length) problems.push(`console errors: ${errs[0].slice(0, 300)}`);
  if (body.length < 80) problems.push('page body nearly empty');
  const status = problems.length ? 'FAIL' : 'ok';
  console.log(`${status.padEnd(4)} ${route.padEnd(28)} ${body.length} chars${problems.length ? ' — ' + problems.join('; ') : ''}`);
  if (dump) console.log('     ' + body.slice(0, only ? 6000 : 400));
  if (find) {
    const match = body.match(find);
    console.log(match ? `     found: …${body.slice(Math.max(0, match.index - 120), match.index + 400)}…` : '     not found: ' + find);
    const inputs = [...window.document.querySelectorAll('input, select, textarea')].filter((el) => el.value).map((el) => `${el.id || el.name || el.type}=${el.value}`);
    if (inputs.length) console.log('     fields: ' + inputs.join(' | ').slice(0, 600));
  }
  if (problems.length) failures.push({ route, problems });
}

console.log(`Public routes (${PUBLIC_ROUTES.length})`);
for (const route of PUBLIC_ROUTES.filter((r) => !only || only.includes(r))) await visit(route, { expectNotFound: route.includes('does-not-exist') });

/** Creates a development demo session for a portal and remounts the app so the cookie is picked up. */
async function startDemoSession(portalType) {
  const demo = await apiFetch('/api/dev/demo-session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ portalType }) });
  if (!demo.ok) return false;
  reactRoot.unmount();
  await sleep(50);
  const fresh = window.document.createElement('div');
  window.document.body.appendChild(fresh);
  reactRoot = mount(fresh);
  if (portalType === 'seller') {
    navigate('/seller');
    await waitFor(() => /Seller dashboard|Seller Central/i.test(text()) && !/Loading secure/.test(text()), 15000);
  } else {
    navigate('/home');
    await waitFor(() => /Dashboard|Farm Condition|Good (morning|afternoon|evening)/i.test(text()) && !/Loading secure/.test(text()), 15000);
  }
  return true;
}

if (!publicOnly) {
  const farmerWanted = PORTAL_ROUTES.filter((r) => !only || only.includes(r));
  const extraPortal = (only || []).filter((r) => !PORTAL_ROUTES.includes(r) && !PUBLIC_ROUTES.includes(r) && !SELLER_ROUTES.includes(r) && !r.startsWith('/seller'));
  if (farmerWanted.length || extraPortal.length) {
    if (!(await startDemoSession('farmer'))) {
      console.log('Demo session unavailable; skipping portal routes.');
    } else {
      console.log(`Portal routes (${farmerWanted.length + extraPortal.length})`);
      for (const route of [...farmerWanted, ...extraPortal]) await visit(route, { expectPortal: true });
    }
  }

  // Seller Central uses the same demo user with the seller portal active.
  const sellerWanted = SELLER_ROUTES.filter((r) => !only || only.includes(r));
  const extraSeller = (only || []).filter((r) => r.startsWith('/seller') && !SELLER_ROUTES.includes(r));
  if (sellerWanted.length || extraSeller.length) {
    if (!(await startDemoSession('seller'))) {
      console.log('Seller demo session unavailable; skipping seller routes.');
    } else {
      console.log(`Seller routes (${sellerWanted.length + extraSeller.length})`);
      for (const route of [...sellerWanted, ...extraSeller]) await visit(route, { expectPortal: true });
    }
  }
}

if (scriptPath) {
  console.log(`Running script ${path.relative(root, scriptPath)}`);
  const mod = await import(pathToFileURL(scriptPath).href);
  await mod.default({ window, navigate, text, waitFor, sleep, apiFetch, visit, startDemoSession, failures, consoleErrors });
}

await rm(outDir, { recursive: true, force: true });
await rm(entry, { force: true });
console.error = origError;
if (failures.length) {
  console.log(`\n${failures.length} route(s) failed.`);
  process.exit(1);
}
console.log('\nAll routes rendered without errors.');
process.exit(0);
