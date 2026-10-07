module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules/', 'dist/', '.next/', 'coverage/', 'artifacts/', 'cache/'],
  settings: { next: { rootDir: 'apps/web/' } },
  rules: {
    'no-undef': 'off', // TypeScript checks names, including type-only names.
    'no-unused-vars': 'off', // Existing legacy code is checked by TypeScript.
    'no-constant-condition': ['error', { checkLoops: false }],
  },
  overrides: [{ files: ['apps/web/**/*.{ts,tsx}'], extends: ['next/core-web-vitals'], rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-require-imports': 'off' } }],
};
