import type { PluginConfig } from "./get-url.js";
import type { Context } from "./types.js";

/**
 * Validate that the user has provided a valid MS Teams webhook URL,
 * either via plugin config or environment variable.
 */
export function verifyConditions(pluginConfig: PluginConfig, context: Context): void {
  const { env, logger } = context;
  const { webhookUrl: urlOption, webhookUrlDryRun: dryRunUrlOption } = pluginConfig;
  const urlEnvironment = env.TEAMS_WEBHOOK_URL;
  const dryRunUrlEnvironment = env.TEAMS_WEBHOOK_URL_DRY_RUN;

  const errors: string[] = [];

  // Validate primary URL
  const url = urlOption ?? urlEnvironment;
  if (!url) {
    errors.push(
      'No webhook URL provided. Set "webhookUrl" in plugin config or TEAMS_WEBHOOK_URL environment variable.',
    );
  } else {
    try {
      new URL(url);
    } catch {
      errors.push(`Invalid webhook URL: "${url}"`);
    }
  }

  if (urlOption && urlEnvironment) {
    logger.log(
      "Found webhook URL in both plugin config and environment. The plugin config value will be used.",
    );
  }

  // Validate dry-run URL if provided
  const dryRunUrl = dryRunUrlOption ?? dryRunUrlEnvironment;
  if (dryRunUrl) {
    try {
      new URL(dryRunUrl);
    } catch {
      errors.push(`Invalid dry-run webhook URL: "${dryRunUrl}"`);
    }

    if (dryRunUrlOption && dryRunUrlEnvironment) {
      logger.log(
        "Found dry-run webhook URL in both plugin config and environment. The plugin config value will be used.",
      );
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
}
