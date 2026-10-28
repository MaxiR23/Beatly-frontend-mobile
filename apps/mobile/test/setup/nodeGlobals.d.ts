// apps/mobile/test/setup/nodeGlobals.d.ts
//
// Type declarations for the Node global the tests use. React Native 0.88 no
// longer declares NodeJS.Process, which expo's `process` global refers to.
//
// Tested:
// - Not a test itself; types for withTimeout.test.ts
//
// What is covered:
// - process.on and process.off for the unhandledRejection event
//
// Run with: pnpm --filter @beatly/mobile typecheck
//
// SEE: apps/mobile/test/auth/withTimeout.test.ts

declare namespace NodeJS {
  interface Process {
    on(event: "unhandledRejection", listener: (reason: unknown) => void): this;
    off(event: "unhandledRejection", listener: (reason: unknown) => void): this;
  }
}
