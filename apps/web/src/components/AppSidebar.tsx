import { useNavigate } from "react-router-dom";
import { BrandMark } from "./BrandMark";

interface AppSidebarProps {
  onSettings: () => void;
}

export function AppSidebar({ onSettings }: AppSidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="app-sidebar" aria-label="주요 메뉴">
      <button className="sidebar-brand" type="button" onClick={() => navigate("/")}>
        <BrandMark />
      </button>
      <nav className="sidebar-nav">
        <button type="button" onClick={() => navigate("/")}>플레이</button>
        <button type="button" onClick={() => navigate("/matchmaking?mode=casual")}>일반</button>
        <button type="button" onClick={() => navigate("/matchmaking?mode=ranked")}>경쟁</button>
        <button type="button" onClick={() => navigate("/private")}>사설방</button>
        <button type="button" onClick={() => navigate("/leaderboard")}>리더보드</button>
        <button type="button" onClick={() => navigate("/account")}>계정</button>
      </nav>
      <div className="sidebar-bottom">
        <button type="button" onClick={onSettings}>설정</button>
      </div>
    </aside>
  );
}
