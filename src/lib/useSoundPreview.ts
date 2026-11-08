import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";

import { getSound } from "@/lib/sounds";
import type { SoundId } from "@/types/alarm";

/** Écoute d'une sonnerie (une seule à la fois), arrêtée automatiquement au démontage. */
export function useSoundPreview() {
  const player = useRef<AudioPlayer | null>(null);

  const stop = useCallback(() => {
    if (!player.current) return;
    player.current.pause();
    player.current.remove();
    player.current = null;
  }, []);

  const play = useCallback(
    (id: SoundId) => {
      stop();
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" }).catch(() => {});
      const p = createAudioPlayer(getSound(id).source);
      p.play();
      player.current = p;
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { play, stop };
}
