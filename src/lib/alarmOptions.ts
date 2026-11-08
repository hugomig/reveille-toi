import { SHAKE_GOAL } from "@/lib/challenges";
import type { DismissMode, RingMode } from "@/types/alarm";

export type Option<T extends string> = { value: T; label: string; description: string };

export const RING_OPTIONS: readonly Option<RingMode>[] = [
  {
    value: "progressive",
    label: "Son progressif",
    description: "Le volume monte doucement, avec vibration",
  },
  { value: "loud", label: "Son fort", description: "Volume maximal dès le début, avec vibration" },
  { value: "vibrate", label: "Vibration seule", description: "Aucun son, seulement la vibration" },
];

export const DISMISS_OPTIONS: readonly Option<DismissMode>[] = [
  { value: "button", label: "Bouton", description: "Un simple appui pour arrêter" },
  { value: "math", label: "Calcul mental", description: "Résoudre un calcul pour arrêter" },
  { value: "shake", label: "Secouer", description: `Secouer le téléphone ${SHAKE_GOAL} fois pour arrêter` },
];

export function optionLabel<T extends string>(options: readonly Option<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
