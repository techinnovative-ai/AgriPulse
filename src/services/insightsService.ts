import type {
  CropRecord,
  DiseaseReport,
  FarmActivity,
  FarmPlot,
  FieldObservation,
  IoTDevice,
  TelemetryReading,
  WeatherSnapshot,
} from '../types';
import type { DataSource, Severity } from '../components/ui/Badge';
import { channelForReading, detectAnomalies, isReadingStale, type TelemetryChannel } from './telemetryService';

/**
 * AGRIPULSE insight engine — rule set v1.
 *
 * Every insight is produced by an explicit, documented agronomic rule applied to the
 * farmer's own records, validated sensor telemetry and the labelled weather snapshot.
 * Nothing here is a trained model: outputs are decision support with stated confidence,
 * never a diagnosis or a guarantee.
 */

export type InsightKind = 'crop_stress' | 'irrigation' | 'soil' | 'weather' | 'device' | 'anomaly' | 'crop_health' | 'task';
export type Confidence = 'high' | 'medium' | 'low';

export interface InsightEvidence {
  label: string;
  value: string;
  source: DataSource;
  at?: string;
}

export interface Insight {
  id: string;
  kind: InsightKind;
  severity: Severity;
  title: string;
  observed: string;
  zoneLabel: string;
  plotId?: string;
  deviceId?: string;
  evidence: InsightEvidence[];
  whyItMatters: string;
  action: string;
  confidence: Confidence;
  confidenceNote: string;
  method: DataSource;
  ruleId: string;
  generatedAt: string;
  route: string;
  actionLabel: string;
}

export interface InsightContext {
  farmId: string;
  farmName: string;
  plots: FarmPlot[];
  crops: CropRecord[];
  observations: FieldObservation[];
  activities: FarmActivity[];
  diseaseReports: DiseaseReport[];
  devices: IoTDevice[];
  telemetry: TelemetryReading[];
  weather: WeatherSnapshot;
  now?: number;
}

/* ---------- Crop moisture targets (general guidance, % volumetric) ---------- */

export interface MoistureTarget {
  min: number;
  max: number;
  note: string;
}

const DEFAULT_TARGET: MoistureTarget = { min: 40, max: 75, note: 'General field-crop guidance range.' };

const CROP_MOISTURE_TARGETS: { match: RegExp; target: MoistureTarget }[] = [
  { match: /paddy|rice/i, target: { min: 60, max: 95, note: 'Transplanted rice tolerates saturated soil; alternate wetting and drying is acceptable after tillering.' } },
  { match: /wheat/i, target: { min: 40, max: 70, note: 'Wheat is most sensitive at crown-root initiation, tillering and grain filling.' } },
  { match: /mustard|rapeseed/i, target: { min: 35, max: 65, note: 'Mustard needs limited irrigation; avoid waterlogging at flowering.' } },
  { match: /maize|corn/i, target: { min: 45, max: 75, note: 'Maize is most sensitive around tasselling and silking.' } },
  { match: /cotton/i, target: { min: 40, max: 70, note: 'Cotton tolerates short dry spells but not waterlogging.' } },
  { match: /sugarcane/i, target: { min: 50, max: 80, note: 'Sugarcane has a high water requirement through the grand growth phase.' } },
  { match: /gram|chickpea|lentil|pea|pulse|moong|urad|arhar|pigeon/i, target: { min: 30, max: 60, note: 'Pulses prefer lighter irrigation and are sensitive to waterlogging.' } },
  { match: /potato/i, target: { min: 55, max: 80, note: 'Potato tubers need evenly moist soil from stolon formation onward.' } },
  { match: /tomato|chilli|brinjal|capsicum|vegetable|onion|cabbage|cauliflower/i, target: { min: 50, max: 78, note: 'Vegetables respond best to frequent light irrigation.' } },
  { match: /soy|groundnut|peanut|sunflower|sesame/i, target: { min: 40, max: 70, note: 'Oilseeds are sensitive during flowering and pod or seed fill.' } },
];

