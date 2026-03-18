import type { PluginConfig } from "./get-url.js";
import type { Context } from "./types.js";

interface AdaptiveCardElement {
  type: string;
  [key: string]: unknown;
}

interface AdaptiveCardMessage {
  type: "AdaptiveCard";
  attachments: Array<{
    $schema: string;
    type: "AdaptiveCard";
    version: string;
    body: AdaptiveCardElement[];
  }>;
}

interface ReleaseSection {
  name: string;
  changes: string;
}

/**
 * Parse semantic-release notes into sections.
 *
 * Release notes follow a predictable markdown format:
 * ```
 * ## [1.2.0](url) (date)
 *
 * ### Features
 *
 * * item 1 ([commit](url))
 * * item 2
 *
 * ### Bug Fixes
 *
 * * fix 1
 * ```
 */
function extractSections(notes: string): ReleaseSection[] {
  const sections: ReleaseSection[] = [];

  // Split by ### headers (level 3 headings)
  const parts = notes.split(/^### /m);

  for (const part of parts) {
    if (!part.trim()) continue;

    const lines = part.split("\n");
    const name = lines[0].trim();

    // Skip if this looks like the version header (## level) or is empty
    if (!name || name.startsWith("#")) continue;

    // Collect the list items (lines starting with * or -)
    const changeLines = lines
      .slice(1)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        // Normalize * bullets to - bullets for consistency
        const trimmed = line.trim();
        if (trimmed.startsWith("* ")) {
          return `- ${trimmed.slice(2)}`;
        }
        return trimmed;
      })
      .filter((line) => line.startsWith("- "));

    if (changeLines.length > 0) {
      sections.push({
        name,
        changes: changeLines.join("\n"),
      });
    }
  }

  return sections;
}

/**
 * Build an Adaptive Card message for Microsoft Teams.
 */
export function teamsify(
  pluginConfig: PluginConfig,
  context: Context,
  isDryRunMode: boolean,
): AdaptiveCardMessage {
  const { nextRelease, lastRelease, commits, options } = context;
  const repository = options?.repositoryUrl?.split("/").pop() ?? "unknown";
  const { title: configTitle, showContributors } = pluginConfig;

  let headerTitle: string;
  let versionText: string;

  if (isDryRunMode) {
    headerTitle = "[DRY-RUN] Preview of the next release";
    versionText = `${nextRelease?.type} version bump`;
  } else {
    headerTitle = configTitle ?? "A new version has been released";
    versionText = `${nextRelease?.gitTag} (${nextRelease?.type})`;
  }

  const facts: Array<{ title: string; value: string }> = [
    { title: "Version", value: versionText },
    {
      title: "Last Release",
      value: lastRelease && Object.keys(lastRelease).length > 0 ? lastRelease.gitTag : "None",
    },
    { title: "Commits", value: String(commits?.length ?? 0) },
  ];

  // Add contributors
  if (commits && commits.length > 0 && (showContributors ?? true)) {
    const contributors = new Set<string>();
    for (const commit of commits) {
      if (commit.author?.email) {
        const name = commit.author.email.substring(0, commit.author.email.indexOf("@"));
        contributors.add(name);
      }
    }
    if (contributors.size > 0) {
      facts.push({
        title: "Contributors",
        value: Array.from(contributors).join(", "),
      });
    }
  }

  const body: AdaptiveCardElement[] = [
    {
      type: "TextBlock",
      size: "Large",
      weight: "Bolder",
      text: headerTitle,
      style: "heading",
    },
    {
      type: "TextBlock",
      text: repository,
      isSubtle: true,
      spacing: "None",
    },
    {
      type: "FactSet",
      facts,
    },
  ];

  // Parse and add release note sections
  const notes = nextRelease?.notes ?? "";
  const sections = extractSections(notes);

  if (sections.length > 0) {
    body.push({
      type: "TextBlock",
      text: "---",
    });

    for (const section of sections) {
      body.push({
        type: "TextBlock",
        text: `**${section.name}**`,
        weight: "Bolder",
        spacing: "Medium",
      });
      body.push({
        type: "TextBlock",
        text: section.changes,
        wrap: true,
      });
    }
  }

  return {
    type: "AdaptiveCard",
    attachments: [
      {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        type: "AdaptiveCard",
        version: "1.4",
        body,
      },
    ],
  };
}
