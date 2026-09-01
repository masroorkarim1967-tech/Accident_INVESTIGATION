import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest doesn't auto-register React Testing Library's cleanup the way
// Jest's testing-library preset does — without this, each component test's
// render() call piles onto the previous test's leftover DOM within the
// same file, producing "found multiple elements" failures that look like
// app bugs but are really a missing-cleanup bug in the test harness.
afterEach(() => {
  cleanup();
});
