import type { Context } from "./types.js";

export interface PluginConfig {
  /** Webhook URL for the Teams Workflow */
  webhookUrl?: string;
  /** Webhook URL for dry-run mode */
  webhookUrlDryRun?: string;
  /** Whether to send notifications in dry-run mode (default: true) */
  notifyInDryRun?: boolean;
  /** Custom title for the notification card */
  title?: string;
  /** Whether to show contributors in the card (default: true) */
  showContributors?: boolean;
}

/**
 * Determine the URL to publish to.
 *
 * - The URL defined in plugin config overrides the one in the environment
 * - In dry-run mode, the order is: webhookUrlDryRun, TEAMS_WEBHOOK_URL_DRY_RUN, webhookUrl, TEAMS_WEBHOOK_URL
 */
export function getUrl(pluginConfig: PluginConfig, context: Context): string | undefined {
  const notifyInDryRun = pluginConfig.notifyInDryRun ?? true;
  const dryRun = context.options?.dryRun === true;

  const urlConfig = pluginConfig.webhookUrl;
  const dryRunUrlConfig = pluginConfig.webhookUrlDryRun;
  const urlEnvironment = context.env.TEAMS_WEBHOOK_URL;
  const dryRunUrlEnvironment = context.env.TEAMS_WEBHOOK_URL_DRY_RUN;

  if (dryRun && notifyInDryRun) {
    return dryRunUrlConfig ?? dryRunUrlEnvironment ?? urlConfig ?? urlEnvironment;
  }

  return urlConfig ?? urlEnvironment;
}