export function moistureTargetForCrop(cropName?: string): MoistureTarget {
  if (!cropName) return DEFAULT_TARGET;
  const found = CROP_MOISTURE_TARGETS.find((entry) => entry.match.test(cropName));
  return found ? found.target : DEFAULT_TARGET;
}

/* ---------- Helpers ---------- */

const DAY = 86_400_000;

function ageDays(iso: string, now: number): number {
  return (now - new Date(iso).getTime()) / DAY;
}

function latestReading(telemetry: TelemetryReading[], deviceIds: Set<string>, channel: TelemetryChannel): TelemetryReading | undefined {
  let latest: TelemetryReading | undefined;
  for (const reading of telemetry) {
    if (!deviceIds.has(reading.deviceId) || reading.quality === 'invalid') continue;
    if (channelForReading(reading) !== channel) continue;
    if (!latest || new Date(reading.measuredAt).getTime() > new Date(latest.measuredAt).getTime()) latest = reading;
  }
  return latest;
}

export interface MoistureReading {
  value: number;
  at: string;
  source: DataSource;
  label: string;
  stale: boolean;
}

/** Best available soil-moisture value for a plot: fresh sensor reading first, then a recent farmer record. */
export function resolvePlotMoisture(
  plot: FarmPlot,
  context: Pick<InsightContext, 'devices' | 'telemetry' | 'observations'>,
  now: number = Date.now()
): MoistureReading | null {
  const plotDevices = new Set(context.devices.filter((device) => device.plotId === plot.id && device.type === 'sensor_node' && device.status !== 'retired').map((device) => device.id));
  const sensor = latestReading(context.telemetry, plotDevices, 'soil_moisture');
  if (sensor) {
    const device = context.devices.find((item) => item.id === sensor.deviceId);
    return {
      value: sensor.value,
      at: sensor.measuredAt,
      source: 'physical_sensor',
      label: device?.name || 'Sensor node',
      stale: isReadingStale(sensor.measuredAt, device?.samplingIntervalMinutes, now),
    };
  }
  const observation = context.observations
    .filter((item) => item.plotId === plot.id && typeof item.soilMoisturePct === 'number')
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  if (observation && typeof observation.soilMoisturePct === 'number') {
    return {
      value: observation.soilMoisturePct,
      at: observation.recordedAt,
      source: observation.sourceLabel === 'Demo Sample Record' ? 'demo' : 'manual_observation',
      label: observation.sourceLabel,
      stale: ageDays(observation.recordedAt, now) > 7,
    };
  }
  return null;
}

export interface IrrigationGuidance {
  plot: FarmPlot;
  crop?: CropRecord;
  target: MoistureTarget;
  moisture: MoistureReading | null;
  status: 'irrigate_now' | 'irrigate_soon' | 'adequate' | 'hold_rain' | 'too_wet' | 'no_data';
  headline: string;
  reasoning: string[];
  confidence: Confidence;
  forecastRainProbPct: number;
  forecastRainMm: number;
}

/** Transparent irrigation recommendation for one plot. */
/** Daily forecast entries that fall on today or tomorrow (falls back to the first two entries). */
export function next48hForecast(daily: WeatherSnapshot['daily'], now: number = Date.now()): WeatherSnapshot['daily'] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = start.getTime() + 2 * 86400000;
  const matching = daily.filter((day) => {
    const t = Date.parse(day.date);
    return Number.isFinite(t) && t >= start.getTime() && t < end;
  });
  return matching.length > 0 ? matching : daily.slice(0, 2);
}

/** Growth-stage adjustment: ripening crops need less water; fallow or harvested zones need none. */
function stageAdjustedTarget(target: MoistureTarget, crop?: CropRecord): MoistureTarget {
  if (!crop) return target;
  if (crop.growthStage === 'Maturation' || crop.growthStage === 'Ready for Harvest') {
    const shift = 15;
    return { min: Math.max(15, target.min - shift), max: Math.max(target.max - shift, target.min), note: `${target.note} Lowered by ${shift} points for the ${crop.growthStage.toLowerCase()} stage, when most crops need less water.` };
  }
  return target;
}

