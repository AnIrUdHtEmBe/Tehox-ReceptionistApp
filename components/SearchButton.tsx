
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  DimensionValue,
  ActivityIndicator,
} from 'react-native';

import Colors from '../theme/Colors';

interface SearchButtonProps {
  onPress?: () => void;
  width?: DimensionValue;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
}

const SearchButton: React.FC<SearchButtonProps> = ({
  onPress,
  width = 80,
  height = 70,
  style,
  loading = false,
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
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Text style={styles.text}>Search</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default SearchButton;

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top:"20%",
    right:10, 
    backgroundColor: Colors.background,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
});

