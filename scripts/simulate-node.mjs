#!/usr/bin/env node
/**
 * AgriPulse bench simulator — exercises the REAL device pipeline end to end.
 *
 *   register gateway + node → one-time pairing → device secret → authenticated telemetry ingest
 *
 * It exists so developers can see Live Monitoring, the Digital Twin and the rule engine working
 * with readings that travelled through the production ingest path. It is NOT a field sensor:
 * the devices it creates are named "Bench simulator …" and should never be used to demonstrate
 * farm conditions to a farmer. Delete them from Devices & Sensors (Retire) when you are done.
 *
 * Usage:
 *   node scripts/simulate-node.mjs [--api http://127.0.0.1:4000] [--email you@example.com --password ...]
 *                                  [--farm <farmId>] [--plot <plotId>] [--backfill-hours 24]
 *                                  [--interval 15] [--live]
 *
 * Without --email/--password the script opens the development demo workspace via
 * POST /api/dev/demo-session (disabled in production or when ALLOW_DEMO_SESSIONS=false).
 */
import process from 'node:process';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const flag = (name) => args.includes(name);

const API = (opt('--api', process.env.AGRIPULSE_API || 'http://127.0.0.1:4000')).replace(/\/$/, '');
const EMAIL = opt('--email', process.env.AGRIPULSE_EMAIL);
const PASSWORD = opt('--password', process.env.AGRIPULSE_PASSWORD);
const FARM_ID = opt('--farm');
const PLOT_ID = opt('--plot');
const BACKFILL_HOURS = Math.max(0, Number(opt('--backfill-hours', 24)) || 0);
const INTERVAL_MIN = Math.max(1, Number(opt('--interval', 15)) || 15);
const LIVE = flag('--live');

const GATEWAY_SERIAL = 'AP-SIM-GW-01';
const NODE_SERIAL = 'AP-SIM-ND-01';
const SENSORS = ['soil_moisture', 'soil_temperature', 'battery_voltage'];

let cookie = '';

async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let data = null;
  try { data = await response.json(); } catch { /* no body */ }
  return { status: response.status, ok: response.ok, data };
}

function fail(message, extra) {
  console.error(`\n✖ ${message}`);
  if (extra) console.error(JSON.stringify(extra, null, 2));
  process.exit(1);
}

async function signIn() {
  if (EMAIL && PASSWORD) {
    const result = await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD, portalType: 'farmer' } });
    if (!result.ok) fail('Login failed.', result.data);
    console.log(`✔ Signed in as ${EMAIL}`);
    return;
  }
  const result = await api('/api/dev/demo-session', { method: 'POST', body: { portalType: 'farmer' } });
  if (!result.ok) fail('Demo session unavailable — pass --email and --password for a registered farmer account.', result.data);
  console.log('✔ Opened the development demo workspace (farmer)');
}

async function pickFarmAndPlot() {
  const farms = await api('/api/farms');
  if (!farms.ok || !farms.data?.farms?.length) fail('No farms available for this account.', farms.data);
  const farm = farms.data.farms.find((item) => item.id === FARM_ID) || farms.data.farms[0];
  const workspace = await api('/api/workspace');
  const plots = (workspace.data?.data?.plots || workspace.data?.plots || []).filter((plot) => plot.farmId === farm.id);
  const plot = plots.find((item) => item.id === PLOT_ID) || plots[0];
  console.log(`✔ Farm: ${farm.name} (${farm.id})${plot ? ` · zone: ${plot.name} (${plot.id})` : ' · no zone'}`);
  return { farm, plot };
}

async function findBySerial(serial) {
  const list = await api('/api/devices');
  if (!list.ok) fail('Could not list devices.', list.data);
  return (list.data.devices || []).find((device) => (device.serialNumber || '').toLowerCase() === serial.toLowerCase() && device.status !== 'retired');
}

async function ensureDevices(farm, plot) {
  let gateway = await findBySerial(GATEWAY_SERIAL);
  if (!gateway) {
    const created = await api('/api/devices', {
      method: 'POST',
      body: {
        farmId: farm.id, type: 'lora_gateway', name: 'Bench simulator gateway (not a field device)', serialNumber: GATEWAY_SERIAL,
        locationLabel: 'Developer bench — simulated, not installed on the farm', backhaulType: 'ethernet', powerSource: 'mains',
      },
    });
    if (!created.ok) fail('Gateway registration failed.', created.data);
    gateway = created.data.device;
    console.log(`✔ Registered ${gateway.name}`);
  } else {
    console.log(`✔ Reusing ${gateway.name}`);
  }

  let node = await findBySerial(NODE_SERIAL);
  if (!node) {
    const created = await api('/api/devices', {
      method: 'POST',
      body: {
        farmId: farm.id, ...(plot ? { plotId: plot.id } : {}), type: 'sensor_node', name: 'Bench simulator node (not a field sensor)', serialNumber: NODE_SERIAL,
        locationLabel: 'Developer bench — simulated readings for pipeline testing', gatewayId: gateway.id, installedSensors: SENSORS, powerSource: 'battery',
      },
    });
    if (!created.ok) fail('Sensor node registration failed.', created.data);
    node = created.data.device;
    console.log(`✔ Registered ${node.name}`);
  } else {
    console.log(`✔ Reusing ${node.name}`);
  }
  return { gateway, node };
}

