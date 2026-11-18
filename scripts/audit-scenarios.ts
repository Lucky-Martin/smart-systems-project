import { AIRPORTS, airportByIcao } from "../src/data/airports";
import { FLIGHTS } from "../src/data/flights";
import { materializeScenario } from "../src/data/scenarios";
import { routeIntersectsPolygon } from "../src/lib/geo";
import { planAction, evaluateAmendedRisk } from "../src/model/actionEngine";
import { evaluateRisk } from "../src/model/riskEngine";
import type { ScenarioId } from "../src/types/aviation";

const scenarios: Array<Exclude<ScenarioId, "custom">> = ["nominal", "turbulence", "crosswind", "compound"];

for (const flight of FLIGHTS) {
  const plannedHit = routeIntersectsPolygon(flight.planned, flight.sigmet);
  const bypassHit = routeIntersectsPolygon(flight.bypass, flight.sigmet);
  const diversions = flight.alternateIcaos.map((icao) => {
    const direct = routeIntersectsPolygon(flight.diversion[icao], flight.sigmet);
    const avoid = routeIntersectsPolygon(flight.diversionAvoid[icao], flight.sigmet);
    return `${icao} direct=${direct} avoid=${avoid}`;
  });
  console.log(`\n${flight.id} planned=${plannedHit} bypass=${bypassHit} ${diversions.join(" | ")}`);
  const arrival = airportByIcao(flight.arrivalIcao);
  for (const scenario of scenarios) {
    const weather = materializeScenario(scenario, arrival.runway.heading, flight.cruiseFl);
    const polygon = weather.sigmetEnabled && weather.severity !== "NONE" ? flight.sigmet : null;
    const filed = evaluateRisk({
      terminal: weather,
      runwayId: arrival.runway.id,
      runwayHeading: arrival.runway.heading,
      route: flight.planned,
      polygon,
      severity: polygon ? weather.severity : "NONE",
      lowerFl: weather.sigmetLowerFl,
      upperFl: weather.sigmetUpperFl,
      flightLevel: weather.filedFl,
    });
    const plan = planAction(flight, weather, filed, AIRPORTS);
    const mitigated = evaluateAmendedRisk(flight, weather, plan, AIRPORTS);
    console.log(
      `  ${scenario.padEnd(12)} filed ${String(filed.composite).padStart(3)} ${filed.band.label.padEnd(8)} ` +
        `xw ${filed.crosswindKt.toFixed(1).padStart(5)}/${String(filed.crosswindScore).padStart(3)} ` +
        `${filed.flightCategory.padEnd(4)} ${String(filed.approachScore).padStart(3)} ` +
        `turb ${String(filed.turbulenceScore).padStart(3)} lat ${filed.sigmetIntersects ? "Y" : "N"} vert ${filed.inVerticalBand ? "Y" : "N"} ` +
        `-> ${plan.type.padEnd(20)} ${plan.summary} | mitigated ${mitigated.composite} ${mitigated.band.label} ` +
        `lat ${mitigated.sigmetIntersects ? "Y" : "N"} vert ${mitigated.inVerticalBand ? "Y" : "N"} FL${plan.flightLevel} ${plan.arrivalIcao}`,
    );
  }
}
