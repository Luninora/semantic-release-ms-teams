import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { success } from "../lifecycle-success.js";
import { createContext } from "./helpers.js";

const WEBHOOK_URL = "https://teams.webhook.example.com/webhook";

describe("lifecycle-success", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends POST request to webhook URL", async () => {
    const context = createContext();
    await success({ webhookUrl: WEBHOOK_URL }, context);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String),
    });
  });

  it("sends valid Adaptive Card JSON", async () => {
    const context = createContext();
    await success({ webhookUrl: WEBHOOK_URL }, context);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.type).toBe("AdaptiveCard");
    expect(body.attachments[0].type).toBe("AdaptiveCard");
  });

  it("skips when no URL is resolved", async () => {
    const context = createContext();
    await success({}, context);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("logs error on non-ok response", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 400, statusText: "Bad Request" });
    const context = createContext();
    const errorSpy = vi.fn();
    context.logger.error = errorSpy;

    await success({ webhookUrl: WEBHOOK_URL }, context);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("400"));
  });

  it("logs error on fetch failure", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));
    const context = createContext();
    const errorSpy = vi.fn();
    context.logger.error = errorSpy;

    await success({ webhookUrl: WEBHOOK_URL }, context);

    expect(errorSpy).toHaveBeenCalled();
  });

  it("sets HAS_PREVIOUS_SEM_REL_EXECUTION after success", async () => {
    const context = createContext();
    await success({ webhookUrl: WEBHOOK_URL }, context);

    expect(context.env.HAS_PREVIOUS_SEM_REL_EXECUTION).toBe("true");
  });

  it("sets HAS_PREVIOUS_SEM_REL_EXECUTION even after failure", async () => {
    fetchSpy.mockRejectedValue(new Error("fail"));
    const context = createContext();
    await success({ webhookUrl: WEBHOOK_URL }, context);

    expect(context.env.HAS_PREVIOUS_SEM_REL_EXECUTION).toBe("true");
  });
});
