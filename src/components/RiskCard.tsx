import { ArrowRight, Gauge } from "lucide-react";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { RISK_WEIGHTS } from "../model/riskEngine";
import {
  CROSSWIND_LIMIT_KT,
  bandLabel,
  formatVisibility,
  severityLabel,
  toneFill,
  toneText,
} from "../lib/present";
import { formatFl } from "../lib/format";

export function RiskCard({ system }: { system: SmartSystem }) {
  const filed = system.filedRisk;
  const mitigated = system.mitigatedRisk;
  const turbulence =
    filed.severity === "NONE"
      ? "No turbulence"
      : `${severityLabel(filed.severity)} · ${formatFl(filed.lowerFl)}–${formatFl(filed.upperFl)}`;

  return (
    <section className="rounded-card border border-line bg-card px-3 py-2">
      <h2 className="mb-1 flex items-center gap-2 text-value font-medium leading-tight text-ink">
        <Gauge className="h-4 w-4 text-muted" />
        Risk
      </h2>
      <div className="flex items-center gap-3">
        <Score value={filed.composite} tone={filed.band.tone} large />
        <ArrowRight className="h-4 w-4 shrink-0 text-faint" />
        <Score value={mitigated.composite} tone={mitigated.band.tone} />
      </div>
      <div className="mt-2 space-y-1.5">
        <Bar
          label="Crosswind"
          detail={`${Math.round(filed.crosswindKt)} kt of ${CROSSWIND_LIMIT_KT} kt limit`}
          score={filed.crosswindScore}
        />
        <Bar
          label="Visibility"
          detail={`${formatVisibility(filed.visibilitySm)} · ${filed.flightCategory}`}
          score={filed.approachScore}
        />
        <Bar label="Turbulence" detail={turbulence} score={filed.turbulenceScore} />
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-body text-muted">How is this calculated?</summary>
        <p className="mt-1.5 text-body leading-snug text-muted">
          Crosswind scores {filed.crosswindScore}, visibility scores {filed.approachScore}, and turbulence scores{" "}
          {filed.turbulenceScore}. They combine as {Math.round(RISK_WEIGHTS.crosswind * 100)}% crosswind,{" "}
          {Math.round(RISK_WEIGHTS.approach * 100)}% visibility, and {Math.round(RISK_WEIGHTS.turbulence * 100)}% turbulence,
          then the result leans toward the strongest factor. This flight scores {filed.composite} out of 100 (
          {bandLabel(filed.band).toLowerCase()}). Nominal is under 35, caution is 35–64, and critical is 65 or higher.
        </p>
      </details>
    </section>
  );
}

function Score({ value, tone, large }: { value: number; tone: SmartSystem["filedRisk"]["band"]["tone"]; large?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-1">
        <span className={`font-semibold tabular-nums leading-none ${toneText(tone)} ${large ? "text-score" : "text-[36px]"}`}>
          {value}
        </span>
        <span className="text-body text-muted">/100</span>
      </div>
      <div className={`text-body font-medium ${toneText(tone)}`}>{bandLabel({ label: tone === "critical" ? "CRITICAL" : tone === "caution" ? "CAUTION" : "NOMINAL", tone, range: "" })}</div>
    </div>
  );
}

function Bar({ label, detail, score }: { label: string; detail: string; score: number }) {
  const tone = score >= 65 ? "critical" : score >= 35 ? "caution" : "nominal";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-body">
        <span className="text-muted">{label}</span>
        <span className="truncate text-ink">{detail}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${toneFill(tone)}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
    </div>
  );
}
