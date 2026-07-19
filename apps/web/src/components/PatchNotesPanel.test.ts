import { describe, expect, it } from "vitest";
import {
  latestPatchNote,
  patchNoteReleases,
} from "./PatchNotesPanel";

describe("patch notes", () => {
  it("publishes the 20260719 account and private-room update as the latest release", () => {
    expect(latestPatchNote.version).toBe("20260719-v1.2.4");
    expect(latestPatchNote.entries).toHaveLength(3);
    expect(latestPatchNote.entries.map((entry) => entry.tag)).toEqual([
      "ACCOUNT",
      "AUTH",
      "PRIVATE",
    ]);
    expect(patchNoteReleases[1]?.version).toBe("20260719-v1.2.3");
  });
});
