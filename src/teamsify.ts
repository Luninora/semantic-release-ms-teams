import type { PluginConfig } from "./get-url.js";
import type { Context } from "./types.js";

// biome-ignore lint/suspicious/noExplicitAny: Adaptive Card elements have dynamic shapes
type CardElement = Record<string, any>;

interface AdaptiveCardMessage {
  type: "message";
  attachments: Array<{
    contentType: "application/vnd.microsoft.card.adaptive";
    contentUrl: null;
    content: {
      $schema: string;
      type: "AdaptiveCard";
      version: string;
      speak: string;
      msteams: { width: "full" };
      body: CardElement[];
      actions: CardElement[];
    };
  }>;
}

interface ChangeItem {
  scope: string;
  description: string;
}

interface ReleaseSection {
  name: string;
  items: ChangeItem[];
}

const SECTION_CONFIG: Record<string, { style: string; icon: string; color: string }> = {
  Features: { style: "good", icon: "Sparkle", color: "Good" },
  "Bug Fixes": { style: "attention", icon: "Bug", color: "Attention" },
  "Performance Improvements": { style: "accent", icon: "Gauge", color: "Accent" },
  "Code Refactoring": { style: "default", icon: "Wrench", color: "Default" },
  Documentation: { style: "default", icon: "Notebook", color: "Default" },
  Reverts: { style: "warning", icon: "ArrowUndo", color: "Warning" },
};

const DEFAULT_SECTION_CONFIG = { style: "default", icon: "Note", color: "Default" };

const SECTION_ORDER = [
  "Features",
  "Bug Fixes",
  "Performance Improvements",
  "Code Refactoring",
  "Reverts",
  "Documentation",
];

/**
 * Parse a changelog line like:
 *   "**auth:** add support for passkeys ([abc123](url))"
 * into { scope: "auth", description: "add support for passkeys ([abc123](url))" }
 */
function parseChangeItem(line: string): ChangeItem {
  const scopeMatch = line.match(/^\*\*([^*]+):\*\*\s*(.+)$/);
  if (scopeMatch) {
    return { scope: scopeMatch[1], description: scopeMatch[2] };
  }
  return { scope: "", description: line };
}

/**
 * Parse semantic-release notes into sections with structured items.
 */
function extractSections(notes: string): ReleaseSection[] {
  const sections: ReleaseSection[] = [];
  const parts = notes.split(/^### /m);

  for (const part of parts) {
    if (!part.trim()) continue;

    const lines = part.split("\n");
    const name = lines[0].trim();
    if (!name || name.startsWith("#")) continue;

    const items: ChangeItem[] = [];
    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let content: string | undefined;
      if (trimmed.startsWith("* ")) {
        content = trimmed.slice(2);
      } else if (trimmed.startsWith("- ")) {
        content = trimmed.slice(2);
      }

      if (content) {
        items.push(parseChangeItem(content));
      }
    }

    if (items.length > 0) {
      sections.push({ name, items });
    }
  }

  return sections;
}

function buildSectionHeader(name: string): CardElement {
  const config = SECTION_CONFIG[name] ?? DEFAULT_SECTION_CONFIG;
  return {
    type: "Container",
    spacing: "Medium",
    style: config.style,
    items: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "auto",
            verticalContentAlignment: "Center",
            items: [{ type: "Icon", name: config.icon, color: config.color, size: "Small" }],
          },
          {
            type: "Column",
            width: "stretch",
            verticalContentAlignment: "Center",
            items: [
              {
                type: "TextBlock",
                text: name,
                weight: "Bolder",
                size: "Large",
                color: config.color,
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildSectionFacts(items: ChangeItem[]): CardElement {
  return {
    type: "FactSet",
    spacing: "Small",
    facts: items.map((item) => ({
      title: item.scope ? `**${item.scope}**` : "—",
      value: item.description,
    })),
  };
}

/**
 * Build an Adaptive Card message for Microsoft Teams Workflow webhooks.
 */
export function teamsify(
  pluginConfig: PluginConfig,
  context: Context,
  isDryRunMode: boolean,
): AdaptiveCardMessage {
  const { nextRelease, lastRelease, options } = context;

  const repoUrl = options?.repositoryUrl ?? "";
  const repository =
    repoUrl
      .replace(/\.git$/, "")
      .split("/")
      .pop() ?? "unknown";
  const version = nextRelease?.gitTag ?? nextRelease?.version ?? "unknown";
  const channel = nextRelease?.channel ?? null;

  const isStaging = version.includes("staging") || channel === "staging";
  const environment = isStaging ? "Staging" : "Production";

  let headerVersion: string;
  let headerSubtitle: string;
  let speak: string;

  if (isDryRunMode) {
    headerVersion = `[DRY-RUN] ${nextRelease?.type ?? "unknown"} version bump`;
    headerSubtitle = "Preview of the next release";
    speak = `Dry run preview for ${repository}`;
  } else {
    headerVersion = `**${version}**`;
    headerSubtitle = `Successfully deployed to **${environment}**`;
    speak = `New release ${version} deployed to ${environment} for ${repository}.`;
  }

  const title = pluginConfig.title ?? "Release";

  const body: CardElement[] = [
    // Header
    {
      type: "Container",
      style: "accent",
      bleed: true,
      items: [
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "auto",
              verticalContentAlignment: "Center",
              items: [{ type: "Icon", name: "Rocket", color: "Light", size: "Large" }],
            },
            {
              type: "Column",
              width: "stretch",
              verticalContentAlignment: "Center",
              items: [
                {
                  type: "TextBlock",
                  text: `${title}: ${headerVersion}`,
                  size: "ExtraLarge",
                  weight: "Bolder",
                  color: "Light",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: headerSubtitle,
                  spacing: "None",
                  color: "Light",
                  isSubtle: true,
                  wrap: true,
                },
              ],
            },
          ],
        },
      ],
    },
    // Metadata
    {
      type: "FactSet",
      spacing: "Medium",
      facts: [
        { title: "Repository:", value: repository },
        {
          title: "Previous:",
          value:
            lastRelease && Object.keys(lastRelease).length > 0 ? `\`${lastRelease.gitTag}\`` : "—",
        },
      ],
    },
  ];

  // Changelog sections (sorted: Features first, then by defined order)
  const notes = nextRelease?.notes ?? "";
  const sections = extractSections(notes).sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.name);
    const bi = SECTION_ORDER.indexOf(b.name);
    return (ai === -1 ? SECTION_ORDER.length : ai) - (bi === -1 ? SECTION_ORDER.length : bi);
  });

  for (const section of sections) {
    body.push(buildSectionHeader(section.name));
    body.push(buildSectionFacts(section.items));
  }

  // Actions
  const releaseUrl = repoUrl.replace(/\.git$/, "");
  const actions: CardElement[] = [];
  if (releaseUrl && !isDryRunMode) {
    actions.push({
      type: "Action.OpenUrl",
      title: "View Release on GitHub",
      iconUrl: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
      url: `${releaseUrl}/releases/tag/${version}`,
    });
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.5",
          speak,
          msteams: { width: "full" },
          body,
          actions,
        },
      },
    ],
  };
}
