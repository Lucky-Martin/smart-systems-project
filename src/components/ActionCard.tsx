import { Route } from "lucide-react";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { formatFl } from "../lib/format";
import { actionSentence, bandLabel, formatEta, formatFuel, placeLabel, toneText } from "../lib/present";

export function ActionCard({ system }: { system: SmartSystem }) {
  const filedAirport = system.filedArrival;
  const nextAirport = system.activeArrival;
  const sentence = actionSentence(system.plan, system.weather.filedFl, nextAirport.city);
  const tone =
    system.plan.priority === "EMERGENCY" ? "critical" : system.plan.type === "MAINTAIN" ? "nominal" : "caution";
  const border = tone === "critical" ? "border-l-critical" : tone === "caution" ? "border-l-caution" : "border-l-nominal";
  const rows = [
    {
      label: "Flight level",
      before: formatFl(system.weather.filedFl),
      after: formatFl(system.plan.flightLevel),
    },
    {
      label: "Destination",
      before: placeLabel(filedAirport.city, filedAirport.icao),
      after: placeLabel(nextAirport.city, nextAirport.icao),
    },
    {
      label: "ETA",
      before: formatEta(system.filedStats.minutes),
      after: formatEta(system.amendedStats.minutes),
    },
    {
      label: "Fuel",
      before: formatFuel(system.filedStats.fuelKg),
      after: formatFuel(system.amendedStats.fuelKg),
    },
    {
      label: "Risk",
      before: `${system.filedRisk.composite} ${bandLabel(system.filedRisk.band)}`,
      after: `${system.mitigatedRisk.composite} ${bandLabel(system.mitigatedRisk.band)}`,
      beforeClass: toneText(system.filedRisk.band.tone),
      afterClass: toneText(system.mitigatedRisk.band.tone),
    },
  ];

  return (
    <section className="rounded-card border border-line bg-card px-3 py-2">
      <h2 className="mb-1.5 flex items-center gap-2 text-value font-medium leading-tight text-ink">
        <Route className="h-4 w-4 text-muted" />
        Action taken
      </h2>
      <p className={`rounded-lg border border-line border-l-4 ${border} bg-canvas px-3 py-2 text-value leading-snug text-ink`}>
        {sentence}
      </p>
      <table className="mt-2 w-full text-body">
        <thead>
          <tr className="text-left text-muted">
            <th className="pb-1 font-medium" />
            <th className="pb-1 font-medium">Before</th>
            <th className="pb-1 font-medium">After</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-line">
              <td className="py-1 pr-2 text-muted">{row.label}</td>
              <td className={`py-1 pr-2 ${"beforeClass" in row ? row.beforeClass : "text-ink"}`}>{row.before}</td>
              <td className={`py-1 font-medium ${"afterClass" in row ? row.afterClass : "text-ink"}`}>{row.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
