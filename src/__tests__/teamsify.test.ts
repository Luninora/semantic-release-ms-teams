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
    expect(result.attachments[0].content.version).toBe("1.5");
    expect(result.attachments[0].content.msteams).toEqual({ width: "full" });
  });

  it("includes header with rocket icon and version", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;

    const header = body[0];
    expect(header.type).toBe("Container");
    expect(header.style).toBe("accent");
    expect(header.bleed).toBe(true);

    const titleBlock = header.items[0].columns[1].items[0];
    expect(titleBlock.text).toContain("v1.1.0");
    expect(titleBlock.size).toBe("ExtraLarge");
  });

  it("uses custom title from config", () => {
    const context = createContext();
    const result = teamsify({ title: "Admin App" }, context, false);
    const header = result.attachments[0].content.body[0];
    const titleBlock = header.items[0].columns[1].items[0];

    expect(titleBlock.text).toContain("Admin App");
  });

  it("shows dry-run title in dry-run mode", () => {
    const context = createContext();
    const result = teamsify({}, context, true);
    const header = result.attachments[0].content.body[0];
    const titleBlock = header.items[0].columns[1].items[0];

    expect(titleBlock.text).toContain("DRY-RUN");
  });

  it("includes repository name in metadata", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;
    const factSet = body[1];

    expect(factSet.type).toBe("FactSet");
    expect(factSet.facts[0].value).toBe("admin");
  });

  it("includes previous release in metadata", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const factSet = result.attachments[0].content.body[1];

    expect(factSet.facts[1].title).toBe("Previous:");
    expect(factSet.facts[1].value).toBe("`v1.0.0`");
  });

  it('shows "—" when there is no last release', () => {
    const context = createContext({ lastRelease: undefined });
    const result = teamsify({}, context, false);
    const factSet = result.attachments[0].content.body[1];

    expect(factSet.facts[1].value).toBe("—");
  });

  it("detects staging environment from version tag", () => {
    const context = createContext({
      nextRelease: {
        version: "1.1.0-staging.1",
        gitTag: "v1.1.0-staging.1",
        gitHead: "abc123",
        channels: ["staging"],
        type: "minor",
        notes: "",
        channel: "staging",
      },
    });
    const result = teamsify({}, context, false);
    const subtitle = result.attachments[0].content.body[0].items[0].columns[1].items[1];

    expect(subtitle.text).toContain("Staging");
  });

  it("shows Production for non-staging releases", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const subtitle = result.attachments[0].content.body[0].items[0].columns[1].items[1];

    expect(subtitle.text).toContain("Production");
  });

  it("parses changelog sections with styled containers", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;

    // Find Features section container (after header + factset)
    const featuresContainer = body.find((el) => el.type === "Container" && el.style === "good");
    expect(featuresContainer).toBeDefined();

    // Find Bug Fixes section container
    const bugFixesContainer = body.find(
      (el) => el.type === "Container" && el.style === "attention",
    );
    expect(bugFixesContainer).toBeDefined();
  });

  it("parses scoped changes into FactSet", () => {
    const context = createContext({
      nextRelease: {
        version: "1.1.0",
        gitTag: "v1.1.0",
        gitHead: "abc123",
        channels: [null],
        type: "minor",
        notes: `## [1.1.0](url) (2026-01-01)

### Features

* **auth:** add passkey support ([abc](url))
* **ui:** dark mode toggle ([def](url))
`,
      },
    });
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;

    const factSets = body.filter((el) => el.type === "FactSet" && el.spacing === "Small");
    expect(factSets).toHaveLength(1);
    expect(factSets[0].facts[0].title).toBe("**auth**");
    expect(factSets[0].facts[0].value).toContain("add passkey support");
    expect(factSets[0].facts[1].title).toBe("**ui**");
  });

  it("handles changes without scope", () => {
    const context = createContext({
      nextRelease: {
        version: "1.1.0",
        gitTag: "v1.1.0",
        gitHead: "abc123",
        channels: [null],
        type: "minor",
        notes: `## [1.1.0](url) (2026-01-01)

### Features

* add something without scope ([abc](url))
`,
      },
    });
    const result = teamsify({}, context, false);
    const body = result.attachments[0].content.body;

    const factSets = body.filter((el) => el.type === "FactSet" && el.spacing === "Small");
    expect(factSets[0].facts[0].title).toBe("—");
    expect(factSets[0].facts[0].value).toContain("add something without scope");
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

    // Should have header + metadata factset only
    expect(body).toHaveLength(2);
  });

  it("includes GitHub release action link", () => {
    const context = createContext();
    const result = teamsify({}, context, false);
    const actions = result.attachments[0].content.actions;

    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("Action.OpenUrl");
    expect(actions[0].url).toContain("/releases/tag/v1.1.0");
  });

  it("omits action link in dry-run mode", () => {
    const context = createContext();
    const result = teamsify({}, context, true);
    const actions = result.attachments[0].content.actions;

    expect(actions).toHaveLength(0);
  });

  it("includes speak text for accessibility", () => {
    const context = createContext();
    const result = teamsify({}, context, false);

    expect(result.attachments[0].content.speak).toContain("v1.1.0");
    expect(result.attachments[0].content.speak).toContain("Production");
  });
});
