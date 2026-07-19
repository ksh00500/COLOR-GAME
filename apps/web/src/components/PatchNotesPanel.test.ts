import { describe, expect, it } from "vitest";
import {
  latestPatchNote,
  patchNoteReleases,
} from "./PatchNotesPanel";

describe("patch notes", () => {
  it("publishes the 20260719 visual remaster as the latest release", () => {
    expect(latestPatchNote.version).toBe("20260719-v1.3.0");
    expect(latestPatchNote.entries).toHaveLength(4);
    expect(latestPatchNote.entries.map((entry) => entry.tag)).toEqual([
      "BRAND",
      "DESIGN",
      "LAYOUT",
      "MOBILE",
    ]);
    expect(patchNoteReleases[1]?.version).toBe("20260719-v1.2.4");
  });
});
