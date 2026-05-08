import React, { useState } from 'react';
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
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { imageService } from '../../services/imageService';
import { useLocation } from '../../hooks/useLocation';
import { apiService } from '../../services/api';

const hazardOptions = [
  { label: 'Pothole', value: 'POTHOLE', type: 2 },
  { label: 'Speed Breaker', value: 'SPEED_BREAKER', type: 1 },
  { label: 'Other', value: 'OTHER', type: 0 },
];

export default function HazardReportScreen() {
  const navigation = useNavigation();
  const { location } = useLocation();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState('Road surface hazard detected');
  const [hazardType, setHazardType] = useState<{ label: string; value: string; type: number }>(hazardOptions[0]);
  const [confidence, setConfidence] = useState(0.88);
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = async () => {
    const result = await imageService.pickImageFromCamera();
    if (result.success && result.uri) {
      setImageUri(result.uri);
    } else {
      Alert.alert('Error', result.error || 'Failed to capture image');
    }
  };

  const handlePickFromGallery = async () => {
    const result = await imageService.pickImageFromGallery();
    if (result.success && result.uri) {
      setImageUri(result.uri);
    } else {
      Alert.alert('Error', result.error || 'Failed to pick image');
    }
  };

  const prepareUpload = async (uri: string, latitude: number, longitude: number, speed?: number) => {
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    const fileName = compressed.uri.split('/').pop() || 'hazard.jpg';
    const formData = new FormData();

    formData.append('image', {
      uri: compressed.uri,
      name: fileName,
      type: 'image/jpeg',
    } as any);

    formData.append('latitude', String(latitude));
    formData.append('longitude', String(longitude));
    formData.append('hazard_type', hazardType.type.toString());
    formData.append('confidence', confidence.toString());
    formData.append('speed', String(speed != null ? Math.round(speed * 3.6) : 0));
    formData.append('timestamp', new Date().toISOString());
    formData.append('description', description);

    return formData;
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Select Photo', 'Please take or choose a hazard photo before submitting.');
      return;
    }

    const latitude = location?.latitude;
    const longitude = location?.longitude;
    if (!latitude || !longitude) {
      Alert.alert('Location Required', 'Enable location services to report a hazard.');
      return;
    }

    setLoading(true);
    try {
      const formData = await prepareUpload(imageUri, latitude, longitude, location?.speed);
      const response = await apiService.reportHazard(formData);
      if (response.success) {
        Alert.alert('Report Sent', 'Hazard uploaded successfully and shared with the network.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Hazard upload failed:', error);
      Alert.alert('Upload Error', error.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report Hazard</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hazard Photo</Text>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>📷</Text>
              <Text style={styles.imagePlaceholderLabel}>Add hazard photo</Text>
            </View>
          )}
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={handlePickFromGallery}>
              <Text style={styles.photoButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hazard Type</Text>
          <View style={styles.typeSwitchContainer}>
            {hazardOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.typeOption,
                  hazardType.value === option.value && styles.typeOptionActive,
                ]}
                onPress={() => setHazardType(option)}
              >
                <Text style={[styles.typeOptionText, hazardType.value === option.value && styles.typeOptionTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Describe the hazard or road condition"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Location</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>Lat: {location?.latitude?.toFixed(6) ?? 'n/a'}</Text>
            <Text style={styles.locationText}>Lon: {location?.longitude?.toFixed(6) ?? 'n/a'}</Text>
          </View>
          <Text style={styles.locationSubtext}>Speed: {location?.speed != null ? Math.round(location.speed * 3.6) : 0} km/h</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading ? styles.submitDisabled : null]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={[colors.secondary, colors.accent]}
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Upload Hazard</Text>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.text,
    fontSize: 18,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  imagePreview: {
    width: '100%',
    height: 260,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  imagePlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  imagePlaceholderText: {
    color: colors.textMuted,
    fontSize: 40,
  },
  imagePlaceholderLabel: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  photoButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  typeSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  typeOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    marginBottom: spacing.sm,
    minWidth: '30%',
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typeOptionText: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  typeOptionTextActive: {
    color: colors.text,
  },
  descriptionInput: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    textAlignVertical: 'top',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationText: {
    color: colors.text,
    fontSize: 13,
  },
  locationSubtext: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  submitButton: {
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  submitGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 22,
  },
  submitText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  submitDisabled: {
    opacity: 0.7,
  },
});
