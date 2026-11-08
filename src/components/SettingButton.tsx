import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "@/theme";

/** Bouton compact « libellé / valeur ▾ » qui ouvre un choix (ex. Sonnerie, Arrêt). */
export function SettingButton({
  label,
  value,
  detail,
  onPress,
}: {
  label: string;
  value: string;
  /** Précision affichée sous la valeur (ex. nom de la sonnerie). */
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}${detail ? `, ${detail}` : ""}. Modifier`}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value} ▾
      </Text>
      {detail ? (
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pressed: { opacity: 0.7 },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: "500" },
  value: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  detail: { fontSize: 12, color: colors.primary },
});
