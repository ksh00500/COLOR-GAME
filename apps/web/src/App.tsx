import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AccountPage } from "./pages/AccountPage";
import { GamePage } from "./pages/GamePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { LobbyPage } from "./pages/LobbyPage";
import { MatchmakingPage } from "./pages/MatchmakingPage";
import { OnlineRoomPage } from "./pages/OnlineRoomPage";
import { PatchNotesPage } from "./pages/PatchNotesPage";
import { ReplayPage } from "./pages/ReplayPage";
import { SpectatePage } from "./pages/SpectatePage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { StorePage } from "./pages/StorePage";
import { PatchNotesPanel } from "./components/PatchNotesPanel";
import { TutorialPanel } from "./components/TutorialPanel";
import { NativeAppBridge } from "./components/NativeAppBridge";
import { CosmeticLoadoutBridge } from "./components/CosmeticLoadoutBridge";
import { AttendanceCheckInModal } from "./components/AttendanceCheckInModal";
import { AdminPage } from "./pages/AdminPage";

export function App() {
  const adminRoute = useLocation().pathname.startsWith("/admin");
  return (
    <>
      {!adminRoute && <NativeAppBridge />}
      {!adminRoute && <CosmeticLoadoutBridge />}
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/" element={<LobbyPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/matchmaking" element={<MatchmakingPage />} />
        <Route path="/match" element={<OnlineRoomPage matchmakingEntry />} />
        <Route path="/private" element={<OnlineRoomPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account-deletion" element={<AccountPage deletionEntry />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/patch-notes" element={<PatchNotesPage />} />
        <Route path="/replay/:gameId" element={<ReplayPage />} />
        <Route path="/spectate/:code" element={<SpectatePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!adminRoute && <TutorialPanel />}
      {!adminRoute && <PatchNotesPanel />}
      {!adminRoute && <AttendanceCheckInModal />}
    </>
  );
}
