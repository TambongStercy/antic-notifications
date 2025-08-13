module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { 
        allowConstantExport: true,
        allowExportNames: ['AuthProvider', 'SocketProvider', 'useAuth', 'useSocket']
      },
    ],
    'no-unused-vars': 'off',
    'no-undef': 'off', // TypeScript handles this
  },
}