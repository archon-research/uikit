import reactConfig from '@archon-research/oxlint-config/react';

export default {
  ...reactConfig,
  rules: {
    ...reactConfig.rules,
    // Charts render inline data-visualisation SVGs, which legitimately carry
    // `role="img"` + `aria-label`; they cannot be swapped for an <img> tag.
    'jsx-a11y/prefer-tag-over-role': 'off',
  },
};
