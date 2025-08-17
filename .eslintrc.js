module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended', // Adds prettier plugin + disables conflicting ESLint rules
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
};
