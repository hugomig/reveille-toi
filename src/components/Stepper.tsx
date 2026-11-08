import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  accessibilityLabel: string;
};

/** Champ numérique avec boutons − / +. Un appui long fait défiler la valeur. */
export function Stepper({ value, min, max, onChange, format = String, accessibilityLabel }: Props) {
  // Valeur courante lue par l'appui long répété (évite une valeur figée dans le setInterval).
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  };
  useEffect(() => stop, []);

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, valueRef.current + delta));
    if (next !== valueRef.current) {
      valueRef.current = next;
      onChange(next);
    }
  };

  const renderButton = (delta: number, label: string, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${delta > 0 ? "Augmenter" : "Diminuer"} ${accessibilityLabel}`}
      disabled={disabled}
      onPress={() => step(delta)}
      onLongPress={() => {
        stop();
        repeat.current = setInterval(() => step(delta), 80);
      }}
      onPressOut={stop}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.row} accessibilityLabel={accessibilityLabel}>
      {renderButton(-1, "−", value <= min)}
      <Text style={styles.value}>{format(value)}</Text>
      {renderButton(1, "+", value >= max)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.track,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: { opacity: 0.7 },
  buttonDisabled: { opacity: 0.35 },
  buttonLabel: { fontSize: 26, lineHeight: 30, color: colors.text },
  value: { fontSize: 22, fontWeight: "600", color: colors.text, minWidth: 100, textAlign: "center" },
});
