import { Navigate, Route, Routes } from "react-router-dom";
import { AccountPage } from "./pages/AccountPage";
import { GamePage } from "./pages/GamePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { LobbyPage } from "./pages/LobbyPage";
import { MatchmakingPage } from "./pages/MatchmakingPage";
import { OnlineRoomPage } from "./pages/OnlineRoomPage";
import { PatchNotesPage } from "./pages/PatchNotesPage";
import { ReplayPage } from "./pages/ReplayPage";
import { SpectatePage } from "./pages/SpectatePage";
import { PatchNotesPanel } from "./components/PatchNotesPanel";
import { TutorialPanel } from "./components/TutorialPanel";

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/matchmaking" element={<MatchmakingPage />} />
        <Route path="/match" element={<OnlineRoomPage matchmakingEntry />} />
        <Route path="/private" element={<OnlineRoomPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/patch-notes" element={<PatchNotesPage />} />
        <Route path="/replay/:gameId" element={<ReplayPage />} />
        <Route path="/spectate/:code" element={<SpectatePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <TutorialPanel />
      <PatchNotesPanel />
    </>
  );
}
