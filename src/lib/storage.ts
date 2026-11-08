import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeSeries } from "@/lib/series";
import type { AlarmSeries, AlarmSeriesInput } from "@/types/alarm";

const KEY = "alarmSeries.v1";

export async function loadSeries(): Promise<AlarmSeries[]> {
  const raw = await AsyncStorage.getItem(KEY);
  const list = raw ? (JSON.parse(raw) as AlarmSeries[]) : [];
  return list.map(normalizeSeries);
}

async function saveAll(list: AlarmSeries[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function getSeries(id: string): Promise<AlarmSeries | undefined> {
  return (await loadSeries()).find((s) => s.id === id);
}

/** Crée la série si `id` est absent, sinon la met à jour. */
export async function upsertSeries(raw: AlarmSeriesInput, id?: string): Promise<AlarmSeries> {
  const name = raw.name?.trim();
  const input: AlarmSeriesInput = { ...raw, name: name || undefined };
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
  await saveAll(list.map((s) => (s.id === id ? { ...s, enabled } : s)));
}

export async function deleteSeries(id: string): Promise<void> {
  const list = await loadSeries();
  await saveAll(list.filter((s) => s.id !== id));
}
