import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { DaySelector } from "@/components/DaySelector";
import { OptionSheet } from "@/components/OptionSheet";
import { RingSheet } from "@/components/RingSheet";
import { SettingButton } from "@/components/SettingButton";
import { DISMISS_OPTIONS, optionLabel, RING_OPTIONS } from "@/lib/alarmOptions";
import { formatDays } from "@/lib/days";
import { getSound } from "@/lib/sounds";
import { loadReminderSettings } from "@/lib/reminders";
import { saveReminderSettings } from "@/lib/storage";
import { formatTime } from "@/lib/time";
import { colors } from "@/theme";
import type { DismissMode, TimeOfDay } from "@/types/alarm";
import {
  DAY_START_MINUTES,
  MAX_NOTIFICATIONS,
  REMINDER_TEXT,
  type ReminderSettings,
} from "@/types/reminders";

/** Heure en cours de modification : une notification (index), une nouvelle, ou l'alarme de secours. */
type Picking = { kind: "notification"; index: number } | { kind: "new" } | { kind: "backup" } | null;

const minutes = (t: TimeOfDay) => t.hour * 60 + t.minute;
/** Ordre dans la nuit : 22:00, 23:30, 00:00, 01:00… (une « journée » commence à 04:00). */
const nightOrder = (t: TimeOfDay) => (minutes(t) - DAY_START_MINUTES + 1440) % 1440;
const sortTimes = (times: TimeOfDay[]) => [...times].sort((a, b) => nightOrder(a) - nightOrder(b));

