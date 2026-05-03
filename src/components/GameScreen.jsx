// ─────────────────────────────────────────────
//  GameScreen — base in-game layout template
//  Panels: Left (stats) | Center (world) | Right (inventory)
//  Bottom: hotbar  ·  Header & Footer kept from home page
// ─────────────────────────────────────────────

const PANEL = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "0.75rem",
};

const LABEL = { color: "#7986cb", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em" };

function PanelSection({ title, children }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      {title && <p style={LABEL}>{title}</p>}
      <div style={{ marginTop: "0.4rem" }}>{children}</div>
    </div>
  );
}

function StatBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div className="flex justify-between text-xs" style={{ color: "#9fa8da", marginBottom: "0.2rem" }}>
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div style={{ height: "6px", borderRadius: "99px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: "99px", transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

function Slot({ children, size = 40 }) {
  return (
    <div
      style={{
        width: size, height: size,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "0.5rem",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.65rem", color: "#5c6bc0",
        cursor: "default",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export default function GameScreen({ onMenu }) {
  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: "#03060f", color: "#e8eaf6", fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Ambient glow orbs ── */}
      <div aria-hidden="true" className="fixed pointer-events-none" style={{ top: "-10rem", left: "-8rem", width: "28rem", height: "28rem", background: "radial-gradient(circle, rgba(63,81,181,0.12) 0%, transparent 70%)", borderRadius: "50%" }} />
      <div aria-hidden="true" className="fixed pointer-events-none" style={{ bottom: "-10rem", right: "-8rem", width: "28rem", height: "28rem", background: "radial-gradient(circle, rgba(0,188,212,0.09) 0%, transparent 70%)", borderRadius: "50%" }} />

      {/* ── Header ── */}
      <header
        className="relative z-20 flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", background: "rgba(3,6,15,0.7)", flexShrink: 0 }}
      >
        <span className="text-base font-semibold select-none" style={{ color: "#c5cae9", letterSpacing: "0.04em" }}>
          Farmer in the Night
        </span>

        <nav className="flex items-center gap-2">
          {["Save", "Load", "Menu"].map((label) => (
            <button
              key={label}
              onClick={label === "Menu" ? onMenu : undefined}
              className="text-xs font-medium"
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: "0.6rem",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "#c5cae9",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Body: Left | World | Right ── */}
      <main className="relative z-10 flex flex-1 gap-3 p-3 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── Left Panel — Player & Status ── */}
        <aside className="flex flex-col gap-0 shrink-0" style={{ width: "180px", ...PANEL, padding: "0.85rem" }}>
          {/* Avatar */}
          <PanelSection title="Player">
            <div className="flex items-center gap-2">
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(63,81,181,0.25)", border: "1px solid rgba(63,81,181,0.4)", flexShrink: 0 }} />
              <span className="text-sm font-medium truncate" style={{ color: "#c5cae9" }}>Farmer</span>
            </div>
          </PanelSection>

          {/* Stats */}
          <PanelSection title="Stats">
            <StatBar label="Energy" value={80} max={100} color="linear-gradient(90deg,#42a5f5,#1e88e5)" />
            <StatBar label="Health" value={95} max={100} color="linear-gradient(90deg,#66bb6a,#43a047)" />
            <StatBar label="Hunger" value={60} max={100} color="linear-gradient(90deg,#ffa726,#fb8c00)" />
          </PanelSection>

          {/* Time */}
          <PanelSection title="Time">
            <p className="text-sm font-semibold" style={{ color: "#e8eaf6" }}>Night · Day 1</p>
            <p style={{ ...LABEL, marginTop: "0.25rem" }}>Spring · Year 1</p>
          </PanelSection>

          {/* Resources */}
          <PanelSection title="Resources">
            {[["Gold", "0 g"], ["Wood", "0"], ["Stone", "0"]].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs" style={{ color: "#9fa8da", marginBottom: "0.3rem" }}>
                <span>{k}</span><span style={{ color: "#e8eaf6" }}>{v}</span>
              </div>
            ))}
          </PanelSection>
        </aside>

        {/* ── Center — Game World ── */}
        <div className="flex-1 relative overflow-hidden" style={{ ...PANEL, minWidth: 0 }}>
          {/* Grid overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* Placeholder label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ color: "rgba(255,255,255,0.06)", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Game World
          </div>
        </div>

        {/* ── Right Panel — Inventory ── */}
        <aside className="flex flex-col shrink-0" style={{ width: "180px", ...PANEL, padding: "0.85rem" }}>
          <PanelSection title="Inventory">
            <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "0.3rem" }}>
              {Array.from({ length: 20 }).map((_, i) => <Slot key={i} size={34} />)}
            </div>
          </PanelSection>

          <PanelSection title="Equipment">
            <div className="flex flex-col gap-2">
              {["Head", "Body", "Feet"].map((slot) => (
                <div key={slot} className="flex items-center gap-2">
                  <Slot size={28} />
                  <span style={{ ...LABEL, textTransform: "none", fontSize: "0.72rem" }}>{slot}</span>
                </div>
              ))}
            </div>
          </PanelSection>
        </aside>
      </main>

      {/* ── Bottom Hotbar ── */}
      <div
        className="relative z-20 flex items-center justify-center gap-2 px-4 py-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", background: "rgba(3,6,15,0.7)", flexShrink: 0 }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ position: "relative" }}>
            <Slot size={44} />
            <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: "0.55rem", color: "#5c6bc0" }}>{i + 1}</span>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <footer
        className="relative z-20 py-3 text-center text-xs"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#7986cb" }}
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
    </div>
  );
}
