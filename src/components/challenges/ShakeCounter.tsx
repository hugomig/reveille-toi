import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { createShakeDetector, SHAKE_GOAL } from "@/lib/challenges";
import { ringColors as C } from "@/theme";

/**
 * Arrêt « Secouer » : la détection démarre dès l'affichage, sans bouton.
 * Affiche un petit compteur ; appelle `onComplete` après SHAKE_GOAL secousses.
 */
export function ShakeCounter({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const [available, setAvailable] = useState<boolean | null>(null);
  const completed = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    const isShake = createShakeDetector();

    Accelerometer.isAvailableAsync().then((ok) => {
      if (cancelled) return;
      setAvailable(ok);
      if (!ok) return;
      Accelerometer.setUpdateInterval(50);
      sub = Accelerometer.addListener((sample) => {
        if (completed.current || !isShake(sample, Date.now())) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCount((c) => {
          const next = Math.min(c + 1, SHAKE_GOAL);
          if (next >= SHAKE_GOAL && !completed.current) {
            completed.current = true;
            // Hors du setState, pour ne pas naviguer pendant un rendu.
            setTimeout(() => onCompleteRef.current(), 0);
          }
          return next;
        });
      });
    });

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  // Sans accéléromètre, impossible de secouer : on laisse arrêter avec un bouton.
  if (available === false) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onComplete}
        style={({ pressed }) => [styles.fallback, pressed && styles.pressed]}
      >
        <Text style={styles.fallbackText}>Arrêter</Text>
      </Pressable>
    );
  }

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Secoue le téléphone pour arrêter : ${count} sur ${SHAKE_GOAL}`}
    >
      <Text style={styles.hint}>Secoue le téléphone pour arrêter</Text>
      <View style={styles.row}>
        {Array.from({ length: SHAKE_GOAL }, (_, i) => (
          <View key={i} style={[styles.dot, i < count && styles.dotDone]} />
        ))}
        <Text style={styles.count}>
          {count} / {SHAKE_GOAL}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 10, paddingVertical: 8 },
  hint: { color: C.textMuted, fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.textMuted,
  },
  dotDone: { backgroundColor: C.success, borderColor: C.success },
  count: { color: C.text, fontSize: 15, fontWeight: "600", marginLeft: 4, fontVariant: ["tabular-nums"] },
  fallback: {
    backgroundColor: C.text,
    borderRadius: 999,
    paddingVertical: 20,
    alignItems: "center",
  },
  fallbackText: { color: C.background, fontSize: 20, fontWeight: "700" },
  pressed: { opacity: 0.8 },
});
