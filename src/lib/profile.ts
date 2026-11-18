export interface ProfileSampleInput {
  progress: number;
  departureElevationFt: number;
  arrivalElevationFt: number;
  filedFl: number;
  activeFl: number;
  verticalEscape: boolean;
  hazardStart: number | null;
}

function lerp(from: number, to: number, amount: number): number {
  const t = Math.min(1, Math.max(0, amount));
  return from + (to - from) * t;
}

/** Barometric altitude along the amended profile, in feet. */
export function altitudeAtProgress(input: ProfileSampleInput): number {
  const progress = Math.min(1, Math.max(0, input.progress));
  const filedFt = input.filedFl * 100;
  const activeFt = input.activeFl * 100;
  const climbEnd = 0.13;
  const descendStart = 0.87;
  const stepEnd = input.hazardStart === null ? 0.36 : Math.max(0.2, input.hazardStart - 0.03);
  const stepStart = Math.max(0.16, stepEnd - 0.1);
  const cruiseTarget = input.verticalEscape ? filedFt : activeFt;

  if (progress <= climbEnd) {
    return lerp(input.departureElevationFt, cruiseTarget, progress / climbEnd);
  }
  if (progress >= descendStart) {
    return lerp(activeFt, input.arrivalElevationFt, (progress - descendStart) / (1 - descendStart));
  }
  if (!input.verticalEscape || Math.abs(filedFt - activeFt) < 50) return activeFt;
  if (progress < stepStart) return filedFt;
  if (progress < stepEnd) return lerp(filedFt, activeFt, (progress - stepStart) / (stepEnd - stepStart));
  return activeFt;
}

export function terrainFeet(progress: number, departureFt: number, arrivalFt: number): number {
  const base = departureFt + (arrivalFt - departureFt) * progress;
  const ridge = Math.sin(progress * Math.PI) * 2400;
  const ripple = Math.sin(progress * Math.PI * 7) * 280;
  return Math.max(0, base * 0.25 + ridge * 0.55 + ripple);
}
