/**
 * Copy for the public website. Everything here describes the product as it exists in this
 * repository; capabilities that are not implemented are marked `planned` or `partial`.
 */

export type CapabilityStatus = 'live' | 'partial' | 'planned';

export const STATUS_LABEL: Record<CapabilityStatus, string> = {
  live: 'Available now',
  partial: 'Partially available',
  planned: 'Planned',
};

export const PUBLIC_NAV: { label: string; to: string }[] = [
  { label: 'Platform', to: '/platform' },
  { label: 'Digital twin', to: '/digital-twin' },
  { label: 'AI capabilities', to: '/ai-capabilities' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Technology', to: '/technology' },
  { label: 'Impact', to: '/impact' },
  { label: 'Roadmap', to: '/roadmap' },
  { label: 'About', to: '/about' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

export const GITHUB_REPO_URL = 'https://github.com/techinnovative-ai/AgriPulse';

export interface ModuleSummary {
  key: string;
  name: string;
  route: string;
  summary: string;
  inputs: string[];
  status: CapabilityStatus;
  note?: string;
}

export const PORTAL_MODULES: ModuleSummary[] = [
  { key: 'dashboard', name: 'Dashboard', route: '/home', summary: 'Farm overview with condition tiles, open alerts, top insights, irrigation guidance, weather and the farm calendar — most important items first.', inputs: ['Farm records', 'Sensor telemetry', 'Weather provider', 'Rule engine'], status: 'live' },
  { key: 'farms', name: 'Farms & Field Zones', route: '/farm', summary: 'Register farms, zones (plots), crops and field observations. Includes an area converter for bigha, acre and hectare.', inputs: ['Farmer input'], status: 'live' },
  { key: 'monitoring', name: 'Live Monitoring', route: '/monitoring', summary: 'Latest value, unit, zone, timestamp, trend and guide-range state per sensor channel, with history for 24 h, 7 d and 30 d. Farmer-recorded measurements are shown separately.', inputs: ['Paired sensor nodes', 'Field observations'], status: 'live', note: 'Shows "Waiting for readings" until a node has sent authenticated telemetry.' },
  { key: 'twin', name: 'Digital Farm Twin', route: '/twin', summary: 'Schematic zone map sized by recorded area, with crop-stress, irrigation, crop and device overlays. Select a zone to see measurements, devices, alerts and recommendations.', inputs: ['Zones & crops', 'Rule engine', 'Device registry'], status: 'live', note: 'Layout is schematic, not GPS-accurate.' },
  { key: 'insights', name: 'AI Insights', route: '/insights', summary: 'Rule-based insights with observed facts, zone, supporting data, why it matters, suggested action, confidence and generation time.', inputs: ['All farm records', 'Telemetry', 'Weather'], status: 'live', note: 'Rule set v1. No machine-learning model is used yet.' },
  { key: 'irrigation', name: 'Irrigation Guidance', route: '/irrigation', summary: 'Per-zone irrigate-now / soon / adequate / hold-for-rain / too-wet guidance from soil moisture against crop target bands and the 48-hour rain outlook.', inputs: ['Soil moisture (sensor or recorded)', 'Crop record', 'Weather forecast'], status: 'live' },
  { key: 'soil', name: 'Soil Health', route: '/soil', summary: 'Soil type per zone, moisture and temperature history, pH band guidance and NPK status when a sensor reports.', inputs: ['Zone records', 'Observations', 'Soil sensors'], status: 'live' },
  { key: 'crop-health', name: 'Crop Health', route: '/crop-health', summary: 'Crop records with recorded health and calculated stress score, symptom reports with structured inspection guidance, and the 100-disease library.', inputs: ['Crop records', 'Symptom reports', 'Rule engine'], status: 'live', note: 'Symptom guidance is rule-based; image diagnosis is planned.' },
  { key: 'weather', name: 'Weather', route: '/weather', summary: 'Current conditions, hourly and daily forecast and agricultural warnings for the farm location, with the provider named on screen.', inputs: ['Weather provider (or labelled demo fallback)'], status: 'live', note: 'Rainfall is provider data, never measured on-farm.' },
  { key: 'assistant', name: 'AI Farming Assistant', route: '/assistant', summary: 'Plain-language questions answered from your saved records, crop and disease libraries, schemes and agronomic rules, with the answer mode labelled.', inputs: ['Farm records', 'Knowledge libraries'], status: 'partial', note: 'Knowledge retrieval and rules only; no external language model is connected.' },
  { key: 'alerts', name: 'Alerts & Notifications', route: '/alerts', summary: 'Every open condition with severity, affected zone or device, time raised and next step. Review state is kept per device.', inputs: ['Rule engine', 'Device registry', 'Tasks', 'Orders'], status: 'partial', note: 'In-portal only; SMS/WhatsApp/push channels are planned.' },
  { key: 'reports', name: 'Reports & Analytics', route: '/reports', summary: 'Observation, task, telemetry and crop-health summaries for 7, 30 or 90 days with CSV export of your own records.', inputs: ['All farm records'], status: 'live' },
  { key: 'devices', name: 'Devices & Sensors', route: '/devices', summary: 'Register sensor nodes and LoRa gateways, run secure pairing, assign gateways and zones, and read the server-derived status and event log.', inputs: ['Device API'], status: 'live' },
  { key: 'settings', name: 'Farm Settings', route: '/account', summary: 'Profile, language and unit preferences, notification preferences and demo-data reset.', inputs: ['Farmer input'], status: 'live' },
];

export const SENSOR_CHANNELS = [
  { name: 'Soil moisture', unit: '%', use: 'Irrigation guidance, stress score' },
  { name: 'Soil temperature', unit: '°C', use: 'Soil health, germination context' },
  { name: 'Air temperature & humidity', unit: '°C / %', use: 'Heat and fungal-risk factors' },
  { name: 'Light', unit: 'lux', use: 'Canopy and shading context' },
  { name: 'Soil pH', unit: 'pH', use: 'Soil pH band guidance' },
  { name: 'Soil NPK', unit: 'mg/kg', use: 'Nutrient status (indicative)' },
  { name: 'Battery voltage', unit: 'V', use: 'Device health, low-battery alerts' },
  { name: 'Standing water', unit: 'yes/no', use: 'Waterlogging detection' },
];

export const DATA_PRINCIPLES = [
  { title: 'No fabricated readings', text: 'Sensor values appear only after a paired node sends authenticated telemetry. Until then the portal says "Waiting for readings" — it never fills the gap with sample numbers.' },
  { title: 'Every value is labelled', text: 'Physical sensor, farmer recorded, weather provider, demo sample, rule-based and planned are distinct labels used consistently across dashboard, twin, insights and reports.' },
  { title: 'Status is server-derived', text: 'Online, offline and attention states are computed by the API from heartbeats and telemetry — a device is never shown as connected because a form said so.' },
  { title: 'Estimates stay estimates', text: 'Rainfall and forecasts come from a weather provider and are labelled as forecast or estimate. AgriPulse has no rain gauge and never stores provider data as measured telemetry.' },
  { title: 'Rules you can read', text: 'Each insight names its rule, the data it used and its confidence. Decision support is never presented as a diagnosis or a guarantee.' },
  { title: 'Planned means not yet', text: 'Image-based disease detection, model-based forecasting and yield estimation are marked planned wherever they are mentioned.' },
];

export const HOW_IT_WORKS_STEPS = [
  { title: 'Register your farm and zones', text: 'Add the farm, its field zones with area, soil type and irrigation method, and the crop growing in each zone. This alone switches on the twin, irrigation targets and stress scoring.' },
  { title: 'Record what you see', text: 'Log soil moisture, soil temperature, standing water, symptoms and pests from field visits. Farmer-recorded values are used immediately and labelled as such.' },
  { title: 'Pair sensor nodes when you have them', text: 'Register a node, complete secure pairing on the device and assign it to a zone. Readings arrive through the gateway or directly over the device API and replace recorded values automatically.' },
  { title: 'Review insights and alerts', text: 'The rule engine re-evaluates every five minutes and whenever records change. Each insight explains what was observed, why it matters and what to do next.' },
  { title: 'Act, schedule and report', text: 'Schedule irrigation and tasks, report crop problems for structured inspection steps, and export CSV reports of your own records.' },
];

export const AI_CAPABILITIES: { title: string; status: CapabilityStatus; what: string; inputs: string; limits: string }[] = [
  { title: 'Crop-stress scoring (rule set v1)', status: 'live', what: 'Composite 0–100 score per zone from moisture deficit or excess, heat, humidity-driven fungal risk, recent observations, recorded crop health and open symptom reports; graded low / moderate / high.', inputs: 'Fresh sensor readings, farmer observations within 10 days, crop record, weather forecast.', limits: 'Weights are agronomic heuristics, not learned from your farm. Confidence drops when inputs are old or missing.' },
  { title: 'Irrigation guidance', status: 'live', what: 'Compares the freshest soil-moisture value with the crop target band and the 48-hour rain outlook to recommend irrigate now, irrigate soon, adequate, hold for rain or too wet.', inputs: 'Soil moisture (sensor first, then recorded), crop name, provider forecast.', limits: 'Target bands are general per crop family; they are not yet calibrated to soil texture or growth stage.' },
  { title: 'Soil pH band guidance', status: 'live', what: 'Classifies a measured pH into agronomic bands and suggests what to check next.', inputs: 'Soil pH sensor reading.', limits: 'Requires a pH sensor; lab tests remain the reference.' },
  { title: 'Telemetry anomaly detection', status: 'live', what: 'Flags stale nodes, low battery, sudden drops or rises and flat-lined channels.', inputs: 'Authenticated telemetry and sampling interval.', limits: 'Simple thresholds; does not yet learn each sensor\'s normal behaviour.' },
  { title: 'Symptom-based crop problem guidance', status: 'live', what: 'Turns your symptom description into possible causes to check, distinguishing checks, inspection steps and when to consult an expert.', inputs: 'Symptom categories, affected parts, crop, growth stage, affected area.', limits: 'Rule-based guidance labelled as such; it is not a diagnosis and does not analyse photos.' },
  { title: 'Farming assistant', status: 'partial', what: 'Answers plain-language questions from your records, the crop and disease libraries, scheme data and rules.', inputs: 'Saved farm workspace and bundled knowledge.', limits: 'No external language model is connected; answers are retrieval and rule-based and say so.' },
  { title: 'Image-based disease detection', status: 'planned', what: 'Photo analysis that proposes likely diseases.', inputs: 'Leaf and plant photos.', limits: 'Requires a configured vision service and validated models; photos are stored for your records only today.' },
  { title: 'Model-based stress forecasting', status: 'planned', what: 'Predicting stress days ahead from sensor and weather trends.', inputs: 'Months of paired telemetry, observations and outcomes.', limits: 'Needs pilot data before any model can be validated; no predictions are shown today.' },
  { title: 'Yield estimation', status: 'planned', what: 'Season yield ranges per zone.', inputs: 'Historical yields plus the above.', limits: 'Not available; no yield figures appear in the portal.' },
];

export const TECH_STACK = [
  { area: 'Farmer Portal', detail: 'React 18, TypeScript, Vite, Tailwind utilities with a shared design-token layer, Recharts for charts, React Router for navigation.' },
  { area: 'API', detail: 'Node.js with Express 5: cookie-based sessions, role checks on every protected route, request validation, rate limiting on authentication, pairing and telemetry endpoints.' },
  { area: 'Storage', detail: 'SQLite through better-sqlite3 when a native build is available, otherwise the built-in node:sqlite driver (Node 22.5+). Workspace data is persisted per account.' },
  { area: 'Device integration', detail: 'Sensor nodes and LoRa gateways register in the portal, complete a short-lived pairing token exchange and then send telemetry with a per-device secret. Status is derived by the server from heartbeats and readings.' },
  { area: 'Weather', detail: 'Provider abstraction with a clearly labelled demo fallback when no provider URL is configured. Precipitation is always presented as forecast or historical estimate.' },
  { area: 'Intelligence', detail: 'Pure TypeScript rule engine (insights, irrigation, stress, anomalies, alerts) evaluated in the client from the same data the user sees, so every conclusion is reproducible.' },
];

export const SECURITY_POINTS = [
  'Sessions use HTTP-only cookies; no tokens or secrets are stored in client code.',
  'Device secrets are issued once during pairing and are never shown again in the UI.',
  'Role and ownership checks apply to every farm, device and telemetry route.',
  'Telemetry is validated for unit, range and timestamp window before it is stored.',
  'Location is only ever entered by the farmer; the portal does not request GPS access.',
];

export const IMPACT_POINTS = [
  { title: 'Earlier action on water stress', text: 'Moisture bands per crop and a visible rain outlook let farmers decide whether to irrigate today, tomorrow or not at all — with the reasoning on screen.' },
  { title: 'Fewer blind spots between visits', text: 'Paired sensor nodes keep reporting between field walks, and anomaly rules flag stale or failing devices rather than letting silence look like calm.' },
  { title: 'Structured problem reporting', text: 'Symptom reports turn "the leaves look wrong" into inspection steps and a record that can be shared with a KVK scientist.' },
  { title: 'Works before hardware arrives', text: 'Everything from the twin to irrigation guidance runs on farmer-recorded values, so adoption does not wait for sensor budgets.' },
];

export const ROADMAP = [
  { phase: 'Phase 1 · Foundation', status: 'live' as CapabilityStatus, when: 'Current release', items: ['Farmer portal with 14 modules on one design system', 'Device registry, secure pairing and telemetry ingestion', 'Rule engine v1: stress, irrigation, soil pH, anomalies, alerts', 'Digital farm twin with zone overlays', 'Reports with CSV export'] },
  { phase: 'Phase 2 · Field pilots', status: 'partial' as CapabilityStatus, when: 'Next', items: ['Reference sensor-node and gateway kits with the published firmware protocol', 'Pilot farms recording outcomes alongside telemetry', 'SMS / WhatsApp alert delivery', 'Crop target bands calibrated by soil texture and growth stage'] },
  { phase: 'Phase 3 · Learning models', status: 'planned' as CapabilityStatus, when: 'After pilot data', items: ['Model-based stress forecasting validated against pilot outcomes', 'Image-based disease detection through a configured vision service', 'Per-sensor anomaly baselines'] },
  { phase: 'Phase 4 · Scale', status: 'planned' as CapabilityStatus, when: 'Later', items: ['Multilingual portal and assistant', 'Advisor and FPO views with farmer consent', 'Yield estimation once historical data exists'] },
];

export const FAQ_ITEMS = [
  { q: 'Do I need sensors to use AgriPulse?', a: 'No. Farms, zones, crops, observations, the digital twin, irrigation guidance, stress scoring, alerts and reports all work from the values you record. Sensors add continuous readings and higher confidence when you have them.' },
  { q: 'Will the portal ever show sample sensor values?', a: 'No. Demo devices stay in a pending state with "Waiting for readings". Sample farm records that ship with the demo are labelled "Demo sample" wherever they appear and can be reset from Farm Settings.' },
  { q: 'How are live, estimated and AI-generated values told apart?', a: 'Every value carries a source label: physical sensor, farmer recorded, weather provider, demo sample, rule-based or planned. The same labels are used on the dashboard, twin, insights, soil, irrigation and reports pages.' },
  { q: 'Is the AI a real model?', a: 'This release uses a transparent rule engine (rule set v1) and knowledge retrieval. Each insight names its rule and confidence. Machine-learning models and image diagnosis are listed as planned and are not presented as working.' },
  { q: 'Where does the weather come from?', a: 'From the weather provider configured for the deployment, named on the Weather page. Without a provider the portal uses a clearly labelled demo forecast. Rainfall is never measured on the farm — AgriPulse has no rain gauge sensor.' },
  { q: 'Which sensors are supported?', a: 'Soil moisture, soil temperature, air temperature and humidity, light, soil pH, soil NPK, battery voltage and standing water. Units and ranges are validated by the API before a reading is stored.' },
  { q: 'How does a sensor node connect?', a: 'Register the node in Devices & Sensors, start a pairing session, enter the short-lived pairing token on the device, and the device receives its own secret for sending telemetry. Status (online, offline, attention) is derived by the server.' },
  { q: 'Can I export my data?', a: 'Yes. Reports & Analytics exports observations, tasks, crop records, devices, telemetry and alerts as CSV files generated in your browser.' },
  { q: 'Does AgriPulse control pumps or valves?', a: 'No. Irrigation guidance is advice for you to act on; the platform does not switch equipment.' },
  { q: 'Who can see my farm data?', a: 'Only your account. Farm, device and telemetry routes enforce ownership on the server. Alert review state is stored on your own device.' },
  { q: 'What does it cost?', a: 'Pricing has not been announced. The project is developed in the open on GitHub; see the Contact page to get in touch about pilots.' },
];
