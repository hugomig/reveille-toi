/** L'heure saisie correspond-elle au premier ou au dernier réveil de la série ? */
export type TimeAnchor = "first" | "last";

/** Façon dont le réveil sonne. */
export type RingMode = "progressive" | "loud" | "vibrate";

/** Façon dont on désactive le réveil. */
export type DismissMode = "button" | "math" | "shake";

/** Sonneries disponibles (fichiers dans assets/sounds, voir src/lib/sounds.ts). */
export type SoundId = "beeps" | "chime" | "marimba" | "digital" | "rise";

/** Jour de la semaine, lundi = 0 … dimanche = 6. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Réglages propres à un réveil de la série. */
export type AlarmSettings = {
  ring: RingMode;
  /** Sonnerie jouée (ignorée en mode « Vibration seule »). */
  sound: SoundId;
  dismiss: DismissMode;
};

/**
 * Une série de réveils : `count` réveils espacés de `intervalMinutes`,
 * dont le premier (ou le dernier, selon `anchor`) sonne à `hour:minute`.
 * `alarms[i]` contient les réglages du i-ème réveil, dans l'ordre chronologique.
 */
export type AlarmSeries = {
  id: string;
  /** Nom facultatif (ex. « Semaine »). Absent ou vide = pas de nom. */
  name?: string;
  enabled: boolean;
  /** Jours où la série sonne, triés. Vide = une seule fois, au prochain passage de l'heure. */
  days: Weekday[];
  anchor: TimeAnchor;
  hour: number;
  minute: number;
  count: number;
  intervalMinutes: number;
  alarms: AlarmSettings[];
};

export type AlarmSeriesInput = Omit<AlarmSeries, "id">;

export type TimeOfDay = { hour: number; minute: number };

export const COUNT_MIN = 1;
export const COUNT_MAX = 20;
export const INTERVAL_MIN = 1;
export const INTERVAL_MAX = 60;

export const DEFAULT_ALARM: AlarmSettings = {
  ring: "progressive",
  sound: "chime",
  dismiss: "button",
};

/** Du lundi au vendredi. */
export const DEFAULT_DAYS: Weekday[] = [0, 1, 2, 3, 4];

export const DEFAULT_SERIES: AlarmSeriesInput = {
  enabled: true,
  days: DEFAULT_DAYS,
  anchor: "first",
  hour: 7,
  minute: 0,
  count: 3,
  intervalMinutes: 5,
  alarms: [DEFAULT_ALARM, DEFAULT_ALARM, DEFAULT_ALARM],
};
