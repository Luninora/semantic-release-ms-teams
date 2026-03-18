import type { PluginConfig } from "./get-url.js";
import { getUrl } from "./get-url.js";
import { teamsify } from "./teamsify.js";
import type { Context } from "./types.js";

/**
 * Send release notification to Microsoft Teams.
 */
export async function success(pluginConfig: PluginConfig, context: Context): Promise<void> {
  const { logger, env, options } = context;
  const notifyInDryRun = pluginConfig.notifyInDryRun ?? true;
  const isDryRunMode = options?.dryRun === true && notifyInDryRun;
  const url = getUrl(pluginConfig, context);

  if (!url) {
    logger.error("No webhook URL resolved. Skipping Teams notification.");
    return;
  }

  let body: string;

  try {
    const card = teamsify(pluginConfig, context, isDryRunMode);
    body = JSON.stringify(card);
  } catch (e) {
    logger.error("An error occurred while building the Adaptive Card.");
    logger.error(e);
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!response.ok) {
      logger.error(`Teams webhook responded with ${response.status}: ${response.statusText}`);
    } else {
      logger.log("Message sent to Microsoft Teams.");
    }
  } catch (error) {
    logger.error("An error occurred while sending the message to Teams.");
    logger.error(error);
  } finally {
    env.HAS_PREVIOUS_SEM_REL_EXECUTION = "true";
  }
}
