import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAlarmLauncher } from "@/lib/useAlarmLauncher";
import { colors } from "@/theme";

export default function RootLayout() {
  useAlarmLauncher();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Mes réveils",
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Préférences"
                hitSlop={10}
                onPress={() => router.push("/settings")}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Ionicons name="settings-outline" size={24} color={colors.text} />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="series/edit" options={{ title: "Série de réveils" }} />
        <Stack.Screen name="settings" options={{ title: "Préférences" }} />
        <Stack.Screen
          name="ring"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
            animation: "fade",
            gestureEnabled: false,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
