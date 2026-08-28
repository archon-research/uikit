const baseConfig = {
  plugins: ['typescript'],
  categories: {
    correctness: 'warn',
    suspicious: 'warn',
  },
  // Declared even though it is empty: consumers compose presets by spreading
  // (`{ ...baseConfig, rules: { ... } }`), which *replaces* this key rather
  // than merging into it. Shipping it makes `...baseConfig.rules` type-check,
  // so the merge idiom is reachable before there is anything to merge.
  rules: {},
};

export default baseConfig;
