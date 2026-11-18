import { routeDistanceNm } from "../lib/geo";
import type { LatLngTuple, RouteStats } from "../types/aviation";

export function groundSpeedKt(flightLevel: number): number {
  const level = Math.min(410, Math.max(180, flightLevel));
  return Math.round(415 + ((level - 200) / 210) * 70);
}

export function routeStats(route: LatLngTuple[], flightLevel: number, fuelFlowKgH: number): RouteStats {
  const nm = routeDistanceNm(route);
  const groundSpeed = groundSpeedKt(flightLevel);
  const hours = nm / Math.max(groundSpeed, 1);
  return {
    nm: Math.round(nm),
    minutes: Math.round(hours * 60),
    fuelKg: Math.round(hours * fuelFlowKgH),
    groundSpeedKt: groundSpeed,
  };
}

/** Prefer a descent beneath the band when the resulting level stays at or above FL200. */
export function escapeFlightLevel(lowerFl: number, upperFl: number): number {
  const below = Math.round((lowerFl - 20) / 10) * 10;
  if (below >= 200) return below;
  return Math.min(410, Math.round((upperFl + 20) / 10) * 10);
}
