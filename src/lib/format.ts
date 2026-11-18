const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function formatUtc(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${day}${MONTHS[date.getUTCMonth()]} ${hours}:${minutes}:${seconds}Z`;
}

export function metarTimeGroup(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}${hours}${minutes}Z`;
}

export function formatFl(flightLevel: number): string {
  return `FL${String(Math.round(flightLevel)).padStart(3, "0")}`;
}

export function padHeading(deg: number): string {
  const wrapped = ((Math.round(deg) % 360) + 360) % 360;
  return String(wrapped).padStart(3, "0");
}

export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (hours <= 0) return `${remain} MIN`;
  return `${hours}H ${String(remain).padStart(2, "0")}M`;
}

export function formatSigned(value: number, unit: string): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} ${unit}`;
}

export function formatFeet(feet: number): string {
  return `${Math.round(feet).toLocaleString("en-US")} FT`;
}

export function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}${ns} ${Math.abs(lon).toFixed(3)}${ew}`;
}
