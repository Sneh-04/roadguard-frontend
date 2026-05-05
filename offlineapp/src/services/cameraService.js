import {
  CameraRoll,
} from '@react-native-camera-roll/camera-roll';
import { RNCamera } from 'react-native-camera';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

class CameraService {
  constructor() {
    this.cameraRef = null;
  }

  /**
   * Request camera permissions
   */
  async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);

        return (
          permissions[PermissionsAndroid.PERMISSIONS.CAMERA] ===
          PermissionsAndroid.RESULTS.GRANTED
        );
      }
      return true;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  /**
   * Set camera reference
   */
  setCameraRef(ref) {
    this.cameraRef = ref;
  }

  /**
   * Capture photo
   */
  async capturePhoto() {
    try {
      if (!this.cameraRef) {
        throw new Error('Camera not available');
      }

      const options = {
        quality: 0.8,
        base64: true,
        skipProcessing: true,
      };

      const data = await this.cameraRef.takePictureAsync(options);
      console.log('Photo captured:', data.uri);

      return {
        uri: data.uri,
        base64: data.base64 ? `data:image/jpeg;base64,${data.base64}` : null,
      };
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw error;
    }
  }

  /**
   * Convert image to base64
   */
  async imageToBase64(imagePath) {
    try {
      const base64 = await RNFS.readFile(imagePath, 'base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw error;
    }
  }

  /**
   * Save image to app documents
   */
  async saveImage(source, complaintId) {
    try {
      let imagePath;

      if (typeof source === 'string') {
        // If it's a URI
        imagePath = source;
      } else if (source.uri) {
        imagePath = source.uri;
      } else {
        throw new Error('Invalid image source');
      }

      // Create app-specific directory
      const appDocDir = RNFS.DocumentDirectoryPath + '/RoadGuardImages';
      
      // Check if directory exists, create if not
      const dirExists = await RNFS.exists(appDocDir);
      if (!dirExists) {
        await RNFS.mkdir(appDocDir);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${complaintId}_${timestamp}.jpg`;
      const destPath = `${appDocDir}/${filename}`;

      // Copy image to app directory
      await RNFS.copyFile(imagePath, destPath);
      console.log('Image saved:', destPath);

      return destPath;
    } catch (error) {
      console.error('Error saving image:', error);
      throw error;
    }
  }

  /**
   * Delete image
   */
  async deleteImage(imagePath) {
    try {
      await RNFS.unlink(imagePath);
      console.log('Image deleted:', imagePath);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

  /**
   * Compress image
   */
  async compressImage(imagePath, quality = 0.7) {
    try {
      // This would require a specific image compression library
      // For now, just return the original path
      return imagePath;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  }

  /**
   * Get image thumbnail
   */
  async getImageThumbnail(imagePath) {
    try {
      // Return the image path for now
      // In a production app, you'd generate actual thumbnails
      return imagePath;
    } catch (error) {
      console.error('Error getting thumbnail:', error);
      throw error;
    }
  }

  /**
   * Batch process images for sync
   */
  async prepareImagesForSync(imagePaths) {
    try {
      const images = [];

      for (const path of imagePaths) {
        const base64 = await this.imageToBase64(path);
        images.push({
          path,
          base64,
        });
      }

      return images;
    } catch (error) {
      console.error('Error preparing images for sync:', error);
      throw error;
    }
  }
}

// Singleton instance
const cameraService = new CameraService();

export default cameraService;
