# AgriPulse design system

The Farmer Portal is the single source of design truth. Every page — portal module, public website page and authentication screen — is built from the same tokens and components so the product reads as one system. This document records what those are and how to use them.

## Principles

1. **Portal identity first.** Cream page background, white rounded surfaces, forest/leaf greens, Inter type, compact 11–13 px interface text, soft green-tinted shadows. New pages extend this language; they never introduce a new one.
2. **Clarity over decoration.** No gratuitous gradients, glassmorphism, neon or animated backgrounds. Motion is limited to 120–180 ms hover/focus transitions and respects `prefers-reduced-motion`.
3. **Colour is never the only signal.** Severity, status and source are always paired with text and, where useful, an icon.
4. **Truthful data presentation.** Every number carries its source. Missing data is shown as *not recorded* / *waiting for readings*, never as zero.
5. **Accessible by default.** Visible focus rings, skip link, semantic landmarks, labelled controls, keyboard-operable maps/tables, WCAG AA contrast.

## Tokens

Defined in `src/components/ui/ui.css` (`:root`) and `tailwind.config.js`.

### Colour

| Role | Token / class | Value | Use |
| --- | --- | --- | --- |
| Page background | `bg-warmbg` | `#F4F7F0` | App and public page canvas |
| Surface | white + `border-[#e2e9de]` | `#FFFFFF` | Cards, panels, tables |
| Primary action | `--ap-primary` / `forest-700` | `#3E7436` (hover `#315F2E`) | Primary buttons, active states |
| Deep forest | `forest-800`, `forest-900`, `forest-950` | `#285B2D`, `#1F4A25`, `#143822` | Sidebar, dark bands, headings on dark |
| Botanical green | `leaf-500`, `leaf-300` | `#72A94B`, `#9BC568` | Accents, active nav marker, success |
| Text | `text-slate-900` / `#1D2C20` | charcoal | Body and headings |
| Muted text | `text-slate-500` / `#718072` | muted grey | Captions, metadata |
| Water / weather / info | `water-500`, `--ap-water` | `#3F8394` | Moisture, rain, informational badges |
| Warning | `harvest` / `--ap-amber` | `#DDA33B` (text `#A26B25`) | Watch states, medium severity |
| Critical | `--ap-red` | `#C84E48` (text `#A33B34`) | High/critical severity, destructive actions |
| Offline / unknown | `offline` badge tone | neutral grey | Disconnected or unknown device state |

Crop-stress levels: low `#387333`, moderate `#C78A2F`, high `#C84E48` — always with a text label.

### Shape, elevation, type

- Radii: `--ap-radius-sm` 10 px (inputs, chips), `--ap-radius-md` 14 px (inner cards, tables), `--ap-radius-lg` 20 px (panels, `rounded-2xl`), `--ap-radius-xl` 26 px (hero bands).
- Shadows: `--ap-shadow-card`, `--ap-shadow-card-hover`, `--ap-shadow-pop` (dialogs, menus). Shadows are green-tinted and soft; no hard drop shadows.
- Controls: `--ap-control-height` 38 px (sm 32 px, lg 44 px).
- Type: Inter. Page titles 20–24 px/800, panel titles 14–16 px/700, body 12–13 px, captions 10–11 px. Eyebrows are 10 px uppercase with 0.15 em tracking.
- Layout: header 76 px, sidebar 256 px (`lg:w-64`), content max-width 1440 px, mobile bottom nav 5 columns. Breakpoints follow Tailwind (`sm` 640, `lg` 1024).

## Components (`src/components/ui`)

