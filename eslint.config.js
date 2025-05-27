import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import {defineConfig} from 'eslint/config';
import js from '@eslint/js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLIENT_JAVASCRIPT_PATHS = [
  'src/static/js/**/*.js',
];

const WEB_WORKER_PATHS = [
  'src/static/js/search-worker.js',
];

const COMMON_GLOBALS = {
  supportedWhenever: {
    URL: 'readonly',

    clearInterval: 'readonly',
    clearTimeout: 'readonly',
    console: 'readonly',
    fetch: 'readonly',
    setInterval: 'readonly',
    setTimeout: 'readonly',
    structuredClone: 'readonly',
  },
};

export default defineConfig([
  // basic config

  {
    files: ['src/**/*.js'],
    extends: ['js/recommended'],
    plugins: {js},

    rules: {
      indent: ['off'],

      'no-empty': ['error', {
        allowEmptyCatch: true,
      }],

      'no-unexpected-multiline': ['off'],
      'no-unused-labels': ['off'],

      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^',
      }],

      'no-cond-assign': ['off'],
      'no-constant-condition': ['off'],
      'no-unsafe-finally': ['off'],
      'no-self-assign': ['off'],
      'require-yield': ['off'],
    },
  },

  // node.js

  {
    files: ['src/**/*.js'],
    ignores: [...CLIENT_JAVASCRIPT_PATHS],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',

      globals: {
        ...COMMON_GLOBALS.supportedWhenever,

        process: 'readonly',
        setImmediate: 'readonly',
      },
    },
  },

  // client javascript - all

  {
    files: [...CLIENT_JAVASCRIPT_PATHS],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',

      globals: {
        ...COMMON_GLOBALS.supportedWhenever,

        CustomEvent: 'readonly',
        Response: 'readonly',
        Worker: 'readonly',
        XMLHttpRequest: 'readonly',
      },
    },
  },

  // client javascript - not web workers

  {
    files: [...CLIENT_JAVASCRIPT_PATHS],
    ignores: [...WEB_WORKER_PATHS],

    languageOptions: {
      globals: {
        DOMException: 'readonly',
        DOMRect: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',

        document: 'readonly',
        getComputedStyle: 'readonly',
        history: 'readonly',
        location: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        window: 'readonly',
      },
    },
  },

  // client javascript - web workers

  {
    files: [WEB_WORKER_PATHS],

    languageOptions: {
      globals: {
        onerror: 'writeable',
        onmessage: 'writeable',
        onunhandledrejection: 'writeable',
        postMessage: 'readonly',
      },
    },
  },
]);
