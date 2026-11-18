import type { Airport } from "../types/aviation";
import type {
  ActionPlan,
  AlternateRanking,
  FlightPlan,
  RiskBreakdown,
  TerminalConditions,
  WeatherInjection,
} from "../types/aviation";
import { routeDistanceNm } from "../lib/geo";
import { classifyFlightCategory } from "../lib/metar";
import { escapeFlightLevel, routeStats } from "./performance";
import { evaluateRisk, scoreApproach, scoreCrosswind, terminalOnlyScore } from "./riskEngine";
import { crosswindComponent } from "../lib/geo";
import { formatFl } from "../lib/format";

const DIVERT_SCORE = 65;
const TURBULENCE_SCORE = 35;

function terminalFromClimate(airport: Airport): TerminalConditions {
  return {
    windSpeedKt: airport.climate.windSpeedKt,
    windDirectionDeg: airport.climate.windDirectionDeg,
    visibilitySm: airport.climate.visibilitySm,
    ceilingFt: airport.climate.ceilingFt,
  };
}

function rankAlternates(
  flight: FlightPlan,
  airports: Record<string, Airport>,
  avoidSigmet: boolean,
): AlternateRanking[] {
  return flight.alternateIcaos
    .map((icao) => {
      const airport = airports[icao];
      const terminal = terminalFromClimate(airport);
      const route = avoidSigmet ? flight.diversionAvoid[icao] : flight.diversion[icao];
      const crosswindKt = crosswindComponent(
        terminal.windSpeedKt,
        terminal.windDirectionDeg,
        airport.runway.heading,
      );
      const category = classifyFlightCategory(terminal.visibilitySm, terminal.ceilingFt);
      const crosswindScore = Math.round(scoreCrosswind(crosswindKt));
      const approachScore = Math.round(scoreApproach(category, terminal.visibilitySm, terminal.ceilingFt));
      return {
        icao,
        name: airport.name,
        city: airport.city,
        crosswindKt,
        crosswindScore,
        category,
        approachScore,
        terminalScore: terminalOnlyScore(crosswindScore, approachScore),
        distanceNm: Math.round(routeDistanceNm(route)),
        selected: false,
      };
    })
    .sort((a, b) => a.terminalScore - b.terminalScore || a.distanceNm - b.distanceNm);
}

function signatureFor(
  flightId: string,
  type: ActionPlan["type"],
  arrivalIcao: string,
  flightLevel: number,
  severity: string,
  armed: boolean,
): string {
  return [type, flightId, arrivalIcao, `FL${flightLevel}`, severity, armed ? "SIG" : "NOSIG"].join("|");
}

