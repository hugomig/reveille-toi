import type { SoundId } from "@/types/alarm";

/**
 * Sonneries disponibles. Les fichiers sont dans le module natif
 * (modules/alarm-scheduler/android/src/main/res/raw), générés par scripts/generate-alarm-sounds.mjs.
 */
export const SOUNDS: readonly { id: SoundId; label: string }[] = [
  { id: "chime", label: "Carillon" },
  { id: "marimba", label: "Marimba" },
  { id: "rise", label: "Montée" },
  { id: "beeps", label: "Bips" },
  { id: "digital", label: "Digital" },
];

export function getSound(id: SoundId) {
  return SOUNDS.find((s) => s.id === id) ?? SOUNDS[0];
}
