import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import AuditLoggingModal from './AuditLoggingModal';
import RBACModal from './RBACModal';
import TenantInviteModal from './TenantInviteModal';

export default function AdminPanel() {
  const { user } = useAuth();
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showRBACModal, setShowRBACModal] = useState<boolean>(false);
  const [showTenantModal, setShowTenantModal] = useState<boolean>(false);

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Panel</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowAuditModal(true)}
        >
          <Text style={styles.actionButtonText}>Audit Logging</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowRBACModal(true)}
        >
          <Text style={styles.actionButtonText}>RBAC</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowTenantModal(true)}
        >
          <Text style={styles.actionButtonText}>Tenant</Text>
        </TouchableOpacity>
      </View>

      <AuditLoggingModal
        visible={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />

      <RBACModal
        visible={showRBACModal}
        onClose={() => setShowRBACModal(false)}
      />

      <TenantInviteModal
        visible={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        onSuccess={() => {
          // Refresh RBAC modal if it's open
          if (showRBACModal) {
            setShowRBACModal(false);
            setTimeout(() => setShowRBACModal(true), 100);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
