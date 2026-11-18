import { flightById } from "../data/flights";
import { airportByIcao } from "../data/airports";
import { formatFl, formatMinutes, formatSigned } from "./format";
import type { DispatchAlert } from "../types/aviation";

export function releaseText(alert: DispatchAlert): string {
  const flight = flightById(alert.flightId);
  const departure = airportByIcao(flight.departureIcao);
  const filedArrival = airportByIcao(flight.arrivalIcao);
  const amendedArrival = airportByIcao(alert.plan.arrivalIcao);
  const fuelDelta = alert.amendedStats.fuelKg - alert.filedStats.fuelKg;
  const timeDelta = alert.amendedStats.minutes - alert.filedStats.minutes;
  const distanceDelta = alert.amendedStats.nm - alert.filedStats.nm;
  return [
    "OC1 DISPATCH RELEASE — SMART ROUTE ADVISOR",
    `MSG ${alert.id.slice(0, 8).toUpperCase()}  ${alert.createdAt}  PRI ${alert.priority}`,
    `FLIGHT ${flight.callsign}  ${flight.aircraft}  ${flight.airline}`,
    `ICAO24 ${flight.icao24.toUpperCase()}`,
    `FILED ${departure.icao} DCT ${filedArrival.icao}  ${formatFl(alert.filedRisk.flightLevel)}`,
    `AMENDED ${departure.icao} DCT ${amendedArrival.icao}  ${formatFl(alert.plan.flightLevel)}`,
    "",
    "— WEATHER —",
    `DEST METAR ${alert.metar}`,
    `DEST TAF   ${alert.taf}`,
    `SIGMET     ${alert.sigmetText}`,
    "",
    "— RISK MODEL —",
    `XW ${alert.filedRisk.crosswindKt.toFixed(1)} KT ON RWY ${alert.filedRisk.runwayId}  SCORE ${alert.filedRisk.crosswindScore}/100`,
    `CATEGORY ${alert.filedRisk.flightCategory}  VIS ${alert.filedRisk.visibilitySm.toFixed(2)} SM  CIG ${Math.round(alert.filedRisk.ceilingFt)} FT  SCORE ${alert.filedRisk.approachScore}/100`,
    `TURB ${alert.filedRisk.severity}  LATERAL ${alert.filedRisk.sigmetIntersects ? "YES" : "NO"}  VERTICAL ${alert.filedRisk.inVerticalBand ? "YES" : "NO"}  SCORE ${alert.filedRisk.turbulenceScore}/100`,
    `COMPOSITE ${alert.filedRisk.composite}/100 ${alert.filedRisk.band.label}`,
    `POST-ACTION ${alert.mitigatedRisk.composite}/100 ${alert.mitigatedRisk.band.label}`,
    "",
    "— ACTION —",
    alert.plan.summary,
    alert.plan.detail,
    alert.plan.runwayNote ?? "RUNWAY SWAP NOT REQUIRED",
    `DIST ${alert.filedStats.nm} NM → ${alert.amendedStats.nm} NM (${formatSigned(distanceDelta, "NM")})`,
    `ETE  ${formatMinutes(alert.filedStats.minutes)} → ${formatMinutes(alert.amendedStats.minutes)} (${formatSigned(timeDelta, "MIN")})`,
    `FUEL ${alert.filedStats.fuelKg} KG → ${alert.amendedStats.fuelKg} KG (${formatSigned(fuelDelta, "KG")})`,
    "",
    "CREW: AMEND THE RELEASE AND ADVISE ATC OF THE NEW LEVEL OR DESTINATION.",
    "END OF ACARS",
  ].join("\n");
}