export function buildIrrigationGuidance(plot: FarmPlot, context: InsightContext, now: number = Date.now()): IrrigationGuidance {
  const crop = context.crops.find((item) => item.plotId === plot.id && item.growthStage !== 'Harvested') || context.crops.find((item) => item.plotId === plot.id);
  const target = stageAdjustedTarget(moistureTargetForCrop(crop?.cropName), crop);
  const moisture = resolvePlotMoisture(plot, context, now);
  const nextDays = next48hForecast(context.weather.daily, now);
  const forecastRainProbPct = Math.max(0, ...nextDays.map((day) => day.rainProbPct));
  const forecastRainMm = nextDays.reduce((sum, day) => sum + (day.expectedRainMm || 0), 0);
  const weatherSource = context.weather.sourceType === 'Live API' ? 'the connected weather provider' : 'the demo forecast dataset';
  const reasoning: string[] = [];

  if (crop && (crop.growthStage === 'Harvested' || crop.growthStage === 'Land Preparation')) {
    return {
      plot, crop, target, moisture, status: 'adequate', forecastRainProbPct, forecastRainMm, confidence: 'medium',
      headline: `No crop water demand — zone is at ${crop.growthStage.toLowerCase()}`,
      reasoning: [`The crop record for this zone is at the ${crop.growthStage.toLowerCase()} stage, so no irrigation schedule applies.`, 'Pre-sowing irrigation, if needed, should follow your sowing plan rather than this guidance.'],
    };
  }

  if (!moisture) {
    return {
      plot, crop, target, moisture, status: 'no_data', forecastRainProbPct, forecastRainMm, confidence: 'low',
      headline: 'No moisture data for this plot yet',
      reasoning: ['No sensor reading or farmer-recorded soil-moisture observation exists for this plot.', 'Record a probe reading in Farms & field zones or pair a soil-moisture node to enable guidance.'],
    };
  }

  reasoning.push(`${moisture.source === 'physical_sensor' ? 'Sensor' : 'Farmer-recorded'} soil moisture is ${moisture.value.toFixed(0)}% (${moisture.label}).`);
  reasoning.push(`Target range for ${crop ? `${crop.cropName} at ${crop.growthStage}` : 'this plot'} is ${target.min}–${target.max}%. ${target.note}`);
  if (moisture.stale) reasoning.push('This value is older than expected, so the recommendation carries lower confidence.');

  let confidence: Confidence = moisture.source === 'physical_sensor' ? 'high' : 'medium';
  if (moisture.stale) confidence = 'low';
  if (moisture.source === 'demo') confidence = 'low';

  if (moisture.value > target.max) {
    reasoning.push('Moisture is above the upper target; additional water risks waterlogging and root-zone oxygen loss.');
    return { plot, crop, target, moisture, status: 'too_wet', headline: 'Hold irrigation — soil is wetter than target', reasoning, confidence, forecastRainProbPct, forecastRainMm };
  }
  const deficit = target.min - moisture.value;
  if (deficit > 0 && forecastRainProbPct >= 60 && forecastRainMm >= 5) {
    reasoning.push(`${weatherSource.charAt(0).toUpperCase()}${weatherSource.slice(1)} indicates ${forecastRainProbPct}% rain probability (~${forecastRainMm.toFixed(0)} mm) in the next two days. Forecast precipitation is an estimate, not a field measurement.`);
    return { plot, crop, target, moisture, status: 'hold_rain', headline: 'Moisture is low, but rain is forecast — review before irrigating', reasoning, confidence: confidence === 'high' ? 'medium' : confidence, forecastRainProbPct, forecastRainMm };
  }
  if (deficit >= 8) {
    reasoning.push(`Moisture is ${deficit.toFixed(0)} points below the lower target.`);
    return { plot, crop, target, moisture, status: 'irrigate_now', headline: 'Irrigation recommended now', reasoning, confidence, forecastRainProbPct, forecastRainMm };
  }
  if (deficit > 0 || moisture.value - target.min < 5) {
    reasoning.push('Moisture is at or just below the lower edge of the target range.');
    return { plot, crop, target, moisture, status: 'irrigate_soon', headline: 'Plan irrigation within 1–2 days', reasoning, confidence, forecastRainProbPct, forecastRainMm };
  }
  reasoning.push('Moisture sits comfortably inside the target range.');
  return { plot, crop, target, moisture, status: 'adequate', headline: 'Moisture adequate — no irrigation needed', reasoning, confidence, forecastRainProbPct, forecastRainMm };
}

