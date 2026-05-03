import { useState } from "react";
import HomePage from "./components/HomePage";
import GameScreen from "./components/GameScreen";

export default function App() {
  const [view, setView] = useState("home"); // "home" | "game"
  const [startData, setStartData] = useState(null);

  if (view === "game") return <GameScreen onMenu={() => { setStartData(null); setView("home"); }} startData={startData} />;
  return <HomePage onStart={(data) => { setStartData(data ?? null); setView("game"); }} />;
}
