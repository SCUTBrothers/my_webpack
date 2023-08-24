module.exports = {
    parser: "@typescript-eslint/parser", // Specifies the ESLint parser
    parserOptions: {
        project: "./tsconfig.json",
    },
    extends: [
        // airbnb
        "airbnb-base",
        "airbnb-typescript/base",
        "plugin:prettier/recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
    ],
    env: {
        node: true
    },
    plugins: ["@typescript-eslint", "prettier", "import"],
}