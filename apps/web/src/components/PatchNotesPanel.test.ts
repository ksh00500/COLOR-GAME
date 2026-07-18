import { describe, expect, it } from "vitest";
import {
  latestPatchNote,
  patchNoteReleases,
} from "./PatchNotesPanel";

describe("patch notes", () => {
  it("publishes the 20260718 attendance and control update as the latest release", () => {
    expect(latestPatchNote.version).toBe("20260718-v1.2.2");
    expect(latestPatchNote.entries).toHaveLength(5);
    expect(latestPatchNote.entries.map((entry) => entry.tag)).toEqual([
      "CHECK-IN",
      "QUEST",
      "CONTROL",
      "ONLINE",
      "AI",
    ]);
    expect(patchNoteReleases[1]?.version).toBe("20260701-v1.2.1");
  });
});
