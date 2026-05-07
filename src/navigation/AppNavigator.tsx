import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import UserNavigator from './UserNavigator';
import AdminNavigator from './AdminNavigator';

export default function AppNavigator() {
  const [mode, setMode] = useState<'user' | 'admin'>('user');

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.switchBar}>
        <TouchableOpacity
          style={[
            styles.button,
            mode === 'user' && styles.activeButton,
          ]}
          onPress={() => setMode('user')}
        >
          <Text style={styles.text}>USER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            mode === 'admin' && styles.activeButton,
          ]}
          onPress={() => setMode('admin')}
        >
          <Text style={styles.text}>ADMIN</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {mode === 'user' ? <UserNavigator /> : <AdminNavigator />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switchBar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    paddingTop: 50,
    paddingBottom: 10,
    justifyContent: 'center',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#374151',
    marginHorizontal: 10,
    borderRadius: 12,
  },
  activeButton: {
    backgroundColor: '#06b6d4',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
});
