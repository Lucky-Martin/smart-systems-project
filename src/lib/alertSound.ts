import type { AlertPriority } from "../types/aviation";

let audioContext: AudioContext | null = null;

export function unlockAudio(): void {
  const Context = window.AudioContext;
  if (!audioContext) audioContext = new Context();
  if (audioContext.state === "suspended") void audioContext.resume();
}

export function playAlertTone(priority: AlertPriority): void {
  if (!audioContext || audioContext.state !== "running") return;
  const now = audioContext.currentTime;
  const frequencies = priority === "EMERGENCY" ? [880, 660, 880] : priority === "PRIORITY" ? [700, 880] : [523];
  frequencies.forEach((frequency, index) => {
    const oscillator = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const start = now + index * 0.15;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
    oscillator.connect(gain);
    gain.connect(audioContext!.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.14);
  });
}
