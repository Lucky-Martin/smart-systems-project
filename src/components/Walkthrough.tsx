import { useEffect, useState } from "react";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { formatFl } from "../lib/format";
import {
  actionSentence,
  bandLabel,
  CROSSWIND_LIMIT_KT,
  placeLabel,
  severityLabel,
  toneText,
} from "../lib/present";
import type { ScenarioId } from "../types/aviation";
import { FlightMap } from "./FlightMap";
import { VerticalProfile } from "./VerticalProfile";

const STEPS = ["Start", "Situation", "Data", "Model", "Action"] as const;

const SITUATIONS: Array<{
  id: Exclude<ScenarioId, "custom">;
  title: string;
  text: string;
}> = [
  {
    id: "nominal",
    title: "A normal day",
    text: "Light wind, clear sky, no turbulence.",
  },
  {
    id: "turbulence",
    title: "Turbulence on the route",
    text: "Severe turbulence sits on the planned altitude.",
  },
  {
    id: "crosswind",
    title: "Crosswind and fog",
    text: "The destination is too windy and too foggy to land.",
  },
  {
    id: "compound",
    title: "A storm cell",
    text: "A storm blocks both the route and the altitude.",
  },
];

export function Walkthrough({ system }: { system: SmartSystem }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(false);
  const atEnd = step === STEPS.length - 1;
  const nextDisabled = step === 1 && !picked;

  const goNext = () => {
    if (nextDisabled) return;
    if (atEnd) {
      setStep(1);
      return;
    }
    setStep((value) => Math.min(STEPS.length - 1, value + 1));
  };

  const goBack = () => setStep((value) => Math.max(0, value - 1));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (event.key === "ArrowRight") {
        if (step === 1 && !picked) return;
        if (step === STEPS.length - 1) setStep(1);
        else setStep((value) => Math.min(STEPS.length - 1, value + 1));
      }
      if (event.key === "ArrowLeft") setStep((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, picked]);

  return (
    <div className="flex h-screen flex-col bg-[#f6f5f2] text-zinc-900">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-6 pt-8">
        <p className="text-sm text-zinc-500">
          Step {step + 1} of {STEPS.length}
          <span className="mx-2 text-zinc-300">·</span>
          {STEPS[step]}
        </p>

        <div className="min-h-0 flex-1 overflow-y-auto py-8">
          {step === 0 && <Intro />}
          {step === 1 && (
            <Situation
              system={system}
              picked={picked}
              onPick={(id) => {
                system.applyScenario(id);
                setPicked(true);
              }}
            />
          )}
          {step === 2 && <DataStep system={system} />}
          {step === 3 && <ModelStep system={system} />}
          {step === 4 && <ActionStep system={system} />}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 bg-[#f6f5f2] py-5">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="h-11 rounded-full px-4 text-base text-zinc-600 disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={nextDisabled}
            className="h-11 rounded-full bg-zinc-900 px-6 text-base font-medium text-white disabled:opacity-30"
          >
            {atEnd ? "Try another situation" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Intro() {
  return (
    <div className="max-w-xl">
      <h1 className="text-4xl font-semibold tracking-tight">How the system works</h1>
      <p className="mt-5 text-lg leading-relaxed text-zinc-600">
        This is a small smart system for one flight. It watches the weather, decides how risky the plan is, and changes the route only when it has to.
      </p>
      <ol className="mt-8 space-y-4 text-lg">
        <li>
          <span className="font-medium">1. Data.</span>{" "}
          <span className="text-zinc-600">It reads the flight and the weather.</span>
        </li>
        <li>
          <span className="font-medium">2. Model.</span>{" "}
          <span className="text-zinc-600">It turns those readings into one risk score.</span>
        </li>
        <li>
          <span className="font-medium">3. Action.</span>{" "}
          <span className="text-zinc-600">If the score is too high, it changes the plan.</span>
        </li>
      </ol>
      <p className="mt-8 text-lg text-zinc-600">
        Click Next and pick a situation. The same three steps run every time.
      </p>
    </div>
  );
}

function Situation({
  system,
  picked,
  onPick,
}: {
  system: SmartSystem;
  picked: boolean;
  onPick: (id: Exclude<ScenarioId, "custom">) => void;
}) {
  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">Pick a situation</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-600">
        The flight is the same in every case: Finnair {system.flight.callsign}, from{" "}
        {system.departure.city} to {system.filedArrival.city}. Only the weather changes.
      </p>
      <div className="mt-8 grid gap-3">
        {SITUATIONS.map((item) => {
          const selected = picked && system.scenarioId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              className={`rounded-2xl border px-5 py-4 text-left ${
                selected
                  ? "border-zinc-900 bg-white"
                  : "border-zinc-200 bg-white/60 hover:border-zinc-400"
              }`}
            >
              <div className="text-lg font-medium">{item.title}</div>
              <div className="mt-1 text-base text-zinc-600">{item.text}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function miles(statuteMiles: number): string {
  if (statuteMiles >= 10) return "10 miles";
  if (statuteMiles < 1) return `${statuteMiles.toFixed(2)} miles`;
  const rounded = Math.round(statuteMiles * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} miles`;
}

function DataStep({ system }: { system: SmartSystem }) {
  const weather = system.weather;
  const turbulence =
    weather.sigmetEnabled && weather.severity !== "NONE"
      ? `${severityLabel(weather.severity)} turbulence from ${formatFl(weather.sigmetLowerFl)} to ${formatFl(weather.sigmetUpperFl)}.`
      : "No turbulence on the route.";

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">1. Data</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-600">
        The system starts by reading three things: the flight plan, the weather at the destination, and whether there is turbulence on the way.
      </p>
      <dl className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
        <Fact
          label="Flight"
          value={`${system.flight.callsign}, ${system.departure.city} to ${system.filedArrival.city}`}
          note={`Planned height ${formatFl(weather.filedFl)}, about ${(weather.filedFl * 100).toLocaleString("en-US")} ft.`}
        />
        <Fact
          label="Airport weather"
          value={`${Math.round(weather.windSpeedKt)} ${Math.round(weather.windSpeedKt) === 1 ? "knot" : "knots"} of wind, ${miles(weather.visibilitySm)} of visibility`}
          note={
            weather.ceilingFt >= 10000
              ? "No low cloud."
              : `Cloud base at ${Math.round(weather.ceilingFt).toLocaleString("en-US")} ft.`
          }
        />
        <Fact
          label="Route weather"
          value={turbulence}
          note="This is the weather the aircraft would actually fly through."
        />
      </dl>
    </div>
  );
}

function ModelStep({ system }: { system: SmartSystem }) {
  const risk = system.filedRisk;
  const turbulence =
    risk.severity === "NONE"
      ? "None on this route."
      : risk.sigmetIntersects && risk.inVerticalBand
        ? `${severityLabel(risk.severity)}. The aircraft would fly through it.`
        : `${severityLabel(risk.severity)}, but the aircraft stays clear of it.`;

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">2. Model</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-600">
        The model turns those readings into one score from 0 to 100. It looks at the wind across the runway, how well the pilot can see, and turbulence. The worst problem counts the most.
      </p>
      <div className="mt-8 flex items-end gap-4">
        <div className={`text-7xl font-semibold leading-none tabular-nums ${toneText(risk.band.tone)}`}>
          {risk.composite}
        </div>
        <div className="pb-2 text-lg text-zinc-600">out of 100 · {bandLabel(risk.band)}</div>
      </div>
      <p className="mt-3 text-lg text-zinc-600">
        {risk.band.tone === "critical"
          ? "This is high. The system has to change the plan."
          : risk.band.tone === "caution"
            ? "This is a warning. The plan is still usable, but it is close to a problem."
            : "This is low. The original plan can stay."}
      </p>
      <dl className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
        <Fact
          label="Crosswind"
          value={`${Math.round(risk.crosswindKt)} knots, limit ${CROSSWIND_LIMIT_KT} knots`}
          note={
            risk.crosswindKt >= CROSSWIND_LIMIT_KT
              ? "The wind is too strong to land on this runway."
              : "The wind is within a normal landing limit."
          }
        />
        <Fact
          label="Visibility"
          value={miles(risk.visibilitySm)}
          note={
            risk.flightCategory === "LIFR" || risk.flightCategory === "IFR"
              ? "The pilot cannot see well enough for a normal landing."
              : "The pilot can see well enough to land."
          }
        />
        <Fact
          label="Turbulence"
          value={turbulence}
          note="Only counts fully when the route and the altitude both meet it."
        />
      </dl>
    </div>
  );
}

function actionExplanation(system: SmartSystem): string {
  const level = formatFl(system.plan.flightLevel);
  const city = system.activeArrival.city;
  const filed = system.filedArrival.city;
  switch (system.plan.type) {
    case "MAINTAIN":
      return `The score is low, so nothing changes. The aircraft continues to ${city} at ${level}.`;
    case "FLIGHT_LEVEL_CHANGE":
      return `The planned height is inside the turbulence, so the aircraft descends to ${level}. The path over the ground stays the same.`;
    case "LATERAL_BYPASS":
      return `Turbulence blocks the route, so the aircraft flies around it and stays at ${level}.`;
    case "LATERAL_AND_DESCENT":
      return `The storm blocks both the route and the height, so the aircraft flies around it and descends to ${level}.`;
    case "DIVERT":
    case "DIVERT_AND_AVOID":
      return system.plan.flightLevel === system.weather.filedFl
        ? `${filed} is not safe to land at, so the aircraft goes to ${city} instead.`
        : `${filed} is not safe, so the aircraft goes to ${city} and changes height to ${level}.`;
    default:
      return actionSentence(system.plan, system.weather.filedFl, city);
  }
}

function ActionStep({ system }: { system: SmartSystem }) {
  const sameLevel = system.plan.flightLevel === system.weather.filedFl;
  const sameAirport = system.plan.arrivalIcao === system.flight.arrivalIcao;
  const turbulenceOn = system.weather.sigmetEnabled && system.weather.severity !== "NONE";
  const showProfile = !sameLevel || turbulenceOn;
  const profileNote =
    !sameLevel && turbulenceOn
      ? "Side view of the flight. The dashed line is the planned height. The solid line drops under the red turbulence band."
      : !sameLevel
        ? "Side view of the flight. The dashed line is the planned height. The solid line is the new one."
        : "Side view of the flight. The red band is the turbulence. The aircraft stays at the planned height.";

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">3. Action</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-600">
        The last step uses the score. A low score keeps the original plan. A high score changes the height, the route, or the destination. The system then scores the new plan again.
      </p>
      <p className="mt-6 text-2xl font-medium leading-snug">{actionExplanation(system)}</p>
      <dl className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
        <Compare
          label="Destination"
          before={placeLabel(system.filedArrival.city, system.filedArrival.icao)}
          after={placeLabel(system.activeArrival.city, system.activeArrival.icao)}
          changed={!sameAirport}
        />
        <Compare
          label="Altitude"
          before={formatFl(system.weather.filedFl)}
          after={formatFl(system.plan.flightLevel)}
          changed={!sameLevel}
        />
        <Compare
          label="Risk"
          before={`${system.filedRisk.composite} ${bandLabel(system.filedRisk.band)}`}
          after={`${system.mitigatedRisk.composite} ${bandLabel(system.mitigatedRisk.band)}`}
          changed={system.filedRisk.composite !== system.mitigatedRisk.composite}
        />
      </dl>
      {showProfile && (
        <>
          <div className="mt-6 h-56 overflow-hidden rounded-2xl border border-zinc-200">
            <VerticalProfile system={system} />
          </div>
          <p className="mt-3 text-sm text-zinc-500">{profileNote}</p>
        </>
      )}
      <div className="mt-6 h-72 overflow-hidden rounded-2xl border border-zinc-200">
        <FlightMap system={system} />
      </div>
      <p className="mt-3 text-sm text-zinc-500">
        The solid line is the plan the system is using now. A dashed line is the original plan, shown when it was replaced.
      </p>
    </div>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
      <dt className="text-base text-zinc-500">{label}</dt>
      <dd>
        <div className="text-lg font-medium">{value}</div>
        <div className="text-base text-zinc-600">{note}</div>
      </dd>
    </div>
  );
}

function Compare({
  label,
  before,
  after,
  changed,
}: {
  label: string;
  before: string;
  after: string;
  changed: boolean;
}) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]">
      <dt className="text-base text-zinc-500">{label}</dt>
      <dd className="text-lg">
        {changed ? (
          <>
            <span className="text-zinc-400 line-through">{before}</span>
            <span className="mx-2 text-zinc-300">→</span>
            <span className="font-medium">{after}</span>
          </>
        ) : (
          <span className="font-medium">{after}</span>
        )}
      </dd>
    </div>
  );
}
