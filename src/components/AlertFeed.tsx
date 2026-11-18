import { Bell } from "lucide-react";
import { airportByIcao } from "../data/airports";
import type { SmartSystem } from "../hooks/useSmartSystem";
import { alertClock, alertSentence, latestAlerts } from "../lib/present";
import type { AlertPriority } from "../types/aviation";

export function AlertFeed({ system }: { system: SmartSystem }) {
  const alerts = latestAlerts(system.alerts.filter((alert) => alert.flightId === system.flight.id));
  const latest = alerts[0];

  return (
    <section className="rounded-card border border-line bg-card px-3 py-2">
      <h2 className="mb-1.5 flex items-center gap-2 text-value font-medium leading-tight text-ink">
        <Bell className="h-4 w-4 text-muted" />
        Alerts
      </h2>
      {alerts.length === 0 ? (
        <p className="text-body text-muted">No alerts yet. Choose a scenario to see the system respond.</p>
      ) : (
        <div className="space-y-1.5">
          {alerts.map((alert) => {
            const city = airportByIcao(alert.plan.arrivalIcao).city;
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => system.setOpenAlertId(alert.id)}
                className="w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-left hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-body tabular-nums text-muted">{alertClock(alert.createdAt)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${pillClass(alert.priority)}`}>
                    {pillLabel(alert.priority)}
                  </span>
                </div>
                <p className="mt-0.5 text-body leading-snug text-ink">{alertSentence(alert, city)}</p>
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        disabled={!latest}
        onClick={() => latest && system.setOpenAlertId(latest.id)}
        className="mt-2 h-9 w-full rounded-lg bg-accent text-body font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Open dispatch briefing
      </button>
    </section>
  );
}

function pillLabel(priority: AlertPriority): string {
  if (priority === "EMERGENCY") return "Emergency";
  if (priority === "PRIORITY") return "Priority";
  return "Routine";
}

function pillClass(priority: AlertPriority): string {
  if (priority === "EMERGENCY") return "bg-critical/15 text-critical";
  if (priority === "PRIORITY") return "bg-caution/15 text-caution";
  return "bg-white/10 text-muted";
}
