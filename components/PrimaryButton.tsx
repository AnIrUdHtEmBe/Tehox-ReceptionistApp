import React from "react";
import {
    ActivityIndicator,
    DimensionValue,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import Colors from "../theme/Colors";

interface PrimaryButtonProps {
  onPress?: () => void;
  width?: DimensionValue;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  text?: string;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  onPress,
  width = 180,
  height = 60,
  style,
  loading = false,
  text,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, { width, height }, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.background} />
        ) : (
          <Text style={styles.text}>{text}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default PrimaryButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { flexDirection: "row", alignItems: "center" },
  text: { color: "white", fontSize: 14, fontFamily: "Roboto-Medium" },
});
