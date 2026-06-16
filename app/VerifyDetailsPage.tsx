import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  View,
} from "react-native";
import AppBar from "../components/AppBar";
import RedirectTimer from "../components/CountDown";
import HomeButton from "../components/HomeButton";
import OutlineButton from "../components/OutlinedButton";
import ProfileDetailsField from "../components/ProfileDetailsFields";
import Colors from "../theme/Colors";

const { height } = Dimensions.get("window");

// Verify Details Page contains information about player just to recheck
export default function VerifyDetailsPage() {
  const {
    name,
    mobile,
    photoUri,
    photoType,
    avatarName,
    email,
    gender,
    gamerTag,
    playerId,
  } = useLocalSearchParams();
  const router = useRouter();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // get avatar key based on avatar name which is passed from pervious route.
  const avatarKey = Array.isArray(avatarName) ? avatarName[0] : avatarName;

  // list of all avatar images
  const avatarImages: Record<string, any> = {
    avatar1: require("../assets/images/avatar1.png"),
    avatar2: require("../assets/images/avatar2.png"),
    avatar3: require("../assets/images/avatar3.png"),
    avatar4: require("../assets/images/avatar4.png"),
    avatar5: require("../assets/images/avatar5.png"),
  };

  const handleGoHomePress = () => {
    router.dismissAll();
  };

  const handleTournamentLeaderboardPress = () => {
    const paramsToSend = {
      playerId,
      name,
    };

    router.replace({
      pathname: "/LeaderBoardPage",
      params: paramsToSend,
    });
  };

  // Confirm wheater it is image or avatar based on that genrate url to render image
  const imageSource =
    photoType === "photo" && photoUri
      ? { uri: Array.isArray(photoUri) ? photoUri[0] : photoUri }
      : avatarKey && avatarImages[avatarKey]
        ? avatarImages[avatarKey]
        : null;
  const isRemoteImage = photoType === "photo" && photoUri;

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <View style={styles.container}>
      <AppBar
        title="Verify Details"
        titleFontWeight="bold"
        onMenuPress={() => console.log("Menu pressed")}
        logoSource={require("../assets/images/tehologo.png")}
      />

      <View style={styles.contentArea}>
        {/* Render loading if image is not loaded else render image */}
        {imageSource && (
          <View style={styles.imageContainer}>
            {isRemoteImage && imageLoading && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={Colors.accent} />
              </View>
            )}

            <Image
              source={imageSource}
              style={[
                styles.profileImage,
                imageLoading && isRemoteImage && styles.hiddenImage,
              ]}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />

            {(!isRemoteImage || !imageLoading) && !imageError && (
              <View style={styles.checkBadge}>
                <CheckCircle size={20} color="#4CAF50" fill="#4caf4f08" />
              </View>
            )}
          </View>
        )}

        <View style={{ height: height * 0.43 }}>
          {/* Renders disabled text fields with player's data */}
          <ProfileDetailsField
            isDisabled={true}
            formData={{
              name: name,
              gamerTag: gamerTag,
              email: email,
              mobile: mobile,
              // gender: gender,
            }}
            onChange={() => {
              {
              }
            }}
            isGenderNeeded={false}
          />
        </View>

        {(!isRemoteImage || !imageLoading) && (
          <>
            {/* Redirect Timer component for auto redirect after timeup */}
            <RedirectTimer />
            {/* HomeButton component navigates to home page */}
            {/* <HomeButton onPress={handleGoHomePress} /> */}
            <OutlineButton
              width={170}
              height={40}
              containerStyle={{ marginBottom: 10 }}
              text="KYC Flow"
              onPress={() => {
                const phoneVal = Array.isArray(mobile) ? mobile[0] : mobile;
                router.replace({
                  pathname: "/Playersearchresultscreen",
                  params: { phone: phoneVal },
                });
              }}
            />
            <OutlineButton
              width={170}
              height={40}
              containerStyle={{ marginBottom: 10 }}
              text="Tournament Leaderboard"
              onPress={handleTournamentLeaderboardPress}
            />
            <HomeButton onPress={handleGoHomePress} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentArea: {
    flex: 1,
    alignItems: "center",
    paddingTop: height * 0.04,
  },
  detailsFieldSpacing: {
    marginTop: -20,
  },
  imageContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    width: 100,
    height: 100,
  },
  loaderContainer: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    zIndex: 1,
  },
  profileImage: {
    position: "relative",
    overflow: "hidden",
    width: 100,
    height: 100,
    borderRadius: 100,
  },
  hiddenImage: {
    opacity: 0,
  },
  checkBadge: {
    position: "absolute",
    top: 1,
    right: 4,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 1,
    zIndex: 2,
  },
});
