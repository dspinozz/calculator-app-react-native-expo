// src/screens/CalculatorScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../utils/AuthContext';
import ApiService from '../services/api';

export default function CalculatorScreen({ navigation }) {
  const [expression, setExpression] = useState('0');
  const [result, setResult] = useState('0');
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();

  const appendToExpression = (value) => {
    if (expression === '0' && value !== '.') {
      setExpression(value);
    } else {
      setExpression(expression + value);
    }
  };

  const clearAll = () => {
    setExpression('0');
    setResult('0');
  };

  const backspace = () => {
    if (expression.length > 1) {
      setExpression(expression.slice(0, -1));
    } else {
      setExpression('0');
    }
  };

  const calculate = async () => {
    if (expression === '0' || !expression) return;

    setLoading(true);
    try {
      const response = await ApiService.calculate(expression);
      if (response.result) {
        setResult(response.result);
        setExpression('0');
      } else if (response.error) {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const Button = ({ label, onPress, style, textStyle }) => (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={[styles.buttonText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#6a11cb', '#2575fc']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.username}>{user?.username || 'User'}</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.display}>
        <Text style={styles.expression}>{expression}</Text>
        <Text style={styles.result}>{result}</Text>
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      <View style={styles.buttons}>
        <View style={styles.row}>
          <Button label="C" onPress={clearAll} style={styles.functionBtn} />
          <Button label="⌫" onPress={backspace} style={styles.functionBtn} />
          <Button label="(" onPress={() => appendToExpression('(')} style={styles.numberBtn} />
          <Button label=")" onPress={() => appendToExpression(')')} style={styles.numberBtn} />
        </View>

        <View style={styles.row}>
          <Button label="7" onPress={() => appendToExpression('7')} style={styles.numberBtn} />
          <Button label="8" onPress={() => appendToExpression('8')} style={styles.numberBtn} />
          <Button label="9" onPress={() => appendToExpression('9')} style={styles.numberBtn} />
          <Button label="÷" onPress={() => appendToExpression('/')} style={styles.operatorBtn} />
        </View>

        <View style={styles.row}>
          <Button label="4" onPress={() => appendToExpression('4')} style={styles.numberBtn} />
          <Button label="5" onPress={() => appendToExpression('5')} style={styles.numberBtn} />
          <Button label="6" onPress={() => appendToExpression('6')} style={styles.numberBtn} />
          <Button label="×" onPress={() => appendToExpression('*')} style={styles.operatorBtn} />
        </View>

        <View style={styles.row}>
          <Button label="1" onPress={() => appendToExpression('1')} style={styles.numberBtn} />
          <Button label="2" onPress={() => appendToExpression('2')} style={styles.numberBtn} />
          <Button label="3" onPress={() => appendToExpression('3')} style={styles.numberBtn} />
          <Button label="−" onPress={() => appendToExpression('-')} style={styles.operatorBtn} />
        </View>

        <View style={styles.row}>
          <Button label="0" onPress={() => appendToExpression('0')} style={[styles.numberBtn, styles.zeroBtn]} />
          <Button label="." onPress={() => appendToExpression('.')} style={styles.numberBtn} />
          <Button label="+" onPress={() => appendToExpression('+')} style={styles.operatorBtn} />
        </View>

        <View style={styles.row}>
          <Button label="^" onPress={() => appendToExpression('^')} style={styles.numberBtn} />
          <Button label="=" onPress={calculate} style={[styles.equalsBtn]} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  username: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
  },
  display: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    margin: 20,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  expression: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'right',
  },
  result: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
  },
  buttons: {
    flex: 1,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  numberBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  operatorBtn: {
    backgroundColor: '#ff9500',
  },
  operatorBtnText: {
    color: '#fff',
  },
  functionBtn: {
    backgroundColor: '#a5a5a5',
  },
  functionBtnText: {
    color: '#fff',
  },
  equalsBtn: {
    flex: 2,
    backgroundColor: '#ff9500',
  },
  zeroBtn: {
    flex: 2,
  },
});
