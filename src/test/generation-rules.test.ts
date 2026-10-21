import { describe, expect, it } from "vitest";
import { isAlreadyGenerated, isGenerationLocked } from "@/lib/generation-rules";

const now = new Date("2026-10-21T12:00:00Z").getTime();

describe("generation rules", () => {
  it("locks a request that started processing under 5 minutes ago", () => {
    expect(isGenerationLocked("processing", "2026-10-21T11:56:00Z", now)).toBe(true);
  });
  it("allows retry once processing has been stuck for 5 minutes or more", () => {
    expect(isGenerationLocked("processing", "2026-10-21T11:55:00Z", now)).toBe(false);
  });
  it("does not lock pending or failed requests", () => {
    expect(isGenerationLocked("failed", "2026-10-21T11:59:00Z", now)).toBe(false);
    expect(isGenerationLocked("pending", "2026-10-21T11:59:00Z", now)).toBe(false);
  });
  it("blocks generating again when completed with a saved plan", () => {
    expect(isAlreadyGenerated("completed", true)).toBe(true);
    expect(isAlreadyGenerated("completed", false)).toBe(false);
  });
});
