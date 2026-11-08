import {
  DEFAULT_ALARM,
  DEFAULT_DAYS,
  type AlarmSeries,
  type AlarmSettings,
  type TimeAnchor,
} from "@/types/alarm";

/**
 * Ajuste la liste des réglages quand le nombre de réveils change.
 * - Heure du premier réveil fixe : les réveils s'ajoutent / s'enlèvent à la fin.
 * - Heure du dernier réveil fixe : ils s'ajoutent / s'enlèvent au début.
 * Un réveil ajouté reprend les réglages de son voisin.
 */
export function resizeAlarms(
  alarms: AlarmSettings[],
  count: number,
  anchor: TimeAnchor,
): AlarmSettings[] {
  if (alarms.length === count) return alarms;
  if (alarms.length > count) {
    return anchor === "first" ? alarms.slice(0, count) : alarms.slice(alarms.length - count);
  }
  const extra = count - alarms.length;
  if (anchor === "first") {
    const template = alarms[alarms.length - 1] ?? DEFAULT_ALARM;
    return [...alarms, ...Array.from({ length: extra }, () => ({ ...template }))];
  }
  const template = alarms[0] ?? DEFAULT_ALARM;
  return [...Array.from({ length: extra }, () => ({ ...template })), ...alarms];
}

/**
 * Complète les champs absents des séries enregistrées par une version précédente de l'appli
 * (réglages par réveil, sonnerie, jours).
 */
export function normalizeSeries(s: AlarmSeries): AlarmSeries {
  const alarms = resizeAlarms(s.alarms ?? [], s.count, "first").map((a) => ({
    ...DEFAULT_ALARM,
    ...a,
  }));
  return { ...s, days: s.days ?? DEFAULT_DAYS, alarms };
}
