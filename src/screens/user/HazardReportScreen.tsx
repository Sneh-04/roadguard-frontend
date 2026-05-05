import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { imageService } from '../../services/imageService';
import { useLocation } from '../../hooks/useLocation';
import { apiService } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

export default function HazardReportScreen() {
  const navigation = useNavigation();
  const { location } = useLocation();
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState('Pothole detected');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  const handleTakePhoto = async () => {
    setShowImageOptions(false);
    const result = await imageService.pickImageFromCamera();
    if (result.success && result.uri) {
      setImageUri(result.uri);
    } else {
      Alert.alert('Error', result.error || 'Failed to capture image');
    }
  };

  const handlePickFromGallery = async () => {
    setShowImageOptions(false);
    const result = await imageService.pickImageFromGallery();
    if (result.success && result.uri) {
      setImageUri(result.uri);
    } else {
      Alert.alert('Error', result.error || 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Unable to get your location. Please enable location services.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Create form data with image and metadata
      const formData = new FormData();
      
      // Add image
      const imageParts = imageUri.split('/');
      const imageName = imageParts[imageParts.length - 1] || 'hazard_report.jpg';
      
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: imageName,
      } as any);

      // Add metadata
      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());
      formData.append('description', description);

      // Upload to backend
      const response = await axios.post(
        `${API_BASE_URL}/hazards/report`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        setSubmitted(true);
        // Reset form after 2 seconds
        setTimeout(() => {
          setImageUri(null);
          setDescription('Pothole detected');
          setSubmitted(false);
          Alert.alert(
            'Success',
            'Your hazard report has been submitted to the admin team!',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }, 2000);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const message = error.response?.data?.detail || 
                     error.message ||
                     'Failed to submit report. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Report Hazard</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Hazard Image</Text>
          
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={() => setShowImageOptions(true)}
              >
                <Text style={styles.changeImageButtonText}>Try different image</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.imagePlaceholder}
              onPress={() => setShowImageOptions(true)}
            >
              <Text style={styles.imagePlaceholderText}>📷</Text>
              <Text style={styles.imagePlaceholderLabel}>Select or Take Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Image Options Modal */}
        <Modal visible={showImageOptions} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choose Image Source</Text>
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleTakePhoto}
              >
                <Text style={styles.modalOptionIcon}>📷</Text>
                <Text style={styles.modalOptionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={handlePickFromGallery}
              >
                <Text style={styles.modalOptionIcon}>🖼️</Text>
                <Text style={styles.modalOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOption, styles.cancelOption]}
                onPress={() => setShowImageOptions(false)}
              >
                <Text style={styles.cancelOptionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Location</Text>
          {location ? (
            <View style={styles.locationBox}>
              <Text style={styles.locationText}>
                Latitude: {location.latitude.toFixed(6)}
              </Text>
              <Text style={styles.locationText}>
                Longitude: {location.longitude.toFixed(6)}
              </Text>
            </View>
          ) : (
            <Text style={styles.warningText}>Getting your location...</Text>
          )}
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Describe the hazard..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Success Message */}
        {submitted && (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>Report submitted successfully!</Text>
            <Text style={styles.successSubtext}>Admin will review it shortly</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
        style={[styles.submitButton, (!imageUri || loading) ? styles.submitButtonDisabled : undefined]}
          onPress={handleSubmit}
          disabled={loading || !imageUri}
        >
          <LinearGradient
            colors={[colors.secondary, colors.accent]}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backButton: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
  },
  title: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  imagePlaceholderLabel: {
    color: colors.textMuted,
    ...typography.text.sm,
  },
  changeImageButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  changeImageButtonText: {
    color: colors.accent,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  modalOptionIcon: {
    fontSize: 24,
    marginRight: spacing.lg,
  },
  modalOptionText: {
    color: colors.text,
    ...typography.text.md,
    fontWeight: '600',
  },
  cancelOption: {
    backgroundColor: colors.danger,
  },
  cancelOptionText: {
    color: colors.text,
    ...typography.text.md,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  locationBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
  },
  locationText: {
    color: colors.text,
    ...typography.text.sm,
    marginBottom: spacing.sm,
  },
  warningText: {
    color: colors.warning,
    ...typography.text.sm,
    fontStyle: 'italic',
  },
  descriptionInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  successBox: {
    backgroundColor: `${colors.success}20`,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  successText: {
    color: colors.success,
    ...typography.text.md,
    fontWeight: typography.fontWeight.semibold,
  },
  successSubtext: {
    color: colors.success,
    ...typography.text.sm,
    opacity: 0.8,
  },
  submitButton: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
  },
});
