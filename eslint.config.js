import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,ts,vue}"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: 2022,
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
      globals: {
        // Node.js 全域變數
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",

        // 瀏覽器全域變數
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",

        // Node.js 類型
        NodeJS: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      vue,
    },
    rules: {
      // TypeScript 規則
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // Vue 規則 - 放寬一些格式要求
      "vue/multi-word-component-names": "off",
      "vue/no-unused-vars": "error",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "vue/attributes-order": "off",
      "vue/no-v-html": "warn", // XSS 風険：真正需要時請確認已過 DOMPurify 清理

      // 一般規則
      quotes: ["error", "double", { avoidEscape: true }], // 統一使用雙引號，允許內含單引號時使用單引號避免 escape
      "no-console": ["warn", { allow: ["warn", "error"] }], // 對herite console.log 發開警告，允許 warn/error
      "no-debugger": "error",
      "no-unused-vars": "off", // 使用 TypeScript 版本
      "no-undef": "off", // TypeScript 處理這個
      eqeqeq: "error",
      curly: ["error", "all"],
      "no-var": "error",
      "prefer-const": "error",
      "no-useless-escape": "error",
      "no-case-declarations": "error",
    },
  },

  {
    files: ["src/main/**/*.ts"],
    languageOptions: {
      globals: {
        // 主程序特定的全域變數
        __dirname: "readonly",
        process: "readonly",
      },
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", "*.config.js", "vite.config.ts", "vitest.config.ts"],
  },
];
