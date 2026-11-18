import { useEffect, useMemo, useRef, useState } from "react";
import { airportByIcao, AIRPORTS } from "../data/airports";
import { flightById, FLIGHTS } from "../data/flights";
import { materializeScenario } from "../data/scenarios";
import { playAlertTone } from "../lib/alertSound";
import { formatFl, formatUtc } from "../lib/format";
import { bboxAround, intersectionSpan, offsetEast, pointAlongRoute, routeDistanceNm, routesCoincide } from "../lib/geo";
import { buildMetar, buildTaf, parseMetarToTerminal } from "../lib/metar";
import { altitudeAtProgress } from "../lib/profile";
import { amendedRouteStats, evaluateAmendedRisk, filedRouteStats, planAction } from "../model/actionEngine";
import { groundSpeedKt } from "../model/performance";
import { evaluateRisk } from "../model/riskEngine";
import { loadAviationFeeds, simulatedSurveillance } from "../services/aviationDataService";
import type {
  DispatchAlert,
  FeedStatus,
  FlightPlan,
  ScenarioId,
  WeatherInjection,
} from "../types/aviation";

const INITIAL_FEED: FeedStatus = {
  opensky: "loading",
  weather: "loading",
  openskyDetail: "Contacting OpenSky Network…",
  weatherDetail: "Contacting AviationWeather.gov…",
  fetchedAt: null,
  aircraft: [],
  metars: [],
  sigmetReports: null,
};

function sigmetBulletin(flight: FlightPlan, weather: WeatherInjection): string {
  if (!weather.sigmetEnabled || weather.severity === "NONE") {
    return "SIGMET NIL — NO TURBULENCE VOLUME ARMED ON THE FILED TRACK";
  }
  return `${flight.sigmetName} ${weather.severity} TURB ${formatFl(weather.sigmetLowerFl)}-${formatFl(weather.sigmetUpperFl)} STNR POLYGON. MODEL INPUT FROM THE INJECTION ENGINE.`;
}

