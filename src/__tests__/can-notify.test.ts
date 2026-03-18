import { describe, expect, it, vi } from "vitest";
import { canNotify } from "../can-notify.js";
import { createContext } from "./helpers.js";

describe("canNotify", () => {
  it("returns true when no plugins are configured", () => {
    const context = createContext({ options: undefined });
    expect(canNotify(context)).toBe(true);
  });

  it("returns true when @semantic-release/git is not in plugins", () => {
    const context = createContext({
      options: {
        plugins: ["@semantic-release/npm", "@semantic-release/github"],
      },
    });
    expect(canNotify(context)).toBe(true);
  });

  it("returns true on first execution even with @semantic-release/git", () => {
    const context = createContext({
      options: {
        plugins: ["@semantic-release/git"],
      },
    });
    expect(canNotify(context)).toBe(true);
  });

  it("returns false when @semantic-release/git is present and previous execution happened", () => {
    const context = createContext({
      options: {
        plugins: ["@semantic-release/git"],
      },
      env: { HAS_PREVIOUS_SEM_REL_EXECUTION: "true" },
    });
    expect(canNotify(context)).toBe(false);
  });

  it("returns false when @semantic-release/git is in array config", () => {
    const context = createContext({
      options: {
        plugins: [["@semantic-release/git", { assets: ["CHANGELOG.md"] }]],
      },
      env: { HAS_PREVIOUS_SEM_REL_EXECUTION: "true" },
    });
    expect(canNotify(context)).toBe(false);
  });

  it("logs a warning when blocking duplicate notification", () => {
    const context = createContext({
      options: {
        plugins: ["@semantic-release/git"],
      },
      env: { HAS_PREVIOUS_SEM_REL_EXECUTION: "true" },
    });
    const warnSpy = vi.fn();
    context.logger.warn = warnSpy;

    canNotify(context);

    expect(warnSpy).toHaveBeenCalledOnce();
  });
});
