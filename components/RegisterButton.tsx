import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

const { width } = Dimensions.get('window');

interface RegistrationButtonProps {
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  title?: string;
  loadingTitle?: string;
}

const RegistrationButton: React.FC<RegistrationButtonProps> = ({
  onPress,
  disabled = false,
  isLoading = false,
  title = 'Register',
  loadingTitle = 'Registering...',
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isDisabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <>
          <ActivityIndicator color="#fff" style={styles.loader} />
          <Text style={[styles.buttonText, isDisabled && styles.buttonTextDisabled]}>
            {loadingTitle}
          </Text>
        </>
      ) : (
        <Text style={[styles.buttonText, isDisabled && styles.buttonTextDisabled]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position:'absolute',
    right:width*0.08,
    top:"108%",
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 40,
    width: width * 0.34,
    flexDirection: 'row',
  },
  buttonDisabled: {
    backgroundColor: '#ADADAD',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,

  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily:'Roboto-Medium',
    letterSpacing:0.7
  },
  buttonTextDisabled: {
    color: '#FFFFFF',
  },
  loader: {
    marginRight: 10,
  },
});

export default RegistrationButton;