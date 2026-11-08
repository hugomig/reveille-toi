import { NativeModule, requireOptionalNativeModule } from "expo";

import type { DismissMode, RingMode, SoundId } from "@/types/alarm";

/** Ce que l'écran de sonnerie doit savoir d'un réveil. */
export type AlarmPayload = {
  /** Identifiant du réveil : `${idSérie}-${index}`. */
  id: string;
  seriesId: string;
  /** Heure prévue, « HH:MM ». */
  time: string;
  name: string;
  ring: RingMode;
  sound: SoundId;
  dismiss: DismissMode;
};

/** Réveil en train de sonner, tel que renvoyé par le natif. */
export type RingingAlarm = AlarmPayload & {
  /** true si déclenché à l'heure prévue, false pour un test (bouton ▶). */
  fired: boolean;
  firedAt: number;
};

/**
 * Réveil à programmer :
 * - répété : `hour:minute` les jours `days` (lundi = 0 … dimanche = 6) ;
 * - unique : `at` (horodatage en ms).
 */
export type AlarmSpec = {
  id: string;
  hour: number;
  minute: number;
  days: number[];
  at?: number;
  payload: AlarmPayload;
};

export type PermissionStatus = {
  exactAlarms: boolean;
  fullScreen: boolean;
  notifications: boolean;
};

type Events = { onAlarm: (event: { alarm: string }) => void };

declare class AlarmSchedulerModule extends NativeModule<Events> {
  scheduleAlarms(json: string): Promise<number>;
  startRinging(payload: string): Promise<void>;
  stopRinging(): Promise<void>;
  getRingingAlarm(): string | null;
  previewSound(id: SoundId): Promise<void>;
  stopPreview(): Promise<void>;
  getPermissionStatus(): PermissionStatus;
  openExactAlarmSettings(): Promise<void>;
  openFullScreenSettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
}

/** null hors Android ou sans le module natif (ex. Expo Go). */
const Native = requireOptionalNativeModule<AlarmSchedulerModule>("AlarmScheduler");

export const isAvailable = Native != null;

export function scheduleAlarms(specs: AlarmSpec[]): Promise<number> {
  return Native?.scheduleAlarms(JSON.stringify(specs)) ?? Promise.resolve(0);
}

export function startRinging(payload: AlarmPayload): Promise<void> {
  return Native?.startRinging(JSON.stringify(payload)) ?? Promise.resolve();
}

export function stopRinging(): Promise<void> {
  return Native?.stopRinging() ?? Promise.resolve();
}

export function getRingingAlarm(): RingingAlarm | null {
  const raw = Native?.getRingingAlarm();
  return raw ? (JSON.parse(raw) as RingingAlarm) : null;
}

/** Appelé quand un réveil commence à sonner (y compris un test). */
export function addAlarmListener(listener: (alarm: RingingAlarm) => void) {
  const sub = Native?.addListener("onAlarm", (e) => listener(JSON.parse(e.alarm) as RingingAlarm));
  return { remove: () => sub?.remove() };
}

export function previewSound(id: SoundId): Promise<void> {
  return Native?.previewSound(id) ?? Promise.resolve();
}

export function stopPreview(): Promise<void> {
  return Native?.stopPreview() ?? Promise.resolve();
}

export function getPermissionStatus(): PermissionStatus {
  return Native?.getPermissionStatus() ?? { exactAlarms: true, fullScreen: true, notifications: true };
}

export const openExactAlarmSettings = () => Native?.openExactAlarmSettings() ?? Promise.resolve();
export const openFullScreenSettings = () => Native?.openFullScreenSettings() ?? Promise.resolve();
export const openNotificationSettings = () => Native?.openNotificationSettings() ?? Promise.resolve();
