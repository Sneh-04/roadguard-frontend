import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { apiService } from '../../services/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllUsers();

      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        Alert.alert('Error', 'Failed to load users');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'delete') => {
    const actions = {
      activate: 'activate',
      deactivate: 'deactivate',
      delete: 'delete',
    };

    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${actions[action]} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              let response;
              if (action === 'delete') {
                // Note: API might not have delete user endpoint, this is placeholder
                Alert.alert('Info', 'Delete user functionality not implemented in API');
                return;
              } else {
                // For activate/deactivate, we might need to update user status
                const user = users.find(u => u.id === userId);
                if (user) {
                  const updatedUser = { ...user, is_active: action === 'activate' };
                  response = await apiService.updateProfile(updatedUser); // Using updateProfile as placeholder
                }
              }

              if (response?.success) {
                await loadUsers(); // Refresh the list
                Alert.alert('Success', `User ${actions[action]}d successfully`);
              } else {
                Alert.alert('Error', `Failed to ${actions[action]} user`);
              }
            } catch (error) {
              console.error(`Failed to ${action} user:`, error);
              Alert.alert('Error', `Failed to ${actions[action]} user`);
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.is_active ? colors.success : colors.textMuted },
            ]}
          >
            <Text style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userRole}>
          Role: {(item?.role ? item.role.charAt(0).toUpperCase() + item.role.slice(1) : "User")}
        </Text>
        <Text style={styles.userJoined}>
          Joined: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => Alert.alert('Edit User', 'Edit functionality coming soon')}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            item.is_active ? styles.deactivateButton : styles.activateButton,
          ]}
          onPress={() => handleUserAction(item.id, item.is_active ? 'deactivate' : 'activate')}
        >
          <Text style={item.is_active ? styles.deactivateButtonText : styles.activateButtonText}>
            {item.is_active ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {users.filter(u => u.is_active).length}
          </Text>
          <Text style={styles.statLabel}>Active Users</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {users.filter(u => u.role === 'admin').length}
          </Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No users found matching your search' : 'No users found'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  loadingText: {
    ...typography.text.lg,
    color: colors.text,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.text.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    ...typography.text.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    ...typography.text.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.text.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  userItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    marginBottom: spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  userName: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...typography.text.xs,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
  userEmail: {
    ...typography.text.md,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  userRole: {
    ...typography.text.sm,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  userJoined: {
    ...typography.text.sm,
    color: colors.textMuted,
  },
  userActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.surfaceLight,
  },
  editButtonText: {
    ...typography.text.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
  activateButton: {
    backgroundColor: colors.success,
  },
  activateButtonText: {
    ...typography.text.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
  deactivateButton: {
    backgroundColor: colors.danger,
  },
  deactivateButtonText: {
    ...typography.text.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.text.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});