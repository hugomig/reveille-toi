import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MathChallenge } from "@/components/challenges/MathChallenge";
import { ShakeCounter } from "@/components/challenges/ShakeCounter";
import { optionLabel, RING_OPTIONS } from "@/lib/alarmOptions";
import { getSound } from "@/lib/sounds";
import { formatTime } from "@/lib/time";
import { ringColors as C } from "@/theme";
import { DEFAULT_ALARM, type DismissMode, type RingMode, type SoundId } from "@/types/alarm";
import { startRinging, stopRinging } from "@modules/alarm-scheduler";

type Params = {
  id?: string;
  seriesId?: string;
  /** Heure prévue du réveil, « HH:MM ». */
  time?: string;
  name?: string;
  ring?: RingMode;
  sound?: SoundId;
  dismiss?: DismissMode;
  /** "1" : réveil déclenché par le téléphone (il sonne déjà). Sinon : test, on lance la sonnerie. */
  fired?: string;
};

/** Écran plein écran affiché quand un réveil sonne. */
export default function RingScreen() {
  const {
    id = "test",
    seriesId = "",
    time = "",
    name = "",
    ring = "progressive",
    sound = DEFAULT_ALARM.sound,
    dismiss = "button",
    fired,
  } = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const now = useClock();

  // Test (bouton ▶) : on lance la sonnerie native, sur le volume « alarme ».
  useEffect(() => {
    if (fired === "1") return;
    startRinging({ id, seriesId, time, name, ring, sound, dismiss });
    return () => {
      stopRinging();
    };
  }, [fired, id, seriesId, time, name, ring, sound, dismiss]);
  const stop = () => stopRinging();
  const [inChallenge, setInChallenge] = useState(false);
  useKeepAwake();

  // Le bouton « retour » d'Android ne doit pas couper le réveil.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  const dismissAlarm = () => {
    stop();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const clock = formatTime({ hour: now.getHours(), minute: now.getMinutes() });
  const padding = { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 };

  // Calcul en cours : la sonnerie continue tant qu'il n'est pas réussi.
  if (inChallenge) {
    return (
      <View style={[styles.container, styles.challengeContainer, padding]}>
        <StatusBar style="light" />
        <Text style={styles.clockSmall}>{clock}</Text>
        <View style={styles.challenge}>
          <MathChallenge onComplete={dismissAlarm} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, padding, { paddingTop: insets.top + 48 }]}>
      <StatusBar style="light" />

      <View style={styles.top}>
        <Text style={styles.clock}>{clock}</Text>
        <Text style={styles.date}>
          {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </Text>
      </View>

      <View style={styles.middle}>
        <Pulse />
        <View style={styles.info}>
          {name ? <Text style={styles.name}>{name}</Text> : null}
          {time ? <Text style={styles.scheduled}>Réveil de {time}</Text> : null}
          <Text style={styles.mode}>
            {optionLabel(RING_OPTIONS, ring)}
            {ring !== "vibrate" ? ` · ${getSound(sound).label}` : ""}
          </Text>
        </View>
      </View>

      {dismiss === "shake" ? (
        // Pas de bouton : on secoue directement, un petit compteur suit la progression.
        <ShakeCounter onComplete={dismissAlarm} />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={dismiss === "math" ? () => setInChallenge(true) : dismissAlarm}
          style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}
        >
          <Text style={styles.stopText}>
            {dismiss === "math" ? "Résoudre pour arrêter" : "Arrêter"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** Heure courante, mise à jour chaque seconde. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Cercle qui pulse au centre de l'écran. */
function Pulse() {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false),
    );
  }, [progress]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.get() * 0.6 }],
    opacity: 0.5 * (1 - progress.get()),
  }));

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRing, ringStyle]} />
      <View style={styles.pulseCore} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  challengeContainer: { justifyContent: "flex-start", alignItems: "center", gap: 24 },
  challenge: { flex: 1, width: "100%", justifyContent: "center" },
  top: { alignItems: "center", gap: 4 },
  clock: { color: C.text, fontSize: 80, fontWeight: "200", fontVariant: ["tabular-nums"] },
  clockSmall: { color: C.textMuted, fontSize: 22, fontWeight: "500", fontVariant: ["tabular-nums"] },
  date: { color: C.textMuted, fontSize: 17, textTransform: "capitalize" },
  middle: { alignItems: "center", gap: 28 },
  pulseWrap: { width: 140, height: 140, alignItems: "center", justifyContent: "center" },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.accent,
  },
  pulseCore: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.accent },
  info: { alignItems: "center", gap: 6 },
  name: { color: C.text, fontSize: 24, fontWeight: "600" },
  scheduled: { color: C.textMuted, fontSize: 17 },
  mode: { color: C.textMuted, fontSize: 14 },
  stopButton: {
    backgroundColor: C.text,
    borderRadius: 999,
    paddingVertical: 20,
    alignItems: "center",
  },
  stopText: { color: C.background, fontSize: 20, fontWeight: "700" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
