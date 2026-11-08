import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ApplyToAllRow, BottomSheet, OptionRow, SheetHeader, sheetStyles } from "@/components/sheet";
import { optionLabel, RING_OPTIONS } from "@/lib/alarmOptions";
import { SOUNDS } from "@/lib/sounds";
import { useSoundPreview } from "@/lib/useSoundPreview";
import { colors } from "@/theme";
import type { AlarmSettings, RingMode, SoundId } from "@/types/alarm";

type RingChoice = Pick<AlarmSettings, "ring" | "sound">;

type Props = {
  subtitle?: string;
  value: RingChoice;
  showApplyToAll: boolean;
  onSelect: (choice: RingChoice, applyToAll: boolean) => void;
  onClose: () => void;
};

/**
 * Choix de la sonnerie en deux temps :
 * 1. le mode (progressif, fort, vibration seule) ;
 * 2. pour « progressif » et « fort » : la sonnerie, qu'on peut écouter avant de valider.
 * À monter uniquement quand le panneau doit s'afficher (l'état repart de `value` à chaque ouverture).
 */
export function RingSheet({ subtitle, value, showApplyToAll, onSelect, onClose }: Props) {
  const [step, setStep] = useState<"mode" | "sound">("mode");
  const [ring, setRing] = useState<RingMode>(value.ring);
  const [sound, setSound] = useState<SoundId>(value.sound);
  const [applyToAll, setApplyToAll] = useState(false);
  const preview = useSoundPreview();

  const close = () => {
    preview.stop();
    onClose();
  };

  const chooseMode = (mode: RingMode) => {
    if (mode === "vibrate") {
      onSelect({ ring: "vibrate", sound }, applyToAll);
      return;
    }
    setRing(mode);
    setStep("sound");
  };

  const chooseSound = (id: SoundId) => {
    setSound(id);
    preview.play(id);
  };

  const confirm = () => {
    preview.stop();
    onSelect({ ring, sound }, applyToAll);
  };

  return (
    <BottomSheet visible onClose={close}>
      {step === "mode" ? (
        <>
          <SheetHeader title="Sonnerie" subtitle={subtitle} />
          <View style={sheetStyles.options} accessibilityRole="radiogroup">
            {RING_OPTIONS.map((opt) => (
              <OptionRow
                key={opt.value}
                label={opt.label}
                description={opt.description}
                selected={opt.value === value.ring}
                onPress={() => chooseMode(opt.value)}
                right={opt.value !== "vibrate" ? <Text style={styles.chevron}>›</Text> : undefined}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <SheetHeader
            title={optionLabel(RING_OPTIONS, ring)}
            subtitle="Touche une sonnerie pour l'écouter"
            onBack={() => {
              preview.stop();
              setStep("mode");
            }}
          />
          <View style={sheetStyles.options} accessibilityRole="radiogroup">
            {SOUNDS.map((s) => (
              <OptionRow
                key={s.id}
                label={s.label}
                selected={s.id === sound}
                onPress={() => chooseSound(s.id)}
                right={<Text style={styles.listen}>▶</Text>}
              />
            ))}
          </View>
        </>
      )}

      {showApplyToAll && <ApplyToAllRow value={applyToAll} onChange={setApplyToAll} />}

      {step === "sound" && (
        <Pressable
          accessibilityRole="button"
          onPress={confirm}
          style={({ pressed }) => [sheetStyles.primaryButton, pressed && sheetStyles.pressed]}
        >
          <Text style={sheetStyles.primaryButtonText}>Valider</Text>
        </Pressable>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chevron: { fontSize: 26, color: colors.textMuted, marginRight: 2 },
  listen: { fontSize: 13, color: colors.primary },
});
