import type { AlarmSeriesInput, TimeOfDay } from "@/types/alarm";

const MINUTES_PER_DAY = 24 * 60;

/** Heures de tous les réveils de la série, dans l'ordre où ils sonnent (passage de minuit géré). */
export function getSeriesTimes(series: AlarmSeriesInput): TimeOfDay[] {
  const anchor = series.hour * 60 + series.minute;
  const span = (series.count - 1) * series.intervalMinutes;
  const start = series.anchor === "first" ? anchor : anchor - span;

  return Array.from({ length: series.count }, (_, i) => {
    const total =
      (((start + i * series.intervalMinutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
      MINUTES_PER_DAY;
    return { hour: Math.floor(total / 60), minute: total % 60 };
  });
}

export function formatTime({ hour, minute }: TimeOfDay): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
