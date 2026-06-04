import axios from "axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showToast } from "../utils/Toast";
import SearchButton from "./SearchButton";

// InputFields contains input fields for unique code and mobile number.
// Player ID search → existing VerifyDetailsPage (unchanged).
// Phone number search → new PlayerSearchResultScreen (new approval flow).
export default function InputFields() {
  const [playerId, setPlayerId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const BASE_URL = process.env.EXPO_PUBLIC_API;
  const PHOTO_URL = process.env.EXPO_PUBLIC_CF_DOMAIN;

  const router = useRouter();

  const handleSearchPress = async () => {
    const isPhoneSearch = !!mobileNumber && !playerId;
    const isPlayerIdSearch = !!playerId;

    if (!playerId && !mobileNumber) {
      Alert.alert(
        "Input Required",
        "Please enter a Player ID or Mobile Number to search.",
      );
      return;
    }

    // ── Phone search → new approval flow ──────────────────────────────────
    if (isPhoneSearch) {
      router.push({
        pathname: "/Playersearchresultscreen",
        params: { phone: mobileNumber },
      });
      setMobileNumber("");
      return;
    }

    // ── Player ID search → existing VerifyDetailsPage (unchanged) ─────────
    setSearchLoading(true);
    try {
      const encodedValue = encodeURIComponent(playerId);
      const url = `${BASE_URL}/api/player/${encodedValue}/?player_id_or_phone=${encodedValue}`;

      const response = await axios.get(url);

      if (response.data.statuscode === "404") {
        showToast("User not found. Please register the player.");
        setTimeout(() => {
          router.push("/RegistartionPage");
        }, 2000);
        return;
      }

      if (response.data.player_id) {
        const photoVal = response.data.photo;
        const hasPhoto =
          photoVal &&
          photoVal !== "None" &&
          photoVal !== "null" &&
          photoVal !== "";

        const paramsToSend = {
          name: response.data.name,
          email: response.data.email,
          gamerTag: response.data.gamer_tag,
          mobile: response.data.phone_no,
          gender: response.data.gender,
          photoType: hasPhoto ? "photo" : "avatar",
          photoUri: hasPhoto ? `${PHOTO_URL}/${photoVal}` : "",
          avatarName: hasPhoto ? null : "avatar1",
          playerId: response.data.player_id,
        };

        router.push({ pathname: "/VerifyDetailsPage", params: paramsToSend });
      } else {
        showToast("User not found. Please register the player.");
        setTimeout(() => {
          router.push("/RegistartionPage");
        }, 2000);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Something went wrong. Please try again.",
      );
    } finally {
      setSearchLoading(false);
      setPlayerId("");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Text style={styles.orText}>or</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter unique code"
          placeholderTextColor="#aaa"
          value={playerId}
          onChangeText={setPlayerId}
          textAlign="center"
        />
      </View>
      {/* Search button — searches player ID if filled, else phone */}
      <SearchButton onPress={handleSearchPress} loading={searchLoading} />
      <View style={styles.inputRow}>
        <Text style={styles.orText}>or</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Mobile number"
          placeholderTextColor="#aaa"
          keyboardType="numeric"
          value={mobileNumber}
          onChangeText={(text) =>
            setMobileNumber(text.replace(/[^0-9]/g, "").slice(0, 10))
          }
          maxLength={10}
          textAlign="center"
        />
      </View>
    </View>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    alignItems: "flex-start",
    justifyContent: "center",
    position: "relative",
    marginVertical: screenHeight * 0.01,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    width: screenWidth * 0.82,
    marginVertical: screenHeight * 0.01,
  },
  orText: {
    color: "#aaa",
    fontSize: 14,
    fontFamily: "Roboto-Medium",
    position: "absolute",
    left: 10,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
    fontFamily: "Roboto-Medium",
    marginHorizontal: "15%",
  },
});
