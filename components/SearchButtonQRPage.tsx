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

const SearchButtonQRPage: React.FC<SearchButtonProps> = ({
  onPress,
  width = 180,
  height = 60,
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

export default SearchButtonQRPage;

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.background,
    borderRadius: 100,
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
    fontWeight: '500',
  },
});
