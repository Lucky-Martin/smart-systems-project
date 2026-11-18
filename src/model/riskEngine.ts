import { crosswindComponent, headwindComponent, routeIntersectsPolygon, windRunwayDelta } from "../lib/geo";
import { classifyFlightCategory } from "../lib/metar";
import type {
  FlightCategory,
  LatLngTuple,
  RiskBand,
  RiskBreakdown,
  TerminalConditions,
  TurbulenceSeverity,
} from "../types/aviation";

export const RISK_WEIGHTS = {
  crosswind: 0.25,
  approach: 0.25,
  turbulence: 0.5,
} as const;

const SEVERITY_BASE: Record<TurbulenceSeverity, number> = {
  NONE: 0,
  MODERATE: 58,
  SEVERE: 88,
  EXTREME: 97,
};

export function riskBand(score: number): RiskBand {
  if (score < 35) return { label: "NOMINAL", tone: "nominal", range: "0–34" };
  if (score < 65) return { label: "CAUTION", tone: "caution", range: "35–64" };
  return { label: "CRITICAL", tone: "critical", range: "65–100" };
}

/**
 * Transport planning limit: safe below 18 kt, caution 18–29 kt, critical at 30 kt and above.
 * 0 kt → 0, 18 kt → 34, 30 kt → 65, 50 kt → 100.
 */
export function scoreCrosswind(crosswindKt: number): number {
  const value = Math.max(0, crosswindKt);
  if (value < 18) return (value / 18) * 34;
  if (value < 30) return 35 + ((value - 18) / 12) * 29;
  return Math.min(100, 65 + ((value - 30) / 20) * 35);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function scoreApproach(category: FlightCategory, visibilitySm: number, ceilingFt: number): number {
  if (category === "VFR") {
    const visibilityPart = clamp01((10 - Math.min(visibilitySm, 10)) / 10);
    const ceilingPart = clamp01((12000 - Math.min(ceilingFt, 12000)) / 12000);
    return 4 + 22 * (0.55 * visibilityPart + 0.45 * ceilingPart);
  }
  if (category === "MVFR") {
    const visibilityPart = clamp01((5 - Math.min(visibilitySm, 5)) / 2);
    const ceilingPart = clamp01((3000 - Math.min(ceilingFt, 3000)) / 2000);
    return 35 + 14 * Math.max(visibilityPart, ceilingPart);
  }
  if (category === "IFR") {
    const visibilityPart = clamp01((3 - Math.min(visibilitySm, 3)) / 2);
    const ceilingPart = clamp01((1000 - Math.min(ceilingFt, 1000)) / 500);
    return 50 + 14 * Math.max(visibilityPart, ceilingPart);
  }
  const visibilityPart = clamp01((1 - Math.min(visibilitySm, 1)) / 1);
  const ceilingPart = clamp01((500 - Math.min(ceilingFt, 500)) / 500);
  return 78 + 22 * Math.max(visibilityPart, ceilingPart);
}

/**
 * Full severity applies only when the track enters the polygon AND cruise is inside the band.
 * A miss on either axis keeps a residual score so the breakdown stays explainable.
 */
export function scoreTurbulence(
  severity: TurbulenceSeverity,
  intersects: boolean,
  inVerticalBand: boolean,
): number {
  if (severity === "NONE") return 0;
  const base = SEVERITY_BASE[severity];
  if (intersects && inVerticalBand) return base;
  if (intersects && !inVerticalBand) return base * 0.22;
  if (!intersects && inVerticalBand) return base * 0.12;
  return base * 0.08;
}

export function blendComposite(crosswind: number, approach: number, turbulence: number): {
  composite: number;
  weighted: number;
  dominant: RiskBreakdown["dominant"];
} {
  const weighted =
    RISK_WEIGHTS.crosswind * crosswind +
    RISK_WEIGHTS.approach * approach +
    RISK_WEIGHTS.turbulence * turbulence;
  const dominantValue = Math.max(crosswind, approach, turbulence);
  const composite = Math.round(Math.min(100, 0.55 * dominantValue + 0.45 * weighted));
  const dominant: RiskBreakdown["dominant"] =
    crosswind >= approach && crosswind >= turbulence
      ? "crosswind"
      : approach >= turbulence
        ? "approach"
        : "turbulence";
  return { composite, weighted, dominant };
}

export interface RiskInput {
  terminal: TerminalConditions;
  runwayId: string;
  runwayHeading: number;
  route: LatLngTuple[];
  polygon: LatLngTuple[] | null;
  severity: TurbulenceSeverity;
  lowerFl: number;
  upperFl: number;
  flightLevel: number;
}

export function evaluateRisk(input: RiskInput): RiskBreakdown {
  const crosswindKt = crosswindComponent(
    input.terminal.windSpeedKt,
    input.terminal.windDirectionDeg,
    input.runwayHeading,
  );
  const headwindKt = headwindComponent(
    input.terminal.windSpeedKt,
    input.terminal.windDirectionDeg,
    input.runwayHeading,
  );
  const flightCategory = classifyFlightCategory(input.terminal.visibilitySm, input.terminal.ceilingFt);
  const hazardActive = input.severity !== "NONE" && input.polygon !== null && input.polygon.length >= 3;
  const sigmetIntersects = hazardActive
    ? routeIntersectsPolygon(input.route, input.polygon as LatLngTuple[])
    : false;
  const inVerticalBand =
    hazardActive && input.flightLevel >= input.lowerFl && input.flightLevel <= input.upperFl;
  const crosswindScore = Math.round(scoreCrosswind(crosswindKt));
  const approachScore = Math.round(
    scoreApproach(flightCategory, input.terminal.visibilitySm, input.terminal.ceilingFt),
  );
  const turbulenceScore = Math.round(scoreTurbulence(input.severity, sigmetIntersects, inVerticalBand));
  const blended = blendComposite(crosswindScore, approachScore, turbulenceScore);

  return {
    crosswindKt,
    headwindKt,
    windDeltaDeg: windRunwayDelta(input.terminal.windDirectionDeg, input.runwayHeading),
    crosswindScore,
    runwayId: input.runwayId,
    runwayHeading: input.runwayHeading,
    flightCategory,
    approachScore,
    visibilitySm: input.terminal.visibilitySm,
    ceilingFt: input.terminal.ceilingFt,
    sigmetIntersects,
    inVerticalBand,
    turbulenceScore,
    severity: hazardActive ? input.severity : "NONE",
    lowerFl: input.lowerFl,
    upperFl: input.upperFl,
    flightLevel: input.flightLevel,
    composite: blended.composite,
    band: riskBand(blended.composite),
    weighted: blended.weighted,
    dominant: blended.dominant,
  };
}

export function terminalOnlyScore(crosswindScore: number, approachScore: number): number {
  return Math.round(0.5 * crosswindScore + 0.5 * approachScore);
}