async function pair(device) {
  const session = await api(`/api/devices/${device.id}/pairing-sessions`, { method: 'POST' });
  if (!session.ok) fail(`Pairing session failed for ${device.name}.`, session.data);
  const completed = await api('/api/device-ingest/pairing/complete', { method: 'POST', body: { pairingToken: session.data.pairingSession.pairingToken }, headers: { cookie: '' } });
  if (!completed.ok) fail(`Pairing completion failed for ${device.name}.`, completed.data);
  console.log(`✔ Paired ${device.name} — device secret received (kept in memory only)`);
  return completed.data.deviceSecret;
}

/** Smooth, plausible bench values: a slow drying curve with a diurnal soil-temperature swing. */
function sample(atMs, seedMs) {
  const hours = (atMs - seedMs) / 3600000;
  const moisture = Math.max(18, Math.min(70, 58 - hours * 0.45 + Math.sin(hours / 3) * 1.2));
  const soilTemp = 24 + 3.5 * Math.sin(((new Date(atMs).getHours() - 9) / 24) * Math.PI * 2);
  const battery = Math.max(3.4, 4.1 - hours * 0.002);
  return [
    { sensorType: 'soil_moisture', value: Number(moisture.toFixed(1)), unit: '%', measuredAt: new Date(atMs).toISOString() },
    { sensorType: 'soil_temperature', value: Number(soilTemp.toFixed(1)), unit: '°C', measuredAt: new Date(atMs).toISOString() },
    { sensorType: 'battery_voltage', value: Number(battery.toFixed(2)), unit: 'V', measuredAt: new Date(atMs).toISOString() },
  ];
}

async function push(secret, readings) {
  const result = await fetch(`${API}/api/device-ingest/telemetry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
    body: JSON.stringify({ readings }),
  });
  if (result.status !== 202) fail(`Telemetry rejected (${result.status}).`, await result.json().catch(() => null));
}

async function main() {
  console.log('AgriPulse bench simulator — readings created here are test data, not farm measurements.\n');
  await signIn();
  const { farm, plot } = await pickFarmAndPlot();
  const { gateway, node } = await ensureDevices(farm, plot);
  const gatewaySecret = await pair(gateway);
  const nodeSecret = await pair(node);
  void gatewaySecret; // gateways have no sensors; pairing alone marks them commissioned

  const now = Date.now();
  const seed = now - BACKFILL_HOURS * 3600000;
  if (BACKFILL_HOURS > 0) {
    const stamps = [];
    for (let t = seed; t <= now; t += INTERVAL_MIN * 60000) stamps.push(t);
    let sent = 0;
    for (let i = 0; i < stamps.length; i += 13) {
      const batch = stamps.slice(i, i + 13).flatMap((t) => sample(t, seed)); // 13 × 3 sensors ≤ 40 readings per request
      await push(nodeSecret, batch);
      sent += batch.length;
    }
    console.log(`✔ Backfilled ${sent} readings over the last ${BACKFILL_HOURS} h (every ${INTERVAL_MIN} min)`);
  } else {
    await push(nodeSecret, sample(now, seed));
    console.log('✔ Sent one reading set');
  }

  if (!LIVE) {
    console.log('\nOpen Live Monitoring or Devices & Sensors in the portal to see the node online. Retire the bench devices when finished.');
    return;
  }
  console.log(`\nLive mode: sending a reading set every ${INTERVAL_MIN} min. Press Ctrl+C to stop.`);
  const timer = setInterval(async () => {
    try {
      await push(nodeSecret, sample(Date.now(), seed));
      console.log(`  ${new Date().toLocaleTimeString()} — sent`);
    } catch (error) {
      console.error('  send failed:', error.message);
    }
  }, INTERVAL_MIN * 60000);
  process.on('SIGINT', () => { clearInterval(timer); console.log('\nStopped.'); process.exit(0); });
}

main().catch((error) => fail(error.message));
