import { useEffect, useState } from "react";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { actionPipeline, dataPipeline, modelPipeline, toneText } from "../lib/present";

export function PipelineStrip({ system, pulse }: { system: SmartSystem; pulse: number }) {
  const [lit, setLit] = useState(3);
  const model = modelPipeline(system.filedRisk);

  useEffect(() => {
    if (pulse === 0) return;
    setLit(0);
    const first = window.setTimeout(() => setLit(1), 40);
    const second = window.setTimeout(() => setLit(2), 340);
    const third = window.setTimeout(() => setLit(3), 640);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.clearTimeout(third);
    };
  }, [pulse]);

  const steps: Array<{ name: string; body: string; accent: string | null; accentClass: string }> = [
    { name: "Data", body: dataPipeline(system.weather), accent: null, accentClass: "" },
    { name: "Model", body: model.prefix, accent: model.band, accentClass: toneText(model.tone) },
    { name: "Action", body: actionPipeline(system.plan, system.weather.filedFl), accent: null, accentClass: "" },
  ];

  return (
    <div className="grid h-16 shrink-0 grid-cols-3 border-b border-line bg-canvas">
      {steps.map((step, index) => {
        const on = lit > index;
        return (
          <div
            key={step.name}
            className={`flex min-w-0 items-center gap-3 px-4 transition-colors duration-300 ${
              index > 0 ? "border-l border-line" : ""
            } ${on ? "bg-card" : "bg-canvas"}`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-body font-semibold transition-colors duration-300 ${
                on ? "bg-accent text-white" : "bg-line text-muted"
              }`}
            >
              {index + 1}
            </span>
            <div className={`min-w-0 transition-opacity duration-300 ${on ? "opacity-100" : "opacity-40"}`}>
              <div className="text-body text-muted">{step.name}</div>
              <div className="truncate text-value text-ink">
                {step.body}
                {step.accent ? <span className={`ml-1.5 font-medium ${step.accentClass}`}>{step.accent}</span> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
