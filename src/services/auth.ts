import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BACKEND_URL } from '../utils/constants';

export interface SignupResponse {
  token: string;
  user_id: number;
  username: string;
  role: string;
}

export interface SignupCredentials {
  email: string;
  username: string;
  password: string;
}

export interface SignupResult {
  token: string;
  role: string;
  username: string;
}

export const signup = async (credentials: SignupCredentials): Promise<SignupResult> => {
  try {
    const response = await axios.post<SignupResponse>(
      `${BACKEND_URL}/api/auth/signup`,
      credentials
    );

    const { token, role, username } = response.data;

    // Save to AsyncStorage
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_role', role);
    await AsyncStorage.setItem('username', username);

    return { token, role, username };
  } catch (error: any) {
    const errorMessage = 
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      'Signup failed';
    
    throw new Error(errorMessage);
  }
};

export const login = async (email: string, password: string): Promise<SignupResult> => {
  try {
    const response = await axios.post<SignupResponse>(
      `${BACKEND_URL}/api/auth/login`,
      { email, password }
    );

    const { token, role, username } = response.data;

    // Save to AsyncStorage
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_role', role);
    await AsyncStorage.setItem('username', username);

    return { token, role, username };
  } catch (error: any) {
    const errorMessage = 
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      'Login failed';
    
    throw new Error(errorMessage);
  }
};

export const logout = async (): Promise<void> => {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('user_role');
  await AsyncStorage.removeItem('username');
};