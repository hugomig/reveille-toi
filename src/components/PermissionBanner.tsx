import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
  getPermissionStatus,
  isAvailable,
  openExactAlarmSettings,
  openFullScreenSettings,
  openNotificationSettings,
  type PermissionStatus,
} from "@modules/alarm-scheduler";
import { colors } from "@/theme";

const ALL_OK: PermissionStatus = { exactAlarms: true, fullScreen: true, notifications: true };

/** Demande les notifications (Android 13+) ; ouvre les réglages si l'utilisateur a déjà refusé. */
async function fixNotifications() {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (result === PermissionsAndroid.RESULTS.GRANTED) return;
  }
  await openNotificationSettings();
}

const ITEMS: { key: keyof PermissionStatus; title: string; text: string; fix: () => Promise<unknown> }[] = [
  {
    key: "notifications",
    title: "Notifications",
    text: "Nécessaires pour afficher l'écran de sonnerie.",
    fix: fixNotifications,
  },
  {
    key: "exactAlarms",
    title: "Alarmes exactes",
    text: "Sans elles, les réveils peuvent sonner avec du retard.",
    fix: openExactAlarmSettings,
  },
  {
    key: "fullScreen",
    title: "Affichage plein écran",
    text: "Pour que l'écran de sonnerie s'ouvre quand le téléphone est verrouillé.",
    fix: openFullScreenSettings,
  },
];

/** Bandeau listant les autorisations manquantes pour que les réveils sonnent correctement. */
export function PermissionBanner() {
  const [status, setStatus] = useState<PermissionStatus>(ALL_OK);

  const refresh = useCallback(() => {
    if (isAvailable) setStatus(getPermissionStatus());
  }, []);

  useFocusEffect(refresh);
  // Au retour des réglages d'Android.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => sub.remove();
  }, [refresh]);

  const missing = ITEMS.filter((item) => !status[item.key]);
  if (missing.length === 0) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Autorisations à accorder</Text>
      {missing.map((item) => (
        <View key={item.key} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemText}>{item.text}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await item.fix();
              refresh();
            }}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Autoriser</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FFF4E5",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  title: { fontSize: 15, fontWeight: "700", color: "#8A4B00" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  itemText: { fontSize: 13, color: colors.textMuted },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonText: { color: colors.onPrimary, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});
