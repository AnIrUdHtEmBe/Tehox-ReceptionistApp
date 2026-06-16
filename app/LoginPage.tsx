import axios from "axios";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppBar from "../components/AppBar";
import PrimaryButton from "../components/PrimaryButton";
import { useTournament } from "../context/TournamentContext";
import { showToast } from "../utils/Toast";

const { width } = Dimensions.get("window");

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // step: "credentials" → email/password form
  // step: "tournament"  → tournament picker after login
  const [step, setStep] = useState<"credentials" | "tournament">("credentials");
  const [selectedId, setSelectedId] = useState<string>("");

  const BASE_URL = process.env.EXPO_PUBLIC_API;
  const router = useRouter();
  const {
    availableTournaments,
    isLoggedIn,
    isReady,
    tournamentId,
    login,
    selectTournament,
  } = useTournament();

  // ── If already logged in but no tournament selected → jump to step 2 ──
  // Handles app-killed-mid-flow scenario gracefully
  useEffect(() => {
    if (
      isReady &&
      isLoggedIn &&
      !tournamentId &&
      availableTournaments.length > 0
    ) {
      setStep("tournament");
    }
  }, [isReady, isLoggedIn, tournamentId, availableTournaments]);

  // ── After login: auto-select if only one tournament ────────────────────
  useEffect(() => {
    if (step !== "tournament") return;
    if (availableTournaments.length === 1) {
      selectTournament(availableTournaments[0].id).then(() => {
        router.replace("/");
      });
    } else if (availableTournaments.length > 1 && !selectedId) {
      setSelectedId(availableTournaments[0].id);
    }
  }, [step, availableTournaments]);

  // ── Step 1: Credentials submit ─────────────────────────────────────────
  async function handleLoginPress() {
    if (!email || !password) {
      showToast?.("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/api/staff/login/receptionist`,
        {
          email,
          password,
        },
      );
      if (response.status === 200) {
        await login(response.data.access_token);
        showToast?.("Login successful!");
        setStep("tournament");
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        showToast?.("Access denied: this app is for Receptionists only");
      } else {
        showToast?.("Invalid credentials or server error");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Tournament confirm ─────────────────────────────────────────
  async function handleTournamentConfirm() {
    if (!selectedId) {
      showToast?.("Please select a tournament");
      return;
    }
    setLoading(true);
    try {
      await selectTournament(selectedId);
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <AppBar
        title={
          step === "tournament" ? "Select Tournament" : "Receptionist Login"
        }
        logoSource={require("../assets/images/tehologo.png")}
      />

      <View style={styles.content}>
        {/* ── Step 1: Credentials ── */}
        {step === "credentials" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <PrimaryButton
              onPress={handleLoginPress}
              loading={loading}
              text="Login"
            />
          </>
        )}

        {/* ── Step 2: Tournament Picker ── */}
        {step === "tournament" && (
          <>
            {availableTournaments.length > 1 ? (
              <>
                <Text style={styles.pickerLabel}>Choose your tournament</Text>
                {availableTournaments.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setSelectedId(t.id)}
                    style={[
                      styles.tournamentOption,
                      selectedId === t.id && styles.tournamentOptionActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.tournamentOptionText,
                        selectedId === t.id &&
                          styles.tournamentOptionTextActive,
                      ]}
                    >
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <PrimaryButton
                  onPress={handleTournamentConfirm}
                  loading={loading}
                  text="Enter"
                />
              </>
            ) : (
              // Single tournament: show spinner while auto-selecting
              <ActivityIndicator
                size="large"
                color="#111827"
                style={{ marginTop: 40 }}
              />
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  input: {
    width: "100%",
    height: 50,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    fontSize: 16,
    marginBottom: 16,
    color: "#000",
    backgroundColor: "transparent",
    paddingHorizontal: 4,
    textAlign: "center",
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 20,
    textAlign: "center",
  },
  tournamentOption: {
    width: width * 0.85,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  tournamentOptionActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  tournamentOptionText: {
    fontSize: 15,
    color: "#374151",
  },
  tournamentOptionTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
