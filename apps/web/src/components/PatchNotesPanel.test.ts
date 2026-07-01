import { describe, expect, it } from "vitest";
import {
  latestPatchNote,
  patchNoteReleases,
} from "./PatchNotesPanel";

describe("patch notes", () => {
  it("publishes the 20260701 match and mobile update as the latest release", () => {
    expect(latestPatchNote.version).toBe("20260701-v1.2.1");
    expect(latestPatchNote.entries).toHaveLength(6);
    expect(latestPatchNote.entries.map((entry) => entry.tag)).toEqual([
      "MATCH",
      "REMATCH",
      "QUEST",
      "ACCOUNT",
      "STORE",
      "UI",
    ]);
    expect(patchNoteReleases[1]?.version).toBe("20260630-v1.1.2");
  });
});
