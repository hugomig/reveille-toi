import DateTimePicker from "@react-native-community/datetimepicker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DaySelector } from "@/components/DaySelector";
import { OptionSheet } from "@/components/OptionSheet";
import { RingSheet } from "@/components/RingSheet";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { SettingButton } from "@/components/SettingButton";
import { Stepper } from "@/components/Stepper";
import { DISMISS_OPTIONS, optionLabel, RING_OPTIONS } from "@/lib/alarmOptions";
import { formatDays } from "@/lib/days";
import { computeOnceStart } from "@/lib/schedule";
import { resizeAlarms } from "@/lib/series";
import { getSound } from "@/lib/sounds";
import { deleteSeries, getSeries, upsertSeries } from "@/lib/storage";
import { formatTime, getSeriesTimes } from "@/lib/time";
import { colors } from "@/theme";
import {
  COUNT_MAX,
  COUNT_MIN,
  DEFAULT_SERIES,
  INTERVAL_MAX,
  INTERVAL_MIN,
  type AlarmSeriesInput,
  type AlarmSettings,
  type DismissMode,
  type TimeAnchor,
} from "@/types/alarm";

/** Panneau de choix ouvert : réglage `kind` du réveil n° `index`. */
type OpenSheet = { index: number; kind: "ring" | "dismiss" } | null;

const ANCHOR_OPTIONS = [
  { value: "first", label: "Premier réveil" },
  { value: "last", label: "Dernier réveil" },
] as const satisfies readonly { value: TimeAnchor; label: string }[];

type RepeatMode = "repeat" | "once";
const REPEAT_OPTIONS = [
  { value: "repeat", label: "Récurrent" },
  { value: "once", label: "Une seule fois" },
] as const satisfies readonly { value: RepeatMode; label: string }[];

/** « Sonnera une seule fois : demain à 07:00 » (date du premier réveil de la série). */
function describeOnce(form: AlarmSeriesInput): string {
  const start = new Date(computeOnceStart(form));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((new Date(start).setHours(0, 0, 0, 0) - today.getTime()) / 86_400_000);
  const day =
    dayDiff === 0
      ? "aujourd'hui"
      : dayDiff === 1
        ? "demain"
        : start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const time = formatTime({ hour: start.getHours(), minute: start.getMinutes() });
  return `Sonnera une seule fois : ${day} à ${time}${form.count > 1 ? " (premier réveil)" : ""}, puis la série se désactive.`;
}

