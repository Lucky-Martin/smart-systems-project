import { SlidersHorizontal } from "lucide-react";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { formatFl, padHeading } from "../lib/format";
import { formatCeiling, formatVisibility, severityLabel } from "../lib/present";
import type { TurbulenceSeverity, WeatherInjection } from "../types/aviation";

const SEVERITIES: TurbulenceSeverity[] = ["NONE", "MODERATE", "SEVERE", "EXTREME"];

export function SensorControls({ system }: { system: SmartSystem }) {
  const weather = system.weather;
  const armed = weather.sigmetEnabled && weather.severity !== "NONE";

  const setSeverity = (severity: TurbulenceSeverity) => {
    const partial: Partial<WeatherInjection> = {
      severity,
      sigmetEnabled: severity !== "NONE",
    };
    system.patchWeather(partial);
  };

  return (
    <section className="rounded-card border border-line bg-card px-3 py-2">
      <h2 className="mb-1.5 flex items-center gap-2 text-value font-medium leading-tight text-ink">
        <SlidersHorizontal className="h-4 w-4 text-muted" />
        Adjust conditions
      </h2>
      <div className="space-y-1.5">
        <Slider
          label="Wind speed"
          min={0}
          max={50}
          step={1}
          value={weather.windSpeedKt}
          display={`${Math.round(weather.windSpeedKt)} kt`}
          onChange={(windSpeedKt) => system.patchWeather({ windSpeedKt })}
        />
        <Slider
          label="Wind direction"
          min={0}
          max={360}
          step={1}
          value={weather.windDirectionDeg}
          display={`${padHeading(weather.windDirectionDeg)}°`}
          onChange={(windDirectionDeg) => system.patchWeather({ windDirectionDeg })}
        />
        <Slider
          label="Visibility"
          min={0.2}
          max={10}
          step={0.1}
          value={weather.visibilitySm}
          display={formatVisibility(weather.visibilitySm)}
          onChange={(visibilitySm) => system.patchWeather({ visibilitySm })}
        />
        <Slider
          label="Ceiling"
          min={100}
          max={10000}
          step={100}
          value={weather.ceilingFt}
          display={formatCeiling(weather.ceilingFt)}
          onChange={(ceilingFt) => system.patchWeather({ ceilingFt })}
        />
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <span className="text-body text-muted">Turbulence area</span>
          <span className="flex items-center gap-2">
            <span className="text-body font-medium text-ink">{armed ? severityLabel(weather.severity) : "Off"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={armed}
              onClick={() =>
                system.patchWeather({
                  sigmetEnabled: !weather.sigmetEnabled,
                  severity: !weather.sigmetEnabled && weather.severity === "NONE" ? "MODERATE" : weather.severity,
                })
              }
              className={`relative h-6 w-10 rounded-full transition-colors ${armed ? "bg-accent" : "bg-line"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  armed ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {SEVERITIES.map((severity) => {
            const selected = weather.severity === severity && (severity === "NONE" ? !weather.sigmetEnabled : armed);
            const tone =
              severity === "EXTREME" || severity === "SEVERE"
                ? "border-critical bg-critical/10 text-critical"
                : severity === "MODERATE"
                  ? "border-caution bg-caution/10 text-caution"
                  : "border-ink bg-white/10 text-ink";
            return (
              <button
                key={severity}
                type="button"
                onClick={() => setSeverity(severity)}
                className={`h-7 rounded-lg border text-body ${selected ? tone : "border-line text-muted"}`}
              >
                {severityLabel(severity)}
              </button>
            );
          })}
        </div>
        <Slider
          label="Base"
          min={180}
          max={430}
          step={10}
          value={weather.sigmetLowerFl}
          display={formatFl(weather.sigmetLowerFl)}
          onChange={(sigmetLowerFl) => system.patchWeather({ sigmetLowerFl, sigmetEnabled: true })}
        />
        <Slider
          label="Top"
          min={200}
          max={450}
          step={10}
          value={weather.sigmetUpperFl}
          display={formatFl(weather.sigmetUpperFl)}
          onChange={(sigmetUpperFl) => system.patchWeather({ sigmetUpperFl, sigmetEnabled: true })}
        />
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-[92px] shrink-0 text-body text-muted">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="w-[72px] shrink-0 text-right text-body font-medium tabular-nums text-ink">{display}</span>
    </label>
  );
}
