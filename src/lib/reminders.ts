import AsyncStorage from "@react-native-async-storage/async-storage";

import { formatTime } from "@/lib/time";
import {
  DAY_START_MINUTES,
  DEFAULT_REMINDERS,
  REMINDER_TEXT,
  type ReminderSettings,
} from "@/types/reminders";
import type { AlarmSpec } from "@modules/alarm-scheduler";

const KEY = "reminderSettings.v1";

const mod = (n: number, m: number) => ((n % m) + m) % m;

export async function loadReminderSettings(): Promise<ReminderSettings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_REMINDERS;
  const saved = JSON.parse(raw) as Partial<ReminderSettings>;
  return {
    notifications: { ...DEFAULT_REMINDERS.notifications, ...saved.notifications },
    backup: { ...DEFAULT_REMINDERS.backup, ...saved.backup },
  };
}

export async function saveReminderSettingsRaw(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}

/**
 * Programmations natives des rappels. Le natif vérifie au moment du déclenchement
 * s'il y a un réveil le jour visé (fire day + targetOffsetDays, entre 04:00 et 16:00).
 */
export function buildReminderSpecs(settings: ReminderSettings): AlarmSpec[] {
  const specs: AlarmSpec[] = [];
  const { notifications, backup } = settings;

  if (notifications.enabled && notifications.days.length > 0) {
    notifications.times.forEach((t, i) => {
      // Heure ≥ 04:00 : envoyée la veille du jour visé. Avant 04:00 : la nuit du jour visé.
      const evening = t.hour * 60 + t.minute >= DAY_START_MINUTES;
      const days = notifications.days.map((d) => (evening ? mod(d - 1, 7) : d)).sort((a, b) => a - b);
      specs.push({
        id: `reminder-${i}`,
        kind: "reminder",
        targetOffsetDays: evening ? 1 : 0,
        hour: t.hour,
        minute: t.minute,
        days,
        payload: { id: `reminder-${i}`, seriesId: "", time: formatTime(t), name: REMINDER_TEXT, ring: "vibrate", sound: "chime", dismiss: "button" },
      });
    });
  }

  if (backup.enabled && backup.days.length > 0) {
    specs.push({
      id: "backup",
      kind: "backup",
      targetOffsetDays: 0,
      hour: backup.time.hour,
      minute: backup.time.minute,
      days: [...backup.days].sort((a, b) => a - b),
      payload: {
        id: "backup",
        seriesId: "",
        time: formatTime(backup.time),
        name: "Alarme de secours",
        ring: backup.ring,
        sound: backup.sound,
        dismiss: backup.dismiss,
      },
    });
  }
  return specs;
}