/* ---------- Crop-stress risk ---------- */

export interface StressFactor {
  label: string;
  points: number;
  detail: string;
  source: DataSource;
}

export interface CropStressAssessment {
  plot: FarmPlot;
  crop?: CropRecord;
  score: number; // 0–100
  level: 'low' | 'moderate' | 'high';
  factors: StressFactor[];
  confidence: Confidence;
  confidenceNote: string;
  dataSources: DataSource[];
}

export function assessCropStress(plot: FarmPlot, context: InsightContext, now: number = Date.now()): CropStressAssessment {
  const crop = context.crops.find((item) => item.plotId === plot.id && item.growthStage !== 'Harvested');
  const factors: StressFactor[] = [];
  const sources = new Set<DataSource>();
  const plotDevices = new Set(context.devices.filter((device) => device.plotId === plot.id && device.type === 'sensor_node' && device.status !== 'retired').map((device) => device.id));

  // Moisture deficit / excess
  const moisture = resolvePlotMoisture(plot, context, now);
  const target = stageAdjustedTarget(moistureTargetForCrop(crop?.cropName), crop);
  if (moisture) {
    sources.add(moisture.source);
    if (moisture.value < target.min) {
      const deficit = target.min - moisture.value;
      const points = Math.min(40, Math.round(deficit * 2.5));
      factors.push({ label: 'Moisture deficit', points, detail: `${moisture.value.toFixed(0)}% vs ${target.min}% lower target`, source: moisture.source });
    } else if (moisture.value > target.max) {
      factors.push({ label: 'Excess moisture', points: 20, detail: `${moisture.value.toFixed(0)}% exceeds ${target.max}% upper target`, source: moisture.source });
    }
  }

  // Heat stress from sensor air temperature, otherwise forecast maximum
  const airTemp = latestReading(context.telemetry, plotDevices, 'air_temperature');
  if (airTemp) {
    sources.add('physical_sensor');
    if (airTemp.value >= 38) factors.push({ label: 'Heat stress', points: airTemp.value >= 42 ? 25 : 15, detail: `${airTemp.value.toFixed(1)} °C canopy air temperature`, source: 'physical_sensor' });
  } else if (context.weather.tempMaxC >= 38) {
    const source: DataSource = context.weather.sourceType === 'Live API' ? 'weather_api' : 'weather_demo';
    sources.add(source);
    factors.push({ label: 'Forecast heat', points: 10, detail: `${context.weather.tempMaxC} °C forecast maximum`, source });
  }

  // Disease pressure: humidity + warm temperature
  const humidity = latestReading(context.telemetry, plotDevices, 'air_humidity');
  const humidityValue = humidity?.value ?? context.weather.humidityPct;
  const humiditySource: DataSource = humidity ? 'physical_sensor' : context.weather.sourceType === 'Live API' ? 'weather_api' : 'weather_demo';
  const tempForDisease = airTemp?.value ?? context.weather.tempC;
  if (humidityValue >= 85 && tempForDisease >= 18 && tempForDisease <= 32) {
    sources.add(humiditySource);
    factors.push({ label: 'Fungal disease pressure', points: 15, detail: `${humidityValue}% humidity at ${tempForDisease}°C favours foliar pathogens`, source: humiditySource });
  }

  // Recorded observations in the last 10 days
  const recentObs = context.observations.filter((item) => item.plotId === plot.id && ageDays(item.recordedAt, now) <= 10);
  const actionObs = recentObs.find((item) => item.severity === 'Action Needed');
  const watchObs = recentObs.find((item) => item.severity === 'Watch');
  if (actionObs) {
    const source: DataSource = actionObs.sourceLabel === 'Demo Sample Record' ? 'demo' : 'manual_observation';
    sources.add(source);
    factors.push({ label: 'Field observation: action needed', points: 25, detail: `${actionObs.category}: ${actionObs.notes.slice(0, 90)}`, source });
  } else if (watchObs) {
    const source: DataSource = watchObs.sourceLabel === 'Demo Sample Record' ? 'demo' : 'manual_observation';
    sources.add(source);
    factors.push({ label: 'Field observation: watch', points: 10, detail: `${watchObs.category}: ${watchObs.notes.slice(0, 90)}`, source });
  }
  const waterlogged = recentObs.find((item) => item.standingWaterStatus === 'Waterlogged');
  if (waterlogged) factors.push({ label: 'Waterlogging recorded', points: 15, detail: 'Standing water reported in this plot', source: 'manual_observation' });

  // Crop health status
  if (crop?.healthStatus === 'Needs Inspection') {
    sources.add('saved_record');
    factors.push({ label: 'Crop marked “Needs inspection”', points: 15, detail: `${crop.cropName} (${crop.variety})`, source: 'saved_record' });
  } else if (crop?.healthStatus === 'Watch / Mild Stress') {
    sources.add('saved_record');
    factors.push({ label: 'Crop marked “Watch / mild stress”', points: 8, detail: `${crop.cropName} (${crop.variety})`, source: 'saved_record' });
  }

  // Open disease reports
  const report = context.diseaseReports.find((item) => item.plotName === plot.name && item.status === 'Needs inspection');
  if (report) {
    sources.add('saved_record');
    factors.push({ label: 'Open disease report', points: 15, detail: `${report.cropName}: ${report.status}`, source: 'saved_record' });
  }

  const score = Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0));
  const level: CropStressAssessment['level'] = score >= 60 ? 'high' : score >= 30 ? 'moderate' : 'low';

  const hasFreshSensor = Boolean(moisture && moisture.source === 'physical_sensor' && !moisture.stale) || Boolean(airTemp && !isReadingStale(airTemp.measuredAt));
  const hasRecentRecord = Boolean(moisture && moisture.source === 'manual_observation' && !moisture.stale) || recentObs.length > 0;
  let confidence: Confidence = 'low';
  let confidenceNote = 'Based mainly on forecast or older records; verify in the field.';
  if (hasFreshSensor) {
    confidence = 'high';
    confidenceNote = 'Supported by fresh validated sensor readings from this plot.';
  } else if (hasRecentRecord) {
    confidence = 'medium';
    confidenceNote = 'Supported by farmer-recorded observations from the last 10 days.';
  }
  if (factors.length === 0 && !moisture) {
    confidenceNote = 'No plot-level data yet; the score reflects the absence of recorded issues, not measured health.';
  }

  return { plot, crop, score, level, factors, confidence, confidenceNote, dataSources: Array.from(sources) };
}

