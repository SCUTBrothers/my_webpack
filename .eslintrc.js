module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    files: ['*.ts'],
    project: './tsconfig.json'
  },
  extends: [
    // airbnb
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  env: {
    node: true
  },
  plugins: ['@typescript-eslint', 'prettier', 'import'],
  rules: {
    'no-plusplus': 'off',
    'consistent-return': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-param-reassign': 'off',
    'no-console': 'off'
  }
}
