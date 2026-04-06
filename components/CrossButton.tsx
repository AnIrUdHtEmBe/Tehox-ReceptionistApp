import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../theme/Colors';

interface BackButtonProps {
  color?: string; 
  size?: number;  
  style?: object; 
}

export default function BackButton({ 
  color = Colors.text, 
  size = 28, 
  style 
}: BackButtonProps) {
  
  const router = useRouter();

  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } 
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      style={[styles.container, style]}
      accessibilityLabel="Go back to the previous screen"
      accessibilityRole="button"
    >
      <Ionicons name="close" size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10, 
  },
});