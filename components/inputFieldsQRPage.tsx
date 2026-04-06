
import React from "react";
import { View, Text, TextInput, StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get('window');

interface InputFieldsProps {
  showFirstOr?: boolean;
  firstPlaceholder?: string;
  secondPlaceholder?: string;
  firstValue?: string;
  secondValue?: string;
  onFirstChange?: (text: string) => void;
  onSecondChange?: (text: string) => void;
}

export default function InputFieldsQRPage({
  showFirstOr = true,
  firstPlaceholder = "Enter the unique code",
  secondPlaceholder = "Enter the registered Mobile number",
  firstValue = "",
  secondValue = "",
  onFirstChange,
  onSecondChange,
}: InputFieldsProps) {
  
  const handleFirstChange = (text: string) => {
    if (onFirstChange) {
      onFirstChange(text);
    }
  };

  const handleMobileChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    
    const limitedText = numericText.slice(0, 10);
    
    if (onSecondChange) {
      onSecondChange(limitedText);
    }
  };

  return (
    <View style={styles.container}>
      {showFirstOr && <Text style={styles.orText}>or</Text>}
      <TextInput
        style={styles.input}
        placeholder={firstPlaceholder}
        placeholderTextColor="#aaa"
        value={firstValue}
        onChangeText={handleFirstChange}
        textAlign="center"
      />
      
      <Text style={styles.orText}>or</Text>
      <TextInput
        style={styles.input}
        placeholder={secondPlaceholder}
        placeholderTextColor="#aaa"
        keyboardType="numeric"
        value={secondValue}
        onChangeText={handleMobileChange}
        maxLength={10}
        textAlign="center"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    width: width,
  },
  orText: {
    color: "#aaa",
    marginTop: height * 0.01,
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  input: {
    width: "80%",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
    fontFamily: 'Roboto-Medium',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
});


