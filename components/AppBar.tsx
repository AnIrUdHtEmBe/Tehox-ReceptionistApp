import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../theme/Colors";
interface AppBarProps {
  title: string;
  titleStyle?: TextStyle;
  onMenuPress?: () => void;
  logoSource?: any;
  titleFontWeight?: "regular" | "bold";
}

const { height } = Dimensions.get("window");

const AppBar: React.FC<AppBarProps> = ({
  title,
  titleStyle,
  onMenuPress,
  logoSource,
  titleFontWeight = "regular",
}) => {
  const getTitleFontFamily = () => {
    if (titleFontWeight === "bold") {
      return "Inter-Bold";
    }
    return "Inter-Regulars";
  };
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onMenuPress}>
          <Text style={styles.menu}>☰</Text>
        </TouchableOpacity>

        <View pointerEvents="none" style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              { fontFamily: getTitleFontFamily() },
              titleStyle,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {logoSource ? (
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={styles.logoPlaceholder} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default AppBar;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.background,
    elevation: 4,
    height: height * 0.15,
  },
  container: {
    height: height * 0.1,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // marginTop:5,
    paddingTop: 20,
    // elevation:4,
  },
  menu: {
    fontSize: 24,
  },
  titleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  title: {
    paddingTop: 15, // ← remove position/left/right from here
    textAlign: "center",
    fontSize: 20,
    fontFamily: "Inter-Regular",
    lineHeight: 100,
    letterSpacing: 0,
  },
  logo: {
    width: 64,
    height: 25,
    backgroundColor: "black",
  },
  logoPlaceholder: {
    width: 64,
    height: 25,
  },
});
