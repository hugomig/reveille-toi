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

import { DISMISS_OPTIONS, optionLabel, RING_OPTIONS } from "@/lib/alarmOptions";
import { getSound } from "@/lib/sounds";
import { formatTime } from "@/lib/time";
import { useAlarmPlayback } from "@/lib/useAlarmPlayback";
import { ringColors as C } from "@/theme";
import { DEFAULT_ALARM, type DismissMode, type RingMode, type SoundId } from "@/types/alarm";

type Params = {
  /** Heure prévue du réveil, « HH:MM ». */
  time?: string;
  name?: string;
  ring?: RingMode;
  sound?: SoundId;
  dismiss?: DismissMode;
};

/** Écran plein écran affiché quand un réveil sonne. */
export default function RingScreen() {
  const {
    time,
    name,
    ring = "progressive",
    sound = DEFAULT_ALARM.sound,
    dismiss = "button",
  } = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const { stop } = useAlarmPlayback(ring, sound);
  const now = useClock();
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

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
    >
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

      <View style={styles.bottom}>
        {dismiss !== "button" && (
          <Text style={styles.challengeHint}>
            Défi prévu : {optionLabel(DISMISS_OPTIONS, dismiss)} (arrive à l&apos;étape 4)
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={dismissAlarm}
          style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}
        >
          <Text style={styles.stopText}>Arrêter</Text>
        </Pressable>
      </View>
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
  top: { alignItems: "center", gap: 4 },
  clock: { color: C.text, fontSize: 80, fontWeight: "200", fontVariant: ["tabular-nums"] },
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
  bottom: { gap: 16 },
  challengeHint: { color: C.textMuted, fontSize: 14, textAlign: "center" },
  stopButton: {
    backgroundColor: C.text,
    borderRadius: 999,
    paddingVertical: 20,
    alignItems: "center",
  },
  stopText: { color: C.background, fontSize: 20, fontWeight: "700" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
