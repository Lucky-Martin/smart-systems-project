import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { airportByIcao } from "../data/airports";
import { flightById } from "../data/flights";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { releaseText } from "../lib/briefing";
import { formatFl } from "../lib/format";
import { actionSentence, bandLabel, formatDelta, formatEta, formatFuel, placeLabel } from "../lib/present";

export function AcarsModal({ system }: { system: SmartSystem }) {
  const alert = system.openAlert;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!alert) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") system.setOpenAlertId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alert, system]);

  if (!alert) return null;

  const flight = flightById(alert.flightId);
  const departure = airportByIcao(flight.departureIcao);
  const filedArrival = airportByIcao(flight.arrivalIcao);
  const amended = airportByIcao(alert.plan.arrivalIcao);
  const text = releaseText(alert);
  const fuelDelta = alert.amendedStats.fuelKg - alert.filedStats.fuelKg;
  const timeDelta = alert.amendedStats.minutes - alert.filedStats.minutes;
  const sentence = actionSentence(alert.plan, alert.filedRisk.flightLevel, amended.city);

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 p-6"
      onClick={() => system.setOpenAlertId(null)}
    >
      <div
        className="scroll-thin flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-line bg-card shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="acars-title"
      >
        <header className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 id="acars-title" className="text-lg font-semibold text-ink">
              Dispatch briefing
            </h2>
            <p className="text-body text-muted">
              <span className="font-mono">{flight.callsign}</span> · {alert.createdAt}
            </p>
          </div>
          <button
            type="button"
            onClick={() => system.setOpenAlertId(null)}
            className="text-muted hover:text-ink"
            aria-label="Close briefing"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="scroll-thin space-y-5 overflow-y-auto px-6 py-5">
          <Section title="Flight">
            <p>
              {flight.callsign} · {flight.aircraft} · {flight.airline}
            </p>
            <p>Filed {placeLabel(departure.city, departure.icao)} to {placeLabel(filedArrival.city, filedArrival.icao)} at {formatFl(alert.filedRisk.flightLevel)}</p>
            <p>Amended {placeLabel(departure.city, departure.icao)} to {placeLabel(amended.city, amended.icao)} at {formatFl(alert.plan.flightLevel)}</p>
          </Section>

          <Section title="Weather">
            <p>{alert.metar}</p>
            <p>{alert.taf}</p>
            <p>{alert.sigmetText}</p>
          </Section>

          <Section title="Risk breakdown">
            <p>
              Crosswind {alert.filedRisk.crosswindKt.toFixed(1)} kt on runway {alert.filedRisk.runwayId} · score {alert.filedRisk.crosswindScore}
            </p>
            <p>
              {alert.filedRisk.flightCategory} · visibility {alert.filedRisk.visibilitySm.toFixed(2)} SM · ceiling {Math.round(alert.filedRisk.ceilingFt)} ft · score {alert.filedRisk.approachScore}
            </p>
            <p>
              Turbulence {alert.filedRisk.severity.toLowerCase()} · track {alert.filedRisk.sigmetIntersects ? "crosses the area" : "clear of the area"} · altitude {alert.filedRisk.inVerticalBand ? "inside the band" : "outside the band"} · score {alert.filedRisk.turbulenceScore}
            </p>
            <p>
              Filed {alert.filedRisk.composite}/100 {bandLabel(alert.filedRisk.band)} · after action {alert.mitigatedRisk.composite}/100 {bandLabel(alert.mitigatedRisk.band)}
            </p>
          </Section>

          <Section title="Action">
            <p>{sentence}</p>
            <p>{alert.plan.summary}</p>
            <p>{alert.plan.detail}</p>
            {alert.plan.runwayNote && <p>{alert.plan.runwayNote}</p>}
          </Section>

          <Section title="Alternate">
            {alert.plan.rankings.map((item) => (
              <p key={item.icao}>
                {item.selected ? "Selected · " : ""}
                {placeLabel(item.city, item.icao)} · {item.category} · {item.crosswindKt.toFixed(0)} kt crosswind · {item.distanceNm} nm · score {item.terminalScore}
              </p>
            ))}
          </Section>

          <Section title="Fuel and time">
            <p>
              Time {formatEta(alert.filedStats.minutes)} → {formatEta(alert.amendedStats.minutes)} ({formatDelta(timeDelta, "min")})
            </p>
            <p>
              Fuel {formatFuel(alert.filedStats.fuelKg)} → {formatFuel(alert.amendedStats.fuelKg)} ({formatDelta(fuelDelta, "kg")})
            </p>
          </Section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              });
            }}
            className="text-body text-muted hover:text-ink"
          >
            {copied ? "Copied" : "Copy text"}
          </button>
          <button
            type="button"
            onClick={() => system.acknowledge(alert.id)}
            className="h-9 rounded-lg bg-accent px-4 text-body font-medium text-white hover:opacity-90"
          >
            {alert.acknowledged ? "Acknowledged" : "Acknowledge"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 font-sans text-body font-medium text-muted">{title}</h3>
      <div className="space-y-1 font-mono text-body leading-relaxed text-ink">{children}</div>
    </section>
  );
}
