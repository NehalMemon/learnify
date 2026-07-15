// ─── ESLint Flat Config (ESLint v9 — CommonJS) ───────────────
// Uses pure CJS (require/module.exports) because this project
// is "type": "commonjs". @eslint/js is ESM-only and cannot be
// required — rules are defined directly instead.
// Run with: npm run lint

'use strict';

module.exports = [
  // ── Source files ──────────────────────────────────────────
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node.js globals
        process:     'readonly',
        console:     'readonly',
        require:     'readonly',
        module:      'writable',
        exports:     'writable',
        __dirname:   'readonly',
        __filename:  'readonly',
        global:      'readonly',
        Buffer:      'readonly',
        setTimeout:  'readonly',
        clearTimeout:'readonly',
        setInterval: 'readonly',
        clearInterval:'readonly',
      },
    },
    rules: {
      // ── Security ──────────────────────────────────────────
      'no-eval':          'error',
      'no-implied-eval':  'error',
      'no-new-func':      'error',

      // ── Code quality ──────────────────────────────────────
      'eqeqeq':           ['error', 'always'],
      'no-unused-vars':   ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-var':           'error',
      'prefer-const':     'warn',
      'no-undef':         'error',

      // ── Async safety ──────────────────────────────────────
      'no-async-promise-executor': 'error',
      'no-await-in-loop':          'warn',
    },
  },

  // ── Test & mock files (Jest globals injected) ─────────────
  {
    files: ['tests/**/*.js', 'src/**/__mocks__/**/*.js'],
    languageOptions: {
      globals: {
        jest:        'readonly',
        describe:    'readonly',
        it:          'readonly',
        test:        'readonly',
        expect:      'readonly',
        beforeEach:  'readonly',
        afterEach:   'readonly',
        beforeAll:   'readonly',
        afterAll:    'readonly',
      },
    },
  },

  // ── Ignored paths ─────────────────────────────────────────
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
  },
];
