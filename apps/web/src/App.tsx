import { Navigate, Route, Routes } from "react-router-dom";
import { GamePage } from "./pages/GamePage";
import { LobbyPage } from "./pages/LobbyPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

