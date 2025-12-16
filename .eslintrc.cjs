module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // 一般規則
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'error',
    
    // 程式碼品質
    'eqeqeq': 'error',
    'curly': 'error',
    'no-var': 'error',
    'prefer-const': 'error'
  },
  overrides: [
    {
      files: ['**/*.test.{js,ts}', '**/__tests__/**/*.{js,ts}'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['**/*.ts'],
      rules: {
        'no-undef': 'off' // TypeScript 處理這個
      }
    },
    {
      files: ['**/*.vue'],
      rules: {
        'no-undef': 'off' // Vue 檔案有特殊處理
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '*.config.js',
    '*.config.ts'
  ]
}