export function useSmartSystem() {
  const initialFlight = flightById("FIN312");
  const initialArrival = airportByIcao(initialFlight.arrivalIcao);
  const [flightId, setFlightId] = useState(initialFlight.id);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("nominal");
  const [weather, setWeather] = useState<WeatherInjection>(() =>
    materializeScenario("nominal", initialArrival.runway.heading, initialFlight.cruiseFl),
  );
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0.22);
  const [now, setNow] = useState(() => new Date());
  const [feed, setFeed] = useState<FeedStatus>(INITIAL_FEED);
  const [alerts, setAlerts] = useState<DispatchAlert[]>([]);
  const [openAlertId, setOpenAlertId] = useState<string | null>(null);
  const [ingestNote, setIngestNote] = useState<string | null>(null);

  const playingRef = useRef(playing);
  const mutedRef = useRef(muted);
  const progressRef = useRef(progress);
  const weatherRef = useRef(weather);
  const signatureRef = useRef<string | null>(null);
  const storyRef = useRef<string | null>(null);
  playingRef.current = playing;
  mutedRef.current = muted;
  progressRef.current = progress;
  weatherRef.current = weather;

  const flight = flightById(flightId);
  const departure = airportByIcao(flight.departureIcao);
  const filedArrival = airportByIcao(flight.arrivalIcao);

  const polygon = weather.sigmetEnabled && weather.severity !== "NONE" ? flight.sigmet : null;

  const filedRisk = useMemo(
    () =>
      evaluateRisk({
        terminal: weather,
        runwayId: filedArrival.runway.id,
        runwayHeading: filedArrival.runway.heading,
        route: flight.planned,
        polygon,
        severity: polygon ? weather.severity : "NONE",
        lowerFl: weather.sigmetLowerFl,
        upperFl: weather.sigmetUpperFl,
        flightLevel: weather.filedFl,
      }),
    [weather, filedArrival, flight, polygon],
  );

  const plan = useMemo(
    () => planAction(flight, weather, filedRisk, AIRPORTS),
    [flight, weather, filedRisk],
  );

  const mitigatedRisk = useMemo(
    () => evaluateAmendedRisk(flight, weather, plan, AIRPORTS),
    [flight, weather, plan],
  );

  const filedStats = useMemo(
    () => filedRouteStats(flight, weather.filedFl),
    [flight, weather.filedFl],
  );
  const amendedStats = useMemo(() => amendedRouteStats(flight, plan), [flight, plan]);
  const activeArrival = airportByIcao(plan.arrivalIcao);

  const blockedDisplay = useMemo(() => {
    if (!plan.blockedRoute) return null;
    if (routesCoincide(plan.blockedRoute, plan.route)) {
      const kilometers = Math.max(8, routeDistanceNm(plan.route) * 0.016 * 1.852);
      return offsetEast(plan.blockedRoute, kilometers);
    }
    return plan.blockedRoute;
  }, [plan]);

  const destinationMetar = useMemo(
    () => buildMetar(filedArrival.icao, weather, filedArrival.lat, now),
    [filedArrival, weather, now],
  );
  const destinationTaf = useMemo(
    () => buildTaf(filedArrival.icao, weather, now),
    [filedArrival, weather, now],
  );
  const departureMetar = useMemo(
    () => buildMetar(departure.icao, departure.climate, departure.lat, now),
    [departure, now],
  );
  const sigmetText = useMemo(() => sigmetBulletin(flight, weather), [flight, weather]);

  const hazardStart = useMemo(() => {
    if (!polygon) return null;
    return intersectionSpan(plan.route, polygon)?.[0] ?? null;
  }, [plan.route, polygon]);

  const kinematics = useMemo(() => {
    const point = pointAlongRoute(plan.route, progress);
    const profile = {
      departureElevationFt: departure.elevationFt,
      arrivalElevationFt: activeArrival.elevationFt,
      filedFl: weather.filedFl,
      activeFl: plan.flightLevel,
      verticalEscape: plan.flightLevel !== weather.filedFl,
      hazardStart,
    };
    const altitude = altitudeAtProgress({ ...profile, progress });
    const earlier = altitudeAtProgress({ ...profile, progress: Math.max(0, progress - 0.01) });
    const minutes = Math.max(amendedStats.minutes, 1) * 0.01;
    return {
      lat: point.lat,
      lon: point.lon,
      heading: point.heading,
      groundSpeedKt: groundSpeedKt(plan.flightLevel),
      baroAltitudeFt: altitude,
      verticalSpeedFpm: (altitude - earlier) / minutes,
      progress,
    };
  }, [plan, progress, departure.elevationFt, activeArrival.elevationFt, weather.filedFl, amendedStats.minutes, hazardStart]);

  const snapshotRef = useRef({
    flight,
    plan,
    filedRisk,
    mitigatedRisk,
    destinationMetar,
    destinationTaf,
    sigmetText,
    filedStats,
    amendedStats,
  });
  snapshotRef.current = {
    flight,
    plan,
    filedRisk,
    mitigatedRisk,
    destinationMetar,
    destinationTaf,
    sigmetText,
    filedStats,
    amendedStats,
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let accumulator = 0;
    const tick = (time: number) => {
      const delta = time - last;
      last = time;
      if (playingRef.current) {
        progressRef.current = (progressRef.current + delta / 78000) % 1;
        accumulator += delta;
        if (accumulator > 120) {
          accumulator = 0;
          setProgress(progressRef.current);
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const previous = signatureRef.current;
      const snap = snapshotRef.current;
      signatureRef.current = snap.plan.signature;
      if (previous === null || previous === snap.plan.signature) return;
      const wasAction = !previous.startsWith("MAINTAIN");
      const isAction = snap.plan.type !== "MAINTAIN";
      if (!wasAction && !isAction) return;
      const cleared = !isAction;
      const alert: DispatchAlert = {
        id: crypto.randomUUID(),
        createdAt: formatUtc(new Date()),
        createdMs: Date.now(),
        flightId: snap.flight.id,
        priority: cleared ? "ROUTINE" : snap.plan.priority,
        title: cleared ? "HAZARD CLEARED — FILED RELEASE RESTORED" : `ACTION EXECUTED — ${snap.plan.summary}`,
        summary: cleared
          ? "Composite risk dropped below the action threshold. The map restored the filed route and flight level."
          : snap.plan.detail,
        acknowledged: false,
        filedRisk: snap.filedRisk,
        mitigatedRisk: snap.mitigatedRisk,
        plan: snap.plan,
        metar: snap.destinationMetar,
        taf: snap.destinationTaf,
        sigmetText: snap.sigmetText,
        filedStats: snap.filedStats,
        amendedStats: snap.amendedStats,
      };
      const storyKey = [
        alert.flightId,
        alert.title,
        alert.plan.arrivalIcao,
        alert.plan.flightLevel,
        alert.filedRisk.composite,
        alert.mitigatedRisk.composite,
      ].join("|");
      if (storyRef.current === storyKey) return;
      storyRef.current = storyKey;
      setAlerts((current) => [alert, ...current].slice(0, 12));
      if (!mutedRef.current) playAlertTone(alert.priority);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [plan.signature]);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      const midpoint = pointAlongRoute(flight.planned, 0.5);
      const bbox = bboxAround(midpoint.lat, midpoint.lon, 5, 8);
      const icaos = [flight.departureIcao, flight.arrivalIcao, ...flight.alternateIcaos];
      const fallbackAircraft = simulatedSurveillance(midpoint.lat, midpoint.lon, Date.now());
      const fallbackMetars = icaos.map((icao) => {
        const airport = airportByIcao(icao);
        const conditions = icao === flight.arrivalIcao ? weatherRef.current : airport.climate;
        return {
          icao,
          raw: buildMetar(icao, conditions, airport.lat, new Date()),
          source: "simulated" as const,
        };
      });
      try {
        const next = await loadAviationFeeds({ bbox, icaos, fallbackAircraft, fallbackMetars });
        if (!cancelled) setFeed(next);
      } catch {
        if (!cancelled) {
          setFeed({
            opensky: "fallback",
            weather: "fallback",
            openskyDetail: "Feed coordinator failed. Surveillance is simulated.",
            weatherDetail: "Feed coordinator failed. METAR is simulated.",
            fetchedAt: new Date().toISOString(),
            aircraft: fallbackAircraft,
            metars: fallbackMetars,
            sigmetReports: null,
          });
        }
      }
    };
    void pull();
    const timer = window.setInterval(() => void pull(), 45000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [flight]);

  const patchWeather = (partial: Partial<WeatherInjection>) => {
    setScenarioId("custom");
    setWeather((current) => {
      const next = { ...current, ...partial };
      next.windDirectionDeg = ((next.windDirectionDeg % 360) + 360) % 360;
      next.visibilitySm = Math.min(10, Math.max(0.2, Math.round(next.visibilitySm * 100) / 100));
      next.ceilingFt = Math.min(10000, Math.max(100, Math.round(next.ceilingFt / 50) * 50));
      next.filedFl = Math.min(410, Math.max(200, Math.round(next.filedFl / 10) * 10));
      next.sigmetLowerFl = Math.min(430, Math.max(180, Math.round(next.sigmetLowerFl / 10) * 10));
      next.sigmetUpperFl = Math.min(450, Math.max(200, Math.round(next.sigmetUpperFl / 10) * 10));
      if (next.sigmetUpperFl <= next.sigmetLowerFl) next.sigmetUpperFl = Math.min(450, next.sigmetLowerFl + 20);
      return next;
    });
  };

  const applyScenario = (id: Exclude<ScenarioId, "custom">) => {
    const arrival = airportByIcao(flightById(flightId).arrivalIcao);
    const selected = flightById(flightId);
    setScenarioId(id);
    setWeather(materializeScenario(id, arrival.runway.heading, selected.cruiseFl));
  };

  const selectFlight = (id: string) => {
    const selected = flightById(id);
    const arrival = airportByIcao(selected.arrivalIcao);
    setFlightId(id);
    if (scenarioId !== "custom") {
      setWeather(materializeScenario(scenarioId, arrival.runway.heading, selected.cruiseFl));
    }
  };

  const ingestLiveMetar = () => {
    const live = feed.metars.find((item) => item.icao === filedArrival.icao && item.source === "aviationweather");
    if (!live) {
      setIngestNote("No live destination METAR is available to ingest.");
      return;
    }
    const parsed = parseMetarToTerminal(live.raw);
    if (!parsed) {
      setIngestNote("Live METAR did not contain wind, visibility, or ceiling groups.");
      return;
    }
    patchWeather(parsed);
    setIngestNote(`Ingested live ${filedArrival.icao} METAR into the sensor model.`);
  };

  const acknowledge = (id: string) => {
    setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, acknowledged: true } : alert)));
  };

  const openAlert = alerts.find((alert) => alert.id === openAlertId) ?? null;

  return {
    flights: FLIGHTS,
    now,
    flight,
    departure,
    filedArrival,
    activeArrival,
    weather,
    scenarioId,
    playing,
    muted,
    kinematics,
    filedRisk,
    mitigatedRisk,
    plan,
    filedStats,
    amendedStats,
    blockedDisplay,
    feed,
    alerts,
    openAlert,
    ingestNote,
    destinationMetar,
    destinationTaf,
    departureMetar,
    sigmetText,
    selectFlight,
    applyScenario,
    patchWeather,
    togglePlay: () => setPlaying((value) => !value),
    toggleMute: () => setMuted((value) => !value),
    setOpenAlertId,
    acknowledge,
    ingestLiveMetar,
  };
}

export type SmartSystem = ReturnType<typeof useSmartSystem>;
