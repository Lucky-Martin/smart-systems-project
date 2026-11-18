import { useEffect, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { airportByIcao } from "../data/airports";
import { routesCoincide } from "../lib/geo";
import { buildMetar, decodeConditions } from "../lib/metar";
import { sigmetPhrase, toneHex } from "../lib/present";
import { palette } from "../../tailwind.config";
import type { Airport, LatLngTuple } from "../types/aviation";

type MarkerKind = "departure" | "destination" | "selected" | "candidate";

const KIND_COLOR: Record<MarkerKind, string> = {
  departure: "#f9fafb",
  destination: palette.accent,
  selected: palette.nominal,
  candidate: palette.muted,
};

function labelPlacement(
  airport: { lat: number; lon: number },
  others: Array<{ lat: number; lon: number }>,
): { direction: "top" | "bottom" | "left" | "right"; offset: [number, number] } {
  let nearest: { lat: number; lon: number; distance: number } | null = null;
  for (const other of others) {
    const dLat = airport.lat - other.lat;
    const dLon = (airport.lon - other.lon) * Math.cos((airport.lat * Math.PI) / 180);
    const distance = dLat * dLat + dLon * dLon;
    if (!nearest || distance < nearest.distance) nearest = { lat: other.lat, lon: other.lon, distance };
  }
  if (!nearest || nearest.distance > 25) return { direction: "top", offset: [0, -14] };
  const dLat = airport.lat - nearest.lat;
  const dLon = airport.lon - nearest.lon;
  if (Math.abs(dLon) >= Math.abs(dLat)) {
    return dLon >= 0 ? { direction: "right", offset: [12, 0] } : { direction: "left", offset: [-12, 0] };
  }
  return dLat >= 0 ? { direction: "top", offset: [0, -14] } : { direction: "bottom", offset: [0, 14] };
}

function FitBounds({ points, fitKey }: { points: LatLngTuple[]; fitKey: string }) {
  const map = useMap();
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    const fit = () => {
      const current = pointsRef.current;
      if (current.length < 2) return;
      map.invalidateSize();
      map.fitBounds(
        L.latLngBounds(current.map(([lat, lon]) => [lat, lon])),
        { paddingTopLeft: [56, 36], paddingBottomRight: [36, 72], maxZoom: 8, animate: false },
      );
    };
    fit();
    const observer = new ResizeObserver(() => fit());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [fitKey, map]);

  return null;
}

function Basemap({ onSource }: { onSource: (source: "carto" | "esri") => void }) {
  const [source, setSource] = useState<"carto" | "esri">("esri");

  useEffect(() => {
    onSource(source);
  }, [onSource, source]);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const response = await fetch("https://a.basemaps.cartocdn.com/dark_nolabels/4/8/5.png");
        const etag = response.headers.get("etag") ?? "";
        const length = Number(response.headers.get("content-length") ?? "0");
        const usable = response.ok && !etag.includes("wm-") && length >= 4000;
        if (!cancelled && usable) setSource("carto");
      } catch {
        if (!cancelled) setSource("esri");
      }
    };
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  if (source === "carto") {
    return (
      <TileLayer
        attribution="&copy; OpenStreetMap &copy; CARTO"
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
        eventHandlers={{ tileerror: () => setSource("esri") }}
      />
    );
  }
  return (
    <TileLayer
      attribution="Tiles &copy; Esri"
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      maxZoom={16}
    />
  );
}

function aircraftIcon(heading: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "aircraft-marker",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;transform:rotate(${heading}deg)"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="${color}" d="M12 2.2 13.8 10.4 21.5 12 13.8 13.6 12.8 21.6 12 18.8 11.2 21.6 10.2 13.6 2.5 12 10.2 10.4Z"/></svg></div>`,
  });
}

function AirportDot({
  airport,
  kind,
  conditions,
  placement,
}: {
  airport: Airport;
  kind: MarkerKind;
  conditions: SmartSystem["weather"] | Airport["climate"];
  placement: { direction: "top" | "bottom" | "left" | "right"; offset: [number, number] };
}) {
  const decoded = decodeConditions(conditions);
  const metar = buildMetar(airport.icao, conditions, airport.lat, new Date());
  return (
    <CircleMarker
      center={[airport.lat, airport.lon]}
      radius={kind === "selected" ? 6 : 5}
      pathOptions={{ color: palette.canvas, weight: 1, fillColor: KIND_COLOR[kind], fillOpacity: 1 }}
    >
      <Tooltip permanent direction={placement.direction} offset={placement.offset} className="airport-label">
        <span>{airport.icao}</span>
      </Tooltip>
      <Popup>
        <div className="space-y-1">
          <div className="text-value font-semibold text-ink">
            {airport.city} ({airport.icao})
          </div>
          <div>{airport.name}</div>
          <div className="text-muted">
            {decoded.wind} · {decoded.visibility} · {decoded.ceiling}
          </div>
          <div className="font-medium">{decoded.category}</div>
          <div className="font-mono text-body leading-snug text-muted">{metar}</div>
        </div>
      </Popup>
    </CircleMarker>
  );
}

