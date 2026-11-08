import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { syncAlarms } from "@/lib/storage";
import { addAlarmListener, getRingingAlarm, type RingingAlarm } from "@modules/alarm-scheduler";

/**
 * À monter une fois, dans le layout racine :
 * - reprogramme les réveils au lancement ;
 * - ouvre l'écran de sonnerie quand un réveil sonne (appli ouverte, en arrière-plan,
 *   ou lancée par la notification plein écran).
 */
export function useAlarmLauncher() {
  const handled = useRef<string | null>(null);

  useEffect(() => {
    syncAlarms();

    const open = (alarm: RingingAlarm | null) => {
      // Les tests (bouton ▶) ouvrent déjà l'écran de sonnerie eux-mêmes.
      if (!alarm?.fired) return;
      const key = `${alarm.id}@${alarm.firedAt}`;
      if (handled.current === key) return;
      handled.current = key;
      const { id, seriesId, time, name, ring, sound, dismiss } = alarm;
      // Laisse le temps à la navigation d'être prête au premier rendu.
      setTimeout(() => {
        router.push({
          pathname: "/ring",
          params: { id, seriesId, time, name, ring, sound, dismiss, fired: "1" },
        });
      }, 0);
    };

    open(getRingingAlarm());
    const alarmSub = addAlarmListener(open);
    const appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") open(getRingingAlarm());
    });
    return () => {
      alarmSub.remove();
      appSub.remove();
    };
  }, []);
}
