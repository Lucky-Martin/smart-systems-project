import type { SmartSystem } from "../hooks/useSmartSystem";
import { formatFl } from "../lib/format";
import { intersectionSpan } from "../lib/geo";
import { altitudeAtProgress } from "../lib/profile";
import { sigmetPhrase, toneHex } from "../lib/present";
import { palette } from "../../tailwind.config";

export function VerticalProfile({ system }: { system: SmartSystem }) {
  const width = 720;
  const height = 210;
  const left = 58;
  const right = 16;
  const top = 16;
  const bottom = 26;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const maxFt = 45000;
  const xOf = (progress: number) => left + progress * plotW;
  const yOf = (feet: number) => top + (1 - feet / maxFt) * plotH;
  const samples = 64;
  const escape = system.plan.flightLevel !== system.weather.filedFl;
  const sigmetOn = system.weather.sigmetEnabled && system.weather.severity !== "NONE";
  const span = sigmetOn ? intersectionSpan(system.flight.planned, system.flight.sigmet) : null;
  const routeColor = toneHex(system.mitigatedRisk.band.tone);

  const line = (flightLevel: number, verticalEscape: boolean) => {
    const points: string[] = [];
    for (let index = 0; index <= samples; index += 1) {
      const progress = index / samples;
      const feet = altitudeAtProgress({
        progress,
        departureElevationFt: system.departure.elevationFt,
        arrivalElevationFt: system.activeArrival.elevationFt,
        filedFl: verticalEscape ? system.weather.filedFl : flightLevel,
        activeFl: flightLevel,
        verticalEscape,
        hazardStart: verticalEscape ? (span?.[0] ?? null) : null,
      });
      points.push(`${xOf(progress).toFixed(1)},${yOf(feet).toFixed(1)}`);
    }
    return points.join(" ");
  };

  const bandTop = yOf(system.weather.sigmetUpperFl * 100);
  const bandBottom = yOf(system.weather.sigmetLowerFl * 100);
  const bandX = span ? xOf(span[0]) : xOf(0.18);
  const bandWidth = span ? Math.max(24, xOf(span[1]) - xOf(span[0])) : plotW * 0.64;
  const aircraftFeet = altitudeAtProgress({
    progress: system.kinematics.progress,
    departureElevationFt: system.departure.elevationFt,
    arrivalElevationFt: system.activeArrival.elevationFt,
    filedFl: system.weather.filedFl,
    activeFl: system.plan.flightLevel,
    verticalEscape: escape,
    hazardStart: escape ? (span?.[0] ?? null) : null,
  });
  const grids = [100, 200, 300, 400];
  const filedY = yOf(system.weather.filedFl * 100);
  const activeY = yOf(system.plan.flightLevel * 100);
  let filedLabelY = filedY - 8;
  let activeLabelY = activeY - 8;
  if (escape && Math.abs(filedLabelY - activeLabelY) < 16) {
    if (filedY < activeY) {
      filedLabelY -= 8;
      activeLabelY += 12;
    } else {
      activeLabelY -= 8;
      filedLabelY += 12;
    }
  }
  const labelX = width - right - 6;

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas px-3 pb-2 pt-2">
      <div className="text-body text-muted">Vertical profile</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-0 w-full flex-1" role="img" aria-label="Vertical profile">
        {grids.map((level) => (
          <g key={level}>
            <line x1={left} x2={width - right} y1={yOf(level * 100)} y2={yOf(level * 100)} stroke={palette.line} strokeWidth="1" />
            <text x="4" y={yOf(level * 100) + 4} fill={palette.muted} fontSize="12" fontFamily="Inter, sans-serif">
              FL{level}
            </text>
          </g>
        ))}
        {sigmetOn && (
          <rect
            x={bandX}
            y={bandTop}
            width={bandWidth}
            height={Math.max(8, bandBottom - bandTop)}
            fill={palette.critical}
            fillOpacity={0.22}
            stroke={palette.critical}
            strokeWidth="1"
          />
        )}
        {escape && (
          <polyline points={line(system.weather.filedFl, false)} fill="none" stroke={palette.muted} strokeWidth="1.5" strokeDasharray="6 5" />
        )}
        <polyline points={line(system.plan.flightLevel, escape)} fill="none" stroke={routeColor} strokeWidth="2.5" />
        {sigmetOn && (
          <text x={bandX + 8} y={bandTop + 16} fill={palette.ink} fontSize="12" fontFamily="Inter, sans-serif">
            {sigmetPhrase(system.weather)}
          </text>
        )}
        <text x={labelX} y={filedLabelY} textAnchor="end" fill={palette.muted} fontSize="12" fontFamily="Inter, sans-serif">
          Filed {formatFl(system.weather.filedFl)}
        </text>
        {escape && (
          <text x={labelX} y={activeLabelY} textAnchor="end" fill={palette.ink} fontSize="12" fontFamily="Inter, sans-serif">
            New {formatFl(system.plan.flightLevel)}
          </text>
        )}
        <circle cx={xOf(system.kinematics.progress)} cy={yOf(aircraftFeet)} r="4.5" fill={palette.ink} stroke={palette.canvas} strokeWidth="1.5" />
        <text x={left} y={height - 8} fill={palette.muted} fontSize="12" fontFamily="Inter, sans-serif">
          {system.departure.icao}
        </text>
        <text x={width - right} y={height - 8} textAnchor="end" fill={palette.muted} fontSize="12" fontFamily="Inter, sans-serif">
          {system.activeArrival.icao}
        </text>
      </svg>
    </div>
  );
}