/** Création (sans `id`) ou édition (avec `id`) d'une série de réveils. */
export default function EditSeriesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id;
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<AlarmSeriesInput>(DEFAULT_SERIES);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [sheet, setSheet] = useState<OpenSheet>(null);
  // Une série sans jours est « une seule fois ». Le mode est gardé à part pour qu'une série
  // récurrente dont on décoche tous les jours reste « Récurrent » (et demande un jour).
  const [repeat, setRepeat] = useState<RepeatMode>("repeat");
  // Jours choisis avant de passer en « une seule fois », restaurés si on revient en récurrent.
  const [savedDays, setSavedDays] = useState(DEFAULT_SERIES.days);

  useEffect(() => {
    if (!id) return;
    getSeries(id).then((existing) => {
      if (existing) {
        const { id: _id, ...rest } = existing;
        setForm(rest);
        setRepeat(rest.days.length > 0 ? "repeat" : "once");
      }
      setLoading(false);
    });
  }, [id]);

  const changeRepeat = (mode: RepeatMode) => {
    if (mode === repeat) return;
    setRepeat(mode);
    if (mode === "once") {
      if (form.days.length > 0) setSavedDays(form.days);
      setForm((f) => ({ ...f, days: [] }));
    } else {
      setForm((f) => ({ ...f, days: savedDays.length > 0 ? savedDays : DEFAULT_SERIES.days }));
    }
  };

  /** Récurrent sans aucun jour : rien à programmer, on n'enregistre pas. */
  const missingDays = repeat === "repeat" && form.days.length === 0;

  const update = <K extends keyof AlarmSeriesInput>(key: K, value: AlarmSeriesInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setCount = (count: number) =>
    setForm((f) => ({ ...f, count, alarms: resizeAlarms(f.alarms, count, f.anchor) }));

  /** Modifie des réglages d'un réveil, ou de tous si `applyToAll`. */
  const updateAlarm = (index: number, patch: Partial<AlarmSettings>, applyToAll: boolean) =>
    setForm((f) => ({
      ...f,
      alarms: f.alarms.map((a, i) => (applyToAll || i === index ? { ...a, ...patch } : a)),
    }));

  const times = useMemo(() => getSeriesTimes(form), [form]);
  const pickerDate = useMemo(() => {
    const d = new Date();
    d.setHours(form.hour, form.minute, 0, 0);
    return d;
  }, [form.hour, form.minute]);

  const save = async () => {
    setSaving(true);
    try {
      await upsertSeries(form, id);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!id) return;
    Alert.alert("Supprimer la série ?", "Tous les réveils de cette série seront supprimés.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deleteSeries(id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isNew ? "Nouvelle série" : "Modifier la série" }} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Nom (facultatif) */}
        <View style={styles.card}>
          <Text style={styles.label}>
            Nom <Text style={styles.optional}>(facultatif)</Text>
          </Text>
          <TextInput
            value={form.name ?? ""}
            onChangeText={(name) => update("name", name)}
            placeholder="Ex. Semaine, Week-end…"
            placeholderTextColor={colors.textMuted}
            maxLength={40}
            returnKeyType="done"
            autoCapitalize="sentences"
            style={styles.nameInput}
          />
        </View>

        {/* Heure du premier / dernier réveil */}
        <View style={styles.card}>
          <SegmentedToggle
            options={ANCHOR_OPTIONS}
            value={form.anchor}
            onChange={(anchor) => update("anchor", anchor)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Heure du ${form.anchor === "first" ? "premier" : "dernier"} réveil : ${formatTime(form)}. Modifier`}
            onPress={() => setShowTimePicker(true)}
            style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}
          >
            <Text style={styles.timeText}>{formatTime(form)}</Text>
            <Text style={styles.timeHint}>Toucher pour modifier</Text>
          </Pressable>
        </View>

        {/* Récurrent (jours de répétition) ou une seule fois */}
        <View style={styles.card}>
          <SegmentedToggle options={REPEAT_OPTIONS} value={repeat} onChange={changeRepeat} />
          {repeat === "repeat" ? (
            <>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Jours</Text>
                <Text style={styles.labelValue}>
                  {form.days.length === 0 ? "Aucun" : formatDays(form.days)}
                </Text>
              </View>
              <DaySelector value={form.days} onChange={(days) => update("days", days)} />
              {form.days.length === 0 && (
                <Text style={[styles.hint, styles.hintError]}>Choisis au moins un jour.</Text>
              )}
            </>
          ) : (
            <Text style={styles.hint}>{describeOnce(form)}</Text>
          )}
        </View>

        {/* Nombre de réveils */}
        <View style={styles.card}>
          <Text style={styles.label}>Nombre de réveils</Text>
          <Stepper
            accessibilityLabel="le nombre de réveils"
            value={form.count}
            min={COUNT_MIN}
            max={COUNT_MAX}
            onChange={setCount}
          />
        </View>

        {/* Écart entre chaque réveil */}
        <View style={[styles.card, form.count < 2 && styles.cardDisabled]}>
          <Text style={styles.label}>Écart entre chaque réveil</Text>
          <Stepper
            accessibilityLabel="l'écart entre chaque réveil"
            value={form.intervalMinutes}
            min={INTERVAL_MIN}
            max={INTERVAL_MAX}
            format={(v) => `${v} min`}
            onChange={(intervalMinutes) => update("intervalMinutes", intervalMinutes)}
          />
        </View>

        {/* Liste des réveils, avec sonnerie et arrêt de chacun */}
        <View style={styles.card}>
          <Text style={styles.label}>
            {times.length === 1
              ? "1 réveil"
              : `${times.length} réveils, de ${formatTime(times[0])} à ${formatTime(times[times.length - 1])}`}
          </Text>
          <View>
            {times.map((t, i) => {
              const alarm = form.alarms[i];
              return (
                <View key={i} style={[styles.alarmRow, i > 0 && styles.alarmRowBorder]}>
                  <Text style={styles.alarmTime}>{formatTime(t)}</Text>
                  <View style={styles.alarmSettings}>
                    <SettingButton
                      label="Sonnerie"
                      value={optionLabel(RING_OPTIONS, alarm.ring)}
                      detail={alarm.ring === "vibrate" ? undefined : getSound(alarm.sound).label}
                      onPress={() => setSheet({ index: i, kind: "ring" })}
                    />
                    <SettingButton
                      label="Arrêt"
                      value={optionLabel(DISMISS_OPTIONS, alarm.dismiss)}
                      onPress={() => setSheet({ index: i, kind: "dismiss" })}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Tester le réveil de ${formatTime(t)}`}
                    hitSlop={6}
                    onPress={() =>
                      router.push({
                        pathname: "/ring",
                        params: {
                          time: formatTime(t),
                          name: form.name?.trim() ?? "",
                          ring: alarm.ring,
                          sound: alarm.sound,
                          dismiss: alarm.dismiss,
                        },
                      })
                    }
                    style={({ pressed }) => [styles.testButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.testIcon}>▶</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {!isNew && (
          <Pressable
            accessibilityRole="button"
            onPress={confirmDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Text style={styles.deleteText}>Supprimer la série</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          accessibilityRole="button"
          disabled={saving || missingDays}
          onPress={save}
          style={({ pressed }) => [
            styles.saveButton,
            (pressed || saving) && styles.pressed,
            missingDays && styles.saveDisabled,
          ]}
        >
          <Text style={styles.saveText}>{isNew ? "Créer la série" : "Enregistrer"}</Text>
        </Pressable>
      </View>

      {sheet?.kind === "ring" && (
        <RingSheet
          subtitle={`Réveil de ${formatTime(times[sheet.index])}`}
          value={form.alarms[sheet.index]}
          showApplyToAll={form.count > 1}
          onSelect={(choice, all) => {
            updateAlarm(sheet.index, choice, all);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      <OptionSheet<DismissMode>
        visible={sheet?.kind === "dismiss"}
        title="Arrêt du réveil"
        subtitle={sheet ? `Réveil de ${formatTime(times[sheet.index])}` : undefined}
        options={DISMISS_OPTIONS}
        value={sheet ? form.alarms[sheet.index].dismiss : "button"}
        showApplyToAll={form.count > 1}
        onSelect={(dismiss, all) => {
          if (sheet) updateAlarm(sheet.index, { dismiss }, all);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />

      {showTimePicker && (
        <DateTimePicker
          mode="time"
          is24Hour
          value={pickerDate}
          onValueChange={(_event, date) => {
            setShowTimePicker(false);
            setForm((f) => ({ ...f, hour: date.getHours(), minute: date.getMinutes() }));
          }}
          onDismiss={() => setShowTimePicker(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 14 },
  cardDisabled: { opacity: 0.45 },
  label: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
  optional: { fontWeight: "400" },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  labelValue: { fontSize: 15, fontWeight: "600", color: colors.primary },
  hint: { fontSize: 13, color: colors.textMuted },
  hintError: { color: colors.danger },
  saveDisabled: { opacity: 0.4 },
  nameInput: {
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.track,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeButton: { alignItems: "center", paddingVertical: 8 },
  timeText: {
    fontSize: 56,
    fontWeight: "300",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  timeHint: { fontSize: 13, color: colors.textMuted },
  alarmRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  alarmRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.track },
  alarmTime: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    width: 58,
  },
  alarmSettings: { flex: 1, flexDirection: "row", gap: 8 },
  testButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  testIcon: { color: colors.onPrimary, fontSize: 13, marginLeft: 2 },
  deleteButton: { alignItems: "center", paddingVertical: 14 },
  deleteText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.background },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveText: { color: colors.onPrimary, fontSize: 17, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});
