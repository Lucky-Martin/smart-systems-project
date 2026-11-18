import type {
  ActionPlan,
  DispatchAlert,
  FlightCategory,
  RiskBand,
  RiskBreakdown,
  RiskTone,
  ScenarioId,
  TurbulenceSeverity,
  WeatherInjection,
} from "../types/aviation";
import { formatFl } from "./format";

/** Critical crosswind used by the risk model: 30 kt and above is critical. */
export const CROSSWIND_LIMIT_KT = 30;

export type Spotlight = "data" | "center" | "action";

export const SCENARIO_UI: Record<
  Exclude<ScenarioId, "custom">,
  { label: string; subtitle: string }
> = {
  nominal: {
    label: "1 Normal",
    subtitle: "Calm wind, clear visibility, and no turbulence. The flight continues as filed.",
  },
  turbulence: {
    label: "2 Turbulence",
    subtitle: "Severe turbulence sits on the filed track between FL280 and FL380. The aircraft descends below it.",
  },
  crosswind: {
    label: "3 Crosswind + Fog",
    subtitle: "The destination has a strong crosswind and fog. The flight diverts to a safer airport.",
  },
  compound: {
    label: "4 Storm Cell",
    subtitle: "An extreme storm cell blocks the filed route and altitude. The flight reroutes and descends.",
  },
};

export const CUSTOM_SUBTITLE = "Manual adjustment. Risk and the recommended action update as the conditions change.";

export function spotlightFor(id: Exclude<ScenarioId, "custom">): Spotlight {
  if (id === "turbulence" || id === "compound") return "center";
  if (id === "crosswind") return "action";
  return "data";
}

export function bandLabel(band: RiskBand): string {
  if (band.tone === "critical") return "Critical";
  if (band.tone === "caution") return "Caution";
  return "Nominal";
}

export function toneText(tone: RiskTone): string {
  if (tone === "critical") return "text-critical";
  if (tone === "caution") return "text-caution";
  return "text-nominal";
}

export function toneFill(tone: RiskTone): string {
  if (tone === "critical") return "bg-critical";
  if (tone === "caution") return "bg-caution";
  return "bg-nominal";
}

export function toneHex(tone: RiskTone): string {
  if (tone === "critical") return "#ef4444";
  if (tone === "caution") return "#f59e0b";
  return "#22c55e";
}

export function categoryTone(category: FlightCategory): RiskTone {
  if (category === "LIFR" || category === "IFR") return "critical";
  return category === "MVFR" ? "caution" : "nominal";
}

export function severityLabel(severity: TurbulenceSeverity): string {
  if (severity === "MODERATE") return "Moderate";
  if (severity === "SEVERE") return "Severe";
  if (severity === "EXTREME") return "Extreme";
  return "None";
}

export function formatVisibility(statuteMiles: number): string {
  if (statuteMiles >= 10) return "10 SM";
  if (statuteMiles < 1) return `${statuteMiles.toFixed(2)} SM`;
  const rounded = Math.round(statuteMiles * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} SM`;
}

export function formatCeiling(feet: number): string {
  if (feet >= 10000) return "Clear";
  return `${Math.round(feet).toLocaleString("en-US")} ft`;
}

export function formatEta(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (hours <= 0) return `${remain} min`;
  return `${hours}h ${String(remain).padStart(2, "0")}m`;
}

export function formatFuel(kg: number): string {
  return `${Math.round(kg).toLocaleString("en-US")} kg`;
}

export function formatDelta(value: number, unit: string): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("en-US")} ${unit}`;
}

export function placeLabel(city: string, icao: string): string {
  return `${city} (${icao})`;
}

export function dataPipeline(weather: WeatherInjection): string {
  const sigmet =
    weather.sigmetEnabled && weather.severity !== "NONE"
      ? `SIGMET ${weather.severity.toLowerCase()} ${formatFl(weather.sigmetLowerFl)}-${formatFl(weather.sigmetUpperFl)}`
      : "no SIGMET";
  return `Wind ${Math.round(weather.windSpeedKt)} kt, Vis ${formatVisibility(weather.visibilitySm)}, ${sigmet}`;
}

export function modelPipeline(risk: RiskBreakdown): { prefix: string; band: string; tone: RiskTone } {
  return {
    prefix: `Risk ${risk.composite}/100`,
    band: bandLabel(risk.band),
    tone: risk.band.tone,
  };
}

export function actionPipeline(plan: ActionPlan, filedFl: number): string {
  const level = formatFl(plan.flightLevel);
  const changed = plan.flightLevel !== filedFl;
  const move = `${plan.flightLevel < filedFl ? "descend" : "climb"} to ${level}`;
  switch (plan.type) {
    case "MAINTAIN":
      return `Continue to ${plan.arrivalIcao} at ${level}`;
    case "FLIGHT_LEVEL_CHANGE":
      return plan.flightLevel < filedFl ? `Descend to ${level}` : `Climb to ${level}`;
    case "LATERAL_BYPASS":
      return `Reroute around turbulence at ${level}`;
    case "LATERAL_AND_DESCENT":
      return `Reroute and ${move}`;
    case "DIVERT":
    case "DIVERT_AND_AVOID":
      return changed ? `Divert to ${plan.arrivalIcao} + ${move}` : `Divert to ${plan.arrivalIcao}`;
    default:
      return plan.summary;
  }
}

export function actionSentence(plan: ActionPlan, filedFl: number, city: string): string {
  const level = formatFl(plan.flightLevel);
  const changed = plan.flightLevel !== filedFl;
  const verb = plan.flightLevel < filedFl ? "descending" : "climbing";
  const place = placeLabel(city, plan.arrivalIcao);
  switch (plan.type) {
    case "MAINTAIN":
      return `Continuing to ${place} at ${level}.`;
    case "FLIGHT_LEVEL_CHANGE":
      return plan.flightLevel < filedFl ? `Descending to ${level}.` : `Climbing to ${level}.`;
    case "LATERAL_BYPASS":
      return `Rerouting around the turbulence and staying at ${level}.`;
    case "LATERAL_AND_DESCENT":
      return `Rerouting around the storm and ${verb} to ${level}.`;
    case "DIVERT":
    case "DIVERT_AND_AVOID":
      return changed ? `Diverting to ${place} and ${verb} to ${level}.` : `Diverting to ${place}.`;
    default:
      return plan.summary;
  }
}

export function alertSentence(alert: DispatchAlert, city: string): string {
  const cleared = alert.priority === "ROUTINE" && alert.title.startsWith("HAZARD");
  if (cleared) {
    return `Hazard cleared. Continuing to ${placeLabel(city, alert.plan.arrivalIcao)} at ${formatFl(alert.plan.flightLevel)}.`;
  }
  return actionSentence(alert.plan, alert.filedRisk.flightLevel, city);
}

export function alertClock(createdAt: string): string {
  const match = createdAt.match(/(\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : createdAt;
}

export function latestAlerts(alerts: DispatchAlert[], limit = 3): DispatchAlert[] {
  const seen = new Set<string>();
  const result: DispatchAlert[] = [];
  for (const alert of alerts) {
    const key = [
      alert.flightId,
      alert.title,
      alert.summary,
      alert.plan.arrivalIcao,
      alert.plan.flightLevel,
      alert.filedRisk.composite,
      alert.mitigatedRisk.composite,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(alert);
    if (result.length >= limit) break;
  }
  return result;
}

export function sigmetPhrase(weather: WeatherInjection): string {
  return `${severityLabel(weather.severity)} turbulence ${formatFl(weather.sigmetLowerFl)}–${formatFl(weather.sigmetUpperFl)}`;
}
