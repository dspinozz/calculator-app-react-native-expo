// Stub for expo-sqlite on web platform (web uses sql.js instead)
// This module is replaced by webpack for web builds

// Default export
const expoSqliteStub = {};

// Named exports that drizzle-orm/expo-sqlite expects
export const openDatabaseSync = () => {
  throw new Error('expo-sqlite is not available on web platform. Use sql.js instead.');
};

export const addDatabaseChangeListener = () => {
  return () => {}; // Return unsubscribe function
};

export const removeDatabaseChangeListener = () => {};

// Also export as default for compatibility
export default expoSqliteStub;
