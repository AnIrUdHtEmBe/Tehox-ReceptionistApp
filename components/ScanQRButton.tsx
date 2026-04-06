import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../theme/Colors';

interface ScanQRButtonProps {
  onPress?: () => void;
  width?: DimensionValue;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

const ScanQRButton: React.FC<ScanQRButtonProps> = ({
  onPress,
  width = 180,
  height = 60,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, { width, height }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons name="qrcode-scan" size={20} color="#fff" />
        <Text style={styles.text}>Scan QR</Text>
      </View>
    </TouchableOpacity>
  );
};

export default ScanQRButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,

  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: Colors.background,
    fontSize: 14,
    marginLeft: 8,
    fontFamily:'Roboto-Medium',
    lineHeight: 20,
    letterSpacing:0.1,
  },

});
