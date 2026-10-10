/**
 * Conventional Commits, e.g. `feat(web): add rsvp form`.
 * Scopes are the workspaces plus a few repo-wide areas (only a warning).
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
    'scope-enum': [
      1,
      'always',
      [
        'api',
        'web',
        'ui',
        'db',
        'contracts',
        'validation',
        'eslint-config',
        'typescript-config',
        'deploy',
        'deps',
        'ci',
      ],
    ],
  },
};
