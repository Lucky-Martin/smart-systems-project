import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { SCENARIO_UI } from "../lib/present";
import type { ScenarioId } from "../types/aviation";

const SCENARIO_ORDER = ["nominal", "turbulence", "crosswind", "compound"] as const;

export function Header({
  system,
  presenting,
  onTogglePresent,
  onScenario,
}: {
  system: SmartSystem;
  presenting: boolean;
  onTogglePresent: () => void;
  onScenario: (id: Exclude<ScenarioId, "custom">) => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-canvas px-4">
      <div className="w-44 shrink-0">
        <div className="text-value font-semibold leading-tight text-ink">Route Advisor</div>
        <div className="text-body text-muted">Weather and turbulence</div>
      </div>

      <div className="flex min-w-0 flex-1 justify-center">
        <div className="grid w-full max-w-3xl grid-cols-4 gap-1 rounded-card border border-line bg-card p-1">
          {SCENARIO_ORDER.map((id) => {
            const active = system.scenarioId === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onScenario(id)}
                className={`h-8 rounded-lg px-2 text-body font-medium ${
                  active ? "bg-accent text-white" : "text-muted hover:bg-white/5 hover:text-ink"
                }`}
              >
                {SCENARIO_UI[id].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-body text-muted xl:inline" title="Keys 1–4 run a scenario. Space plays or pauses.">
          1–4 · Space
        </span>
        <button
          type="button"
          aria-pressed={presenting}
          onClick={onTogglePresent}
          className={`h-8 rounded-lg border px-3 text-body font-medium ${
            presenting ? "border-accent bg-accent text-white" : "border-line bg-card text-ink hover:bg-white/5"
          }`}
        >
          Present
        </button>
        <button
          type="button"
          onClick={system.togglePlay}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-card px-3 text-body font-medium text-ink hover:bg-white/5"
        >
          {system.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {system.playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={system.toggleMute}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-card text-ink hover:bg-white/5"
          aria-label={system.muted ? "Unmute alert tone" : "Mute alert tone"}
        >
          {system.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
