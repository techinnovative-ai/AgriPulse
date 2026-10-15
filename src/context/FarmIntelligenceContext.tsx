import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAgriPulse } from './AgriPulseContext';
import { useFarmTelemetry, type FarmTelemetry } from '../hooks/useFarmTelemetry';
import {
  assessCropStress,
  buildIrrigationGuidance,
  generateInsights,
  type CropStressAssessment,
  type Insight,
  type InsightContext,
  type IrrigationGuidance,
} from '../services/insightsService';
import { deriveAlerts, readAcknowledgedAlerts, writeAcknowledgedAlerts, type FarmAlert } from '../services/alertsService';

interface FarmIntelligenceValue {
  telemetry: FarmTelemetry;
  insightContext: InsightContext | null;
  insights: Insight[];
  stressByPlot: CropStressAssessment[];
  irrigationByPlot: IrrigationGuidance[];
  alerts: FarmAlert[];
  activeAlerts: FarmAlert[];
  acknowledged: Record<string, string>;
  acknowledgeAlert: (alertId: string) => void;
  restoreAlert: (alertId: string) => void;
  acknowledgeAll: () => void;
  generatedAt: string | null;
}

const FarmIntelligenceContext = createContext<FarmIntelligenceValue | null>(null);

/**
 * Computes telemetry, insights and alerts once per active farm and shares them with
 * every portal surface (header bell, dashboard, Alerts, AI Insights, Irrigation …).
 */
export const FarmIntelligenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeFarm, plots, crops, observations, activities, diseaseReports, devices, weather, orders } = useAgriPulse();
  const telemetry = useFarmTelemetry(activeFarm?.id, devices, Boolean(activeFarm));
  const [acknowledged, setAcknowledged] = useState<Record<string, string>>(() => readAcknowledgedAlerts());
  // Re-evaluate time-based rules every five minutes without refetching.
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 5 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  const insightContext = useMemo<InsightContext | null>(() => {
    if (!activeFarm) return null;
    return {
      farmId: activeFarm.id,
      farmName: activeFarm.name,
      plots: plots.filter((plot) => plot.farmId === activeFarm.id),
      crops: crops.filter((crop) => crop.farmId === activeFarm.id),
      observations: observations.filter((item) => item.farmId === activeFarm.id),
      activities: activities.filter((item) => item.farmId === activeFarm.id),
      diseaseReports: diseaseReports.filter((item) => item.farmId === activeFarm.id),
      devices: devices.filter((item) => item.farmId === activeFarm.id),
      telemetry: telemetry.readings,
      weather,
      now: clock,
    };
  }, [activeFarm, plots, crops, observations, activities, diseaseReports, devices, telemetry.readings, weather, clock]);

  const insights = useMemo(() => (insightContext ? generateInsights(insightContext) : []), [insightContext]);
  const stressByPlot = useMemo(() => (insightContext ? insightContext.plots.map((plot) => assessCropStress(plot, insightContext, clock)) : []), [insightContext, clock]);
  const irrigationByPlot = useMemo(() => (insightContext ? insightContext.plots.map((plot) => buildIrrigationGuidance(plot, insightContext, clock)) : []), [insightContext, clock]);

  const alerts = useMemo(
    () => deriveAlerts({ insights, devices, activities, orders, farmId: activeFarm?.id, now: clock }),
    [insights, devices, activities, orders, activeFarm?.id, clock]
  );
  const activeAlerts = useMemo(() => alerts.filter((alert) => !acknowledged[alert.id]), [alerts, acknowledged]);

  const persist = useCallback((next: Record<string, string>) => {
    setAcknowledged(next);
    writeAcknowledgedAlerts(next);
  }, []);
  const acknowledgeAlert = useCallback((alertId: string) => persist({ ...acknowledged, [alertId]: new Date().toISOString() }), [acknowledged, persist]);
  const restoreAlert = useCallback(
    (alertId: string) => {
      const next = { ...acknowledged };
      delete next[alertId];
      persist(next);
    },
    [acknowledged, persist]
  );
  const acknowledgeAll = useCallback(() => {
    const stamp = new Date().toISOString();
    const next = { ...acknowledged };
    for (const alert of alerts) next[alert.id] = stamp;
    persist(next);
  }, [acknowledged, alerts, persist]);

  const value = useMemo<FarmIntelligenceValue>(
    () => ({
      telemetry,
      insightContext,
      insights,
      stressByPlot,
      irrigationByPlot,
      alerts,
      activeAlerts,
      acknowledged,
      acknowledgeAlert,
      restoreAlert,
      acknowledgeAll,
      generatedAt: insights[0]?.generatedAt || (insightContext ? new Date(clock).toISOString() : null),
    }),
    [telemetry, insightContext, insights, stressByPlot, irrigationByPlot, alerts, activeAlerts, acknowledged, acknowledgeAlert, restoreAlert, acknowledgeAll, clock]
  );

  return <FarmIntelligenceContext.Provider value={value}>{children}</FarmIntelligenceContext.Provider>;
};

export function useFarmIntelligence(): FarmIntelligenceValue {
  const value = useContext(FarmIntelligenceContext);
  if (!value) throw new Error('useFarmIntelligence must be used inside FarmIntelligenceProvider');
  return value;
}
