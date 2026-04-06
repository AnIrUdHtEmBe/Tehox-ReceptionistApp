
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import FloatingLabelInput from "./FloatingInputField";
import GenderDropdown from "./GenderDropdown";

interface ProfileDetailsFieldProps {
  formData: any;
  onChange: (key: string, value: string) => void;
  errors?: any;
  isDisabled?: boolean; 
  isGenderNeeded?: boolean;
}

export default function ProfileDetailsField({ 
  formData, 
  onChange, 
  errors,
  isDisabled = false,
  isGenderNeeded = true,
}: ProfileDetailsFieldProps) {

  const [localData, setLocalData] = useState(formData);
  const [emailError, setEmailError] = useState<string>("");
  const [mobileError, setMobileError] = useState<string>("");

  useEffect(() => {
    setLocalData(formData);
  }, [formData]);

  // Email validation regex
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Mobile validation - exactly 10 digits
  const validateMobile = (mobile: string): boolean => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
  };

  const handleChange = (key: string, value: string) => {
    if (isDisabled) return; 
    
    setLocalData((prev: any) => ({ ...prev, [key]: value }));
    onChange(key, value);

    // Real-time email validation
    if (key === "email") {
      if (value.trim() === "") {
        setEmailError("Email is required");
      } else if (!validateEmail(value)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
      }
    }

    // Real-time mobile validation
    if (key === "mobile") {
      if (value.trim() === "") {
        setMobileError("Mobile number is required");
      } else if (!validateMobile(value)) {
        setMobileError("Mobile number must be exactly 10 digits");
      } else {
        setMobileError("");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isDisabled} 
      >
        <View style={styles.container}>
          <FloatingLabelInput
            label="Name"
            value={localData.name || ""}
            onChangeText={(text) => handleChange("name", text)}
            placeholder="Enter your name"
            editable={!isDisabled} 
          />
          {errors?.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <FloatingLabelInput
            label="Gamer Tag"
            value={localData.gamerTag || ""}
            onChangeText={(text) => handleChange("gamerTag", text)}
            placeholder="Enter your gamer tag"
            editable={!isDisabled} 
          />
          {errors?.gamerTag && <Text style={styles.errorText}>{errors.gamerTag}</Text>}

          <FloatingLabelInput
            label="Email"
            value={localData.email || ""}
            onChangeText={(text) => handleChange("email", text)}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
            editable={!isDisabled}
          />
          {/* Show email validation error in real-time */}
          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : errors?.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}

          <FloatingLabelInput
            label="Mobile Number"
            value={localData.mobile || ""}
            onChangeText={(text) => handleChange("mobile", text)}
            keyboardType="numeric"
            maxLength={10}
            placeholder="Enter your mobile number"
            editable={!isDisabled} 
          />
          {/* Show mobile validation error in real-time */}
          {mobileError ? (
            <Text style={styles.errorText}>{mobileError}</Text>
          ) : errors?.mobile ? (
            <Text style={styles.errorText}>{errors.mobile}</Text>
          ) : null}

          {isGenderNeeded && (
            <View style={{ marginTop: 20 }}>
              <GenderDropdown
                selectedGender={localData.gender || ""}
                onSelectGender={(gender: string) => handleChange("gender", gender)}
                isDisabled={isDisabled}
              />
              {errors?.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    alignSelf: "flex-start",
    marginTop: 1,
    marginLeft: 5,
  },
});