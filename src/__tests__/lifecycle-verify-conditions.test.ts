import { describe, expect, it, vi } from "vitest";
import { verifyConditions } from "../lifecycle-verify-conditions.js";
import { createContext } from "./helpers.js";

const VALID_URL = "https://teams.webhook.example.com/webhook";

describe("verifyConditions", () => {
  it("passes with valid webhookUrl in config", () => {
    const context = createContext();
    expect(() => verifyConditions({ webhookUrl: VALID_URL }, context)).not.toThrow();
  });

  it("passes with valid TEAMS_WEBHOOK_URL in env", () => {
    const context = createContext({ env: { TEAMS_WEBHOOK_URL: VALID_URL } });
    expect(() => verifyConditions({}, context)).not.toThrow();
  });

  it("throws when no URL is provided", () => {
    const context = createContext();
    expect(() => verifyConditions({}, context)).toThrow();
  });

  it("throws for invalid URL format", () => {
    const context = createContext();
    expect(() => verifyConditions({ webhookUrl: "not-a-url" }, context)).toThrow();
  });

  it("validates dry-run URL if provided", () => {
    const context = createContext();
    expect(() =>
      verifyConditions({ webhookUrl: VALID_URL, webhookUrlDryRun: "invalid" }, context),
    ).toThrow();
  });

  it("passes with valid dry-run URL", () => {
    const context = createContext();
    expect(() =>
      verifyConditions({ webhookUrl: VALID_URL, webhookUrlDryRun: VALID_URL }, context),
    ).not.toThrow();
  });

  it("logs when URL is set in both config and env", () => {
    const context = createContext({ env: { TEAMS_WEBHOOK_URL: VALID_URL } });
    const logSpy = vi.fn();
    context.logger.log = logSpy;

    verifyConditions({ webhookUrl: VALID_URL }, context);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("both plugin config and environment"),
    );
  });
});
