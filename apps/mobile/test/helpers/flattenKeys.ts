// apps/mobile/test/helpers/flattenKeys.ts
//
// Test helper: flattens a nested translation object into dotted keys.
//
// Tested:
// - Not a test itself; used by the i18n tests
//
// What is covered:
// - Every leaf of a nested object, joined by "."
//
// Run with: pnpm --filter @beatly/mobile test -- i18n
//
// SEE: apps/mobile/src/i18n/resources.ts

export function flattenKeys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]: [string, unknown]) => {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    return typeof value === "object" && value !== null ? flattenKeys(value, path) : [path];
  });
}

export function valueAt(obj: object, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        typeof node === "object" && node !== null ? Reflect.get(node, key) : undefined,
      obj,
    );
}
