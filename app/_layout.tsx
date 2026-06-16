import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { AppState, LogBox } from "react-native";
import {
  TournamentProvider,
  useTournament,
} from "../context/TournamentContext";

LogBox.ignoreAllLogs();

function AppCore() {
  const router = useRouter();
  const { isReady, isLoggedIn, tournamentId, logout } = useTournament();

  // ── Background inactivity auto-logout (30 min) ──────────────────────
  useEffect(() => {
    let backgroundTimer: ReturnType<typeof setTimeout> | null = null;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        backgroundTimer = setTimeout(
          () => {
            logout();
          },
          30 * 60 * 1000,
        );
      } else if (nextState === "active") {
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

  // ── Auth + tournament guard ─────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;

    if (!isLoggedIn) {
      // No token — go to login (step 1: credentials)
      router.replace("/LoginPage");
      return;
    }

    if (!tournamentId) {
      // Logged in but no tournament selected — go to login (shows step 2: picker)
      router.replace("/LoginPage");
    }
  }, [isReady, isLoggedIn, tournamentId]);

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
