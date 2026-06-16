import { useTournament } from "@/context/TournamentContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppBar from "../components/AppBar";
import LeaderboardComponent, {
  Prize,
} from "../components/LeaderBoardRankingCard";
import OutlineButton from "../components/OutlinedButton";

export default function SportsLeaderboard() {
  const router = useRouter();
  const { name, playerId } = useLocalSearchParams();

  const [timer, setTimer] = useState(10);
  const [timerPaused, setTimerPaused] = useState(false);
  const { tournamentId } = useTournament();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const API_BASE_URL = process.env.EXPO_PUBLIC_API;
  const intervalRef = useRef<any>(null);
  const AWS_BASE_URL = process.env.EXPO_PUBLIC_CF_DOMAIN;

  // Timer countdown
  useEffect(() => {
    if (!timerPaused) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerPaused]);

  useEffect(() => {
    if (timer <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      router.dismissTo("/");
    }
  }, [timer]);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchPrizes = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/rewards/leaderboard_prizes?tournament_id=${tournamentId}`,
        );
        const data: Prize[] = await res.json();

        // Prepend CF domain to photo paths
        const withPhotos = data.map((p) => ({
          ...p,
          prize_photo: p.prize_photo
            ? `${process.env.EXPO_PUBLIC_CF_DOMAIN}/${p.prize_photo}?t=${Date.now()}`
            : "",
        }));
        setPrizes(withPhotos);
      } catch (err) {
        console.error("Failed to fetch prizes:", err);
      }
    };

    fetchPrizes();
  }, [tournamentId]);

  const handleGoToHome = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.dismissTo("/");
  };

  return (
    <View style={styles.container}>
      <AppBar
        title={"Tournament Leaderboard"}
        titleFontWeight="bold"
        onMenuPress={() => console.log("Menu pressed")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <LeaderboardComponent
          name={name as string}
          player_id={playerId as string}
          prizes={prizes}
          tournamentId={tournamentId}
        />
      </ScrollView>

      <View style={styles.bottomContainer}>
        <Text style={styles.redirectText}>
          You will be redirected to the home screen in
        </Text>
        <TouchableOpacity onPress={() => setTimerPaused((p) => !p)}>
          <Text style={styles.timerText}>{timer}s</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTimerPaused((p) => !p)}>
          <Text
            style={{
              fontSize: 12,
              color: "#888",
              fontFamily: "Roboto-Medium",
              marginBottom: 8,
            }}
          >
            {timerPaused ? "resume" : "pause"}
          </Text>
        </TouchableOpacity>
        <OutlineButton
          text="Go to Home"
          height={40}
          width={124}
          onPress={handleGoToHome}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingVertical: 10,
  },
  redirectText: {
    fontSize: 14,
    fontFamily: "Roboto-Regular",
    letterSpacing: 0.4,
    color: "#333",
    textAlign: "center",
  },
  timerText: {
    fontSize: 36,
    fontFamily: "Roboto-Medium",
    textAlign: "center",
    marginVertical: 6,
  },
});
