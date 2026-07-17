import "server-only";

/**
 * Pre-launch mode is deliberately opt-in. Missing values, casing variants,
 * and every value other than the exact string "true" keep the full site mode.
 */
export function isPrelaunchMode(): boolean {
  return process.env.PRELAUNCH_MODE === "true";
}
