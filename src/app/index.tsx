import { router, useFocusEffect } from "expo-router";
import { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import ReorderableList, {
  reorderItems,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from "react-native-reorderable-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDays, WEEKDAYS } from "@/lib/days";
import { loadSeries, saveSeriesOrder, setSeriesEnabled } from "@/lib/storage";
import { formatTime, getSeriesTimes } from "@/lib/time";
import { colors } from "@/theme";
import type { AlarmSeries, Weekday } from "@/types/alarm";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [series, setSeries] = useState<AlarmSeries[]>([]);

  // Recharge la liste à chaque retour sur l'accueil (après création/édition).
  useFocusEffect(
    useCallback(() => {
      loadSeries().then(setSeries);
    }, []),
  );

  const toggle = useCallback((id: string, enabled: boolean) => {
    setSeries((list) => list.map((s) => (s.id === id ? { ...s, enabled } : s)));
    setSeriesEnabled(id, enabled);
  }, []);

  const handleReorder = ({ from, to }: ReorderableListReorderEvent) => {
    setSeries((list) => {
      const next = reorderItems(list, from, to);
      saveSeriesOrder(next);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <ReorderableList
        data={series}
        keyExtractor={(item) => item.id}
        onReorder={handleReorder}
        renderItem={({ item }) => <SeriesCard series={item} onToggle={toggle} />}
        contentContainerStyle={
          series.length === 0
            ? styles.emptyContainer
            : [styles.list, { paddingBottom: insets.bottom + 112 }]
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune série de réveils</Text>
            <Text style={styles.emptyText}>Appuie sur + pour créer ta première série.</Text>
          </View>
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Créer une série de réveils"
        onPress={() => router.push("/series/edit")}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 24 },
          pressed && styles.fabPressed,
        ]}
      >
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>
    </View>
  );
}

const SeriesCard = memo(function SeriesCard({
  series,
  onToggle,
}: {
  series: AlarmSeries;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const drag = useReorderableDrag();
  const times = getSeriesTimes(series);
  const first = times[0];
  const last = times[times.length - 1];
  const details =
    series.count === 1
      ? "1 réveil"
      : `${series.count} réveils · toutes les ${series.intervalMinutes} min`;

  return (
    <View style={styles.card}>
      {/* Poignée : on l'attrape pour déplacer la série dans la liste */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Déplacer la série"
        onPressIn={drag}
        hitSlop={8}
        style={styles.handle}
      >
        <DragHandleIcon />
      </Pressable>

      <Pressable
        onPress={() => router.push({ pathname: "/series/edit", params: { id: series.id } })}
        style={({ pressed }) => [styles.cardBody, pressed && styles.cardPressed]}
      >
        {series.name ? (
          <Text style={styles.cardName} numberOfLines={1}>
            {series.name}
          </Text>
        ) : null}
        <Text style={[styles.cardTime, !series.enabled && styles.muted]}>
          {series.count === 1 ? formatTime(first) : `${formatTime(first)} → ${formatTime(last)}`}
        </Text>
        <Text style={styles.cardDetails}>{details}</Text>
        <DaysLine days={series.days} />
      </Pressable>

      <Switch
        accessibilityLabel={series.name ? `Activer la série ${series.name}` : "Activer la série"}
        value={series.enabled}
        onValueChange={(v) => onToggle(series.id, v)}
        trackColor={{ true: colors.primary, false: colors.track }}
        thumbColor={colors.surface}
      />
    </View>
  );
});

/** Jours de la série : « L M M J V S D » avec les jours actifs en couleur, ou « Une fois ». */
function DaysLine({ days }: { days: Weekday[] }) {
  if (days.length === 0) return <Text style={styles.daysOnce}>Une fois</Text>;
  return (
    <View style={styles.daysRow} accessibilityLabel={`Jours : ${formatDays(days)}`}>
      {WEEKDAYS.map(({ day, letter }) => (
        <Text key={day} style={[styles.dayLetter, days.includes(day) && styles.dayLetterOn]}>
          {letter}
        </Text>
      ))}
    </View>
  );
}

/** Icône « poignée » : 2 colonnes de 3 points. */
function DragHandleIcon() {
  return (
    <View style={styles.handleIcon}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={styles.handleDot} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  emptyContainer: { flexGrow: 1, justifyContent: "center", padding: 32 },
  empty: { alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingRight: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  handle: {
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  handleIcon: { width: 12, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  handleDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textMuted },
  cardBody: { flex: 1, gap: 4, marginRight: 12 },
  cardPressed: { opacity: 0.6 },
  cardName: { fontSize: 15, fontWeight: "600", color: colors.primary },
  cardTime: {
    fontSize: 28,
    fontWeight: "500",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  muted: { color: colors.textMuted },
  cardDetails: { fontSize: 14, color: colors.textMuted },
  daysRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  dayLetter: { fontSize: 13, fontWeight: "600", color: colors.textFaint },
  dayLetterOn: { color: colors.primary },
  daysOnce: { fontSize: 13, fontWeight: "600", color: colors.primary, marginTop: 2 },
  fab: {
    position: "absolute",
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  fabLabel: { color: colors.onPrimary, fontSize: 34, lineHeight: 38, fontWeight: "400" },
});