/* ---------- Insight generation ---------- */

function severityForStress(level: CropStressAssessment['level']): Severity {
  return level === 'high' ? 'high' : level === 'moderate' ? 'medium' : 'low';
}

export function generateInsights(context: InsightContext): Insight[] {
  const now = context.now ?? Date.now();
  const generatedAt = new Date(now).toISOString();
  const insights: Insight[] = [];
  const weatherSource: DataSource = context.weather.sourceType === 'Live API' ? 'weather_api' : 'weather_demo';
  const farmPlots = context.plots.filter((plot) => plot.farmId === context.farmId);

  for (const plot of farmPlots) {
    const stress = assessCropStress(plot, context, now);
    if (stress.level !== 'low') {
      insights.push({
        id: `stress-${plot.id}`,
        kind: 'crop_stress',
        severity: severityForStress(stress.level),
        title: `${stress.level === 'high' ? 'High' : 'Moderate'} crop-stress risk in ${plot.name}`,
        observed: `Risk score ${stress.score}/100 from ${stress.factors.length} contributing factor${stress.factors.length === 1 ? '' : 's'}: ${stress.factors.map((factor) => factor.label.toLowerCase()).join(', ')}.`,
        zoneLabel: plot.name,
        plotId: plot.id,
        evidence: stress.factors.map((factor) => ({ label: factor.label, value: factor.detail, source: factor.source })),
        whyItMatters: stress.crop
          ? `${stress.crop.cropName} at ${stress.crop.growthStage} loses yield quickly when several stress factors overlap.`
          : 'Overlapping stress factors reduce crop vigour and make pest or disease damage more likely.',
        action: stress.factors.some((factor) => factor.label.includes('Moisture deficit'))
          ? 'Walk the plot today, confirm topsoil dryness by hand, and follow the irrigation guidance for this plot.'
          : 'Inspect the plot within 24 hours, photograph affected plants, and record what you find as a field observation.',
        confidence: stress.confidence,
        confidenceNote: stress.confidenceNote,
        method: 'rule_based',
        ruleId: 'stress.composite.v1',
        generatedAt,
        route: '/crop-health',
        actionLabel: 'Open crop health',
      });
    }

    const irrigation = buildIrrigationGuidance(plot, context, now);
    if (irrigation.status === 'irrigate_now' || irrigation.status === 'too_wet' || irrigation.status === 'hold_rain') {
      insights.push({
        id: `irrigation-${plot.id}`,
        kind: 'irrigation',
        severity: irrigation.status === 'irrigate_now' ? 'high' : 'medium',
        title: `${irrigation.headline} — ${plot.name}`,
        observed: irrigation.reasoning[0],
        zoneLabel: plot.name,
        plotId: plot.id,
        evidence: [
          ...(irrigation.moisture ? [{ label: 'Soil moisture', value: `${irrigation.moisture.value.toFixed(0)}%`, source: irrigation.moisture.source, at: irrigation.moisture.at }] : []),
          { label: 'Target range', value: `${irrigation.target.min}–${irrigation.target.max}%`, source: 'rule_based' as DataSource },
          { label: 'Rain outlook (48 h)', value: `${irrigation.forecastRainProbPct}% · ~${irrigation.forecastRainMm.toFixed(0)} mm`, source: weatherSource, at: context.weather.updatedAt },
        ],
        whyItMatters: irrigation.status === 'too_wet'
          ? 'Over-irrigation wastes water and starves roots of oxygen, which invites root rot.'
          : 'Moisture below the crop target slows growth and, at sensitive stages, directly reduces yield.',
        action: irrigation.status === 'irrigate_now'
          ? `Irrigate ${plot.name} (${plot.irrigationMethod}) and record the event as an irrigation observation.`
          : irrigation.status === 'hold_rain'
            ? 'Delay irrigation until after the forecast window, then re-check moisture before deciding.'
            : 'Skip the next irrigation set and check drainage in low spots.',
        confidence: irrigation.confidence,
        confidenceNote: irrigation.moisture?.source === 'physical_sensor' ? 'Uses a validated sensor reading from this plot.' : 'Uses a farmer-recorded probe reading; a paired soil-moisture node would raise confidence.',
        method: 'rule_based',
        ruleId: 'irrigation.target-band.v1',
        generatedAt,
        route: '/irrigation',
        actionLabel: 'Open irrigation guidance',
      });
    }
  }

  // Soil pH from sensor or farm record
  for (const plot of farmPlots) {
    const plotDevices = new Set(context.devices.filter((device) => device.plotId === plot.id && device.type === 'sensor_node').map((device) => device.id));
    const ph = latestReading(context.telemetry, plotDevices, 'soil_ph');
    if (ph && (ph.value < 6 || ph.value > 7.5)) {
      insights.push({
        id: `soil-ph-${plot.id}`,
        kind: 'soil',
        severity: ph.value < 5.5 || ph.value > 8.5 ? 'high' : 'medium',
        title: `Soil pH ${ph.value.toFixed(1)} in ${plot.name} is outside the preferred band`,
        observed: `The soil-pH sensor reported ${ph.value.toFixed(2)} pH.`,
        zoneLabel: plot.name,
        plotId: plot.id,
        evidence: [{ label: 'Soil pH', value: ph.value.toFixed(2), source: 'physical_sensor', at: ph.measuredAt }, { label: 'Preferred band', value: '6.0–7.5 pH', source: 'rule_based' }],
        whyItMatters: ph.value < 6 ? 'Acidic soil locks up phosphorus and molybdenum and can release toxic aluminium.' : 'Alkaline soil limits iron, zinc and manganese uptake and can cause chlorosis.',
        action: 'Confirm with a laboratory soil test (Soil Health Card scheme) before applying lime or gypsum.',
        confidence: 'medium',
        confidenceNote: 'Field pH sensors drift; treat as a screening value until confirmed by a lab test.',
        method: 'rule_based',
        ruleId: 'soil.ph-band.v1',
        generatedAt,
        route: '/soil',
        actionLabel: 'Open soil health',
      });
    }
  }

  // Weather advisories
  for (const warning of context.weather.warnings) {
    insights.push({
      id: `weather-${warning.id}`,
      kind: 'weather',
      severity: warning.severity === 'Warning' ? 'high' : warning.severity === 'Watch' ? 'medium' : 'info',
      title: warning.title,
      observed: warning.description,
      zoneLabel: `${context.farmName} (whole farm)`,
      evidence: [{ label: 'Trigger', value: warning.triggerCondition, source: weatherSource, at: context.weather.updatedAt }],
      whyItMatters: 'Weather drives irrigation timing, spray windows and disease pressure across every plot.',
      action: 'Review field tasks scheduled for the affected days and adjust spraying or irrigation accordingly.',
      confidence: context.weather.sourceType === 'Live API' ? 'medium' : 'low',
      confidenceNote: context.weather.sourceType === 'Live API' ? 'Forecasts are provider estimates and lose accuracy beyond 3 days.' : 'Illustrative demo forecast — no live weather provider is configured.',
      method: 'rule_based',
      ruleId: 'weather.advisory-passthrough.v1',
      generatedAt,
      route: '/weather',
      actionLabel: 'Open weather',
    });
  }

  // Telemetry anomalies & device health
  for (const device of context.devices.filter((item) => item.farmId === context.farmId && item.status !== 'retired')) {
    const plot = farmPlots.find((item) => item.id === device.plotId);
    const zone = plot ? plot.name : device.locationLabel;
    if (device.type === 'sensor_node') {
      const anomalies = detectAnomalies(context.telemetry.filter((reading) => reading.deviceId === device.id), device, now);
      for (const anomaly of anomalies) {
        insights.push({
          id: `anomaly-${device.id}-${anomaly.kind}-${anomaly.channel}`,
          kind: 'anomaly',
          severity: anomaly.kind === 'low_battery' || anomaly.kind === 'sudden_drop' ? 'medium' : 'low',
          title: `${device.name}: ${anomaly.kind.replace(/_/g, ' ')} detected`,
          observed: anomaly.description,
          zoneLabel: zone,
          plotId: device.plotId,
          deviceId: device.id,
          evidence: [{ label: 'Device', value: device.name, source: 'physical_sensor', at: anomaly.at }],
          whyItMatters: 'Sensor faults and power issues silently degrade every downstream recommendation.',
          action: anomaly.kind === 'low_battery' ? 'Check the solar panel orientation and battery pack during the next field visit.' : 'Verify the probe is seated correctly and compare against a manual reading.',
          confidence: 'medium',
          confidenceNote: 'Heuristic check on recent readings; confirm physically.',
          method: 'rule_based',
          ruleId: `telemetry.${anomaly.kind}.v1`,
          generatedAt,
          route: `/devices/${device.id}`,
          actionLabel: 'Open device',
        });
      }
    }
    if (device.status === 'offline' || device.status === 'attention_required') {
      insights.push({
        id: `device-${device.id}-${device.status}`,
        kind: 'device',
        severity: device.status === 'attention_required' ? 'high' : 'medium',
        title: `${device.name} is ${device.status === 'offline' ? 'offline' : 'reporting a fault'}`,
        observed: device.lastSeenAt ? `Last authenticated contact ${new Date(device.lastSeenAt).toLocaleString('en-IN')}.` : 'No authenticated contact has been recorded.',
        zoneLabel: zone,
        deviceId: device.id,
        evidence: [{ label: 'Server-derived status', value: device.status.replace(/_/g, ' '), source: 'physical_sensor', at: device.lastSeenAt }],
        whyItMatters: 'Monitoring, stress scoring and irrigation guidance for this zone fall back to manual records while the device is silent.',
        action: 'Check power and gateway range, then watch for the next heartbeat on the device page.',
        confidence: 'high',
        confidenceNote: 'Status is derived from authenticated heartbeats on the server.',
        method: 'rule_based',
        ruleId: 'device.status.v1',
        generatedAt,
        route: `/devices/${device.id}`,
        actionLabel: 'Open device',
      });
    }
  }

  // Crop health: open disease reports and overdue inspections
  for (const report of context.diseaseReports.filter((item) => item.farmId === context.farmId && item.status === 'Needs inspection')) {
    insights.push({
      id: `report-${report.id}`,
      kind: 'crop_health',
      severity: 'high',
      title: `Inspection due: ${report.cropName} in ${report.plotName}`,
      observed: `A symptom report is open with status “${report.status}”.`,
      zoneLabel: report.plotName,
      evidence: [{ label: 'Report created', value: new Date(report.createdAt).toLocaleDateString('en-IN'), source: 'saved_record', at: report.createdAt }],
      whyItMatters: 'Early confirmation of a disease or pest keeps treatment localised and cheaper.',
      action: 'Compare symptoms against the crop disease library and update the report after inspection.',
      confidence: 'medium',
      confidenceNote: 'Based on the farmer’s symptom report, not on an image-recognition model.',
      method: 'rule_based',
      ruleId: 'crop-health.open-report.v1',
      generatedAt,
      route: '/crop-health',
      actionLabel: 'Open crop health',
    });
  }

  // Overdue high-priority tasks
  const todayIso = new Date(now).toISOString().slice(0, 10);
  for (const task of context.activities.filter((item) => item.farmId === context.farmId && item.status === 'Pending' && item.priority === 'High' && item.scheduledDate <= todayIso)) {
    insights.push({
      id: `task-${task.id}`,
      kind: 'task',
      severity: 'medium',
      title: `Overdue high-priority task: ${task.title}`,
      observed: `${task.category} scheduled for ${task.scheduledDate}${task.plotName ? ` in ${task.plotName}` : ''}.`,
      zoneLabel: task.plotName || `${context.farmName} (whole farm)`,
      evidence: [{ label: 'Scheduled date', value: task.scheduledDate, source: 'saved_record' }],
      whyItMatters: 'Timing-critical operations such as irrigation and spraying lose effect when delayed.',
      action: 'Complete or reschedule the task from the dashboard calendar.',
      confidence: 'high',
      confidenceNote: 'Directly from your farm calendar.',
      method: 'saved_record',
      ruleId: 'task.overdue.v1',
      generatedAt,
      route: '/home',
      actionLabel: 'Open calendar',
    });
  }

  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}
