import { Platform } from 'react-native';
import * as schema from './schema';
import type { SQLJsDatabase } from 'drizzle-orm/sql-js';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

type DrizzleDatabase = SQLJsDatabase<typeof schema> | ExpoSQLiteDatabase<typeof schema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;
let drizzleInstance: DrizzleDatabase | null = null;

// Type guard for window
declare const window: Window & typeof globalThis | undefined;

/**
 * Unified database initialization for web and mobile
 * Web: Uses sql.js
 * Mobile: Uses expo-sqlite
 */
export async function initDatabase(): Promise<DrizzleDatabase> {
  if (dbInstance && drizzleInstance) {
    return drizzleInstance;
  }

  try {
    if (Platform.OS === 'web') {
      // Web platform: Use sql.js
      const initSqlJs = (await import('sql.js')).default;
      const SQL = await initSqlJs({
        locateFile: (file: string) => {
          // Use CDN for sql.js WASM files
          return `https://sql.js.org/dist/${file}`;
        },
      });
      
      // Try to load from localStorage
      let dbData: Uint8Array | null = null;
      if (typeof window !== 'undefined' && window?.localStorage) {
        try {
          const saved = window.localStorage.getItem('calculator_db');
          if (saved) {
            dbData = new Uint8Array(JSON.parse(saved));
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Could not load database from localStorage:', e);
        }
      }
      
      dbInstance = dbData ? new SQL.Database(dbData) : new SQL.Database();
      
      // Create tables
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS calculator_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          expression TEXT NOT NULL,
          result TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        );
      `);

      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL
        );
      `);

      // Initialize Drizzle for web
      const { drizzle } = await import('drizzle-orm/sql-js');
      drizzleInstance = drizzle(dbInstance, { schema }) as SQLJsDatabase<typeof schema>;

      // Auto-save to localStorage
      if (typeof window !== 'undefined' && window?.localStorage) {
        setInterval(() => {
          try {
            const data = dbInstance.export();
            window.localStorage.setItem('calculator_db', JSON.stringify(Array.from(data)));
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Could not save database to localStorage:', e);
          }
        }, 5000);
      }
    } else {
      // Mobile platform: Use expo-sqlite (dynamically imported to avoid webpack bundling)
      try {
        const SQLite = await import('expo-sqlite');
        // Use openDatabaseSync if available, otherwise fallback to openDatabase
        const expoDb = (SQLite as any).openDatabaseSync 
          ? (SQLite as any).openDatabaseSync('calculator.db')
          : SQLite.openDatabase('calculator.db');
        
        // Create tables
        if (expoDb.execSync) {
          expoDb.execSync(`
            CREATE TABLE IF NOT EXISTS calculator_history (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              expression TEXT NOT NULL,
              result TEXT NOT NULL,
              timestamp INTEGER NOT NULL
            );
          `);

          expoDb.execSync(`
            CREATE TABLE IF NOT EXISTS user_preferences (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              key TEXT NOT NULL UNIQUE,
              value TEXT NOT NULL
            );
          `);
        } else {
          // Fallback for older expo-sqlite API
          expoDb.transaction((tx: any) => {
            tx.executeSql(`
              CREATE TABLE IF NOT EXISTS calculator_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expression TEXT NOT NULL,
                result TEXT NOT NULL,
                timestamp INTEGER NOT NULL
              );
            `);
            tx.executeSql(`
              CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL
              );
            `);
          });
        }

        // Initialize Drizzle for mobile
        const { drizzle } = await import('drizzle-orm/expo-sqlite');
        drizzleInstance = drizzle(expoDb, { schema }) as ExpoSQLiteDatabase<typeof schema>;
        dbInstance = expoDb;
      } catch (mobileError) {
        // eslint-disable-next-line no-console
        console.error('Mobile database initialization failed:', mobileError);
        throw mobileError;
      }
    }

    return drizzleInstance;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Database initialization error:', error);
    throw error;
  }
}

/**
 * Get the database instance (must call initDatabase first)
 */
export function getDatabase(): DrizzleDatabase {
  if (!drizzleInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return drizzleInstance;
}

/**
 * Manually save database (web only - mobile auto-saves)
 */
export function saveDatabase(): boolean {
  if (Platform.OS === 'web' && dbInstance && typeof window !== 'undefined' && window?.localStorage) {
    try {
      const data = dbInstance.export();
      window.localStorage.setItem('calculator_db', JSON.stringify(Array.from(data)));
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save database:', error);
      return false;
      }
  }
  return false;
}

