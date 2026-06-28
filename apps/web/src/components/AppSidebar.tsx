import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { BrandMark } from "./BrandMark";

interface AppSidebarProps {
  onSettings: () => void;
}

export function AppSidebar({ onSettings }: AppSidebarProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <aside className="app-sidebar" aria-label={t("주요 메뉴")}>
      <button className="sidebar-brand" type="button" onClick={() => navigate("/")}>
        <BrandMark />
      </button>
      <nav className="sidebar-nav">
        <button type="button" onClick={() => navigate("/")}>{t("플레이")}</button>
        <button type="button" onClick={() => navigate("/matchmaking?mode=casual")}>{t("일반")}</button>
        <button type="button" onClick={() => navigate("/matchmaking?mode=ranked")}>{t("경쟁")}</button>
        <button type="button" onClick={() => navigate("/private")}>{t("사설방")}</button>
        <button type="button" onClick={() => navigate("/leaderboard")}>{t("리더보드")}</button>
        <button type="button" onClick={() => navigate("/account")}>{t("계정")}</button>
        <button type="button" onClick={() => navigate("/patch-notes")}>{t("패치노트")}</button>
      </nav>
      <div className="sidebar-bottom">
        <button type="button" onClick={() => navigate("/privacy")}>{t("개인정보")}</button>
        <button type="button" onClick={onSettings}>{t("설정")}</button>
      </div>
    </aside>
  );
}
