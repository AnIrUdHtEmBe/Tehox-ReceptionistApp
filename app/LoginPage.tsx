import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import AppBar from "../components/AppBar";
import PrimaryButton from "../components/PrimaryButton";
import { useTournament } from "../context/TournamentContext";
import { showToast } from "../utils/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const BASE_URL = process.env.EXPO_PUBLIC_API;
  const router = useRouter();
  const { login } = useTournament();

  async function handleLoginPress() {
    if (!email || !password) {
      showToast?.("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/staff/login`, {
        email,
        password,
      });
      if (response.status === 200) {
        await login(response.data.access_token);
        showToast?.("Login successful!");
        router.replace("/");
      }
    } catch (error: any) {
      console.error(error);
      showToast?.("Invalid credentials or server error");
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
        title="Receptionist Login"
        logoSource={require("../assets/images/tehologo.png")}
      />
      <View style={styles.content}>
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
        />
        <PrimaryButton
          onPress={handleLoginPress}
          loading={loading}
          text="Login"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
    color: "#000",
  },
});
