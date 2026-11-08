import AsyncStorage from "@react-native-async-storage/async-storage";

import { scheduleAlarms } from "@modules/alarm-scheduler";
import { buildReminderSpecs, loadReminderSettings, saveReminderSettingsRaw } from "@/lib/reminders";
import { buildAlarmSpecs, computeOnceStart, isOnceExpired } from "@/lib/schedule";
import { normalizeSeries } from "@/lib/series";
import type { AlarmSeries, AlarmSeriesInput } from "@/types/alarm";
import type { ReminderSettings } from "@/types/reminders";

const KEY = "alarmSeries.v1";

/** Charge les séries ; désactive les séries « une fois » dont tous les réveils sont passés. */
export async function loadSeries(): Promise<AlarmSeries[]> {
  const raw = await AsyncStorage.getItem(KEY);
  const list = (raw ? (JSON.parse(raw) as AlarmSeries[]) : []).map(normalizeSeries);
  const now = Date.now();
  if (list.some((s) => s.enabled && isOnceExpired(s, now))) {
    const updated = list.map((s) => (s.enabled && isOnceExpired(s, now) ? { ...s, enabled: false } : s));
    await saveAll(updated);
    return updated;
  }
  return list;
}

/** Programme sur le téléphone les réveils des séries et les rappels (remplace tout). */
async function scheduleAll(list: AlarmSeries[], reminders?: ReminderSettings): Promise<void> {
  const settings = reminders ?? (await loadReminderSettings());
  await scheduleAlarms([...buildAlarmSpecs(list), ...buildReminderSpecs(settings)]);
}

/** Enregistre la liste et reprogramme les réveils sur le téléphone. */
async function saveAll(list: AlarmSeries[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  await scheduleAll(list);
}

/** Reprogramme les réveils à partir des séries enregistrées (au lancement de l'appli). */
export async function syncAlarms(): Promise<void> {
  await scheduleAll(await loadSeries());
}

/** Enregistre les réglages des rappels et reprogramme. */
export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await saveReminderSettingsRaw(settings);
  await scheduleAll(await loadSeries(), settings);
}

export async function getSeries(id: string): Promise<AlarmSeries | undefined> {
  return (await loadSeries()).find((s) => s.id === id);
}

/** Série « une fois » activée : (re)calcule la date de son premier réveil. */
function withOnceStart<T extends AlarmSeriesInput>(s: T): T {
  if (s.days.length > 0 || !s.enabled) return { ...s, onceStart: undefined };
  return { ...s, onceStart: computeOnceStart(s) };
}

/** Crée la série si `id` est absent, sinon la met à jour. */
export async function upsertSeries(raw: AlarmSeriesInput, id?: string): Promise<AlarmSeries> {
  const name = raw.name?.trim();
  const input = withOnceStart({ ...raw, name: name || undefined });
  const list = await loadSeries();
  if (id) {
    const updated: AlarmSeries = { ...input, id };
    await saveAll(list.map((s) => (s.id === id ? updated : s)));
    return updated;
  }
  const created: AlarmSeries = {
    ...input,
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
  };
  await saveAll([...list, created]);
  return created;
}

/** Enregistre la liste dans l'ordre donné (après un glisser-déposer). */
export async function saveSeriesOrder(list: AlarmSeries[]): Promise<void> {
  await saveAll(list);
}

export async function setSeriesEnabled(id: string, enabled: boolean): Promise<void> {
  const list = await loadSeries();
  await saveAll(list.map((s) => (s.id === id ? withOnceStart({ ...s, enabled }) : s)));
}

export async function deleteSeries(id: string): Promise<void> {
  const list = await loadSeries();
  await saveAll(list.filter((s) => s.id !== id));
}
