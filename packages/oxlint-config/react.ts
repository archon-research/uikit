import baseConfig from './base.js';

const reactConfig = {
  ...baseConfig,
  plugins: [...baseConfig.plugins, 'react', 'react-hooks', 'jsx-a11y'],
  rules: {
    ...baseConfig.rules,
    'react/react-in-jsx-scope': 'off',
    // oxlint files both of these under `pedantic`, so the categories inherited
    // from `base` never reach them — `rules-of-hooks` in particular was absent
    // from the effective config of every consumer of this preset. They are
    // named one by one rather than by raising a whole category, which would
    // also pull in `max-lines`, `max-lines-per-function` and
    // `import/max-dependencies`.
    'react/rules-of-hooks': 'error',
    'react/jsx-no-target-blank': 'error',
  },
};

export default reactConfig;
