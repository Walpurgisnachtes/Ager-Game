import { useState } from "react";
import HomePage from "./components/HomePage";
import GameScreen from "./components/GameScreen";

export default function App() {
  const [view, setView] = useState("home"); // "home" | "game"

  if (view === "game") return <GameScreen onMenu={() => setView("home")} />;
  return <HomePage onStart={() => setView("game")} />;
}
