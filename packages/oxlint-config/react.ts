const reactConfig = {
  plugins: ['typescript', 'react', 'react-hooks', 'jsx-a11y', 'import'],
  categories: {
    correctness: 'warn',
    suspicious: 'warn',
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
  },
};

export default reactConfig;