| Component | Purpose | Notes |
| --- | --- | --- |
| `Button` | All actions | Variants `primary`, `accent`, `secondary`, `outline`, `ghost`, `danger`, `on-dark`; sizes `sm`/`md`/`lg`; `to` renders a router `Link`, `href` an anchor; `loading`, `block`, `iconOnly`, `leadingIcon`/`trailingIcon`. Use clear verbs: *View details*, *Refresh readings*, *Export CSV*, *Review alert*. |
| `Panel` | White surface with optional title, subtitle, actions, `flush` body | `as="section" | "aside" | "article" | "div"` |
| `PageHeader` | Module heading with eyebrow, icon, title, description, actions | One per page; portal pages wrap content in `<div className="dashboard-page space-y-6">` |
| `Badge`, `SeverityBadge`, `DeviceStatusPill`, `SourceTag` | Status and provenance | `SourceTag` takes a `DataSource` (`physical_sensor`, `manual_observation`, `weather_api`, `weather_demo`, `demo`, `rule_based`, `model_prediction`, `planned`, `unavailable`, `saved_record`) and renders label + icon + tooltip. |
| `MetricCard` | Key figure with unit, note, tone, optional source | Never use for filler; each metric must answer a question. |
| `EmptyState`, `ErrorState`, `Notice`, `Skeleton*` | Loading, empty, error, offline, permission states | Every data view handles all four. `ErrorState` offers a retry action. |
| `Timestamp`, `formatRelativeTime`, `formatAbsoluteTime` | Time display | Relative with absolute tooltip; "just now" under 45 s. |
| `SegmentedControl`, `Tabs`, `Field`, `SearchInput`, `KeyValueList`, `Legend` | Controls and form scaffolding | `Field` wires label, hint, required and error state to the input via render-prop `({ id, invalid })`. |
| `Dialog`, `ConfirmDialog` | Modals | Focus trap, Escape to close; confirm before destructive actions. |
| `ChartContainer`, `ChartTooltip`, `CHART_COLORS`, `CHART_AXIS_PROPS`, `CHART_GRID_PROPS` | Recharts wrapper | Title, subtitle, unit, source, legend, empty state; gaps are rendered as gaps, not zero. |
| `DataTable` | Responsive tables | Horizontal scroll wrapper, header styling, empty state. |

Feature components built on these primitives: `InsightCard` (what / where / supporting data / why / action / confidence / generated-at), `SensorChannelCard` (value, unit, trend, guide range, timestamp, device, status), `FarmTwinMap` (schematic zones, overlays, keyboard selection), `PortalShell` (generic portal frame: collapsible sidebar groups remembered per portal, breadcrumb header, quick search, date chip, notification bell with severity badges, profile menu, banner slot, mobile drawer and 5-column bottom nav), `AppShell` (Farmer Portal on `PortalShell`: farm switcher, weather chip, cart, Seller Central switch, floating assistant) and `SellerShell` (Seller Central on `PortalShell`: store identity chip with verification status, Preview store / Farmer Portal switches, attention items as notifications). Both portals therefore share one header, sidebar, notification and mobile-navigation implementation.

## Page patterns

### Portal module page

```tsx
<div className="dashboard-page space-y-6">
  <PageHeader eyebrow="Irrigation guidance" icon={<Droplets size={14} />} title="Irrigation guidance"
    description="…" actions={<Button to="/farm?tab=observations&action=new">Record moisture reading</Button>} />
  {/* 1. the most important status first (metric row or status band) */}
  {/* 2. the working surface (cards, table, chart) with loading/empty/error states */}
  {/* 3. supporting context (weather, reference bands, notes) */}
</div>
```

- Most important information first; no decorative cards.
- Everything that is an estimate carries a `SourceTag` and, where relevant, a confidence level.
- Deep links between modules use documented query parameters (see README).

### Public website page

`PublicLayout` provides the sticky header, mobile drawer, footer, scroll-to-top and document title. Pages compose `PageHero`, `Section`, `FeatureCard`, `Steps`, `FaqList`, `CtaBand` and `PortalPreview` from `src/components/public/PublicSections.tsx`; copy lives in `src/data/publicContent.ts`. Status pills use the same live / partial / planned vocabulary as the portal.

### Authentication screens

White header with the logo, a *Back to website* link and the cross-portal link; cream canvas; the same inputs and buttons as the portal.

## States checklist

Every data surface must handle: loading (skeleton), empty (what to do next), error (message + retry), offline/stale (label and timestamp), permission (explain, do not fake), success/confirmation for writes, and destructive-action confirmation.

## Responsiveness

- Desktop (≥ 1024 px): fixed sidebar, header, 12-column grids.
- Tablet: collapsible drawer, 2-column grids.
- Mobile: drawer + 5-item bottom navigation, single column, horizontal-scroll wrappers for tables and chip bars, no horizontal page overflow.
- Print: `@media print` hides navigation, header, floating chat and controls; `.print-area` content prints on white.

## Adding a new page

1. Start from an existing module page and reuse `PageHeader`, `Panel`, `MetricCard`, states and controls.
2. Pull farm data from `useAgriPulse()` and derived intelligence from `useFarmIntelligence()`; do not recompute insights locally.
3. Label every value with a `SourceTag`; never invent a reading.
4. Add the route in `src/App.tsx` (and `FARMER_ROUTE_PREFIXES` for guarded farmer routes), the nav entry in `AppShell`'s `NAV_GROUPS` or `SellerShell`'s `SELLER_NAV_GROUPS`, and the route to `PORTAL_ROUTES` / `SELLER_ROUTES` in `scripts/smoke-render.mjs`.
5. Run `npm run lint`, `npm test`, `npm run build`, `npm run smoke`.
