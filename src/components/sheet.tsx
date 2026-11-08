import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

/** Panneau qui monte du bas de l'écran, fermé en touchant le fond ou avec « retour ». */
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grabber} />
        {children}
      </View>
    </Modal>
  );
}

export function SheetHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  /** Affiche une flèche « retour » à gauche du titre. */
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={onBack}
          hitSlop={10}
          style={styles.back}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
      )}
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/** Ligne d'option avec bouton radio. `right` : contenu optionnel affiché à droite. */
export function OptionRow({
  label,
  description,
  selected,
  onPress,
  right,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  right?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        {description ? <Text style={styles.optionDescription}>{description}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function ApplyToAllRow({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.applyAll}>
      <Text style={styles.applyAllLabel}>Appliquer à tous les réveils de la série</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.track }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

export const sheetStyles = StyleSheet.create({
  options: { gap: 8, marginTop: 12 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.track,
    marginBottom: 12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  back: { paddingRight: 4 },
  backIcon: { fontSize: 34, lineHeight: 36, color: colors.text },
  headerText: { flex: 1 },
  title: { fontSize: 19, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  optionSelected: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  optionDescription: { fontSize: 13, color: colors.textMuted },
  applyAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
    paddingVertical: 8,
  },
  applyAllLabel: { flex: 1, fontSize: 15, color: colors.text },
});
