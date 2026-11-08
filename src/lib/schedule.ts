import type { AlarmSpec } from "@modules/alarm-scheduler";
import { formatTime, getSeriesTimes } from "@/lib/time";
import type { AlarmSeries } from "@/types/alarm";

const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Minutes (depuis minuit, peut être négatif ou ≥ 1440) du premier réveil de la série. */
function startMinutes(s: AlarmSeries): number {
  const anchor = s.hour * 60 + s.minute;
  return s.anchor === "first" ? anchor : anchor - (s.count - 1) * s.intervalMinutes;
}

/**
 * Série « une fois » : horodatage du premier réveil, pour que le réveil saisi
 * (premier ou dernier) sonne à sa prochaine occurrence.
 */
export function computeOnceStart(s: AlarmSeries | Omit<AlarmSeries, "id">, now = Date.now()): number {
  const anchor = new Date(now);
  anchor.setHours(s.hour, s.minute, 0, 0);
  if (anchor.getTime() <= now) anchor.setDate(anchor.getDate() + 1);
  const offset = s.anchor === "first" ? 0 : (s.count - 1) * s.intervalMinutes;
  return anchor.getTime() - offset * MINUTE;
}

/** Série « une fois » dont tous les réveils sont passés. */
export function isOnceExpired(s: AlarmSeries, now = Date.now()): boolean {
  if (s.days.length > 0 || s.onceStart == null) return false;
  const last = s.onceStart + (s.count - 1) * s.intervalMinutes * MINUTE;
  return last < now - MINUTE;
}

/** Liste des réveils à programmer côté natif pour les séries activées. */
export function buildAlarmSpecs(list: AlarmSeries[]): AlarmSpec[] {
  const specs: AlarmSpec[] = [];
  for (const s of list) {
    if (!s.enabled) continue;
    const times = getSeriesTimes(s);
    const start = startMinutes(s);

    s.alarms.forEach((alarm, i) => {
      const payload = {
        id: `${s.id}-${i}`,
        seriesId: s.id,
        time: formatTime(times[i]),
        name: s.name ?? "",
        ring: alarm.ring,
        sound: alarm.sound,
        dismiss: alarm.dismiss,
      };

      if (s.days.length === 0) {
        if (s.onceStart == null) return;
        const at = s.onceStart + i * s.intervalMinutes * MINUTE;
        specs.push({ id: payload.id, hour: times[i].hour, minute: times[i].minute, days: [], at, payload });
        return;
      }

      // Les jours choisis sont ceux de l'heure saisie : un réveil qui tombe après minuit
      // (ou avant, pour « dernier réveil ») sonne le jour suivant (ou précédent).
      const dayOffset = Math.floor((start + i * s.intervalMinutes) / DAY_MINUTES);
      const days = s.days.map((d) => mod(d + dayOffset, 7)).sort((a, b) => a - b);
      specs.push({ id: payload.id, hour: times[i].hour, minute: times[i].minute, days, payload });
    });
  }
  return specs;
}
