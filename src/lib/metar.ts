import type { FlightCategory, TerminalConditions } from "../types/aviation";
import { metarTimeGroup } from "./format";

/** FAA flight category from prevailing visibility (SM) and ceiling (ft). */
export function classifyFlightCategory(visibilitySm: number, ceilingFt: number): FlightCategory {
  if (ceilingFt < 500 || visibilitySm < 1) return "LIFR";
  if (ceilingFt < 1000 || visibilitySm < 3) return "IFR";
  if (ceilingFt <= 3000 || visibilitySm <= 5) return "MVFR";
  return "VFR";
}

function cloudGroup(ceilingFt: number): string {
  if (ceilingFt >= 10000) return "NSC";
  const hundreds = String(Math.max(1, Math.round(ceilingFt / 100))).padStart(3, "0");
  if (ceilingFt < 1000) return `OVC${hundreds}`;
  if (ceilingFt <= 3000) return `BKN${hundreds}`;
  return `SCT${hundreds}`;
}

function visibilityGroup(icao: string, visibilitySm: number): string {
  if (icao.startsWith("K")) {
    if (visibilitySm >= 10) return "10SM";
    if (visibilitySm <= 0.3) return "1/4SM";
    if (visibilitySm <= 0.6) return "1/2SM";
    if (visibilitySm < 1) return "3/4SM";
    const rounded = Math.round(visibilitySm * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded.toFixed(0)}SM` : `${rounded.toFixed(1)}SM`;
  }
  const meters = visibilitySm >= 6.21 ? 9999 : Math.max(50, Math.round((visibilitySm * 1609.344) / 50) * 50);
  return String(meters).padStart(4, "0");
}

function windGroup(windSpeedKt: number, windDirectionDeg: number): string {
  if (windSpeedKt < 1) return "00000KT";
  const direction = String(Math.round(windDirectionDeg) % 360).padStart(3, "0");
  const speed = String(Math.min(99, Math.round(windSpeedKt))).padStart(2, "0");
  return `${direction}${speed}KT`;
}

function temperatureGroup(lat: number): string {
  if (lat > 60) return "M04/M08";
  if (lat > 48) return "06/02";
  if (lat > 40) return "11/04";
  return "18/09";
}

export function buildMetar(
  icao: string,
  conditions: TerminalConditions,
  latitude: number,
  time: Date,
): string {
  const altimeter = icao.startsWith("K") ? "A2992" : "Q1013";
  return [
    icao,
    metarTimeGroup(time),
    windGroup(conditions.windSpeedKt, conditions.windDirectionDeg),
    visibilityGroup(icao, conditions.visibilitySm),
    cloudGroup(conditions.ceilingFt),
    temperatureGroup(latitude),
    altimeter,
  ].join(" ");
}

export function buildTaf(icao: string, conditions: TerminalConditions, time: Date): string {
  const day = String(time.getUTCDate()).padStart(2, "0");
  const hour = String(time.getUTCHours()).padStart(2, "0");
  const from = `${day}${hour}`;
  const endDate = new Date(time.getTime() + 24 * 3600 * 1000);
  const to = `${String(endDate.getUTCDate()).padStart(2, "0")}${hour}`;
  const category = classifyFlightCategory(conditions.visibilitySm, conditions.ceilingFt);
  const tempo =
    category === "LIFR" || category === "IFR"
      ? " TEMPO 6H FG OVC003"
      : category === "MVFR"
        ? " TEMPO 4H BKN015"
        : " NOSIG";
  return `TAF ${icao} ${metarTimeGroup(time)} ${from}/${to} ${windGroup(conditions.windSpeedKt, conditions.windDirectionDeg)} ${visibilityGroup(icao, conditions.visibilitySm)} ${cloudGroup(conditions.ceilingFt)}${tempo}`;
}

export interface DecodedMetar {
  wind: string;
  visibility: string;
  ceiling: string;
  category: FlightCategory;
}

export function decodeConditions(conditions: TerminalConditions): DecodedMetar {
  const category = classifyFlightCategory(conditions.visibilitySm, conditions.ceilingFt);
  return {
    wind: `${String(Math.round(conditions.windDirectionDeg)).padStart(3, "0")}° / ${Math.round(conditions.windSpeedKt)} KT`,
    visibility: `${conditions.visibilitySm.toFixed(conditions.visibilitySm < 3 ? 2 : 1)} SM`,
    ceiling: conditions.ceilingFt >= 10000 ? "NO CEILING" : `BKN/OVC ${Math.round(conditions.ceilingFt).toLocaleString("en-US")} FT`,
    category,
  };
}

export function parseMetarToTerminal(raw: string): Partial<TerminalConditions> | null {
  const parsed: Partial<TerminalConditions> = {};
  const wind = raw.match(/\b(\d{3})(\d{2,3})KT\b/);
  if (wind) {
    parsed.windDirectionDeg = Number(wind[1]);
    parsed.windSpeedKt = Number(wind[2]);
  }
  if (/\b00000KT\b/.test(raw)) {
    parsed.windDirectionDeg = 0;
    parsed.windSpeedKt = 0;
  }
  const statute = raw.match(/\b(P6|10|1\/4|1\/2|3\/4|\d(?:\.\d)?)SM\b/);
  if (statute) {
    const token = statute[1];
    const fractions: Record<string, number> = { "1/4": 0.25, "1/2": 0.5, "3/4": 0.75, P6: 6 };
    parsed.visibilitySm = fractions[token] ?? Math.min(10, Number(token));
  } else if (/\bCAVOK\b/.test(raw)) {
    parsed.visibilitySm = 10;
    parsed.ceilingFt = 10000;
  } else {
    const withoutClock = raw.replace(/\b\d{6}Z\b/g, " ");
    const meters = withoutClock.match(/\s(\d{4})\s/);
    if (meters) {
      const value = Number(meters[1]);
      parsed.visibilitySm = value >= 9999 ? 10 : Math.max(0.2, Math.round((value / 1609.344) * 100) / 100);
    }
  }
  const cloud = raw.match(/\b(?:BKN|OVC|VV)(\d{3})\b/);
  if (cloud) parsed.ceilingFt = Number(cloud[1]) * 100;
  else if (/\b(?:SKC|NSC|NCD|CLR|CAVOK)\b/.test(raw)) parsed.ceilingFt = 10000;
  if (
    parsed.windSpeedKt === undefined &&
    parsed.visibilitySm === undefined &&
    parsed.ceilingFt === undefined
  ) {
    return null;
  }
  return parsed;
}
