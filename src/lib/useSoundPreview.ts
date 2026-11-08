import { useCallback, useEffect } from "react";

import { previewSound, stopPreview } from "@modules/alarm-scheduler";
import type { SoundId } from "@/types/alarm";

/** Écoute d'une sonnerie sur le volume « alarme », arrêtée automatiquement au démontage. */
export function useSoundPreview() {
  const stop = useCallback(() => {
    stopPreview();
  }, []);

  const play = useCallback((id: SoundId) => {
    previewSound(id);
  }, []);

  useEffect(() => stop, [stop]);

  return { play, stop };
}
