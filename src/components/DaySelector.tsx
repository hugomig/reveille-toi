import { Pressable, StyleSheet, Text, View } from "react-native";

import { toggleDay, WEEKDAYS } from "@/lib/days";
import { colors } from "@/theme";
import type { Weekday } from "@/types/alarm";

type Props = {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
};

/** Sept pastilles L M M J V S D à activer / désactiver. */
export function DaySelector({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {WEEKDAYS.map(({ day, letter, long }) => {
        const selected = value.includes(day);
        return (
          <Pressable
            key={day}
            accessibilityRole="checkbox"
            accessibilityLabel={long}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(toggleDay(value, day))}
            style={({ pressed }) => [
              styles.day,
              selected && styles.daySelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.letter, selected && styles.letterSelected]}>{letter}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.track,
    alignItems: "center",
    justifyContent: "center",
  },
  daySelected: { backgroundColor: colors.primary },
  pressed: { opacity: 0.7 },
  letter: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
  letterSelected: { color: colors.onPrimary },
});
