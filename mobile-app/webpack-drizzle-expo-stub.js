// Stub for drizzle-orm/expo-sqlite on web platform (web uses drizzle-orm/sql-js instead)
export const drizzle = () => {
  throw new Error('drizzle-orm/expo-sqlite is not available on web platform. Use drizzle-orm/sql-js instead.');
};
export * from './webpack-expo-sqlite-stub.js';
