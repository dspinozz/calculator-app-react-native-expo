import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ApiService from '../services/api';

interface AuditLog {
  id: number;
  username: string;
  action: string;
  resource?: string;
  expression?: string;
  result?: string;
  timestamp: string;
}

interface AuditUser {
  id: number;
  username: string;
  log_count: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AuditLoggingModal({ visible, onClose }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, selectedUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async (): Promise<void> => {
    setLoading(true);
    try {
      const [logsData, usersData] = await Promise.all([
        ApiService.getAuditLogs(100, selectedUserId || undefined),
        ApiService.getAuditUsers(),
      ]);
      setLogs(logsData);
      setUsers(usersData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load audit logs';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.username.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.resource?.toLowerCase().includes(query) ||
      log.expression?.toLowerCase().includes(query) ||
      log.result?.toLowerCase().includes(query)
    );
  });

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
            <Text style={styles.title}>Audit Logging</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search logs..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {selectedUserId && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => {
                  setSelectedUserId(null);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.clearFilterText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>

          {users.length > 0 && (
            <ScrollView horizontal style={styles.userFilter}>
              {users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userFilterButton,
                    selectedUserId === user.id && styles.userFilterButtonActive,
                  ]}
                  onPress={() => setSelectedUserId(user.id)}
                >
                  <Text
                    style={[
                      styles.userFilterText,
                      selectedUserId === user.id && styles.userFilterTextActive,
                    ]}
                  >
                    {user.username} ({user.log_count})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#6a11cb" style={styles.loader} />
          ) : (
            <ScrollView style={styles.logsContainer}>
              {filteredLogs.length === 0 ? (
                <Text style={styles.emptyText}>No audit logs found</Text>
              ) : (
                filteredLogs.map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <View style={styles.logHeader}>
                      <Text style={styles.logUsername}>{log.username}</Text>
                      <Text style={styles.logTimestamp}>
                        {new Date(log.timestamp).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={styles.logAction}>Action: {log.action}</Text>
                    {log.resource && <Text style={styles.logDetail}>Resource: {log.resource}</Text>}
                    {log.expression && (
                      <Text style={styles.logDetail}>Expression: {log.expression}</Text>
                    )}
                    {log.result && <Text style={styles.logDetail}>Result: {log.result}</Text>}
                  </View>
                ))
              )}
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
  searchContainer: {
    marginBottom: 15,
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  clearFilterButton: {
    padding: 12,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
  },
  clearFilterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userFilter: {
    maxHeight: 50,
    marginBottom: 15,
  },
  userFilterButton: {
    padding: 8,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  userFilterButtonActive: {
    backgroundColor: '#6a11cb',
  },
  userFilterText: {
    fontSize: 12,
    color: '#333',
  },
  userFilterTextActive: {
    color: '#fff',
  },
  loader: {
    margin: 40,
  },
  logsContainer: {
    maxHeight: 400,
  },
  logItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  logAction: {
    fontSize: 14,
    color: '#6a11cb',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 40,
  },
});

