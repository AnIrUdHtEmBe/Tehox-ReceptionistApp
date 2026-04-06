import axios from "axios";
import { Camera, CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppBar from "../components/AppBar";
import BackButton from "../components/CrossButton";
import InputFieldsQRPage from "../components/inputFieldsQRPage";
import SearchButtonQRPage from "../components/SearchButtonQRPage";
import Colors from "../theme/Colors";
import { showToast } from "../utils/Toast";

// ScanQrPage contains qr scanner and input fields
export default function ScanQRPage() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const BASE_URL = process.env.EXPO_PUBLIC_API;
  const PHOTO_URL = process.env.EXPO_PUBLIC_CF_DOMAIN;
  const router = useRouter();

  // Request camera permissions if not given
  useEffect(() => {
    requestCameraPermission();
  }, []);

  // Requests for camera permissions
  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      setIsLoading(false);

      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera permission to scan QR codes.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
      }
    } catch (error) {
      showToast?.("Requesting camera permission failed");
      setIsLoading(false);
    }
  };

  // Obtains data by scanning qrcode.
  const handleQRCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);
    let valueToSearch = data;
    try {
      // Extract player_id from raw data
      const parsedData = JSON.parse(data);
      if (parsedData.player_id) {
        setQrCodeData(parsedData.player_id);
        valueToSearch = parsedData.player_id;
      } else {
        setQrCodeData(data);
        console.log(data);
      }
    } catch (error) {
      showToast?.(`Couldn't scan QR`);
      setQrCodeData(data);
    }
    // call search function automatically
    handleSearchPress(valueToSearch);
  };

  // Makes api call to get player data of specific player
  async function handleSearchPress(searchValue?: string) {
    const value = searchValue || qrCodeData || mobileNumber;

    if (!value) {
      Alert.alert(
        "Input Required",
        "Please enter a Player ID or Mobile Number to search.",
      );
      return;
    }

    setSearchLoading(true);

    try {
      const encodedValue = encodeURIComponent(value);

      const response = await axios.get(
        `${BASE_URL}/api/player/${encodedValue}/?player_id_or_phone=${encodedValue}`,
        {
          headers: { Accept: "application/json" },
        },
      );

      if (response.data.player_id) {
        // Generate complete photo url
        const photoUri = response.data.photo
          ? `${PHOTO_URL}/${response.data.photo}`
          : "";
        const paramsToSend = {
          name: response.data.name,
          email: response.data.email,
          gamerTag: response.data.gamer_tag,
          mobile: response.data.phone_no,
          gender: response.data.gender,
          photoType: "photo",
          photoUri: photoUri,
          avatarName: null,
          playerId: response.data.player_id,
        };
        // navigate to VerifyDetailsPage
        router.replace({
          pathname: "/VerifyDetailsPage",
          params: paramsToSend,
        });
      } else {
        showToast("User not found. Please register the player.");

        // If player not found navigate to registration page again
        setTimeout(() => {
          router.replace("/RegistartionPage");
        }, 2000);
      }
    } catch (error) {
      console.error("General Error during search:", error);
      showToast("An unexpected error occurred. Please try again.");
      setScanned(false);
    } finally {
      setSearchLoading(false);
      setQrCodeData("");
      setMobileNumber("");
      setSearchLoading(false);
    }
  }
  // Renders camera frame along with input fields
  const renderContent = () => {
    // loader
    if (isLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            Requesting camera permission...
          </Text>
        </View>
      );
    }
    // if camera permisson is not given load this
    if (hasPermission === false) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>No access to camera</Text>
          <Text style={styles.errorSubText}>
            Please grant camera permission in settings to scan QR codes
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.scannerContainer}>
          {/* Camera frame */}
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleQRCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          >
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </CameraView>

          {searchLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.searchingText}>Searching...</Text>
            </View>
          )}
        </View>

        {/* Manual input fields */}
        <Text style={styles.bottomText}>Try using any of the below method</Text>
        {/* InputFields component for QRPage */}
        <InputFieldsQRPage
          firstValue={qrCodeData}
          onFirstChange={setQrCodeData}
          secondValue={mobileNumber}
          onSecondChange={setMobileNumber}
        />

        <View style={styles.searchButton}>
          {/* Search Button compoenent for qr page */}
          <SearchButtonQRPage
            width={87}
            height={40}
            onPress={() => handleSearchPress()}
            loading={searchLoading}
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <AppBar
        title="Home"
        onMenuPress={() => console.log("Menu pressed")}
        logoSource={require("../assets/images/tehologo.png")}
      />
      {/* BackButton component for navigating to previous page */}
      <BackButton />
      {/* KeyboarddAvoidingView component for avoiding keyboard overlapping on input fields */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {renderContent()}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scannerWrapper: {
    flex: 1,
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 0,
    backgroundColor: "white",
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: "white",
  },
  scannerContainer: {
    width: 272,
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
  },
  camera: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  searchingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  corner: {
    position: "absolute",
    width: 50,
    height: 50,
    borderColor: "#000000ff",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 6,
    borderRightWidth: 6,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderBottomRightRadius: 10,
  },
  bottomText: {
    fontSize: 16,
    fontFamily: "Roboto-Medium",
    lineHeight: 20,
    letterSpacing: 0.5,
    color: Colors.text,
    textAlign: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF3B30",
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  searchButton: {
    marginTop: 20,
  },
});
