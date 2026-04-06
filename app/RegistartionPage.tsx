import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import AppBar from "../components/AppBar";
import PlayerPhotoSelector from "../components/PlayerPhotoSelector";
import ProfileDetailsField from "../components/ProfileDetailsFields";
import RegistrationButton from "../components/RegisterButton";
import Sidebar from "../components/Sidebar";
import { useTournament } from "../context/TournamentContext";
import Colors from "../theme/Colors";
import { parseJwt } from "../utils/parseJwt";

const { width } = Dimensions.get("window");

export default function RegistrationPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    gender: "",
    gamerTag: "",
    photo: null as null | {
      uri?: string;
      source?: any;
      type: "avatar" | "photo";
      avatarName?: string;
    },
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { tournamentId, logout } = useTournament();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const BASE_URL = process.env.EXPO_PUBLIC_API;
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleLogout = async () => {
    setSidebarOpen(false);
    await logout();
    router.replace("/LoginPage");
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[\w-.]+..([\w-]+\.)+[\w-]{2,4}$/.test(formData.email))
      newErrors.email = "Invalid email format";
    if (!formData.mobile.trim()) newErrors.mobile = "Mobile number is required";
    else if (!/^\d{10}$/.test(formData.mobile))
      newErrors.mobile = "Mobile number must be 10 digits";
    if (!formData.gender) newErrors.gender = "Please select gender";
    if (!formData.photo) newErrors.photo = "Please select a profile photo";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem("staff_token");
      const payload = token ? parseJwt(token) : null;
      const resolvedTournamentId = payload?.tournament_id || tournamentId;

      const createUser = await axios.post(
        `${BASE_URL}/api/player/signup/`,
        {
          playerName: formData.name,
          gamerTag: formData.gamerTag,
          email: formData.email,
          phoneNo: formData.mobile,
          password: formData.mobile,
          gender: formData.gender,
          tournamentID: resolvedTournamentId,
        },
        { headers: { "Content-Type": "application/json" } },
      );

      if (createUser.status !== 200) {
        Alert.alert("Error", "Failed to create user.");
        setIsLoading(false);
        return;
      }

      console.log("User created", createUser.data);

      const loginUser = await axios.post(
        `${BASE_URL}/api/player/login/`,
        { username: formData.email, password: formData.mobile },
        { headers: { "Content-Type": "application/json" } },
      );

      if (loginUser.status !== 200) {
        Alert.alert("Error", "User created but login failed.");
        setIsLoading(false);
        return;
      }

      console.log("Login successful");

      // Pure utility — does NOT touch loading state
      const compressImage = async (uri: string): Promise<string> => {
        try {
          const result = await manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.7, format: SaveFormat.JPEG },
          );
          return result.uri;
        } catch (error) {
          console.error("Image compression error:", error);
          return uri; // fall back to original
        }
      };

      // Bug fix: use expo-asset to resolve bundled asset to a real file URI
      const getFileFromAvatar = async (source: any) => {
        const asset = Asset.fromModule(source);
        await asset.downloadAsync();
        let localUri = asset.localUri ?? asset.uri;

        // Ensure it's a file:// path for expo-image-manipulator and fetch
        if (localUri && !localUri.startsWith("file://")) {
          const cacheFile = `${FileSystem.cacheDirectory}avatar_${asset.name}.${asset.type}`;
          await FileSystem.copyAsync({ from: localUri, to: cacheFile });
          localUri = cacheFile;
        }

        const compressedUri = await compressImage(localUri);
        const finalUri =
          Platform.OS === "android" && !compressedUri.startsWith("file://")
            ? `file://${compressedUri}`
            : compressedUri;

        return { uri: finalUri, name: "avatar.jpg", type: "image/jpeg" };
      };

      let file: { uri: string; name: string; type: string } | undefined;

      if (formData.photo?.type === "avatar" && formData.photo?.source) {
        file = await getFileFromAvatar(formData.photo.source);
      } else if (formData.photo?.uri) {
        const compressedUri = await compressImage(formData.photo.uri);
        const finalUri =
          Platform.OS === "android" && !compressedUri.startsWith("file://")
            ? `file://${compressedUri}`
            : compressedUri;
        file = { uri: finalUri, name: "profile.jpg", type: "image/jpeg" };
      }

      if (!file) {
        Alert.alert("Success", "Registration completed without photo!");
        setIsLoading(false);
        return;
      }

      // Single FormData — no duplicate
      const uploadFormData = new FormData();
      uploadFormData.append("photo", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);

      console.log("Uploading photo:", file.uri);

      const uploadResponse = await fetch(
        `${BASE_URL}/api/player/upload-photo`,
        {
          method: "POST",
          body: uploadFormData,
          headers: {
            Authorization: `Bearer ${loginUser.data.access_token}`,
            // Do NOT set Content-Type manually — fetch sets multipart boundary automatically
          },
        },
      );

      if (uploadResponse.status !== 200) {
        const responseText = await uploadResponse.text();
        console.error("Upload failed:", uploadResponse.status, responseText);
        Alert.alert(
          "Warning",
          uploadResponse.status === 413
            ? "Image is too large. Please try a smaller photo."
            : "User created but photo upload failed.",
        );
        setIsLoading(false);
        return;
      }

      console.log("Photo uploaded successfully");
      setIsLoading(false);

      return router.push({
        pathname: "/VerifyDetailsPage",
        params: {
          name: formData.name,
          email: formData.email,
          gamerTag: formData.gamerTag,
          mobile: formData.mobile,
          gender: formData.gender,
          photoType: formData.photo?.type ?? null,
          photoUri:
            formData.photo?.type === "photo" ? formData.photo.uri : null,
          avatarName:
            formData.photo?.type === "avatar"
              ? formData.photo.avatarName
              : null,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", "Something went wrong.");
      setIsLoading(false);
    }
  };

  const isFormComplete =
    formData.name.trim() &&
    formData.email.trim() &&
    /^[\w-.]+..([\w-]+\.)+[\w-]{2,4}$/.test(formData.email) &&
    formData.mobile.trim() &&
    /^\d{10}$/.test(formData.mobile) &&
    formData.gender &&
    formData.photo;

  return (
    <View style={styles.container}>
      <AppBar
        title="Registration"
        titleFontWeight="bold"
        onMenuPress={() => setSidebarOpen(true)}
        logoSource={require("../assets/images/tehologo.png")}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContent}>
          <ProfileDetailsField
            formData={formData}
            onChange={handleFieldChange}
            errors={errors}
          />

          <PlayerPhotoSelector
            selectedPhoto={formData.photo}
            onPhotoSelect={(photo) => handleFieldChange("photo", photo)}
            error={errors.photo}
          />

          <RegistrationButton
            disabled={!isFormComplete}
            onPress={handleRegister}
            isLoading={isLoading}
            loadingTitle="Wait"
          />
        </View>
      </ScrollView>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContainer: { flexGrow: 1, width },
  formContent: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 0,
  },
});
