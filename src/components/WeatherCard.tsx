import { useState } from "react";
import { CloudSun } from "lucide-react";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { decodeConditions } from "../lib/metar";
import { categoryTone, formatCeiling, formatVisibility, toneText } from "../lib/present";

export function WeatherCard({ system, presenting }: { system: SmartSystem; presenting: boolean }) {
  const [open, setOpen] = useState(false);
  const decoded = decodeConditions(system.weather);
  const tone = categoryTone(decoded.category);
  const live = system.feed.metars.find(
    (item) => item.icao === system.filedArrival.icao && item.source === "aviationweather",
  );

  return (
    <section className="rounded-card border border-line bg-card px-3 py-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-value font-medium text-ink">
          <CloudSun className="h-4 w-4 text-muted" />
          Destination weather
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${toneText(tone)} bg-white/5`}>
          {decoded.category}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Wind" value={`${Math.round(system.weather.windDirectionDeg)}° / ${Math.round(system.weather.windSpeedKt)} kt`} />
        <Stat label="Visibility" value={formatVisibility(system.weather.visibilitySm)} />
        <Stat label="Ceiling" value={formatCeiling(system.weather.ceilingFt)} />
      </div>
      {!presenting && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="text-body text-muted hover:text-ink"
            aria-expanded={open}
          >
            {open ? "Hide raw METAR/TAF" : "Raw METAR/TAF"}
          </button>
          {open && (
            <div className="mt-1.5 space-y-1 font-mono text-body leading-snug text-ink">
              <p>{system.destinationMetar}</p>
              <p className="text-muted">{system.destinationTaf}</p>
              {live && (
                <button type="button" onClick={system.ingestLiveMetar} className="font-sans text-body text-accent">
                  Use live observation
                </button>
              )}
              {system.ingestNote && <p className="font-sans text-muted">{system.ingestNote}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-body leading-tight text-muted">{label}</div>
      <div className="truncate text-value font-medium leading-tight text-ink">{value}</div>
    </div>
  );
}
