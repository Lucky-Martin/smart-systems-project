import { Plane } from "lucide-react";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { formatFeet, padHeading } from "../lib/format";

export function AircraftCard({ system }: { system: SmartSystem }) {
  const cells = [
    { label: "Callsign", value: system.flight.callsign, mono: true },
    { label: "Route", value: `${system.departure.icao} → ${system.activeArrival.icao}`, mono: true },
    { label: "Altitude", value: formatFeet(system.kinematics.baroAltitudeFt).toLowerCase() },
    { label: "Speed", value: `${system.kinematics.groundSpeedKt} kt` },
    { label: "Heading", value: `${padHeading(system.kinematics.heading)}°` },
    { label: "Aircraft", value: system.flight.aircraft },
  ];

  return (
    <section className="rounded-card border border-line bg-card px-3 py-2">
      <h2 className="mb-1.5 flex items-center gap-2 text-value font-medium leading-tight text-ink">
        <Plane className="h-4 w-4 text-muted" />
        Aircraft
      </h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {cells.map((cell) => (
          <div key={cell.label} className="min-w-0">
            <dt className="text-body leading-tight text-muted">{cell.label}</dt>
            <dd className={`truncate text-value font-medium leading-tight text-ink ${cell.mono ? "font-mono" : ""}`}>{cell.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
