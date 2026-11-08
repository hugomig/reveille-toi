import type { Weekday } from "@/types/alarm";

/** Lundi = 0 … dimanche = 6. */
export const WEEKDAYS: readonly { day: Weekday; letter: string; short: string; long: string }[] = [
  { day: 0, letter: "L", short: "Lun", long: "lundi" },
  { day: 1, letter: "M", short: "Mar", long: "mardi" },
  { day: 2, letter: "M", short: "Mer", long: "mercredi" },
  { day: 3, letter: "J", short: "Jeu", long: "jeudi" },
  { day: 4, letter: "V", short: "Ven", long: "vendredi" },
  { day: 5, letter: "S", short: "Sam", long: "samedi" },
  { day: 6, letter: "D", short: "Dim", long: "dimanche" },
];

const same = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** Résumé lisible : « Tous les jours », « Lun–Ven », « Week-end », « Lun, Mer, Ven », « Une fois ». */
export function formatDays(days: readonly Weekday[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 0) return "Une fois";
  if (sorted.length === 7) return "Tous les jours";
  if (same(sorted, [5, 6])) return "Week-end";
  // Suite de jours consécutifs d'au moins 3 jours : « Lun–Ven ».
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive && sorted.length >= 3) {
    return `${WEEKDAYS[sorted[0]].short}–${WEEKDAYS[sorted[sorted.length - 1]].short}`;
  }
  return sorted.map((d) => WEEKDAYS[d].short).join(", ");
}

/** Ajoute ou retire un jour, en gardant la liste triée. */
export function toggleDay(days: readonly Weekday[], day: Weekday): Weekday[] {
  return days.includes(day)
    ? days.filter((d) => d !== day)
    : [...days, day].sort((a, b) => a - b);
}
