import type { AlarmSettings, TimeOfDay, Weekday } from "@/types/alarm";

/**
 * Rappels quand aucun réveil n'est prévu.
 *
 * Les jours cochés sont les jours de réveil visés. Une « journée » va de 04:00 à 04:00 :
 * une heure avant 04:00 appartient à la nuit du jour visé. Un réveil est « prévu » s'il
 * sonne le jour visé entre 04:00 et 16:00.
 */
export type ReminderSettings = {
  notifications: {
    enabled: boolean;
    days: Weekday[];
    /** Heures d'envoi : ≥ 04:00 → la veille du jour visé ; < 04:00 → la nuit du jour visé. */
    times: TimeOfDay[];
  };
  backup: {
    enabled: boolean;
    days: Weekday[];
    /** Heure de l'alarme de secours : ≥ 04:00 → le jour visé ; < 04:00 → la nuit qui le précède. */
    time: TimeOfDay;
  } & Pick<AlarmSettings, "ring" | "sound" | "dismiss">;
};

/** Début de la « journée » : les heures avant 04:00 appartiennent à la nuit précédente. */
export const DAY_START_MINUTES = 4 * 60;

export const MAX_NOTIFICATIONS = 6;

export const REMINDER_TEXT = "Pas de réveil de prévu pour demain. Un oubli ?";

export const DEFAULT_REMINDERS: ReminderSettings = {
  notifications: {
    enabled: false,
    days: [0, 1, 2, 3, 4],
    times: [{ hour: 0, minute: 0 }],
  },
  backup: {
    enabled: false,
    days: [0, 1, 2, 3, 4],
    // Avant 04:00 : sonne dans la nuit qui précède le jour visé.
    time: { hour: 0, minute: 30 },
    ring: "vibrate",
    sound: "chime",
    dismiss: "button",
  },
};
