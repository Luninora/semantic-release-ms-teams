import { describe, expect, it } from "vitest";
import { teamsify } from "../teamsify.js";
import { createContext } from "./helpers.js";

describe("teamsify", () => {
  it("returns a valid Adaptive Card message structure", () => {
    const context = createContext();
    const result = teamsify({}, context, false);

    expect(result.type).toBe("message");
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].contentType).toBe("application/vnd.microsoft.card.adaptive");
    expect(result.attachments[0].content.type).toBe("AdaptiveCard");
    expect(result.attachments[0].content.version).toBe("1.4");
  });

  it("includes header with default title", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;

    const header = body[0];
    expect(header.type).toBe("TextBlock");
    expect(header.text).toBe("A new version has been released");
    expect(header.weight).toBe("Bolder");
  });

  it("uses custom title from config", () => {
    const context = createContext();
    const result = teamsify({ title: "Admin App Release" }, context, false);
    const header = result.attachments[0].content.body[0];

    expect(header.text).toBe("Admin App Release");
  });

  it("shows dry-run title in dry-run mode", () => {
    const context = createContext();
    const result = teamsify({}, context, true);
    const header = result.attachments[0].content.body[0];

    expect(header.text).toContain("DRY-RUN");
  });

  it("includes repository name", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;
    const subtitle = body[1];

    expect(subtitle.text).toBe("admin");
  });

  it("includes FactSet with version info", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;
    const factSet = body.find((el) => el.type === "FactSet") as {
      facts: Array<{ title: string; value: string }>;
    };

    expect(factSet).toBeDefined();
    const facts = factSet.facts;
    expect(facts.find((f) => f.title === "Version")?.value).toBe("v1.1.0 (minor)");
    expect(facts.find((f) => f.title === "Last Release")?.value).toBe("v1.0.0");
    expect(facts.find((f) => f.title === "Commits")?.value).toBe("1");
  });

  it('shows "None" when there is no last release', () => {
    const context = createContext({ lastRelease: undefined });
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;
    const factSet = body.find((el) => el.type === "FactSet") as {
      facts: Array<{ title: string; value: string }>;
    };
    const lastRelease = factSet.facts.find((f) => f.title === "Last Release");

    expect(lastRelease?.value).toBe("None");
  });

  it("includes contributors by default", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;
    const factSet = body.find((el) => el.type === "FactSet") as {
      facts: Array<{ title: string; value: string }>;
    };
    const contributors = factSet.facts.find((f) => f.title === "Contributors");

    expect(contributors?.value).toBe("test");
  });

  it("hides contributors when showContributors is false", () => {
    const context = createContext();
    const result = teamsify({ showContributors: false }, context, false);
    const body = result.attachments[0].content.body;
    const factSet = body.find((el) => el.type === "FactSet") as {
      facts: Array<{ title: string; value: string }>;
    };
    const contributors = factSet.facts.find((f) => f.title === "Contributors");

    expect(contributors).toBeUndefined();
  });

  it("parses release note sections", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;

    const textBlocks = body.filter((el) => el.type === "TextBlock" && typeof el.text === "string");
    const features = textBlocks.find((el) => el.text === "**Features**");
    const bugFixes = textBlocks.find((el) => el.text === "**Bug Fixes**");

    expect(features).toBeDefined();
    expect(bugFixes).toBeDefined();
  });

  it("includes change items in sections", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;

    const textBlocks = body.filter(
      (el) =>
        el.type === "TextBlock" &&
        typeof el.text === "string" &&
        (el.text as string).startsWith("- "),
    );

    expect(textBlocks.length).toBeGreaterThan(0);
    expect(textBlocks[0].text).toContain("add new feature");
  });

  it("handles empty release notes", () => {
    const context = createContext({
      nextRelease: {
        version: "1.1.0",
        gitTag: "v1.1.0",
        gitHead: "abc123",
        channels: [null],
        type: "minor",
        notes: "",
      },
    });
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;

    // Should have header, subtitle, and factset but no separator or sections
    expect(body).toHaveLength(3);
  });

  it("deduplicates contributors", () => {
    const context = createContext({
      commits: [
        {
          hash: "a",
          message: "feat: a",
          subject: "feat: a",
          body: "",
          author: { name: "A", email: "user@example.com" },
          committer: { name: "A", email: "user@example.com" },
          committerDate: "2026-01-01",
        },
        {
          hash: "b",
          message: "feat: b",
          subject: "feat: b",
          body: "",
          author: { name: "A", email: "user@example.com" },
          committer: { name: "A", email: "user@example.com" },
          committerDate: "2026-01-01",
        },
      ],
    });
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;
    const factSet = body.find((el) => el.type === "FactSet") as {
      facts: Array<{ title: string; value: string }>;
    };
    const contributors = factSet.facts.find((f) => f.title === "Contributors");

    expect(contributors?.value).toBe("user");
  });
});
