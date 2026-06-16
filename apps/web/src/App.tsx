import { Navigate, Route, Routes } from "react-router-dom";
import { AccountPage } from "./pages/AccountPage";
import { GamePage } from "./pages/GamePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { LobbyPage } from "./pages/LobbyPage";
import { MatchmakingPage } from "./pages/MatchmakingPage";
import { OnlineRoomPage } from "./pages/OnlineRoomPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/matchmaking" element={<MatchmakingPage />} />
      <Route path="/private" element={<OnlineRoomPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
