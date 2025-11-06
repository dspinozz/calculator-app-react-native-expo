// src/screens/NoTenantScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../utils/AuthContext';

export default function NoTenantScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <LinearGradient colors={['#6a11cb', '#2575fc']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>
        
        <Text style={styles.title}>Access Pending</Text>
        
        <Text style={styles.message}>
          Hello <Text style={styles.username}>{user?.username || 'User'}</Text>, 
          your account has been created successfully!
        </Text>
        
        <Text style={styles.message}>
          However, you haven't been assigned to a tenant yet. Please contact 
          your administrator to grant you access.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What does this mean?</Text>
          <Text style={styles.infoText}>• Your account is active but needs tenant assignment</Text>
          <Text style={styles.infoText}>• An administrator must assign you to a tenant</Text>
          <Text style={styles.infoText}>• Once assigned, you'll be able to use all features</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 24,
  },
  username: {
    fontWeight: 'bold',
    color: '#ffd700',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    padding: 20,
    marginTop: 30,
    marginBottom: 30,
    width: '100%',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 10,
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
