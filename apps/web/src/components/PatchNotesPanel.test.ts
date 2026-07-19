import { describe, expect, it } from "vitest";
import {
  latestPatchNote,
  patchNoteReleases,
} from "./PatchNotesPanel";

describe("patch notes", () => {
  it("publishes the 20260719 tile palette update as the latest release", () => {
    expect(latestPatchNote.version).toBe("20260719-v1.2.3");
    expect(latestPatchNote.entries).toHaveLength(4);
    expect(latestPatchNote.entries.map((entry) => entry.tag)).toEqual([
      "PALETTE",
      "EQUIP",
      "MOBILE",
      "COLOR",
    ]);
    expect(patchNoteReleases[1]?.version).toBe("20260718-v1.2.2");
  });
});
