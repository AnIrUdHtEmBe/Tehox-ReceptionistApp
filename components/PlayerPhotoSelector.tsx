

import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Colors from '../theme/Colors';

const { width, height } = Dimensions.get('window');

const avatars = [
  { id: 1, name:'avatar1', source: require('../assets/images/avatar1.png') },
  { id: 2, name:'avatar2', source: require('../assets/images/avatar2.png') },
  { id: 3, name:'avatar3', source: require('../assets/images/avatar3.png') },
  { id: 4, name:'avatar4', source: require('../assets/images/avatar4.png') },
  { id: 5, name:'avatar5', source: require('../assets/images/avatar5.png') },
];


const PlayerPhotoSelector: React.FC<{
  selectedPhoto: any;
  onPhotoSelect: (photo: any) => void;
  error?: string;
}> = ({ selectedPhoto, onPhotoSelect, error }) => {
  const [hasPhoto, setHasPhoto] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(null);

  const handleAvatarSelect = (avatar: any) => {
    const photo = { 
      source: avatar.source, 
      type: 'avatar',
      avatarName: avatar.name,
    };
    onPhotoSelect(photo);
    setHasPhoto(false);
    setSelectedAvatarId(avatar.id);
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.back,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const photo = { uri: result.assets[0].uri, type: 'photo' };
      onPhotoSelect(photo);
      setHasPhoto(true);
      setSelectedAvatarId(null); 
    }
  };

  const renderProfileImage = () => {
    if (selectedPhoto) {
      if (selectedPhoto.type === 'avatar') {
        return (
          <Image source={selectedPhoto.source} style={styles.profileImage} />
        );
      } else {
        return (
          <Image source={{ uri: selectedPhoto.uri }} style={styles.profileImage} />
        );
      }
    }

    return (
      <View style={styles.placeholderContainer}>
        <View style={styles.placeholderIcon}>
          <View style={styles.head} />
          <View style={styles.body} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Player Photo</Text>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.avatarRow}
        contentContainerStyle={styles.avatarRowContent}
      >
        {avatars.map((avatar) => {
          const isSelected = avatar.id === selectedAvatarId;
          return (
            <TouchableOpacity
              key={avatar.id}
              onPress={() => handleAvatarSelect(avatar)}
              style={[
                styles.avatarContainer,
                isSelected && styles.selectedAvatar, 
              ]}
            >
              <Image
                source={avatar.source}
                style={styles.avatarImage}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      <View style={styles.profileContainer}>{renderProfileImage()}</View>

      <TouchableOpacity
        style={styles.photoButton}
        onPress={handleTakePhoto}
      >
        <Text style={styles.photoButtonText}>
          {hasPhoto ? 'Edit photo' : 'Take photo'}
        </Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
 
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    letterSpacing: 0.3,
    color: 'black',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  avatarRow: {
    maxHeight: 80,
    marginBottom: height * 0.003,
    width: width * 0.8,
  },
  avatarRowContent: {
    paddingHorizontal: width * 0.01,
  },
  avatarContainer: {
    marginHorizontal: 2,
    borderRadius: 100,
    width: 54,
    height: 54,
    opacity:0.5,
  },
  selectedAvatar: {
    borderWidth: 2,
    borderColor: Colors.text, 
    opacity:1,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 100,
  },
  profileContainer: {
    position:'absolute',
    left:width*0.06,
    top:height*0.18,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    alignItems: 'center',
  },
  head: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#333',
    marginBottom: 5,
  },
  body: {
    width: 70,
    height: 45,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    borderWidth: 3,
    borderColor: '#333',
    borderBottomWidth: 0,
  },
  photoButton: {
    position:'absolute',
    right:width*0.015,
    top:"120%",
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    letterSpacing: 0.5,
  },
  errorText: { color: 'red', fontSize: 12, marginTop: 5 },
});

export default PlayerPhotoSelector;
