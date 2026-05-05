import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ImagePickerResult {
  success: boolean;
  uri?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  size?: number;
  error?: string;
}

class ImageService {
  async pickImageFromGallery(): Promise<ImagePickerResult> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Permission to access photo library was denied',
        };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return {
          success: false,
          error: 'Image selection cancelled',
        };
      }

      const asset = result.assets[0];
      return {
        success: true,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType || 'image/jpeg',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to pick image: ${(error as any).message || 'Unknown error'}`,
      };
    }
  }

  async pickImageFromCamera(): Promise<ImagePickerResult> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Permission to access camera was denied',
        };
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return {
          success: false,
          error: 'Photo capture cancelled',
        };
      }

      const asset = result.assets[0];
      return {
        success: true,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType || 'image/jpeg',
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to capture image: ${(error as any).message || 'Unknown error'}`,
      };
    }
  }

  async createFormData(
    imageUri: string,
    latitude: number,
    longitude: number,
    description: string = 'Pothole detected'
  ): Promise<FormData | null> {
    try {
      const formData = new FormData();

      // Add image file
      const imageParts = imageUri.split('/');
      const imageName = imageParts[imageParts.length - 1];

      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: imageName,
      } as any);

      // Add location and description
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('description', description);

      // Add token
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        formData.append('token', token);
      }

      return formData;
    } catch (error) {
      console.error('Failed to create form data:', error);
      return null;
    }
  }
}

export const imageService = new ImageService();
