import type { BoundingBox } from "../lib/geo";
import type { FeedStatus, LiveAircraft, LiveMetar } from "../types/aviation";

const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const METAR_URL = "https://aviationweather.gov/api/data/metar";
const SIGMET_URL = "https://aviationweather.gov/api/data/airsigmet";

interface OpenSkyResponse {
  time?: number;
  states?: Array<Array<string | number | boolean | null>> | null;
}

interface AviationWeatherMetar {
  icaoId?: string;
  rawOb?: string;
  raw?: string;
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

function parseOpenSky(payload: OpenSkyResponse): LiveAircraft[] {
  const states = payload.states ?? [];
  const aircraft: LiveAircraft[] = [];
  for (const state of states) {
    const lat = state[6];
    const lon = state[5];
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    const altitude = state[7];
    const velocity = state[9];
    const track = state[10];
    const callsign = String(state[1] ?? "").trim();
    aircraft.push({
      icao24: String(state[0] ?? "").toLowerCase(),
      callsign: callsign || "----",
      country: String(state[2] ?? "Unknown"),
      lat,
      lon,
      baroAltitudeFt: typeof altitude === "number" ? Math.round(altitude * 3.28084) : null,
      groundSpeedKt: typeof velocity === "number" ? Math.round(velocity * 1.94384) : null,
      heading: typeof track === "number" ? Math.round(track) : null,
      source: "opensky",
    });
    if (aircraft.length >= 80) break;
  }
  return aircraft;
}

export function simulatedSurveillance(lat: number, lon: number, seed: number): LiveAircraft[] {
  const traffic = [
    ["NAX412", "4782aa", "Norway", 0.55, 0.85],
    ["SAS087", "4aca10", "Sweden", -0.45, 0.65],
    ["AAL210", "a1c903", "United States", 0.3, -0.8],
    ["RYR64W", "4ca8e1", "Ireland", -0.65, -0.35],
  ] as const;
  return traffic.map((row, index) => {
    const drift = Math.sin(seed / 5000 + index * 1.4) * 0.16;
    return {
      icao24: row[1],
      callsign: row[0],
      country: row[2],
      lat: lat + row[3] + drift,
      lon: lon + row[4] + drift * 0.45,
      baroAltitudeFt: 28000 + index * 3000,
      groundSpeedKt: 418 + index * 16,
      heading: Math.round((seed / 50 + index * 78) % 360),
      source: "simulated" as const,
    };
  });
}

export async function loadAviationFeeds(options: {
  bbox: BoundingBox;
  icaos: string[];
  fallbackAircraft: LiveAircraft[];
  fallbackMetars: LiveMetar[];
}): Promise<FeedStatus> {
  const fetchedAt = new Date().toISOString();
  const openSkyUrl =
    `${OPENSKY_URL}?lamin=${options.bbox.lamin.toFixed(2)}` +
    `&lomin=${options.bbox.lomin.toFixed(2)}` +
    `&lamax=${options.bbox.lamax.toFixed(2)}` +
    `&lomax=${options.bbox.lomax.toFixed(2)}`;
  const metarUrl = `${METAR_URL}?ids=${options.icaos.join(",")}&format=json`;

  const [openSkyResult, metarResult, sigmetResult] = await Promise.allSettled([
    fetchJson<OpenSkyResponse>(openSkyUrl, 7000),
    fetchJson<AviationWeatherMetar[]>(metarUrl, 7000),
    fetchJson<unknown[]>(`${SIGMET_URL}?format=json`, 7000),
  ]);

  let opensky: FeedStatus["opensky"] = "fallback";
  let openskyDetail = "OpenSky unreachable (CORS, rate limit, or network). Surveillance is simulated.";
  let aircraft = options.fallbackAircraft;
  if (openSkyResult.status === "fulfilled") {
    opensky = "live";
    aircraft = parseOpenSky(openSkyResult.value);
    openskyDetail =
      aircraft.length > 0
        ? `OpenSky live · ${aircraft.length} targets in the aircraft box`
        : "OpenSky live · no targets in the current box";
  }

  let weather: FeedStatus["weather"] = "fallback";
  let weatherDetail = "AviationWeather.gov unreachable. METAR strings below are generated from the sensor model.";
  let metars = options.fallbackMetars;
  if (metarResult.status === "fulfilled" && Array.isArray(metarResult.value)) {
    const live = metarResult.value
      .map((row) => ({
        icao: row.icaoId ?? "",
        raw: row.rawOb ?? row.raw ?? "",
        source: "aviationweather" as const,
      }))
      .filter((row) => row.icao && row.raw);
    if (live.length > 0) {
      weather = "live";
      metars = live;
      weatherDetail = `AviationWeather.gov live METAR · ${live.length} stations`;
    } else {
      weatherDetail = "AviationWeather.gov returned no METAR for these stations. Showing simulated observations.";
    }
  }

  const sigmetReports =
    sigmetResult.status === "fulfilled" && Array.isArray(sigmetResult.value)
      ? sigmetResult.value.length
      : null;

  return {
    opensky,
    weather,
    openskyDetail,
    weatherDetail,
    fetchedAt,
    aircraft,
    metars,
    sigmetReports,
  };
}
