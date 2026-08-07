import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['lib/', 'dist/', 'node_modules/', 'webpack.config.js', 'scripts/'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);