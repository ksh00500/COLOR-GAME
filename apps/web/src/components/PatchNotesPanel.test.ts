import { describe, expect, it } from "vitest";
import {
  latestPatchNote,
  patchNoteReleases,
} from "./PatchNotesPanel";

describe("patch notes", () => {
  it("publishes the 20260721 cosmetics remaster as the latest release", () => {
    expect(latestPatchNote.version).toBe("20260721-v1.3.1");
    expect(latestPatchNote.entries).toHaveLength(4);
    expect(latestPatchNote.entries.map((entry) => entry.tag)).toEqual([
      "STORE",
      "LOADOUT",
      "EFFECT",
      "RESULT",
    ]);
    expect(patchNoteReleases[1]?.version).toBe("20260719-v1.3.0");
  });
});
