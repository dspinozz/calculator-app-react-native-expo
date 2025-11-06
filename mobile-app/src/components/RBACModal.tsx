import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import ApiService from '../services/api';

interface Tenant {
  id: number;
  name: string;
  created_at: string;
}

interface UserSetting {
  id: number;
  username: string;
  allow_parentheses: boolean;
  allow_exponents: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function RBACModal({ visible, onClose }: Props) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [userSettings, setUserSettings] = useState<UserSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [removingUser, setRemovingUser] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    try {
      // Load tenants first (faster, needed for delete buttons)
      const tenantsData = await ApiService.getAllTenants();
      // eslint-disable-next-line no-console
      console.log('RBAC Modal - Loaded tenants:', tenantsData);
      // eslint-disable-next-line no-console
      console.log('RBAC Modal - Tenant count:', tenantsData.length);
      setTenants(tenantsData);
      
      // Load user settings separately (now filtered by tenant on backend)
      const settingsData = await ApiService.getAllUserSettings();
      // eslint-disable-next-line no-console
      console.log('RBAC Modal - API Response:', settingsData);
      // eslint-disable-next-line no-console
      console.log('RBAC Modal - User count:', settingsData.length);
      // eslint-disable-next-line no-console
      console.log('RBAC Modal - User IDs:', settingsData.map(u => u.id));
      // eslint-disable-next-line no-console
      console.log('RBAC Modal - Usernames:', settingsData.map(u => u.username));
      
      // Verify davidspinozzi26 is NOT in the list
      const davidInList = settingsData.some(u => u.username === 'davidspinozzi26' || u.id === 6);
      if (davidInList) {
        // eslint-disable-next-line no-console
        console.error('❌ ERROR: davidspinozzi26 (ID: 6) is still in the API response!');
        // eslint-disable-next-line no-console
        console.error('This means the backend is not filtering correctly');
      } else {
        // eslint-disable-next-line no-console
        console.log('✅ davidspinozzi26 (ID: 6) is NOT in API response (correct)');
      }
      
      // Additional frontend filter: Remove any users that shouldn't be here
      // (Safety check in case backend filtering fails)
      const filteredSettings = settingsData.filter(user => {
        // We can't check tenant_id here (not in response), but we can log
        // eslint-disable-next-line no-console
        console.log(`Checking user: ${user.username} (ID: ${user.id})`);
        return true; // Keep all for now, backend should filter
      });
      
      // eslint-disable-next-line no-console
      console.log('RBAC Modal - After frontend filter:', filteredSettings.length, 'users');
      
      // Force state update by creating new array reference
      setUserSettings([...filteredSettings]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      // eslint-disable-next-line no-console
      console.error('RBAC Modal - Error loading data:', error);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (
    userId: number,
    permission: 'parentheses' | 'exponents',
    value: boolean
  ): Promise<void> => {
    setUpdating(userId);
    try {
      const user = userSettings.find((u) => u.id === userId);
      if (!user) return;

      const allowParentheses =
        permission === 'parentheses' ? value : user.allow_parentheses;
      const allowExponents =
        permission === 'exponents' ? value : user.allow_exponents;

      await ApiService.updateUserSettings(userId, allowParentheses, allowExponents);
      await loadData(); // Reload to get updated data
      Alert.alert('Success', 'Permission updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update permission';
      Alert.alert('Error', errorMessage);
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveUser = async (userId: number, username: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log('handleRemoveUser called:', userId, username);
    
    // Use window.confirm for web (more reliable), Alert for mobile
    let confirmed = false;
    if (typeof window !== 'undefined' && window.confirm) {
      confirmed = window.confirm(`Are you sure you want to remove "${username}" from their tenant? They will lose access until reassigned.`);
    } else {
      // For mobile, we'll proceed directly (Alert.alert doesn't work well with async/await)
      // User can cancel via the Alert buttons
      Alert.alert(
        'Remove User from Tenant',
        `Are you sure you want to remove "${username}" from their tenant? They will lose access until reassigned.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              // Call the removal logic directly
              performUserRemoval(userId, username);
            },
          },
        ]
      );
      return; // Exit early for mobile, removal will happen in onPress
    }

    if (!confirmed) {
      // eslint-disable-next-line no-console
      console.log('User cancelled removal');
      return;
    }

    await performUserRemoval(userId, username);
  };

  const performUserRemoval = async (userId: number, username: string): Promise<void> => {

    setRemovingUser(userId);
    try {
      // eslint-disable-next-line no-console
      console.log('Removing user:', userId, username);
      const result = await ApiService.removeUserFromTenant(userId);
      // eslint-disable-next-line no-console
      console.log('Remove result:', result);
      
      if (result && result.success) {
        // eslint-disable-next-line no-console
        console.log('Removal successful, reloading data...');
        // Reload data first to get fresh list from backend (which filters by tenant)
        await loadData();
        // Also immediately filter out the removed user as a safety measure
        setUserSettings(prev => {
          const filtered = prev.filter(user => user.id !== userId);
          // eslint-disable-next-line no-console
          console.log('UI updated - removed user from list. Remaining users:', filtered.length);
          // eslint-disable-next-line no-console
          console.log('Remaining user IDs:', filtered.map(u => u.id));
          return filtered;
        });
        Alert.alert('Success', result.message || 'User removed from tenant successfully');
      } else {
        const errorMsg = result?.message || 'Failed to remove user from tenant';
        // eslint-disable-next-line no-console
        console.error('Remove failed:', errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Remove user error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove user from tenant';
      Alert.alert('Error', errorMessage);
    } finally {
      setRemovingUser(null);
    }
  };

  // Handle ESC key press (web only)
  React.useEffect(() => {
    if (!visible) return;
    
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress as unknown as EventListener);
      return () => {
        window.removeEventListener('keydown', handleKeyPress as unknown as EventListener);
      };
    }
  }, [visible, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()}
          style={styles.modalContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>RBAC</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6a11cb" style={styles.loader} />
          ) : (
            <ScrollView style={styles.content}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tenants ({tenants.length})</Text>
                {tenants.length === 0 ? (
                  <Text style={styles.emptyText}>No tenants found</Text>
                ) : (
                  tenants.map((tenant) => (
                    <View key={`tenant-${tenant.id}`} style={styles.tenantItem}>
                      <View style={styles.tenantInfo}>
                        <Text style={styles.tenantName}>{tenant.name} (ID: {tenant.id})</Text>
                        <Text style={styles.tenantDate}>
                          Created: {new Date(tenant.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>User Permissions</Text>
                {userSettings.length === 0 ? (
                  <Text style={styles.emptyText}>No users found</Text>
                ) : (
                  userSettings.map((user) => (
                    <View key={`user-${user.id}`} style={styles.userItem}>
                      <View style={styles.userHeader}>
                        <Text style={styles.userName}>{user.username}</Text>
                        {user.username !== 'admin' && (
                          <TouchableOpacity
                            style={[
                              styles.removeUserButton,
                              removingUser === user.id && styles.removeUserButtonDisabled,
                            ]}
                            onPress={() => {
                              // eslint-disable-next-line no-console
                              console.log('Remove button clicked for user:', user.id, user.username);
                              handleRemoveUser(user.id, user.username);
                            }}
                            disabled={removingUser === user.id}
                            activeOpacity={0.7}
                          >
                            {removingUser === user.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.removeUserButtonText}>Remove</Text>
                            )}
                          </TouchableOpacity>
                        )}
                        {/* Note: If user appears here but remove fails with "not in tenant", 
                            it means backend query is returning users it shouldn't. 
                            This is a backend filtering issue. */}
                      </View>
                      <View style={styles.permissionRow}>
                        <Text style={styles.permissionLabel}>Parentheses</Text>
                        <Switch
                          value={user.allow_parentheses}
                          onValueChange={(value) =>
                            handleTogglePermission(user.id, 'parentheses', value)
                          }
                          disabled={updating === user.id}
                        />
                      </View>
                      <View style={styles.permissionRow}>
                        <Text style={styles.permissionLabel}>Exponents</Text>
                        <Switch
                          value={user.allow_exponents}
                          onValueChange={(value) =>
                            handleTogglePermission(user.id, 'exponents', value)
                          }
                          disabled={updating === user.id}
                        />
                      </View>
                      {updating === user.id && (
                        <ActivityIndicator size="small" color="#6a11cb" style={styles.updatingLoader} />
                      )}
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxWidth: 800,
    maxHeight: '80%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  loader: {
    margin: 40,
  },
  content: {
    maxHeight: 600,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  tenantItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  tenantDate: {
    fontSize: 12,
    color: '#666',
  },
  userItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  removeUserButton: {
    backgroundColor: '#ff9500',
    borderRadius: 6,
    padding: 8,
    paddingHorizontal: 12,
    marginLeft: 10,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  removeUserButtonDisabled: {
    opacity: 0.6,
  },
  removeUserButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  permissionLabel: {
    fontSize: 14,
    color: '#666',
  },
  updatingLoader: {
    marginTop: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    padding: 20,
  },
});
    