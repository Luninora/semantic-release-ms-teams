import { canNotify } from "./can-notify.js";
import type { PluginConfig } from "./get-url.js";
import { success as sendNotification } from "./lifecycle-success.js";
import { verifyConditions as verify } from "./lifecycle-verify-conditions.js";
import type { Context } from "./types.js";

let verified = false;

/**
 * Verify that the webhook URL is configured and valid.
 */
export const verifyConditions = (pluginConfig: PluginConfig, context: Context): void => {
  verify(pluginConfig, context);
  verified = true;
};

/**
 * Send release notification to Microsoft Teams.
 *
 * This step is skipped in dry-run mode unless notifyInDryRun is true.
 */
export const success = async (pluginConfig: PluginConfig, context: Context): Promise<void> => {
  if (verified && canNotify(context)) {
    await sendNotification(pluginConfig, context);
  }
};

export type { PluginConfig };
