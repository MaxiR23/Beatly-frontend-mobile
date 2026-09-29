// INFO: ESLint flat config. Besides the usual TypeScript rules it encodes
// the import boundaries of ARCHITECTURE.md: what core may not import,
// what ui may not import, and which libraries may only be imported from
// their adapter in apps/mobile. Three libraries have a single importer inside
// packages/ui instead: lucide-react-native (Icon.tsx), expo-glass-effect
// (GlassSurface.tsx) and react-native-svg (GradientFill.tsx). A boundary is a rule here, not a habit.

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
  "i18next",
  "expo-localization",
  "react-native-image-colors",
];

// Icons are drawn with the Icon component of packages/ui; its file is the
// only importer of the icon library.
const iconLibraryOnlyInIcon = {
  group: ["lucide-react-native", "lucide-react-native/*"],
  message:
    "Icons are drawn with the Icon component of @beatly/ui/native; packages/ui/src/components/Icon.tsx is the only importer of lucide-react-native.",
};

// Floating surfaces are drawn with GlassSurface of packages/ui; its file is
// the only importer of the glass library.
const glassLibraryOnlyInGlassSurface = {
  group: ["expo-glass-effect"],
  message:
    "Floating surfaces are drawn with GlassSurface of @beatly/ui/native; packages/ui/src/components/GlassSurface.tsx is the only importer of expo-glass-effect.",
};

// Gradients are drawn with GradientFill of packages/ui; its file is the only
// importer of the svg library.
const svgLibraryOnlyInGradientFill = {
  group: ["react-native-svg", "react-native-svg/*"],
  message:
    "Gradients are drawn with GradientFill inside packages/ui; packages/ui/src/components/GradientFill.tsx is the only importer of react-native-svg.",
};

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

const restricted = (patterns, message, extra = []) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        ...patterns.map((group) => ({ group: [group], message })),
        ...extra,
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
        [
          "@beatly/mobile",
          "expo-*",
          "@tanstack/*",
          ...adapterOnlyLibraries,
          ...crossWorkspacePaths,
        ],
        "packages/ui never imports the app, a data library or an adapter-only library. It receives data and callbacks as props.",
        [iconLibraryOnlyInIcon, svgLibraryOnlyInGradientFill],
      ),
    },
  },

  // The Icon component is the one file allowed to import the icon library.
  // A later block replaces no-restricted-imports wholesale, so the full ui
  // list is repeated here.
  {
    files: ["packages/ui/src/components/Icon.tsx"],
    rules: {
      ...memoization,
      ...restricted(
        [
          "@beatly/mobile",
          "expo-*",
          "@tanstack/*",
          ...adapterOnlyLibraries,
          ...crossWorkspacePaths,
        ],
        "packages/ui never imports the app, a data library or an adapter-only library. It receives data and callbacks as props.",
        [svgLibraryOnlyInGradientFill],
      ),
    },
  },

  // The GlassSurface component is the one file allowed to import the glass
  // library. Same shape as the Icon block; the negation lives in one group
  // because a negation only works inside the group that names the pattern.
  {
    files: ["packages/ui/src/components/GlassSurface.tsx"],
    rules: {
      ...memoization,
      ...restricted(
        ["@beatly/mobile", "@tanstack/*", ...adapterOnlyLibraries, ...crossWorkspacePaths],
        "packages/ui never imports the app, a data library or an adapter-only library. It receives data and callbacks as props.",
        [
          iconLibraryOnlyInIcon,
          svgLibraryOnlyInGradientFill,
          {
            group: ["expo-*", "!expo-glass-effect"],
            message:
              "packages/ui never imports the app, a data library or an adapter-only library. It receives data and callbacks as props.",
          },
        ],
      ),
    },
  },

  // The GradientFill component is the one file allowed to import the svg
  // library. Same shape as the Icon block.
  {
    files: ["packages/ui/src/components/GradientFill.tsx"],
    rules: {
      ...memoization,
      ...restricted(
        [
          "@beatly/mobile",
          "expo-*",
          "@tanstack/*",
          ...adapterOnlyLibraries,
          ...crossWorkspacePaths,
        ],
        "packages/ui never imports the app, a data library or an adapter-only library. It receives data and callbacks as props.",
        [iconLibraryOnlyInIcon],
      ),
    },
  },

  // packages/ui's main entry and its tokens: apps/mobile/app.config.ts
  // evaluates this entry under Node, which cannot parse react-native's
  // source. react-native-dependent tokens go in packages/ui/src/native.ts,
  // which this pattern does not match.
  {
    files: ["packages/ui/src/index.ts", "packages/ui/src/tokens/**/*.ts"],
    rules: {
      ...restricted(
        ["react-native"],
        "apps/mobile/app.config.ts evaluates @beatly/ui's main entry under Node, which cannot parse react-native's source. Move this into packages/ui/src/native.ts.",
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
        [iconLibraryOnlyInIcon, glassLibraryOnlyInGlassSurface, svgLibraryOnlyInGradientFill],
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
