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
import Colors from '../theme/Colors';

interface HomeButtonProps {
  onPress?: () => void;
  width?: DimensionValue;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

const HomeButton: React.FC<HomeButtonProps> = ({
  onPress,
  width = 124,
  height = 40,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, { width, height }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
      
        <Text style={styles.text}>Go to Home</Text>
      </View>
    </TouchableOpacity>
  );
};

export default HomeButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom:40,
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
    letterSpacing:0.1,
    lineHeight:20,
  },
});
