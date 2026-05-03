import { useRef } from "react";

const STARS = Array.from({ length: 150 }, (_, i) => ({
  id: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: Math.random() * 2.5 + 0.8,
  duration: Math.random() * 4 + 2,
  delay: Math.random() * 3,
  opacity: Math.random() * 0.5 + 0.4,
}));

export default function HomePage({ onStart }) {
  const loadRef = useRef(null);
  const handleLoad = () => loadRef.current?.click();
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onStart({ savedMap: ev.target.result.trim() });
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden relative"
      style={{ background: "#03060f", color: "#e8eaf6", fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Starry Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {STARS.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              background: "#ffffff",
              animation: `twinkle ${star.duration}s ${star.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Ambient glow orbs ── */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: "-10rem", left: "-8rem",
          width: "28rem", height: "28rem",
          background: "radial-gradient(circle, rgba(63,81,181,0.18) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          bottom: "-10rem", right: "-8rem",
          width: "28rem", height: "28rem",
          background: "radial-gradient(circle, rgba(0,188,212,0.14) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      {/* ── Header ── */}
      <header
        className="relative z-10 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(6px)" }}
      >
        <span
          className="text-xl font-semibold tracking-wide select-none"
          style={{ color: "#c5cae9", letterSpacing: "0.04em" }}
        >
          Farmer in the Night
        </span>

        <nav className="flex items-center gap-3">
          {["Start", "Save", "Load"].map((label) => (
            <button
              key={label}
              onClick={label === "Start" ? () => onStart(null) : label === "Load" ? handleLoad : undefined}
              className="text-sm font-medium transition-all duration-200"
              style={{
                padding: "0.45rem 1.1rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "#c5cae9",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
        <div style={{ animation: "float 5s ease-in-out infinite" }}>
          {/* Big Title */}
          <h1
            className="font-extrabold tracking-tight leading-tight"
            style={{
              fontSize: "clamp(2.6rem, 8vw, 5.5rem)",
              color: "#e8eaf6",
              textShadow: "0 0 40px rgba(121,134,203,0.55), 0 0 80px rgba(63,81,181,0.3)",
              marginBottom: "2rem",
            }}
          >
            Farmer in the Night
          </h1>

          {/* Start Game Button */}
          <button
            onClick={onStart}
            className="font-semibold transition-all duration-200"
            style={{
              fontSize: "1.125rem",
              padding: "0.9rem 3rem",
              borderRadius: "1rem",
              border: "none",
              background: "linear-gradient(135deg, #3f51b5 0%, #283593 100%)",
              color: "#e8eaf6",
              cursor: "pointer",
              boxShadow: "0 0 32px rgba(63,81,181,0.5), 0 4px 16px rgba(0,0,0,0.4)",
              letterSpacing: "0.03em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #5c6bc0 0%, #3949ab 100%)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #3f51b5 0%, #283593 100%)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          >
            Start
          </button>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 py-4 text-center text-sm"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(6px)",
          color: "#7986cb",
        }}
      >
        <a
          href="https://github.com/Walpurgisnachtes/Ager-Game"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#7986cb", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e8eaf6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#7986cb")}
        >
          GitHub — Walpurgisnachtes/Ager-Game
        </a>
      </footer>

      {/* ── Keyframe Styles ── */}
      <input ref={loadRef} type="file" accept=".sav" style={{ display: "none" }} onChange={onFileChange} />
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--op, 0.6); transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
      `}</style>
    </div>
  );
}