export function planAction(
  flight: FlightPlan,
  injection: WeatherInjection,
  filedRisk: RiskBreakdown,
  airports: Record<string, Airport>,
): ActionPlan {
  const arrival = airports[flight.arrivalIcao];
  const sigmetArmed = injection.sigmetEnabled && injection.severity !== "NONE";
  const rankings = rankAlternates(flight, airports, sigmetArmed);
  const chosen = rankings[0];
  const terminalCritical = filedRisk.crosswindScore >= DIVERT_SCORE || filedRisk.approachScore >= DIVERT_SCORE;
  const verticalConflict = filedRisk.sigmetIntersects && filedRisk.inVerticalBand && filedRisk.turbulenceScore >= TURBULENCE_SCORE;
  const lateralConflict =
    filedRisk.sigmetIntersects && !filedRisk.inVerticalBand && filedRisk.turbulenceScore >= TURBULENCE_SCORE;
  const escapeFl = escapeFlightLevel(injection.sigmetLowerFl, injection.sigmetUpperFl);
  const filedFl = injection.filedFl;
  const descends = escapeFl < filedFl;
  const levelVerb = descends ? "DESCEND" : "CLIMB";

  const runwayNote =
    filedRisk.crosswindScore >= DIVERT_SCORE
      ? `Reciprocal of runway ${arrival.runway.id} was evaluated. Crosswind magnitude is identical on the opposite heading, so a runway swap does not remove the hazard.`
      : null;

  const base: Pick<ActionPlan, "rankings" | "runwayNote"> = {
    rankings: rankings.map((item) => ({ ...item, selected: false })),
    runwayNote,
  };

  if (terminalCritical && chosen) {
    const avoid = verticalConflict || lateralConflict || (sigmetArmed && filedRisk.sigmetIntersects);
    const route = (avoid ? flight.diversionAvoid[chosen.icao] : flight.diversion[chosen.icao]) ?? flight.diversion[chosen.icao];
    const alternate = airports[chosen.icao];
    const nextLevel = verticalConflict ? escapeFl : filedFl;
    const type = avoid && verticalConflict ? "DIVERT_AND_AVOID" : avoid && sigmetArmed && filedRisk.sigmetIntersects ? "DIVERT_AND_AVOID" : "DIVERT";
    const levelClause =
      nextLevel !== filedFl ? ` + ${levelVerb} ${formatFl(filedFl)} → ${formatFl(nextLevel)}` : "";
    return {
      ...base,
      type,
      priority: "EMERGENCY",
      summary: `DIVERT ${flight.arrivalIcao} → ${chosen.icao}${levelClause}`,
      detail: `${flight.arrivalIcao} ${arrival.name} is ${filedRisk.flightCategory} with ${filedRisk.crosswindKt.toFixed(1)} kt crosswind on runway ${arrival.runway.id}. ${chosen.icao} ${alternate.name} is the lowest terminal-risk alternate (${chosen.category}, score ${chosen.terminalScore}). ${avoid ? "The diversion track is drawn clear of the active SIGMET polygon." : "No en-route polygon conflict is active."}`,
      route,
      blockedRoute: flight.planned,
      flightLevel: nextLevel,
      arrivalIcao: chosen.icao,
      diverts: true,
      terminal: terminalFromClimate(alternate),
      rankings: base.rankings.map((item) => ({ ...item, selected: item.icao === chosen.icao })),
      signature: signatureFor(flight.id, type, chosen.icao, nextLevel, injection.severity, sigmetArmed),
    };
  }

  if (injection.severity === "EXTREME" && verticalConflict) {
    return {
      ...base,
      type: "LATERAL_AND_DESCENT",
      priority: "EMERGENCY",
      summary: `LATERAL BYPASS + ${levelVerb} ${formatFl(filedFl)} → ${formatFl(escapeFl)}`,
      detail: `${flight.sigmetName} is extreme and the filed cruise ${formatFl(filedFl)} sits inside ${formatFl(injection.sigmetLowerFl)}–${formatFl(injection.sigmetUpperFl)} while the track crosses the polygon. The amendment offsets the ground track and escapes the altitude band together.`,
      route: flight.bypass,
      blockedRoute: flight.planned,
      flightLevel: escapeFl,
      arrivalIcao: flight.arrivalIcao,
      diverts: false,
      terminal: injection,
      signature: signatureFor(flight.id, "LATERAL_AND_DESCENT", flight.arrivalIcao, escapeFl, injection.severity, sigmetArmed),
    };
  }

  if ((injection.severity === "SEVERE" || injection.severity === "EXTREME") && verticalConflict) {
    return {
      ...base,
      type: "FLIGHT_LEVEL_CHANGE",
      priority: "PRIORITY",
      summary: `${levelVerb} ${formatFl(filedFl)} → ${formatFl(escapeFl)} ${descends ? "BELOW" : "ABOVE"} SIGMET`,
      detail: `Filed track crosses ${flight.sigmetName}. ${formatFl(filedFl)} is inside the ${injection.severity.toLowerCase()} band ${formatFl(injection.sigmetLowerFl)}–${formatFl(injection.sigmetUpperFl)}. The ground track is unchanged. Cruise becomes ${formatFl(escapeFl)}, which is outside the band.`,
      route: flight.planned,
      blockedRoute: flight.planned,
      flightLevel: escapeFl,
      arrivalIcao: flight.arrivalIcao,
      diverts: false,
      terminal: injection,
      signature: signatureFor(flight.id, "FLIGHT_LEVEL_CHANGE", flight.arrivalIcao, escapeFl, injection.severity, sigmetArmed),
    };
  }

  if (verticalConflict || lateralConflict) {
    return {
      ...base,
      type: "LATERAL_BYPASS",
      priority: "PRIORITY",
      summary: `LATERAL WAYPOINT BYPASS AROUND SIGMET`,
      detail: `The filed track enters ${flight.sigmetName}. A waypoint offset clears the polygon. Filed cruise ${formatFl(filedFl)} is retained${filedRisk.inVerticalBand ? " only because the new track no longer occupies the band geographically." : " because the filed level is already outside the band."}`,
      route: flight.bypass,
      blockedRoute: flight.planned,
      flightLevel: filedFl,
      arrivalIcao: flight.arrivalIcao,
      diverts: false,
      terminal: injection,
      signature: signatureFor(flight.id, "LATERAL_BYPASS", flight.arrivalIcao, filedFl, injection.severity, sigmetArmed),
    };
  }

  const verticalMiss =
    sigmetArmed && filedRisk.sigmetIntersects && !filedRisk.inVerticalBand
      ? ` The track still meets the SIGMET polygon, but ${formatFl(filedFl)} is outside ${formatFl(injection.sigmetLowerFl)}–${formatFl(injection.sigmetUpperFl)}, so the vertical half of the 3D test fails and the residual score stays below the action threshold.`
      : "";

  return {
    ...base,
    type: "MAINTAIN",
    priority: "ROUTINE",
    summary: "MAINTAIN FILED ROUTE AND FLIGHT LEVEL",
    detail: `No terminal limit and no 3D SIGMET conflict are above the action threshold. The filed route, destination, and cruise level stay in force.${verticalMiss}`,
    route: flight.planned,
    blockedRoute: null,
    flightLevel: filedFl,
    arrivalIcao: flight.arrivalIcao,
    diverts: false,
    terminal: injection,
    signature: signatureFor(flight.id, "MAINTAIN", flight.arrivalIcao, filedFl, injection.severity, sigmetArmed),
  };
}

export function evaluateAmendedRisk(
  flight: FlightPlan,
  injection: WeatherInjection,
  plan: ActionPlan,
  airports: Record<string, Airport>,
): RiskBreakdown {
  const airport = airports[plan.arrivalIcao];
  const polygon = injection.sigmetEnabled && injection.severity !== "NONE" ? flight.sigmet : null;
  return evaluateRisk({
    terminal: plan.terminal,
    runwayId: airport.runway.id,
    runwayHeading: airport.runway.heading,
    route: plan.route,
    polygon,
    severity: polygon ? injection.severity : "NONE",
    lowerFl: injection.sigmetLowerFl,
    upperFl: injection.sigmetUpperFl,
    flightLevel: plan.flightLevel,
  });
}

export function filedRouteStats(flight: FlightPlan, filedFl: number) {
  return routeStats(flight.planned, filedFl, flight.fuelFlowKgH);
}

export function amendedRouteStats(flight: FlightPlan, plan: ActionPlan) {
  return routeStats(plan.route, plan.flightLevel, flight.fuelFlowKgH);
}
