import pluginNext from '@next/eslint-plugin-next';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

import { config as baseConfig } from './base.js';

/**
 * A custom ESLint configuration for Next.js apps.
 *
 * @type {import("eslint").Linter.Config[]} */
export const nextJsConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    plugins: {
      '@next/next': pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
  pluginReactHooks.configs.flat.recommended,
  {
    ignores: ['.next/**'],
  },
];
