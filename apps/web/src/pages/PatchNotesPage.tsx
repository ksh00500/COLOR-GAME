import { useState } from "react";
import { AppSidebar } from "../components/AppSidebar";
import {
  openPatchNotes,
  patchNoteReleases,
} from "../components/PatchNotesPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { useI18n } from "../i18n";

export function PatchNotesPage() {
  const { t, formatDate } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />

      <section className="patch-notes-page app-content-shell" aria-labelledby="patch-notes-title">
        <div className="online-copy">
          <p className="eyebrow">PATCH NOTES</p>
          <h1 id="patch-notes-title">{t("패치노트")}</h1>
          <p>{t("업데이트 기록을 버전별로 확인할 수 있습니다. 항목을 누르면 상세 내용이 열립니다.")}</p>
        </div>

        <div className="patch-release-list" aria-label={t("패치노트 목록")}>
          {patchNoteReleases.map((release) => (
            <button
              key={release.version}
              className="patch-release-card"
              type="button"
              onClick={() => openPatchNotes(release.version)}
            >
              <span className="patch-release-version">#{release.version}</span>
              <span className="patch-release-date">{formatDate(release.date)}</span>
              <strong>{t(release.title)}</strong>
              <small>{t(release.summary)}</small>
              <i>{t("상세 보기")} ↗</i>
            </button>
          ))}
        </div>
      </section>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
