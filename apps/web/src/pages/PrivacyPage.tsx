import { Link } from "react-router-dom";
import { AppSidebar } from "../components/AppSidebar";
import { SettingsPanel } from "../components/SettingsPanel";
import { useState } from "react";
import { useI18n } from "../i18n";

export function PrivacyPage() {
  const { t } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim();

  return (
    <main className="online-page app-frame">
      <AppSidebar onSettings={() => setSettingsOpen(true)} />
      <article className="legal-shell app-content-shell">
        <p className="eyebrow">PRIVACY POLICY</p>
        <h1>{t("개인정보 처리방침")}</h1>
        <p>{t("시행일: 2026년 6월 28일")}</p>

        <section>
          <h2>{t("수집하는 정보")}</h2>
          <p>{t("Tango는 계정 이용 시 이메일, 해시 처리된 비밀번호, 닉네임, 아바타, 레이팅, 전적, 출석 기록을 처리합니다. 서비스 운영을 위해 익명 방문 식별자, 접속 경로, 브라우저 정보를 처리할 수 있습니다.")}</p>
        </section>
        <section>
          <h2>{t("이용 목적")}</h2>
          <p>{t("수집한 정보는 로그인, 온라인 대전, 전적과 리더보드, 출석 기능, 서비스 안정성 확인에만 사용합니다.")}</p>
        </section>
        <section>
          <h2>{t("보관과 삭제")}</h2>
          <p>{t("계정 정보는 회원 탈퇴 전까지 보관합니다. 계정을 삭제하면 계정 정보, 출석 기록, 계정과 연결된 경기 기록과 리플레이가 삭제되며 복구할 수 없습니다. 계정과 연결되지 않은 집계형 매칭 시간과 익명 방문 통계는 서비스 운영 목적으로 남을 수 있습니다.")}</p>
          <Link className="primary-action legal-action" to="/account-deletion">
            {t("계정 삭제 요청")}
          </Link>
        </section>
        <section>
          <h2>{t("보호와 처리 위탁")}</h2>
          <p>{t("전송 구간은 HTTPS로 보호하며 비밀번호는 원문으로 저장하지 않습니다. 서버와 데이터베이스 운영을 위해 Amazon Web Services 인프라를 사용합니다.")}</p>
        </section>
        <section>
          <h2>{t("문의")}</h2>
          {supportEmail ? (
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          ) : (
            <p>{t("지원 이메일은 정식 출시 전에 이 페이지와 Play Store 등록 정보에 추가됩니다.")}</p>
          )}
        </section>
      </article>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
