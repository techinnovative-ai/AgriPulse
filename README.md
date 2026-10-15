# AgriPulse — Intelligent Farm Digital Twin & Early Crop-Stress Detection

**See More. Predict Earlier. Grow Smarter.**

AgriPulse is a smart-agriculture platform for Indian farms: a public website that explains the product, a **Farmer Portal** that brings farm records, sensor telemetry, a digital farm twin, rule-based insights, irrigation guidance, weather context, alerts and reports into one consistent workspace, and **Seller Central**, a workspace for agri-input dealers built on the same shell and design system (orders, catalogue, payouts status, reports, store settings — marketplace flows are demonstrations).

> **Honest status.** This is a development-stage product with a real authenticated API, server-backed workspaces and a secure device registry/pairing/telemetry pipeline. It is **not** yet a production agricultural, commerce, weather, AI or hardware service. The section [What is real today](#what-is-real-today) lists exactly what works, what is partial and what is planned.

---

## Contents

- [What is real today](#what-is-real-today)
- [Farmer Portal modules](#farmer-portal-modules)
- [Seller Central](#seller-central)
- [Public website](#public-website)
- [Data integrity rules](#data-integrity-rules)
- [How the rule engine works](#how-the-rule-engine-works)
- [Architecture](#architecture)
- [Local development](#local-development)
- [Verification](#verification)
- [Bench simulator (developer tool)](#bench-simulator-developer-tool)
- [Configuration](#configuration)
- [Security and privacy](#security-and-privacy)
- [Known limitations](#known-limitations)
- [Before any production deployment](#before-any-production-deployment)

---

## What is real today

| Area | Status | Notes |
| --- | --- | --- |
| Accounts & sessions | **Live** | Farmer and seller registration/login via the Express API. Passwords are scrypt-hashed; session tokens are random, stored hashed and sent in an `HttpOnly`, `SameSite=Lax` cookie. |
| Farm records | **Live** | Farms, field zones (plots), crops, observations, activities, disease reports and preferences are saved as revisioned server workspaces (SQLite in development). |
| Devices & sensors | **Live** | Device registry, gateway assignment, one-time pairing, device secrets, authenticated telemetry ingest (`POST /api/device-ingest/telemetry`), server-derived status and audit events. Status is never set from the browser. |
| Live monitoring | **Live** | Latest value per channel, trend, guide ranges, history for Live / 24 h / 7 d / 30 d, connection status and auto-refresh — only once a paired node has reported. |
| Digital farm twin | **Live (schematic)** | Zones sized by recorded area with crop, stress, irrigation, device and alert overlays plus an accessible table. Positions are illustrative, not GPS. |
| AI insights, crop-stress score, irrigation & soil guidance | **Live — rule-based v1** | Transparent rules over your records, telemetry and the forecast. Every card states the rule, the inputs, the zone, why it matters, the action and a confidence level. No machine-learning model is deployed. |
| Alerts & notifications | **Live (in-app)** | Derived from the same rule engine and device status; acknowledgements are stored in the browser. SMS, WhatsApp and push delivery are not configured. |
| Reports & analytics | **Live** | Observation, task, telemetry-count and crop-health charts over 7/30/90 days, farm summary, CSV export and a print layout. |
| Weather | **Partial** | A clearly labelled demo forecast is used unless `VITE_WEATHER_API_URL` points to a provider. Precipitation is always a forecast estimate — the platform has **no rain gauge**. |
| AI farming assistant | **Partial** | Local rule-based and reference answers with farm context; not a hosted generative model. |
| Crop health / disease | **Partial** | Symptom reports and a 100-disease reference library. Image-based diagnosis is planned. |
| Marketplace, orders, Seller Central | **Demo** | Catalogue, cart, checkout and the seller workspace are demonstrations: listings, stock and order status changes are saved to the workspace, but nothing is shipped, charged, invoiced or settled. |
| ML models, satellite/drone imagery, yield prediction, pump control | **Planned** | Shown as "planned" in the UI; never presented as working. |

## Farmer Portal modules

Sign in at `/farmer/login` (the development demo workspace is available from the login page when `ALLOW_DEMO_SESSIONS` is not `false`).

| Module | Route | What it does |
| --- | --- | --- |
| Dashboard | `/home` | Farm overview, quick actions, top insights, irrigation status, sensor/record indicators, weather with its source, recent alerts, activity calendar, trend charts. |
| Farms & field zones | `/farm` | Farms, zones, crops, observations and the area converter. |
| Live monitoring | `/monitoring` | Sensor channels, history and node table. |
| Digital farm twin | `/twin` | Zone map, overlays and a selectable zone detail panel (`?zone=<plotId>`). |
| AI insights | `/insights` | All current insights with filters and supporting data. |
| Irrigation guidance | `/irrigation` | Per-zone moisture vs. crop target band and 48-hour rain outlook. |
| Soil health | `/soil` | Moisture/temperature history, zone soil profiles, observation log, pH guide and NPK status. |
| Crop health | `/crop-health` | Crop records, open symptom reports (`?action=report`) and stress scores. |
| Weather | `/weather` | Current, hourly and daily forecast with provider attribution and advisories. |
| Devices & sensors | `/devices`, `/devices/:id` | Registry, commissioning, events and telemetry provenance. |
| Reports & analytics | `/reports` | Charts, farm summary, CSV export, print view. |
| AI farming assistant | `/assistant` | Full-page assistant with suggested prompts; also available as the floating chat. |
| Alerts & notifications | `/alerts` | Severity, category, affected zone/device, time, next step, acknowledge/restore. |
| Knowledge | `/disease`, `/dictionary`, `/news`, `/schemes` | Reference content. |
| Market | `/store`, `/cart`, `/orders`, `/wishlist`, `/offers` | Demonstration marketplace. |
| Farm settings | `/account` | Profile, preferences, demo data reset. |

Deep links used across modules: `/home?action=new-task&category=<ActivityCategory>&plot=<plotName>`, `/home#farm-calendar`, `/crop-health?action=report`, `/twin?zone=<plotId>`, `/farm?tab=observations&action=new`.

## Seller Central

Sign in at `/login` (seller accounts register at `/signup`). Seller Central uses the same `PortalShell` as the Farmer Portal — identical sidebar, header, notifications, mobile drawer and bottom navigation — with seller navigation and seller-specific "needs attention" items (orders awaiting acceptance, out-of-stock or low-stock listings, incomplete profile).

| Module | Route | What it does |
| --- | --- | --- |
| Dashboard | `/seller` | Orders awaiting acceptance, orders in progress, active listings, delivered order value; attention list with next steps; store/integration status; inventory watch; recent orders. |
| Orders | `/seller/orders` | Pipeline counts, status tabs and search, order detail with printable statement, confirmed workflow Placed → Processing → Dispatched → Delivered, cancellation while Placed/Processing, CSV export. Deep links `?status=<OrderStatus>` and `?order=<id>`. |
| Catalogue & inventory | `/seller/catalog` | Own listings vs. whole marketplace (read-only), category/stock/search filters, add/edit listing with validation, stock ±5, mark out of stock / restock, delete with confirmation, CSV export. Deep links `?action=new`, `?stock=<in_stock|low_stock|out_of_stock>`, `?q=<text>`. |
| Payouts & settlements | `/seller/payouts` | Honest integration status (payments, settlement schedule, bank account, GST invoicing are **not connected**) and order value by status. The settlement ledger is empty until a provider exists. |
| Reports & analytics | `/seller/reports` | Orders and order value per week (4/8/12 weeks), best-selling listings, listings by category, CSV exports. |
| Store settings | `/seller/settings` | Business identity, tax/licence details, dispatch address with GSTIN/PIN/mobile format checks and explicit Save/Discard; account status; demo reset. |

In the development demo workspace the same user holds both roles, so the header offers **Preview store** (opens the farmer-side store) and **Farmer Portal**; the Farmer Portal offers **Seller Central** in return. Registered accounts hold one role and do not see these switches. Orders reach a seller only inside the shared demo workspace — routing orders from farmer accounts to individual seller accounts is not implemented. `/seller/dashboard` redirects to `/seller`.

## Public website

`/` Home · `/platform` · `/digital-twin` · `/ai-capabilities` · `/how-it-works` · `/technology` · `/impact` · `/roadmap` · `/about` · `/faq` · `/contact` · `/farmer/login` · `/farmer/signup` (seller: `/login`, `/signup`).

All copy lives in `src/data/publicContent.ts` and uses the same status labels as the product (live, partial, planned). The contact page opens a prefilled GitHub issue because no email service is configured.

## Data integrity rules

These rules are enforced in code and must stay that way:

1. **No fabricated readings.** Sensor values appear only after a paired node sends authenticated telemetry. Otherwise the UI shows *Waiting for readings* / *No connected data*. Missing is never shown as zero.
2. **Status is server-derived.** New devices stay *pending* until pairing completes and a verified heartbeat arrives. The browser cannot mark a device online.
3. **Sources are labelled separately** with the `SourceTag` component: physical sensor, farmer recorded, demo sample, weather forecast / demo forecast, rule-based estimate, model prediction (none deployed), planned, unavailable.
4. **No rain gauge.** Precipitation is provider forecast data and is never stored as telemetry.
5. **Demo content is labelled** (`isDemoRecord`, "Demo sample", "Demo forecast") and limited to the development demo workspace.
6. **AI claims are honest.** Rule-based v1 outputs are labelled as such; ML, imagery and SMS are labelled planned.

## How the rule engine works

`src/services/insightsService.ts` (rule set v1) and `src/services/alertsService.ts` run in the browser over data already loaded for the active farm. Rule identifiers are shown on every card:

- `irrigation.target-band.v1` — freshest moisture value (fresh sensor first, else the latest farmer observation, stale after 7 days) vs. a crop target band (e.g. paddy 60–95 %, wheat 40–70 %), lowered by 15 points at maturation / ready-for-harvest. Statuses: irrigate now (≥ 8 points below), irrigate soon, hold — rain expected (≥ 60 % chance and ≥ 5 mm in the next 48 h), adequate, too wet, no data.
- `stress.composite.v1` — 0–100 crop-stress score from moisture deficit/excess, soil temperature, open symptom reports, crop health status, recent observation severity and sensor anomalies. Low < 30, moderate 30–59, high ≥ 60.
- `soil.ph-band.v1`, `weather.advisory-passthrough.v1`, `telemetry.<kind>.v1`, `device.status.v1`, `crop-health.open-report.v1`, `task.overdue.v1`.

Each output includes the inputs used, the affected zone, a confidence level and the time it was generated. Confidence is *high* only for fresh sensor data, *medium* for recent farmer-recorded values and *low* for stale or demo values.

## Architecture

```
src/
  components/ui/        shared design system (tokens in ui.css, Button, Panel, PageHeader, Badge/SourceTag,
                        MetricCard, States, Controls, Dialog, DataTable, ChartContainer, Timestamp)
  components/public/    public-site layout and sections
  components/           PortalShell (generic sidebar/header/notifications/mobile nav frame), AppShell (farmer),
                        SellerShell (seller), FarmTwinMap, InsightCard, SensorChannelCard, chat
  context/              AgriPulseContext (session, workspace, devices), FarmIntelligenceContext (telemetry +
                        insights + alerts shared by the dashboard, bell, Alerts, Insights, Irrigation, Soil, Reports)
  hooks/                useFarmTelemetry (per-device telemetry fetch, auto-refresh only after a node has reported)
  services/             telemetryService, insightsService, alertsService, weatherService, deviceService,
                        sellerService (order workflow, stock states, attention items, validators), …
  pages/                farmer module pages;  pages/seller/ Seller Central;  pages/public/ website pages
  data/                 seed demo data and public-site content
server/                 Express 5 API: auth, workspaces, devices, pairing, telemetry ingest (SQLite)
scripts/                smoke-render.mjs (headless route check), simulate-node.mjs (bench simulator),
                        checks/seller-workflow.mjs (interaction check run through the smoke harness)
docs/                   DESIGN_SYSTEM.md, DEVICE_API_CONTRACTS.md, BLUEPRINT.md
```

Frontend: React 18, TypeScript, Vite, Tailwind (semantic palettes `agripulse`, `forest`, `leaf`, `earth`, `harvest`, `water`), Recharts, lucide-react. Backend: Node ≥ 22, Express 5, zod, SQLite (`better-sqlite3` when a native build is available, otherwise the built-in `node:sqlite` driver — requires Node ≥ 22.5).

See [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) for tokens, components and page patterns, and [`docs/DEVICE_API_CONTRACTS.md`](docs/DEVICE_API_CONTRACTS.md) for the device API.

## Local development

Requirements: Node.js 22.5 or newer, npm.

```bash
npm install
npm run dev
```

`npm run dev` starts the API on `0.0.0.0:4000` and Vite on `0.0.0.0:3000`; Vite proxies `/api` to the API. The SQLite file is created at `.data/agripulse.sqlite`.

## Verification

```bash
npm run lint        # tsc --noEmit + syntax check of the server modules
npm test            # API tests (auth, workspaces, devices, pairing, telemetry)
npm run build       # production bundle
npm run smoke       # headless render of every public, Farmer Portal and Seller Central route against the running API
npm run smoke:seller# Seller Central interaction check (listing CRUD, order workflow, settings validation, portal switch)
```

`npm run smoke` needs the API running (`npm run dev:api`). It mounts the real app in jsdom, visits all public routes, opens the development demo session and visits every Farmer Portal and Seller Central route, failing on console errors, unexpected 404 pages or empty content. Use `--only /route,/other`, `--dump` or `--find <regex>` to inspect a page.

`npm run smoke:seller` runs the Seller Central interaction check (`scripts/checks/seller-workflow.mjs`): listing validation → publish → stock changes → delete, then accept → dispatch → deliver on a sample order it inserts into the demo workspace and removes afterwards, plus settings validation. Any script can be attached with `--script <file.mjs>`.

## Bench simulator (developer tool)

```bash
npm run simulate -- --backfill-hours 24 --interval 15 --live
```

The simulator exercises the **real** pipeline: it registers a gateway and a sensor node named *"Bench simulator … (not a field device/sensor)"*, completes one-time pairing, receives a device secret and posts readings through the authenticated ingest route. Use it to see Live Monitoring, the twin and the rule engine with data that travelled the production path. It is not a field sensor — retire the bench devices from Devices & sensors when finished and never use them to demonstrate farm conditions to a farmer. Pass `--email`/`--password` to use a registered account instead of the demo workspace.

## Configuration

API: `API_HOST`, `API_PORT`, `AGRIPULSE_DB_PATH`, `DEVICE_ONLINE_WINDOW_SECONDS`, `ALLOW_DEMO_SESSIONS` (`false` disables the demo workspace; it is always disabled with `NODE_ENV=production`).

Frontend (`.env.example`): `VITE_WEATHER_API_URL` is an endpoint hook for a weather provider of your choice; without it the labelled demo forecast is used. Never place private provider credentials in a `VITE_*` variable — they would ship to the browser.

## Security and privacy

- No secrets in client code; device secrets are shown once at pairing and never stored by the website.
- Every device, workspace and telemetry route checks ownership and role on the server.
- Request bodies are validated with zod; sensitive-looking fields are rejected from workspace writes; rate limits protect pairing and ingest.
- The app never requests the browser's location silently.
- The development demo workspace is shared: do not enter real personal, financial, network or device credentials.

## Known limitations

- Weather provider, email delivery, SMS/WhatsApp alerts, image-based disease diagnosis, ML stress models, satellite/drone imagery, yield prediction and pump/valve control are not implemented.
- Alert acknowledgements are stored per browser, not on the server.
- Insights are computed in the browser for the active farm; there is no scheduled server-side evaluation yet.
- Gateways do not report heartbeats through the current ingest route, so a paired gateway shows as pending until a heartbeat path exists.
- Marketplace and Seller Central flows are demonstrations: no payment, courier, GST invoice, buyer notification or settlement is produced; seller verification is manual and not available.
- Orders are visible to a seller only within the shared development demo workspace; farmer-to-seller order routing between separate accounts is not implemented.

## Before any production deployment

Use a managed database with backups and migrations, TLS, a production session/cookie policy, account recovery and email verification, monitoring and audit review, and a reviewed authorization model. Hardware rollout additionally needs device attestation and credential rotation, a trusted provisioning workflow, authenticated transport (MQTT over TLS or HTTPS), signed firmware, telemetry abuse controls and real-device acceptance tests. Commerce, weather and AI require their own vetted server-side integrations.
