import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";
import type { AlarmSeries } from "@/types/alarm";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  // Pas encore de stockage : la liste sera alimentée à l'étape 2.
  const series: AlarmSeries[] = [];

  return (
    <View style={styles.container}>
      <FlatList
        data={series}
        keyExtractor={(item) => item.id}
        contentContainerStyle={series.length === 0 ? styles.emptyContainer : styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: "/series/edit", params: { id: item.id } })}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
          </Pressable>
        )}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: "center", padding: 32 },
  empty: { alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
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
