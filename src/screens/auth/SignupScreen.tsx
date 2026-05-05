import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { signup } from '../../services/auth';

export default function SignupScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    agreeToTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{fullName?: string; username?: string; email?: string; password?: string; confirmPassword?: string; agreeToTerms?: string}>({});

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: {fullName?: string; username?: string; email?: string; password?: string; confirmPassword?: string; agreeToTerms?: string} = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) newErrors.username = 'Username can only contain letters, numbers, and underscores';

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await signup({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        username: formData.username.trim(),
      });

      // Navigate based on role
      if (result.role === 'admin') {
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'AdminNavigator' }],
        });
      } else {
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'UserNavigator' }],
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      const message = (error as any)?.message || 'Signup failed';
      Alert.alert('Signup Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>RoadGuard-AI</Text>
          <Text style={styles.appTagline}>Intelligent Road Safety</Text>
        </View>

        {/* Signup Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the road safety revolution</Text>

          {/* Full Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) => updateFormData('fullName', text)}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          {/* Username */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🏷</Text>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={(text) => updateFormData('username', text)}
                placeholder="Choose a username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => updateFormData('email', text)}
                placeholder="Enter your email"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => updateFormData('password', text)}
                placeholder="Create a password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔐</Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData('confirmPassword', text)}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {/* Role Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Account Type</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'user' && styles.roleButtonSelected,
                ]}
                onPress={() => updateFormData('role', 'user')}
              >
                <Text style={[
                  styles.roleButtonText,
                  formData.role === 'user' && styles.roleButtonTextSelected,
                ]}>
                  User
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'admin' && styles.roleButtonSelected,
                ]}
                onPress={() => updateFormData('role', 'admin')}
              >
                <Text style={[
                  styles.roleButtonText,
                  formData.role === 'admin' && styles.roleButtonTextSelected,
                ]}>
                  Admin
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms Checkbox */}
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[styles.checkbox, formData.agreeToTerms && styles.checkboxChecked]}
              onPress={() => updateFormData('agreeToTerms', !formData.agreeToTerms)}
            >
              {formData.agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.checkboxText}>
              I agree to the{' '}
              <Text style={[styles.linkText, { color: colors.accent }]}>
                Terms & Privacy Policy
              </Text>
            </Text>
          </View>
          {errors.agreeToTerms && <Text style={styles.errorText}>{errors.agreeToTerms}</Text>}

          {/* Signup Button */}
          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            style={styles.signupButton}
          >
            <LinearGradient
              colors={[colors.secondary, colors.accent]}
              style={styles.signupButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.signupButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Login')}>
              <Text style={[styles.linkText, { color: colors.accent }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  appName: {
    ...typography.text.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  appTagline: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    ...typography.text.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.text.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.text.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    fontSize: 18,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.text.md,
    color: colors.text,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
  },
  errorText: {
    ...typography.text.xs,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleButton: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleButtonSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  roleButtonText: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  roleButtonTextSelected: {
    color: colors.text,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: colors.text,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
  },
  checkboxText: {
    flex: 1,
    ...typography.text.sm,
    color: colors.textMuted,
  },
  linkText: {
    ...typography.text.sm,
    fontWeight: typography.fontWeight.medium,
  },
  signupButton: {
    marginBottom: spacing.lg,
  },
  signupButtonGradient: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  signupButtonText: {
    ...typography.text.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    ...typography.text.md,
    color: colors.textMuted,
  },
});