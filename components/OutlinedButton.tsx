import React from 'react';
import {
  ActivityIndicator,
  DimensionValue,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import Colors from '../theme/Colors';

interface OutlineButtonProps {
  onPress?: () => void;
  width?: DimensionValue;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;        // existing (kept same)
  containerStyle?: StyleProp<ViewStyle>; // added
  textStyle?: StyleProp<any>;            // added
  loading?: boolean;
  text?: string;
}

const OutlineButton: React.FC<OutlineButtonProps> = ({
  onPress,
  width = 180,
  height = 60,
  style,
  containerStyle,
  textStyle,
  loading = false,
  text,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, { width, height }, style, containerStyle]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Text style={[styles.text, textStyle]}>{text}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};


export default OutlineButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.background,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    // paddingVertical:
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily:'Roboto-Medium'
    // fontWeight: '500',
  },
});
