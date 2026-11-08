import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";

/**
 * Création (sans `id`) ou édition (avec `id`) d'une série de réveils.
 * Le formulaire sera construit à l'étape 2.
 */
export default function EditSeriesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isNew ? "Nouvelle série" : "Modifier la série" }} />
      <Text style={styles.text}>
        {isNew ? "Configuration d'une nouvelle série de réveils" : `Édition de la série ${id}`}
      </Text>
      <Text style={styles.hint}>{"Le formulaire arrive à l'étape 2."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  text: { fontSize: 17, color: colors.text },
  hint: { fontSize: 15, color: colors.textMuted },
});
