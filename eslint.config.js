// INFO: ESLint flat config. Besides the usual TypeScript rules it encodes
// the import boundaries of ARCHITECTURE.md: what core may not import,
// what ui may not import, and which libraries may only be imported from
// their adapter in apps/mobile. A boundary is a rule here, not a habit.

import js from "@eslint/js";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

// Libraries core must never see. core is TypeScript only and runs in Node.
const platformLibraries = [
  "react",
  "react/*",
  "react-dom",
  "react-native",
  "react-native/*",
  "react-native-*",
  "expo",
  "expo-*",
  "@expo/*",
  "@supabase/*",
  "@react-native-*/*",
  "@tanstack/*",
];

// Libraries that get exactly one adapter under apps/mobile/src/adapters/.
// The list grows by one entry per adapter, in the same PR as the adapter.
const adapterOnlyLibraries = [
  "expo-audio",
  "expo-secure-store",
  "expo-file-system",
  "expo-file-system/*",
  "expo-sqlite",
  "@supabase/*",
  "@react-native-async-storage/*",
  "@react-native-community/netinfo",
];

// A workspace is imported by its package name, never by a relative path
// that crosses into another workspace's src.
const crossWorkspacePaths = [
  "**/core/src/**",
  "**/ui/src/**",
  "**/mobile/src/**",
  "**/packages/**",
  "**/apps/**",
];

// A relative import without its real extension (./tokens/color, ./, ..) or
// ending in a JavaScript extension (./tokens/color.js): Node's type-stripping
// loader, which evaluates app.config.ts, resolves neither. It does not match
// ./tokens/color.ts, ../X.tsx, ./data.json, ../assets/icon.png or a bare
// package.
// Known limits: a dynamic import("./x") or require("./x") is not checked
// (no-restricted-imports only sees ImportDeclaration / ExportDeclaration), and
// an extensionless specifier whose last segment has a dot (./Foo.test) slips
// through.
const relativeImportWithoutExtension = String.raw`^\.{1,2}(?:/(?:[^/]*/)*[^./]*)?$|^\.{1,2}/.*\.(?:js|jsx|mjs|cjs)$`;

const restricted = (patterns, message) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        ...patterns.map((group) => ({ group: [group], message })),
        {
          regex: relativeImportWithoutExtension,
          message:
            "A relative import carries the file's real extension (./x.ts, ./X.tsx). Node's type-stripping loader, which evaluates app.config.ts, resolves nothing else.",
        },
      ],
    },
  ],
});

const memoization = {
  "no-restricted-syntax": [
    "error",
    {
      selector: "CallExpression[callee.name=/^(useMemo|useCallback|memo)$/]",
      message:
        "The React Compiler memoizes. A manual useMemo/useCallback/memo needs an eslint-disable-next-line with a description saying why the compiler is not enough.",
    },
    {
      selector: "CallExpression[callee.property.name=/^(useMemo|useCallback|memo)$/]",
      message:
        "The React Compiler memoizes. A manual useMemo/useCallback/memo needs an eslint-disable-next-line with a description saying why the compiler is not enough.",
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/.expo/",
      "**/coverage/",
      "**/ios/",
      "**/android/",
      "pnpm-lock.yaml",
      "**/expo-env.d.ts",
    ],
  },

  js.configs.recommended,
  comments.recommended,

  // Plain JS: only the root config files.
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: { globals: globals.node },
  },

  // TypeScript, type-aware, in every workspace.
  {
    files: ["**/*.{ts,tsx}"],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@eslint-community/eslint-comments/require-description": "error",
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      "@eslint-community/eslint-comments/no-unused-disable": "error",
      "no-console": "error",
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "HTTP goes through the core client; the global fetch lives only in apps/mobile/src/adapters/http.ts.",
        },
      ],
      ...restricted(
        crossWorkspacePaths,
        "Import the workspace by its package name (@beatly/core, @beatly/ui).",
      ),
    },
  },

  // packages/core: no platform, no other workspace.
  {
    files: ["packages/core/**/*.ts"],
    rules: {
      ...restricted(
        [...platformLibraries, "@beatly/ui", "@beatly/mobile", ...crossWorkspacePaths],
        "packages/core never imports react, react-native, expo or another workspace. It talks to the world through a port.",
      ),
    },
  },

  // packages/ui: no app, no data. It receives data and callbacks.
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: {
      ...memoization,
      ...restricted(
        ["@beatly/mobile", "expo-*", "@supabase/*", "@tanstack/*", ...crossWorkspacePaths],
        "packages/ui never imports the app, a data library or an adapter-only library. It receives data and callbacks as props.",
      ),
    },
  },

  // apps/mobile: adapter-only libraries stay in their adapter.
  {
    files: ["apps/mobile/**/*.{ts,tsx}"],
    ignores: ["apps/mobile/src/adapters/**"],
    rules: {
      ...memoization,
      ...restricted(
        [...adapterOnlyLibraries, ...crossWorkspacePaths],
        "This library is imported only by its adapter under apps/mobile/src/adapters/. Everything else goes through the port.",
      ),
    },
  },

  // The two files that are allowed what everything else is not.
  {
    files: ["apps/mobile/src/adapters/http.ts"],
    rules: { "no-restricted-globals": "off" },
  },
  {
    files: ["apps/mobile/src/adapters/log.ts"],
    rules: { "no-console": "off" },
  },

  prettier,
);
