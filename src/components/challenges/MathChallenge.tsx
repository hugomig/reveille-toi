import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { generateMathProblem, MATH_PROBLEM_COUNT } from "@/lib/challenges";
import { ringColors as C } from "@/theme";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "✓"] as const;
const MAX_DIGITS = 4;

/** Défi « Calcul mental » : résoudre MATH_PROBLEM_COUNT calculs avec un pavé numérique. */
export function MathChallenge({ onComplete }: { onComplete: () => void }) {
  const [problem, setProblem] = useState(generateMathProblem);
  const [solved, setSolved] = useState(0);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const shakeX = useSharedValue(0);

  const answerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.get() }] }));

  const submit = () => {
    if (!input) return;
    if (Number(input) === problem.answer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const next = solved + 1;
      if (next >= MATH_PROBLEM_COUNT) {
        onComplete();
        return;
      }
      setSolved(next);
      setProblem(generateMathProblem());
      setInput("");
      setError(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(true);
      setInput("");
      shakeX.set(
        withSequence(
          withTiming(-12, { duration: 50 }),
          withTiming(12, { duration: 50 }),
          withTiming(-8, { duration: 50 }),
          withTiming(8, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        ),
      );
    }
  };

  const press = (key: (typeof KEYS)[number]) => {
    if (key === "✓") return submit();
    setError(false);
    setInput((v) => (v.length < MAX_DIGITS ? v + key : v));
  };

  const erase = () => {
    setError(false);
    setInput((v) => v.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        {MATH_PROBLEM_COUNT > 1
          ? `Calcul ${solved + 1} / ${MATH_PROBLEM_COUNT}`
          : "Résous le calcul pour arrêter"}
      </Text>
      <Text style={styles.problem}>{problem.text} =</Text>
      <View style={styles.answerRow}>
        <Animated.View style={[styles.answer, error && styles.answerError, answerStyle]}>
          <Text style={[styles.answerText, !input && styles.placeholder]}>
            {input || (error ? "Raté, réessaie" : "?")}
          </Text>
        </Animated.View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Effacer le dernier chiffre (appui long : tout effacer)"
          onPress={erase}
          onLongPress={() => setInput("")}
          disabled={!input}
          style={({ pressed }) => [
            styles.eraseButton,
            !input && styles.eraseDisabled,
            pressed && styles.keyPressed,
          ]}
        >
          <Text style={styles.keyText}>⌫</Text>
        </Pressable>
      </View>

      <View style={styles.keypad}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={key === "✓" ? "Valider" : key}
            onPress={() => press(key)}
            style={({ pressed }) => [
              styles.key,
              key === "0" && styles.keyWide,
              key === "✓" && styles.keySubmit,
              pressed && styles.keyPressed,
            ]}
          >
            <Text style={styles.keyText}>{key}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 12, width: "100%" },
  progress: { color: C.textMuted, fontSize: 15 },
  problem: { color: C.text, fontSize: 36, fontWeight: "600", fontVariant: ["tabular-nums"] },
  answerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  eraseButton: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  eraseDisabled: { opacity: 0.35 },
  answer: {
    minWidth: 160,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: C.surface,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  answerError: { borderColor: C.error },
  answerText: { color: C.text, fontSize: 30, fontWeight: "600", fontVariant: ["tabular-nums"] },
  placeholder: { color: C.textMuted, fontSize: 20, lineHeight: 36 },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
    maxWidth: 300,
  },
  key: {
    width: 84,
    height: 58,
    borderRadius: 16,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Le 0 occupe deux colonnes : dernière ligne = [ 0 0 ][ ✓ ]. */
  keyWide: { width: 84 * 2 + 10 },
  keySubmit: { backgroundColor: C.accent },
  keyPressed: { opacity: 0.6 },
  keyText: { color: C.text, fontSize: 24, fontWeight: "500" },
});