export function FlightMap({ system }: { system: SmartSystem }) {
  const [basemap, setBasemap] = useState<"carto" | "esri">("esri");
  const sigmetOn = system.weather.sigmetEnabled && system.weather.severity !== "NONE";
  const routeColor = toneHex(system.mitigatedRisk.band.tone);
  const showFiled = Boolean(system.plan.blockedRoute && !routesCoincide(system.plan.blockedRoute, system.plan.route));
  const sigmetColor = system.weather.severity === "MODERATE" ? palette.caution : palette.critical;

  const markers: Array<{ airport: Airport; kind: MarkerKind; conditions: SmartSystem["weather"] | Airport["climate"] }> = [
    { airport: system.departure, kind: "departure", conditions: system.departure.climate },
    { airport: system.filedArrival, kind: "destination", conditions: system.weather },
  ];
  const seen = new Set([system.departure.icao, system.filedArrival.icao]);
  const extra = new Set<string>();
  if (system.plan.diverts) extra.add(system.plan.arrivalIcao);
  if (system.plan.rankings[0]) extra.add(system.plan.rankings[0].icao);
  for (const icao of extra) {
    if (seen.has(icao)) continue;
    seen.add(icao);
    const airport = airportByIcao(icao);
    markers.push({
      airport,
      kind: system.plan.diverts && system.plan.arrivalIcao === icao ? "selected" : "candidate",
      conditions: airport.climate,
    });
  }

  const fitPoints: LatLngTuple[] = [
    ...system.plan.route,
    ...system.flight.planned,
    ...markers.map((item) => [item.airport.lat, item.airport.lon] as LatLngTuple),
    ...(sigmetOn ? system.flight.sigmet : []),
  ];
  const fitKey = `${system.flight.id}|${system.plan.signature}`;

  return (
    <div className={`relative h-full w-full ${basemap === "esri" ? "basemap-muted" : ""}`}>
      <MapContainer center={[system.departure.lat, system.departure.lon]} zoom={6} zoomControl={false} className="h-full w-full">
        <ZoomControl position="bottomright" />
        <Basemap onSource={setBasemap} />
        <FitBounds points={fitPoints} fitKey={fitKey} />
        {sigmetOn && (
          <Polygon
            positions={system.flight.sigmet}
            pathOptions={{ color: sigmetColor, weight: 1, fillColor: sigmetColor, fillOpacity: 0.22 }}
          />
        )}
        {showFiled && system.plan.blockedRoute && (
          <Polyline
            positions={system.plan.blockedRoute}
            pathOptions={{ color: palette.faint, weight: 1.5, opacity: 0.95, dashArray: "6 7" }}
          />
        )}
        <Polyline positions={system.plan.route} pathOptions={{ color: routeColor, weight: 3, opacity: 1 }} />
        {markers.map((item) => (
          <AirportDot
            key={item.airport.icao}
            airport={item.airport}
            kind={item.kind}
            conditions={item.conditions}
            placement={labelPlacement(
              item.airport,
              markers.filter((other) => other.airport.icao !== item.airport.icao).map((other) => other.airport),
            )}
          />
        ))}
        <Marker
          position={[system.kinematics.lat, system.kinematics.lon]}
          icon={aircraftIcon(system.kinematics.heading, routeColor)}
          zIndexOffset={800}
        >
          <Tooltip permanent direction="right" offset={[12, 0]} className="plane-tag">
            <span>{system.flight.callsign}</span>
          </Tooltip>
          <Popup>
            <div>
              <div className="font-mono font-medium">{system.flight.callsign}</div>
              <div>
                {system.kinematics.groundSpeedKt} kt · heading {Math.round(system.kinematics.heading)}°
              </div>
              <div>{Math.round(system.kinematics.baroAltitudeFt).toLocaleString("en-US")} ft</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {sigmetOn && (
        <div className="pointer-events-none absolute left-3 top-3 z-[650]">
          <span className="sigmet-pill">{sigmetPhrase(system.weather)}</span>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-[650] rounded-lg border border-line bg-canvas/95 px-3 py-2 text-body text-muted">
        <div className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 rounded-full" style={{ background: routeColor }} />
          Active route
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block w-6 border-t border-dashed" style={{ borderColor: palette.faint }} />
          Filed route
        </div>
        <div className={`mt-1 flex items-center gap-2 ${sigmetOn ? "" : "opacity-50"}`}>
          <span
            className="inline-block h-2 w-6 rounded-sm border"
            style={{
              background: sigmetOn ? "rgba(239,68,68,0.28)" : "transparent",
              borderColor: sigmetOn ? palette.critical : palette.faint,
            }}
          />
          Turbulence
        </div>
      </div>
    </div>
  );
}
