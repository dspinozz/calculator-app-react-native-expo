import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { initDatabase, getDatabase, saveDatabase } from '../db/db';
import { calculatorHistory, userPreferences } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

type HistoryRecord = InferSelectModel<typeof calculatorHistory>;
type PreferenceRecord = InferSelectModel<typeof userPreferences>;

interface TestResult {
  success: boolean;
  error?: string;
}

/**
 * Unified database component for both web and mobile
 * Tests and displays database status
 */
export default function DatabaseComponent() {
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string>('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const testDatabase = useCallback(async (): Promise<TestResult> => {
    try {
      const db = getDatabase();
      
      // Test insert - MUST use .run() to execute
      db.insert(calculatorHistory).values({
        expression: '2 + 2',
        result: '4',
        timestamp: Math.floor(Date.now() / 1000),
      }).run();

      // Get all records
      const historyRecords = db.select().from(calculatorHistory).all() as HistoryRecord[];
      const lastRecord = historyRecords.length > 0 ? historyRecords[historyRecords.length - 1] : null;

      // Test insert into user_preferences with conflict handling
      try {
        db.insert(userPreferences).values({
          key: 'theme',
          value: 'dark',
        }).run();
      } catch {
        // If exists, update it - MUST use .run() to execute
        db.update(userPreferences)
          .set({ value: 'dark' })
          .where(eq(userPreferences.key, 'theme'))
          .run();
      }

      // Test select preferences
      const preferences = db.select()
        .from(userPreferences)
        .where(eq(userPreferences.key, 'theme'))
        .all() as PreferenceRecord[];

      // Save database (web only)
      saveDatabase();

      setTestResult(`✅ Drizzle ORM Test Successful! (${Platform.OS})
- Inserted history record ID: ${lastRecord?.id || 'N/A'}
- Total history records: ${historyRecords.length}
- Theme preference: ${preferences[0]?.value || 'not found'}`);

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setTestResult(`❌ Test failed: ${errorMsg}`);
      // eslint-disable-next-line no-console
      console.error('Database test error:', err);
      return { success: false, error: errorMsg };
    }
  }, []);

  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      const db = getDatabase();
      const records = db.select()
        .from(calculatorHistory)
        .orderBy(calculatorHistory.timestamp)
        .limit(10)
        .all() as HistoryRecord[];
      setHistory(records || []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load history:', err);
    }
  }, []);

  const initializeDatabase = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await initDatabase();
      setDbReady(true);
      const result = await testDatabase();
      if (result && result.success) {
        await loadHistory();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize database:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setTestResult(`❌ Error: ${errorMessage}`);
    }
  }, [testDatabase, loadHistory]);

  useEffect(() => {
    // Use setTimeout to avoid calling setState synchronously in effect
    const timer = setTimeout(() => {
      initializeDatabase();
    }, 0);
    return () => clearTimeout(timer);
  }, [initializeDatabase]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Database Component (Drizzle ORM - {Platform.OS})
      </Text>
      <View style={styles.statusContainer}>
        <Text style={styles.status}>
          Database Status: {dbReady ? '✅ Ready' : '⏳ Initializing...'}
        </Text>
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}
      {testResult ? (
        <View style={styles.testContainer}>
          <Text style={styles.testResult}>{testResult}</Text>
        </View>
      ) : null}
      {history.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Recent History ({history.length}):</Text>
          {history.map((record) => (
            <Text key={record.id} style={styles.historyItem}>
              {record.expression} = {record.result}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusContainer: {
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#c62828',
  },
  testContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  testResult: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  historyContainer: {
    marginTop: 15,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  historyItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});
