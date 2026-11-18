import type { ScenarioId, ScenarioPreset, WeatherInjection } from "../types/aviation";
import { normalizeHeading } from "../lib/geo";

export const SCENARIOS: ScenarioPreset[] = [
  {
    id: "nominal",
    index: 1,
    short: "S1 Nominal VFR",
    title: "Scenario 1: Nominal VFR Cruise",
    detail: "Headwind, 10 SM, high ceiling, SIGMET off. Emerald route stays at FL340.",
  },
  {
    id: "turbulence",
    index: 2,
    short: "S2 Severe CAT",
    title: "Scenario 2: En-Route Severe Clear-Air Turbulence SIGMET",
    detail: "Severe CAT from FL280 to FL380 on the filed track. Action steps down to FL260.",
  },
  {
    id: "crosswind",
    index: 3,
    short: "S3 Xwind + LIFR",
    title: "Scenario 3: Destination Severe Crosswind & LIFR Visibility Drop",
    detail: "Direct crosswind above 35 kt and visibility under 0.5 SM. Action diverts.",
  },
  {
    id: "compound",
    index: 4,
    short: "S4 Compound Cell",
    title: "Scenario 4: Compound Multi-Hazard Storm Cell",
    detail: "Extreme SIGMET through the filed level and track. Lateral bypass plus descent, emergency release.",
  },
];

export function materializeScenario(
  id: Exclude<ScenarioId, "custom">,
  runwayHeading: number,
  cruiseFl: number,
): WeatherInjection {
  const headwind = normalizeHeading(runwayHeading);
  const crosswind = normalizeHeading(runwayHeading + 90);
  const quartering = normalizeHeading(runwayHeading + 35);
  const band = { sigmetLowerFl: 280, sigmetUpperFl: 380, filedFl: cruiseFl };

  switch (id) {
    case "nominal":
      return {
        ...band,
        windSpeedKt: 8,
        windDirectionDeg: headwind,
        visibilitySm: 10,
        ceilingFt: 8000,
        sigmetEnabled: false,
        severity: "NONE",
      };
    case "turbulence":
      return {
        ...band,
        windSpeedKt: 12,
        windDirectionDeg: headwind,
        visibilitySm: 10,
        ceilingFt: 9000,
        sigmetEnabled: true,
        severity: "SEVERE",
      };
    case "crosswind":
      return {
        ...band,
        windSpeedKt: 42,
        windDirectionDeg: crosswind,
        visibilitySm: 0.25,
        ceilingFt: 200,
        sigmetEnabled: false,
        severity: "NONE",
      };
    case "compound":
      return {
        ...band,
        windSpeedKt: 14,
        windDirectionDeg: quartering,
        visibilitySm: 8,
        ceilingFt: 5000,
        sigmetEnabled: true,
        severity: "EXTREME",
      };
    default:
      return materializeScenario("nominal", runwayHeading, cruiseFl);
  }
}
