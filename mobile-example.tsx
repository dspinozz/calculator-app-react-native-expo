// Example React Native Expo Calculator Screen
// This shows how the web calculator would look in React Native

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculate, getUserSettings, updateUserSettings } from './services/api';

interface CalculatorScreenProps {
  navigation: any;
}

export default function CalculatorScreen({ navigation }: CalculatorScreenProps) {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [settings, setSettings] = useState({
    allow_parentheses: true,
    allow_exponents: true,
  });
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadUserInfo();
    loadSettings();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUsername(user.username);
        setIsAdmin(user.role === 'admin');
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await getUserSettings();
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const appendToExpression = (value: string) => {
    // Check restrictions
    if ((value === '(' || value === ')') && !settings.allow_parentheses) {
      Alert.alert('Restricted', 'Parentheses are not allowed for your account');
      return;
    }
    if (value === '^' && !settings.allow_exponents) {
      Alert.alert('Restricted', 'Exponents are not allowed for your account');
      return;
    }

    const lastChar = expression.slice(-1);
    
    // Same validation logic as web version
    if (value === '(') {
      if (expression === '' || ['+', '-', '*', '/', '^', '('].includes(lastChar)) {
        setExpression(prev => prev + value);
      }
      return;
    }

    if (value === ')') {
      const openParens = (expression.match(/\(/g) || []).length;
      const closeParens = (expression.match(/\)/g) || []).length;
      if (openParens > closeParens && !['+', '-', '*', '/', '^', '('].includes(lastChar)) {
        setExpression(prev => prev + value);
      }
      return;
    }

    // Handle operators, numbers, etc. (same logic as web)
    setExpression(prev => prev + value);
  };

  const handleCalculate = async () => {
    if (!expression) return;

    try {
      const response = await calculate(expression);
      
      if (response.data.error) {
        Alert.alert('Error', response.data.error);
        return;
      }

      setResult(response.data.result);
      setExpression(''); // Clear expression, keep result visible
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigation.replace('Login');
      } else if (error.response?.status === 403) {
        Alert.alert('Permission Denied', error.response.data.error || 'You do not have permission');
      } else {
        Alert.alert('Error', 'Calculation failed');
      }
    }
  };

  const clearAll = () => {
    setExpression('');
    setResult('0');
  };

  const backspace = () => {
    setExpression(prev => prev.slice(0, -1));
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('auth_token');
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Button component
  const CalcButton = ({ 
    label, 
    onPress, 
    style = styles.button,
    textStyle = styles.buttonText 
  }: any) => (
    <TouchableOpacity style={style} onPress={onPress}>
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.username}>{username}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Display */}
      <View style={styles.display}>
        <Text style={styles.expression}>{expression || '0'}</Text>
        <Text style={styles.result}>{result}</Text>
      </View>

      {/* Buttons Grid */}
      <View style={styles.buttonsContainer}>
        {/* Row 1 */}
        <View style={styles.row}>
          <CalcButton label="C" onPress={clearAll} style={styles.functionButton} />
          <CalcButton label="⌫" onPress={backspace} style={styles.functionButton} />
          <CalcButton label="%" onPress={() => appendToExpression('%')} style={styles.functionButton} />
          <CalcButton label="÷" onPress={() => appendToExpression('/')} style={styles.operatorButton} />
        </View>

        {/* Row 2 */}
        <View style={styles.row}>
          <CalcButton label="7" onPress={() => appendToExpression('7')} />
          <CalcButton label="8" onPress={() => appendToExpression('8')} />
          <CalcButton label="9" onPress={() => appendToExpression('9')} />
          <CalcButton label="×" onPress={() => appendToExpression('*')} style={styles.operatorButton} />
        </View>

        {/* Row 3 */}
        <View style={styles.row}>
          <CalcButton label="4" onPress={() => appendToExpression('4')} />
          <CalcButton label="5" onPress={() => appendToExpression('5')} />
          <CalcButton label="6" onPress={() => appendToExpression('6')} />
          <CalcButton label="−" onPress={() => appendToExpression('-')} style={styles.operatorButton} />
        </View>

        {/* Row 4 */}
        <View style={styles.row}>
          <CalcButton label="1" onPress={() => appendToExpression('1')} />
          <CalcButton label="2" onPress={() => appendToExpression('2')} />
          <CalcButton label="3" onPress={() => appendToExpression('3')} />
          <CalcButton label="+" onPress={() => appendToExpression('+')} style={styles.operatorButton} />
        </View>

        {/* Row 5 */}
        <View style={styles.row}>
          {settings.allow_parentheses && (
            <CalcButton label="(" onPress={() => appendToExpression('(')} />
          )}
          <CalcButton label="0" onPress={() => appendToExpression('0')} />
          {settings.allow_parentheses && (
            <CalcButton label=")" onPress={() => appendToExpression(')')} />
          )}
          {settings.allow_exponents ? (
            <CalcButton label="x^y" onPress={() => appendToExpression('^')} style={styles.operatorButton} />
          ) : (
            <View style={styles.button} />
          )}
        </View>

        {/* Equals Button */}
        <View style={styles.row}>
          <CalcButton 
            label="=" 
            onPress={handleCalculate} 
            style={[styles.equalsButton, { flex: 1 }]} 
          />
        </View>

        {/* Admin Panel Button */}
        {isAdmin && (
          <TouchableOpacity 
            style={styles.adminButton}
            onPress={() => navigation.navigate('Admin')}
          >
            <Text style={styles.adminButtonText}>Admin Panel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6a11cb',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  },
  display: {
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    minHeight: 100,
    justifyContent: 'flex-end',
  },
  expression: {
    fontSize: 18,
    color: '#666',
    textAlign: 'right',
    marginBottom: 10,
  },
  result: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  buttonsContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  operatorButton: {
    backgroundColor: '#ff9500',
  },
  functionButton: {
    backgroundColor: '#a5a5a5',
  },
  equalsButton: {
    backgroundColor: '#ff9500',
    marginHorizontal: 5,
  },
  adminButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  adminButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

