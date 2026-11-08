import type { AudioSource } from "expo-audio";

import type { SoundId } from "@/types/alarm";

/** Sonneries générées par scripts/generate-alarm-sounds.mjs. */
export const SOUNDS: readonly { id: SoundId; label: string; source: AudioSource }[] = [
  { id: "chime", label: "Carillon", source: require("../../assets/sounds/chime.wav") },
  { id: "marimba", label: "Marimba", source: require("../../assets/sounds/marimba.wav") },
  { id: "rise", label: "Montée", source: require("../../assets/sounds/rise.wav") },
  { id: "beeps", label: "Bips", source: require("../../assets/sounds/beeps.wav") },
  { id: "digital", label: "Digital", source: require("../../assets/sounds/digital.wav") },
];

export function getSound(id: SoundId) {
  return SOUNDS.find((s) => s.id === id) ?? SOUNDS[0];
}
