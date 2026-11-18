export type LatLngTuple = [number, number];

export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR";

export type TurbulenceSeverity = "NONE" | "MODERATE" | "SEVERE" | "EXTREME";

export type ScenarioId = "nominal" | "turbulence" | "crosswind" | "compound" | "custom";

export type RiskTone = "nominal" | "caution" | "critical";

export type ActionType =
  | "MAINTAIN"
  | "FLIGHT_LEVEL_CHANGE"
  | "LATERAL_BYPASS"
  | "LATERAL_AND_DESCENT"
  | "DIVERT"
  | "DIVERT_AND_AVOID";

export type AlertPriority = "ROUTINE" | "PRIORITY" | "EMERGENCY";

export interface TerminalConditions {
  windSpeedKt: number;
  windDirectionDeg: number;
  visibilitySm: number;
  ceilingFt: number;
}

export interface WeatherInjection extends TerminalConditions {
  sigmetEnabled: boolean;
  severity: TurbulenceSeverity;
  sigmetLowerFl: number;
  sigmetUpperFl: number;
  filedFl: number;
}

export interface AirportClimate extends TerminalConditions {
  note: string;
}

export interface Airport {
  icao: string;
  iata: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  elevationFt: number;
  runway: {
    id: string;
    heading: number;
    lengthFt: number;
  };
  climate: AirportClimate;
}

export interface FlightPlan {
  id: string;
  callsign: string;
  icao24: string;
  aircraft: string;
  airline: string;
  fuelFlowKgH: number;
  cruiseFl: number;
  departureIcao: string;
  arrivalIcao: string;
  alternateIcaos: [string, string];
  planned: LatLngTuple[];
  bypass: LatLngTuple[];
  diversion: Record<string, LatLngTuple[]>;
  diversionAvoid: Record<string, LatLngTuple[]>;
  sigmet: LatLngTuple[];
  sigmetName: string;
}

export interface RiskBand {
  label: "NOMINAL" | "CAUTION" | "CRITICAL";
  tone: RiskTone;
  range: string;
}

export interface RiskBreakdown {
  crosswindKt: number;
  headwindKt: number;
  windDeltaDeg: number;
  crosswindScore: number;
  runwayId: string;
  runwayHeading: number;
  flightCategory: FlightCategory;
  approachScore: number;
  visibilitySm: number;
  ceilingFt: number;
  sigmetIntersects: boolean;
  inVerticalBand: boolean;
  turbulenceScore: number;
  severity: TurbulenceSeverity;
  lowerFl: number;
  upperFl: number;
  flightLevel: number;
  composite: number;
  band: RiskBand;
  weighted: number;
  dominant: "crosswind" | "approach" | "turbulence";
}

export interface RouteStats {
  nm: number;
  minutes: number;
  fuelKg: number;
  groundSpeedKt: number;
}

export interface AlternateRanking {
  icao: string;
  name: string;
  city: string;
  crosswindKt: number;
  crosswindScore: number;
  category: FlightCategory;
  approachScore: number;
  terminalScore: number;
  distanceNm: number;
  selected: boolean;
}

export interface ActionPlan {
  type: ActionType;
  priority: AlertPriority;
  summary: string;
  detail: string;
  route: LatLngTuple[];
  blockedRoute: LatLngTuple[] | null;
  flightLevel: number;
  arrivalIcao: string;
  diverts: boolean;
  terminal: TerminalConditions;
  rankings: AlternateRanking[];
  runwayNote: string | null;
  signature: string;
}

export interface AircraftKinematics {
  lat: number;
  lon: number;
  heading: number;
  groundSpeedKt: number;
  baroAltitudeFt: number;
  verticalSpeedFpm: number;
  progress: number;
}

export interface LiveAircraft {
  icao24: string;
  callsign: string;
  country: string;
  lat: number;
  lon: number;
  baroAltitudeFt: number | null;
  groundSpeedKt: number | null;
  heading: number | null;
  source: "opensky" | "simulated";
}

export interface LiveMetar {
  icao: string;
  raw: string;
  source: "aviationweather" | "simulated";
}

export interface FeedStatus {
  opensky: "live" | "fallback" | "loading";
  weather: "live" | "fallback" | "loading";
  openskyDetail: string;
  weatherDetail: string;
  fetchedAt: string | null;
  aircraft: LiveAircraft[];
  metars: LiveMetar[];
  sigmetReports: number | null;
}

export interface DispatchAlert {
  id: string;
  createdAt: string;
  createdMs: number;
  flightId: string;
  priority: AlertPriority;
  title: string;
  summary: string;
  acknowledged: boolean;
  filedRisk: RiskBreakdown;
  mitigatedRisk: RiskBreakdown;
  plan: ActionPlan;
  metar: string;
  taf: string;
  sigmetText: string;
  filedStats: RouteStats;
  amendedStats: RouteStats;
}

export interface ScenarioPreset {
  id: Exclude<ScenarioId, "custom">;
  index: number;
  short: string;
  title: string;
  detail: string;
}
