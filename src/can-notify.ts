import type { Context } from "./types.js";

/**
 * Handle conflict with @semantic-release/git which causes the message to be
 * sent twice.
 *
 * This plugin adds commits to the current branch, which re-triggers
 * semantic-release. This function returns false if @semantic-release/git is
 * active and a previous execution has already sent a notification.
 *
 * @see https://github.com/yllieth/semantic-release-ms-teams/issues/20
 */
export function canNotify(context: Context): boolean {
  const { env, options, logger } = context;

  if (!options?.plugins) return true;

  for (const plugin of options.plugins) {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;

    if (
      typeof pluginName === "string" &&
      pluginName === "@semantic-release/git" &&
      env.HAS_PREVIOUS_SEM_REL_EXECUTION === "true"
    ) {
      logger.warn(
        "The @semantic-release/git plugin has been detected, and it seems a message has already been sent to Teams. No other message will be issued.",
      );
      return false;
    }
  }

  return true;
}
