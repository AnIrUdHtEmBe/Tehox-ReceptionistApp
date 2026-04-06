// REPLACE entire file with:
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { AppState } from "react-native";
import {
  TournamentProvider,
  useTournament,
} from "../context/TournamentContext";

function AppCore() {
  const router = useRouter();
  const { logout } = useTournament();

  useEffect(() => {
    let backgroundTimer: ReturnType<typeof setTimeout> | null = null;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        // Only logout if backgrounded for more than 30 minutes
        backgroundTimer = setTimeout(
          () => {
            logout();
          },
          30 * 60 * 1000,
        );
      } else if (nextState === "active") {
        // User came back before timeout — cancel it
        if (backgroundTimer) {
          clearTimeout(backgroundTimer);
          backgroundTimer = null;
        }
      }
    });

    return () => {
      subscription.remove();
      if (backgroundTimer) clearTimeout(backgroundTimer);
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("staff_token").then((token) => {
      if (!token) router.replace("/LoginPage");
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter_18pt-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter_18pt-Medium.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter_18pt-Bold.ttf"),
    "Roboto-Medium": require("../assets/fonts/Roboto_Condensed-Medium.ttf"),
    "Roboto-SemiBold": require("../assets/fonts/Roboto_Condensed-SemiBold.ttf"),
    "Roboto-Regular": require("../assets/fonts/Roboto_Condensed-Regular.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <TournamentProvider>
      <AppCore />
    </TournamentProvider>
  );
}
