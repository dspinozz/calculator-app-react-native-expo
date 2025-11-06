import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Calculator history table
export const calculatorHistory = sqliteTable('calculator_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  expression: text('expression').notNull(),
  result: text('result').notNull(),
  timestamp: integer('timestamp').notNull(),
});

// User preferences table
export const userPreferences = sqliteTable('user_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});
