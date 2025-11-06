module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    'react-native/react-native': true,
    browser: true, // For localStorage
    es6: true,
    node: true,
  },
  plugins: ['react', 'react-native', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/immutability': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
