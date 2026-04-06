import React from 'react';
import { Dimensions, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import Colors from '../theme/Colors';

const { width, height } = Dimensions.get('window');

const scaleSize = (size: number) => (width < 600 ? size : size * 1.4);

interface FloatingLabelInputProps extends TextInputProps {
  label: string;
  containerStyle?: object;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  containerStyle,
  ...rest
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={styles.input}
        placeholderTextColor={Colors.placeholder}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.8,
    marginTop: height * 0.025,
    backgroundColor: Colors.background,
  },
  label: {
    position: 'absolute',
    top: scaleSize(-10),
    left: scaleSize(10),
    backgroundColor: Colors.background,
    paddingHorizontal: scaleSize(5),
    fontSize: scaleSize(12),
    fontFamily: 'Roboto-Regular',
    letterSpacing: 0.3,
    zIndex: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.text,
    borderRadius: scaleSize(4),
    fontSize: scaleSize(16),
    fontFamily: 'Roboto-Regular',
    letterSpacing: 0.1,
    lineHeight: scaleSize(20),
    color: Colors.text,
    paddingHorizontal: scaleSize(15),
    paddingVertical: scaleSize(12),
    height: scaleSize(55),
    backgroundColor: 'white',
  },
});


export default FloatingLabelInput;
