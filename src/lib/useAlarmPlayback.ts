import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import { Vibration } from "react-native";

import { getSound } from "@/lib/sounds";
import type { RingMode, SoundId } from "@/types/alarm";

/** Durée de la montée du volume en mode progressif (secondes). */
export const RAMP_SECONDS = 30;
const RAMP_START_VOLUME = 0.05;
const RAMP_TICK_MS = 250;

/** Vibration : 0,8 s de vibration, 0,6 s de pause, en boucle. */
const VIBRATION_PATTERN = [0, 800, 600];

/**
 * Lance la sonnerie (son et/ou vibration) au montage et l'arrête au démontage.
 * Retourne `stop()` pour l'arrêter plus tôt (quand l'utilisateur coupe le réveil).
 */
export function useAlarmPlayback(ring: RingMode, sound: SoundId) {
  const player = useRef<AudioPlayer | null>(null);
  const ramp = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (ramp.current) clearInterval(ramp.current);
    ramp.current = null;
    Vibration.cancel();
    if (player.current) {
      player.current.pause();
      player.current.remove();
      player.current = null;
    }
  }, []);

  useEffect(() => {
    Vibration.vibrate(VIBRATION_PATTERN, true);

    if (ring !== "vibrate") {
      // Joue même en mode silencieux et coupe les autres sons (musique…).
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "doNotMix" }).catch(() => {});

      const p = createAudioPlayer(getSound(sound).source);
      p.loop = true;
      p.volume = ring === "progressive" ? RAMP_START_VOLUME : 1;
      p.play();
      player.current = p;

      if (ring === "progressive") {
        const startedAt = Date.now();
        ramp.current = setInterval(() => {
          const progress = Math.min(1, (Date.now() - startedAt) / (RAMP_SECONDS * 1000));
          if (player.current) {
            player.current.volume = RAMP_START_VOLUME + (1 - RAMP_START_VOLUME) * progress;
          }
          if (progress >= 1 && ramp.current) {
            clearInterval(ramp.current);
            ramp.current = null;
          }
        }, RAMP_TICK_MS);
      }
    }

    return stop;
  }, [ring, sound, stop]);

  return { stop };
}
