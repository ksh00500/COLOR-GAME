import { describe, expect, it } from "vitest";
import {
  latestPatchNote,
  patchNoteReleases,
} from "./PatchNotesPanel";

describe("patch notes", () => {
  it("publishes the 20260630 economy and cosmetics update as the latest release", () => {
    expect(latestPatchNote.version).toBe("20260630-v1.1.2");
    expect(latestPatchNote.entries).toHaveLength(6);
    expect(latestPatchNote.entries.map((entry) => entry.tag)).toEqual([
      "ECONOMY",
      "COSMETIC",
      "STORE",
      "ATTENDANCE",
      "COUPON",
      "UI",
    ]);
    expect(patchNoteReleases[1]?.version).toBe("20260625-V1.1.1");
  });
});
