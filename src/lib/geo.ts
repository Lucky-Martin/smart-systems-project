import type { LatLngTuple } from "../types/aviation";

const EARTH_NM = 3440.065;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function normalizeHeading(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function haversineNm(a: LatLngTuple, b: LatLngTuple): number {
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function routeDistanceNm(route: LatLngTuple[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i += 1) total += haversineNm(route[i - 1], route[i]);
  return total;
}

export function bearingDeg(a: LatLngTuple, b: LatLngTuple): number {
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLon = toRad(b[1] - a[1]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return normalizeHeading((Math.atan2(y, x) * 180) / Math.PI);
}

export interface AlongRoutePoint {
  lat: number;
  lon: number;
  heading: number;
  traveledNm: number;
  totalNm: number;
}

export function pointAlongRoute(route: LatLngTuple[], progress: number): AlongRoutePoint {
  const totalNm = routeDistanceNm(route);
  if (route.length === 0) {
    return { lat: 0, lon: 0, heading: 0, traveledNm: 0, totalNm: 0 };
  }
  if (route.length === 1 || totalNm === 0) {
    return { lat: route[0][0], lon: route[0][1], heading: 0, traveledNm: 0, totalNm };
  }
  const target = Math.min(1, Math.max(0, progress)) * totalNm;
  let walked = 0;
  for (let i = 1; i < route.length; i += 1) {
    const segment = haversineNm(route[i - 1], route[i]);
    if (walked + segment >= target || i === route.length - 1) {
      const fraction = segment === 0 ? 0 : Math.min(1, Math.max(0, (target - walked) / segment));
      return {
        lat: route[i - 1][0] + (route[i][0] - route[i - 1][0]) * fraction,
        lon: route[i - 1][1] + (route[i][1] - route[i - 1][1]) * fraction,
        heading: bearingDeg(route[i - 1], route[i]),
        traveledNm: walked + segment * fraction,
        totalNm,
      };
    }
    walked += segment;
  }
  const last = route[route.length - 1];
  return {
    lat: last[0],
    lon: last[1],
    heading: bearingDeg(route[route.length - 2], last),
    traveledNm: totalNm,
    totalNm,
  };
}

function orientation(a: LatLngTuple, b: LatLngTuple, c: LatLngTuple): number {
  return (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
}

function onSegment(a: LatLngTuple, b: LatLngTuple, c: LatLngTuple): boolean {
  return (
    Math.min(a[0], b[0]) - 1e-9 <= c[0] &&
    c[0] <= Math.max(a[0], b[0]) + 1e-9 &&
    Math.min(a[1], b[1]) - 1e-9 <= c[1] &&
    c[1] <= Math.max(a[1], b[1]) + 1e-9
  );
}

export function segmentsIntersect(
  a: LatLngTuple,
  b: LatLngTuple,
  c: LatLngTuple,
  d: LatLngTuple,
): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  if (Math.abs(o1) < 1e-10 && onSegment(a, b, c)) return true;
  if (Math.abs(o2) < 1e-10 && onSegment(a, b, d)) return true;
  if (Math.abs(o3) < 1e-10 && onSegment(c, d, a)) return true;
  if (Math.abs(o4) < 1e-10 && onSegment(c, d, b)) return true;
  return false;
}

/** Ray cast. Coordinates are [lat, lon]. */
export function pointInPolygon(point: LatLngTuple, polygon: LatLngTuple[]): boolean {
  const y = point[0];
  const x = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const yi = polygon[i][0];
    const xi = polygon[i][1];
    const yj = polygon[j][0];
    const xj = polygon[j][1];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function routeIntersectsPolygon(route: LatLngTuple[], polygon: LatLngTuple[]): boolean {
  if (polygon.length < 3 || route.length === 0) return false;
  for (const point of route) {
    if (pointInPolygon(point, polygon)) return true;
  }
  for (let i = 1; i < route.length; i += 1) {
    for (let j = 0; j < polygon.length; j += 1) {
      const next = (j + 1) % polygon.length;
      if (segmentsIntersect(route[i - 1], route[i], polygon[j], polygon[next])) return true;
    }
  }
  return false;
}

/** Along-track fraction where the route is inside or crossing the polygon. */
export function intersectionSpan(
  route: LatLngTuple[],
  polygon: LatLngTuple[] | null,
): [number, number] | null {
  if (!polygon || polygon.length < 3 || route.length < 2) return null;
  const total = routeDistanceNm(route);
  if (total <= 0) return null;
  let walked = 0;
  let start: number | null = null;
  let end: number | null = null;
  const mark = (distance: number) => {
    if (start === null) start = distance;
    end = distance;
  };
  const segmentHits = (a: LatLngTuple, b: LatLngTuple) => {
    if (pointInPolygon(a, polygon) || pointInPolygon(b, polygon)) return true;
    for (let j = 0; j < polygon.length; j += 1) {
      const next = (j + 1) % polygon.length;
      if (segmentsIntersect(a, b, polygon[j], polygon[next])) return true;
    }
    return false;
  };
  for (let i = 1; i < route.length; i += 1) {
    const length = haversineNm(route[i - 1], route[i]);
    if (segmentHits(route[i - 1], route[i])) {
      mark(walked);
      mark(walked + length);
    }
    walked += length;
  }
  if (start === null || end === null) return null;
  return [Math.max(0, start / total - 0.015), Math.min(1, end / total + 0.015)];
}

export function centroid(points: LatLngTuple[]): LatLngTuple {
  const lat = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const lon = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return [lat, lon];
}

export function offsetEast(route: LatLngTuple[], kilometers: number): LatLngTuple[] {
  return route.map(([lat, lon]) => {
    const degrees = kilometers / (111.32 * Math.max(0.25, Math.cos(toRad(lat))));
    return [lat, lon + degrees];
  });
}

export function routesCoincide(a: LatLngTuple[], b: LatLngTuple[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (point, index) => Math.abs(point[0] - b[index][0]) < 1e-6 && Math.abs(point[1] - b[index][1]) < 1e-6,
  );
}

export function windRunwayDelta(windDirectionDeg: number, runwayHeading: number): number {
  let diff = Math.abs(windDirectionDeg - runwayHeading) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function crosswindComponent(
  windSpeedKt: number,
  windDirectionDeg: number,
  runwayHeading: number,
): number {
  return windSpeedKt * Math.abs(Math.sin(toRad(windRunwayDelta(windDirectionDeg, runwayHeading))));
}

export function headwindComponent(
  windSpeedKt: number,
  windDirectionDeg: number,
  runwayHeading: number,
): number {
  return windSpeedKt * Math.cos(toRad(windRunwayDelta(windDirectionDeg, runwayHeading)));
}

export interface BoundingBox {
  lamin: number;
  lamax: number;
  lomin: number;
  lomax: number;
}

export function bboxAround(lat: number, lon: number, deltaLat: number, deltaLon: number): BoundingBox {
  return {
    lamin: Math.max(-90, lat - deltaLat),
    lamax: Math.min(90, lat + deltaLat),
    lomin: Math.max(-180, lon - deltaLon),
    lomax: Math.min(180, lon + deltaLon),
  };
}

export function boundsOf(routes: LatLngTuple[][]): LatLngTuple[] {
  return routes.flat();
}