/** Préférences des rappels : notifications et alarme de secours quand aucun réveil n'est prévu. */
export default function SettingsScreen() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [sheet, setSheet] = useState<"ring" | "dismiss" | null>(null);

  useEffect(() => {
    loadReminderSettings().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  /** Applique une modification et l'enregistre (reprogramme les rappels sur le téléphone). */
  const change = (next: ReminderSettings) => {
    setSettings(next);
    saveReminderSettings(next);
  };
  const { notifications, backup } = settings;
  const setNotifications = (patch: Partial<ReminderSettings["notifications"]>) =>
    change({ ...settings, notifications: { ...notifications, ...patch } });
  const setBackup = (patch: Partial<ReminderSettings["backup"]>) =>
    change({ ...settings, backup: { ...backup, ...patch } });

  const pickerValue = (() => {
    const t =
      picking?.kind === "notification"
        ? notifications.times[picking.index]
        : picking?.kind === "backup"
          ? backup.time
          : { hour: 23, minute: 0 };
    const d = new Date();
    d.setHours(t.hour, t.minute, 0, 0);
    return d;
  })();

  const onPicked = (date: Date) => {
    const t = { hour: date.getHours(), minute: date.getMinutes() };
    if (picking?.kind === "backup") setBackup({ time: t });
    else if (picking?.kind === "new") setNotifications({ times: sortTimes([...notifications.times, t]) });
    else if (picking?.kind === "notification") {
      setNotifications({
        times: sortTimes(notifications.times.map((old, i) => (i === picking.index ? t : old))),
      });
    }
    setPicking(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* ===== Catégorie « Pas de réveil pour demain » ===== */}
      <View style={styles.category}>
        <Text style={styles.categoryTitle}>Pas de réveil pour demain</Text>
        <Text style={styles.intro}>
          Pour les jours cochés, l&apos;appli vérifie qu&apos;au moins un réveil sonne entre 04:00 et
          16:00. Sinon, elle te prévient et peut sonner en secours.
        </Text>
      </View>

      {/* --- Notifications ---------------------------------------------------- */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitle}>Notification(s)</Text>
            <Text style={styles.sectionSubtitle}>« {REMINDER_TEXT} »</Text>
          </View>
          <Switch
            accessibilityLabel="Activer les notifications de rappel"
            value={notifications.enabled}
            onValueChange={(enabled) => setNotifications({ enabled })}
            trackColor={{ true: colors.primary, false: colors.track }}
            thumbColor={colors.surface}
          />
        </View>

        <View style={[styles.sectionBody, !notifications.enabled && styles.disabled]}>
          <DayRow
            days={notifications.days}
            onChange={(days) => setNotifications({ days })}
            label="Jours de réveil concernés"
          />

          <Text style={styles.label}>
            {notifications.times.length === 0
              ? "Aucun horaire"
              : `${notifications.times.length} notification${notifications.times.length > 1 ? "s" : ""}`}
          </Text>
          {notifications.times.map((t, i) => (
            <View key={`${i}-${minutes(t)}`} style={styles.timeRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Notification à ${formatTime(t)}. Modifier`}
                onPress={() => setPicking({ kind: "notification", index: i })}
                style={({ pressed }) => [styles.timeChip, pressed && styles.pressed]}
              >
                <Text style={styles.timeChipText}>{formatTime(t)}</Text>
              </Pressable>
              <Text style={styles.timeHint}>
                {minutes(t) >= DAY_START_MINUTES ? "la veille au soir" : "dans la nuit, avant 04:00"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Supprimer la notification de ${formatTime(t)}`}
                hitSlop={8}
                onPress={() => setNotifications({ times: notifications.times.filter((_, j) => j !== i) })}
                style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
          {notifications.times.length < MAX_NOTIFICATIONS && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPicking({ kind: "new" })}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              <Text style={styles.addText}>+ Ajouter un horaire</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* --- Alarme de secours -------------------------------------------------- */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitle}>Alarme de secours</Text>
            <Text style={styles.sectionSubtitle}>
              {optionLabel(RING_OPTIONS, backup.ring)}
              {backup.ring !== "vibrate" ? ` · ${getSound(backup.sound).label}` : ""} · arrêt :{" "}
              {optionLabel(DISMISS_OPTIONS, backup.dismiss).toLowerCase()}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Activer l'alarme de secours"
            value={backup.enabled}
            onValueChange={(enabled) => setBackup({ enabled })}
            trackColor={{ true: colors.primary, false: colors.track }}
            thumbColor={colors.surface}
          />
        </View>

        <View style={[styles.sectionBody, !backup.enabled && styles.disabled]}>
          <DayRow days={backup.days} onChange={(days) => setBackup({ days })} label="Jours concernés" />

          <Text style={styles.label}>Heure de déclenchement</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Alarme de secours à ${formatTime(backup.time)}. Modifier`}
            onPress={() => setPicking({ kind: "backup" })}
            style={({ pressed }) => [styles.bigTime, pressed && styles.pressed]}
          >
            <Text style={styles.bigTimeText}>{formatTime(backup.time)}</Text>
            <Text style={styles.timeHint}>
              {minutes(backup.time) < DAY_START_MINUTES
                ? "Dans la nuit, si aucun réveil n'est prévu le matin"
                : "Si aucun réveil n'est prévu ce jour-là"}
            </Text>
          </Pressable>

          <View style={styles.settingRow}>
            <SettingButton
              label="Sonnerie"
              value={optionLabel(RING_OPTIONS, backup.ring)}
              detail={backup.ring === "vibrate" ? undefined : getSound(backup.sound).label}
              onPress={() => setSheet("ring")}
            />
            <SettingButton
              label="Arrêt"
              value={optionLabel(DISMISS_OPTIONS, backup.dismiss)}
              onPress={() => setSheet("dismiss")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tester l'alarme de secours"
              hitSlop={6}
              onPress={() =>
                router.push({
                  pathname: "/ring",
                  params: {
                    id: "backup-test",
                    time: formatTime(backup.time),
                    name: "Alarme de secours",
                    ring: backup.ring,
                    sound: backup.sound,
                    dismiss: backup.dismiss,
                  },
                })
              }
              style={({ pressed }) => [styles.testButton, pressed && styles.pressed]}
            >
              <Text style={styles.testIcon}>▶</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {sheet === "ring" && (
        <RingSheet
          subtitle="Alarme de secours"
          value={backup}
          showApplyToAll={false}
          onSelect={(choice) => {
            setBackup(choice);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      <OptionSheet<DismissMode>
        visible={sheet === "dismiss"}
        title="Arrêt de l'alarme de secours"
        options={DISMISS_OPTIONS}
        value={backup.dismiss}
        onSelect={(dismiss) => {
          setBackup({ dismiss });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />

      {picking && (
        <DateTimePicker
          mode="time"
          is24Hour
          value={pickerValue}
          onValueChange={(_e, date) => onPicked(date)}
          onDismiss={() => setPicking(null)}
        />
      )}
    </ScrollView>
  );
}

function DayRow({
  days,
  onChange,
  label,
}: {
  days: ReminderSettings["backup"]["days"];
  onChange: (days: ReminderSettings["backup"]["days"]) => void;
  label: string;
}) {
  return (
    <View style={styles.dayBlock}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.labelValue}>{days.length === 0 ? "Aucun" : formatDays(days)}</Text>
      </View>
      <DaySelector value={days} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
  category: { gap: 4, marginTop: 4, paddingHorizontal: 4 },
  categoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  intro: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionTitleBox: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  sectionSubtitle: { fontSize: 13, color: colors.textMuted },
  sectionBody: { gap: 12 },
  disabled: { opacity: 0.45 },
  dayBlock: { gap: 10 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
  labelValue: { fontSize: 15, fontWeight: "600", color: colors.primary },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  timeChipText: { fontSize: 18, fontWeight: "600", color: colors.primary, fontVariant: ["tabular-nums"] },
  timeHint: { flex: 1, fontSize: 13, color: colors.textMuted },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.track,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { fontSize: 14, color: colors.textMuted },
  addButton: { paddingVertical: 10, alignItems: "center", borderRadius: 12, backgroundColor: colors.track },
  addText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  testButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  testIcon: { color: colors.onPrimary, fontSize: 13, marginLeft: 2 },
  bigTime: { alignItems: "center", paddingVertical: 4, gap: 2 },
  bigTimeText: { fontSize: 44, fontWeight: "300", color: colors.text, fontVariant: ["tabular-nums"] },
  pressed: { opacity: 0.7 },
});
