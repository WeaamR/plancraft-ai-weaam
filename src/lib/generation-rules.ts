// Shared by the server trigger and the details page (browser-safe, no imports).

/** A "processing" request older than this is treated as stuck and may be retried. */
export const STALE_PROCESSING_MS = 5 * 60 * 1000;

/** True while a generation run is genuinely in progress and a new one must not start. */
export function isGenerationLocked(status: string, updatedAt: string, now = Date.now()): boolean {
  return status === "processing" && now - new Date(updatedAt).getTime() < STALE_PROCESSING_MS;
}

/** True when the request already has its finished plan; generating again is blocked. */
export function isAlreadyGenerated(status: string, hasPlan: boolean): boolean {
  return status === "completed" && hasPlan;
}
