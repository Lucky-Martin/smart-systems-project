import { airportByIcao } from "../data/airports";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { AircraftCard } from "./AircraftCard";
import { SensorControls } from "./SensorControls";
import { WeatherCard } from "./WeatherCard";

export function DataPanel({ system, presenting }: { system: SmartSystem; presenting: boolean }) {
  const opensky = feedLabel(system.feed.opensky);
  const weather = feedLabel(system.feed.weather);
  const live = system.feed.opensky === "live" || system.feed.weather === "live";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-3">
      <label className="block shrink-0">
        <span className="mb-1 block text-body text-muted">Flight</span>
        <select
          value={system.flight.id}
          onChange={(event) => system.selectFlight(event.target.value)}
          className="h-9 w-full rounded-card border border-line bg-card px-3 text-value text-ink"
        >
          {system.flights.map((flight) => {
            const from = airportByIcao(flight.departureIcao).city;
            const to = airportByIcao(flight.arrivalIcao).city;
            return (
              <option key={flight.id} value={flight.id}>
                {flight.callsign} · {from} to {to}
              </option>
            );
          })}
        </select>
      </label>
      <AircraftCard system={system} />
      <WeatherCard system={system} presenting={presenting} />
      <SensorControls system={system} />
      {!presenting && (
        <p className="flex shrink-0 items-center gap-2 px-1 text-body text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-nominal" : "bg-faint"}`} />
          OpenSky: {opensky} · AviationWeather: {weather}
        </p>
      )}
    </div>
  );
}

function feedLabel(state: "live" | "fallback" | "loading"): string {
  if (state === "live") return "live";
  if (state === "loading") return "connecting";
  return "simulated";
}
