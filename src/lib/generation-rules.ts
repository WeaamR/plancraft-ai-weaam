// Shared by the server trigger and the details page (browser-safe, no imports).

/** A "processing" request older than this is treated as stuck and may be retried. */
export const STALE_PROCESSING_MS = 5 * 60 * 1000;

/** True while a generation run is genuinely in progress and a new one must not start. */
export function isGenerationLocked(status: string, updatedAt: string, now = Date.now()): boolean {
  return status === "processing" && now - new Date(updatedAt).getTime() < STALE_PROCESSING_MS;
}

/** A saved plan remains available and blocks regeneration regardless of run status. */
export function isAlreadyGenerated(_status: string, hasPlan: boolean): boolean {
  return hasPlan;
}
