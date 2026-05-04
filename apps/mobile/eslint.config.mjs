import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactNative from 'eslint-plugin-react-native';
import reactHooks from 'eslint-plugin-react-hooks';

const eslintConfig = defineConfig([
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'ios/**',
      'android/**',
      '*.d.ts',
    ],
  },
  // CommonJS config files
  {
    files: ['babel.config.js', 'metro.config.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        global: 'readonly',
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-undef': 'off',
    },
  },
  // TypeScript/React files
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        global: 'readonly',
        __DEV__: 'readonly',
      },
    },
    plugins: {
      react,
      'react-native': reactNative,
      'react-hooks': reactHooks,
    },
    rules: {
      // Disallow unused variables and imports
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-unused-vars': 'off',
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off', // Not compatible with eslint 9
      // Disable some strict rules for React Native
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);

export default eslintConfig;
