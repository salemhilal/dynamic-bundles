module.exports = {
    env: {
        commonjs: true,
        es6: true,
        node: true,
    },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/eslint-recommended", "prettier"],
    globals: {
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 11,
    },
    plugins: ["@typescript-eslint"],
    rules: {},
};
