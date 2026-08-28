const baseConfig = {
  plugins: ['typescript', 'import'],
  categories: {
    correctness: 'warn',
    suspicious: 'warn',
  },
  rules: {
    // oxlint files this under `restriction`, so the categories above never
    // reach it. Nothing about it is React-specific — a cycle is as much a
    // hazard in a node package — so it belongs here rather than in `react`.
    'import/no-cycle': 'error',
  },
};

export default baseConfig;
