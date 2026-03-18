import { describe, expect, it } from "vitest";
import { getUrl } from "../get-url.js";
import { createContext } from "./helpers.js";

const WEBHOOK_URL = "https://teams.webhook.example.com/primary";
const DRYRUN_URL = "https://teams.webhook.example.com/dryrun";

describe("getUrl", () => {
  describe("normal mode", () => {
    it("returns webhookUrl from config", () => {
      const context = createContext();
      expect(getUrl({ webhookUrl: WEBHOOK_URL }, context)).toBe(WEBHOOK_URL);
    });

    it("returns TEAMS_WEBHOOK_URL from env", () => {
      const context = createContext({ env: { TEAMS_WEBHOOK_URL: WEBHOOK_URL } });
      expect(getUrl({}, context)).toBe(WEBHOOK_URL);
    });

    it("config takes precedence over env", () => {
      const context = createContext({ env: { TEAMS_WEBHOOK_URL: "https://env.url" } });
      expect(getUrl({ webhookUrl: WEBHOOK_URL }, context)).toBe(WEBHOOK_URL);
    });

    it("returns undefined when no URL is set", () => {
      const context = createContext();
      expect(getUrl({}, context)).toBeUndefined();
    });
  });

  describe("dry-run mode", () => {
    it("returns webhookUrlDryRun from config", () => {
      const context = createContext({ options: { dryRun: true } });
      expect(getUrl({ webhookUrlDryRun: DRYRUN_URL, webhookUrl: WEBHOOK_URL }, context)).toBe(
        DRYRUN_URL,
      );
    });

    it("returns TEAMS_WEBHOOK_URL_DRY_RUN from env", () => {
      const context = createContext({
        options: { dryRun: true },
        env: { TEAMS_WEBHOOK_URL_DRY_RUN: DRYRUN_URL },
      });
      expect(getUrl({}, context)).toBe(DRYRUN_URL);
    });

    it("falls back to primary URL in dry-run", () => {
      const context = createContext({ options: { dryRun: true } });
      expect(getUrl({ webhookUrl: WEBHOOK_URL }, context)).toBe(WEBHOOK_URL);
    });

    it("returns undefined when notifyInDryRun is false", () => {
      const context = createContext({ options: { dryRun: true } });
      expect(getUrl({ notifyInDryRun: false, webhookUrl: WEBHOOK_URL }, context)).toBe(WEBHOOK_URL);
    });
  });
});
