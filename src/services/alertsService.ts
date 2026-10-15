import type { Severity } from '../components/ui/Badge';
import type { DemoOrder, FarmActivity, IoTDevice } from '../types';
import type { Insight, InsightKind } from './insightsService';

export type AlertCategory = 'crop' | 'irrigation' | 'soil' | 'weather' | 'device' | 'task' | 'store';

export interface FarmAlert {
  id: string;
  category: AlertCategory;
  severity: Severity;
  title: string;
  detail: string;
  affected: string;
  occurredAt: string;
  route: string;
  actionLabel: string;
  nextStep: string;
  deviceId?: string;
  plotId?: string;
}

const KIND_TO_CATEGORY: Record<InsightKind, AlertCategory> = {
  crop_stress: 'crop',
  crop_health: 'crop',
  irrigation: 'irrigation',
  soil: 'soil',
  weather: 'weather',
  device: 'device',
  anomaly: 'device',
  task: 'task',
};

export const ALERT_CATEGORY_LABEL: Record<AlertCategory, string> = {
  crop: 'Crop health',
  irrigation: 'Irrigation',
  soil: 'Soil',
  weather: 'Weather',
  device: 'Devices',
  task: 'Tasks',
  store: 'Store',
};

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

interface AlertInputs {
  insights: Insight[];
  devices: IoTDevice[];
  activities: FarmActivity[];
  orders: DemoOrder[];
  farmId?: string;
  now?: number;
}

/**
 * Single source of alerts for the header bell, dashboard panel and Alerts page.
 * Alerts are derived from the same insight engine plus device and task state, so the
 * three surfaces never disagree.
 */
export function deriveAlerts({ insights, devices, activities, orders, farmId, now = Date.now() }: AlertInputs): FarmAlert[] {
  const alerts: FarmAlert[] = [];
  const nowIso = new Date(now).toISOString();

  for (const insight of insights) {
    if (insight.severity === 'low') continue;
    alerts.push({
      id: insight.id,
      category: KIND_TO_CATEGORY[insight.kind],
      severity: insight.severity,
      title: insight.title,
      detail: insight.observed,
      affected: insight.zoneLabel,
      occurredAt: insight.evidence.find((item) => item.at)?.at || insight.generatedAt,
      route: insight.route,
      actionLabel: insight.actionLabel,
      nextStep: insight.action,
      deviceId: insight.deviceId,
      plotId: insight.plotId,
    });
  }

  for (const device of devices.filter((item) => (!farmId || item.farmId === farmId) && item.status !== 'retired')) {
    if (device.status === 'pending_pairing' || device.status === 'pending_gateway_assignment') {
      alerts.push({
        id: `device-pending-${device.id}`,
        category: 'device',
        severity: 'info',
        title: `${device.name} is waiting for ${device.status === 'pending_pairing' ? 'secure pairing' : 'a gateway assignment'}`,
        detail: device.status === 'pending_pairing' ? 'Registered in AGRIPULSE but the physical hardware has not completed commissioning.' : 'This sensor node has no LoRa gateway on its farm yet.',
        affected: device.locationLabel,
        occurredAt: device.updatedAt,
        route: `/devices/${device.id}`,
        actionLabel: 'Open device',
        nextStep: device.status === 'pending_pairing' ? 'Start a pairing session from the device page when the hardware is on site.' : 'Register a gateway on this farm, then assign the node to it.',
        deviceId: device.id,
      });
    }
  }

  const tomorrow = new Date(now + 86_400_000).toISOString().slice(0, 10);
  for (const task of activities.filter((item) => (!farmId || item.farmId === farmId) && item.status === 'Pending' && item.priority === 'High' && item.scheduledDate <= tomorrow)) {
    if (alerts.some((alert) => alert.id === `task-${task.id}`)) continue;
    alerts.push({
      id: `task-upcoming-${task.id}`,
      category: 'task',
      severity: 'low',
      title: `Due soon: ${task.title}`,
      detail: `${task.category}${task.cropName ? ` for ${task.cropName}` : ''} on ${task.scheduledDate}.`,
      affected: task.plotName || 'Whole farm',
      occurredAt: `${task.scheduledDate}T06:00:00.000Z`,
      route: '/home',
      actionLabel: 'Open calendar',
      nextStep: 'Mark the task complete once done so the calendar stays accurate.',
    });
  }

  const latestOrder = orders[0];
  if (latestOrder && latestOrder.orderStatus !== 'Delivered' && latestOrder.orderStatus !== 'Cancelled') {
    alerts.push({
      id: `order-${latestOrder.id}`,
      category: 'store',
      severity: 'info',
      title: `Demo order ${latestOrder.id} is ${latestOrder.orderStatus.toLowerCase()}`,
      detail: `${latestOrder.items.length} item(s) · ${latestOrder.paymentMode} · demonstration workflow only.`,
      affected: 'Agri store',
      occurredAt: latestOrder.createdAt || nowIso,
      route: '/orders',
      actionLabel: 'View orders',
      nextStep: 'Track the simulated fulfilment lifecycle on the Orders page.',
    });
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

const ACK_KEY = 'AgriPulse:v1:alertAcks';

export function readAcknowledgedAlerts(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(ACK_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function writeAcknowledgedAlerts(acks: Record<string, string>): void {
  try {
    window.localStorage.setItem(ACK_KEY, JSON.stringify(acks));
  } catch {
    /* storage unavailable (private mode) — acknowledgements are a convenience only */
  }
}
