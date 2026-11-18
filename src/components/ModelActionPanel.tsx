import type { SmartSystem } from "../hooks/useSmartSystem";
import { ActionCard } from "./ActionCard";
import { AlertFeed } from "./AlertFeed";
import { RiskCard } from "./RiskCard";

export function ModelActionPanel({ system }: { system: SmartSystem }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-3">
      <RiskCard system={system} />
      <ActionCard system={system} />
      <AlertFeed system={system} />
    </div>
  );
}
