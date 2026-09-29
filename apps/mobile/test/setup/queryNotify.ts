// apps/mobile/test/setup/queryNotify.ts
//
// Test setup: delivers TanStack Query notifications on a microtask instead of setTimeout(0), so a query update lands inside the act() scope of the render or event that caused it.
//
// Tested:
// - Not a test itself; loaded by the jest `setupFiles` of apps/mobile
//
// What is covered:
// apps/mobile/test
//
import { notifyManager } from "@tanstack/react-query";

notifyManager.setScheduler(queueMicrotask);
