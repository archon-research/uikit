const reactConfig = {
  plugins: ['typescript', 'react', 'react-hooks', 'jsx-a11y', 'import'],
  categories: {
    correctness: 'warn',
    suspicious: 'warn',
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    // oxlint files the three below under `pedantic`/`restriction`, so the
    // categories above never reach them — `rules-of-hooks` in particular was
    // absent from the effective config of every consumer of this preset.
    // They are named one by one rather than by raising a whole category, which
    // would also pull in `max-lines`, `max-lines-per-function` and
    // `import/max-dependencies`.
    'react/rules-of-hooks': 'error',
    'import/no-cycle': 'error',
    'react/jsx-no-target-blank': 'error',
  },
};

export default reactConfig;
