// ─────────────────────────────────────────────
//  GameScreen — in-game layout
//  Left: player stats  |  Center: world grid  |  Right: equipment
//  Bottom overlay: HandCards (fan)
// ─────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from "react";
import { generateMap, toString as mapToString, fromString as mapFromString, MAP_W, MAP_H } from "../systems/mapGenerationSystem";

const _terrainIconsGlob = import.meta.glob("../assets/images/world_icons/*.png", { eager: true });
import { DragProvider, useDropZone } from "../systems/dragSystem";
import { canDrop, EQUIPMENT_SLOTS, SAMPLE_HAND } from "../systems/cardSystem";
import HandCards from "./HandCards";
import "../assets/styles/cards.css";

const PANEL = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.75rem",
};

const LABEL = {
    color: "#7986cb",
    fontSize: "0.68rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "0.3rem",
    display: "block",
};

function PanelSection({ title, children }) {
    return (
        <div style={{ marginBottom: "1rem" }}>
            {title && <span style={LABEL}>{title}</span>}
            {children}
        </div>
    );
}

function StatBar({ label, value, max, color }) {
    return (
        <div style={{ marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#9fa8da", marginBottom: "0.2rem" }}>
                <span>{label}</span><span>{value}/{max}</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: 99, transition: "width 0.4s" }} />
            </div>
        </div>
    );
}

/**
 * A single equipment slot acting as a drop zone.
 * Accepts only cards whose tags match EQUIPMENT_SLOTS[slotKey].accepts.
 * Starts as "empty"; changes when a valid card is equipped (dragged here).
 */
function EquipSlot({ slotKey, slotDef, equippedCard, onEquip }) {
    const { isOver, accepts, dropProps } = useDropZone("equipment", slotKey, canDrop, onEquip);

    return (
        <div
            {...dropProps}
            className={[
                "card-base",
                equippedCard ? `card-rarity-${equippedCard.rarity.toLowerCase()}` : "",
                isOver && accepts ? "drop-zone-active" : "",
                isOver && !accepts ? "drop-zone-reject" : "",
            ].filter(Boolean).join(" ")}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.5rem",
                background: "rgba(255,255,255,0.03)",
                border: equippedCard ? undefined : "1px dashed rgba(255,255,255,0.1)",
                borderRadius: "0.5rem",
                minHeight: "2.6rem",
                cursor: "crosshair",
                transition: "all 0.2s",
                userSelect: "none",
            }}
        >
            {/* Miniature card art placeholder */}
            <div style={{
                width: 22, height: 30, borderRadius: "0.25rem", flexShrink: 0,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.4rem", color: "#5c6bc0",
            }}>
                {equippedCard ? "▣" : ""}
            </div>
            <div>
                <span style={LABEL}>{slotDef.label}</span>
                <span style={{ fontSize: "0.72rem", color: equippedCard ? "#e8eaf6" : "rgba(255,255,255,0.22)" }}>
                    {equippedCard ? equippedCard.name : "empty"}
                </span>
            </div>
        </div>
    );
}

// ── World Grid ────────────────────────────────────────────────────────────────
const TILE_SIZE = 64; // px per tile at zoom 1×
const GRID_COLS = MAP_W;  // full 256-tile width
const GRID_ROWS = MAP_H;  // full 256-tile height

const TERRAIN_ICONS = Object.fromEntries(
    Object.entries(_terrainIconsGlob).map(([path, mod]) => [
        path.replace(/^.*\/([^/]+)\.png$/, "$1"),
        mod.default,
    ])
);

/**
 * Individual world grid cell — absolutely positioned, sized by the camera.
 * left/top/size are pre-computed screen-space values supplied by WorldGrid.
 */
function WorldCell({ cellKey, cellCard, onDrop, left, top, size, terrainTile }) {
    const { isOver, accepts, dropProps } = useDropZone("world", cellKey, canDrop, onDrop);

    return (
        <div
            {...dropProps}
            className={[
                cellCard ? `card-base card-rarity-${cellCard.rarity.toLowerCase()}` : "",
                isOver && accepts ? "drop-zone-active" : "",
                isOver && !accepts ? "drop-zone-reject" : "",
            ].filter(Boolean).join(" ")}
            style={{
                position: "absolute",
                left,
                top,
                width: size - 1,
                height: size - 1,
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "0.2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                boxSizing: "border-box",
            }}
            title={cellCard ? `${cellCard.name} [${cellCard.rarity}]` : terrainTile ?? ""}
        >
            {cellCard ? (
                (cellCard.worldArt ?? cellCard.art) ? (
                    <img
                        src={cellCard.worldArt ?? cellCard.art}
                        alt={cellCard.name}
                        style={{ width: "80%", height: "80%", objectFit: "contain", imageRendering: "auto" }}
                        draggable={false}
                    />
                ) : (
                    <span style={{ fontSize: "0.48rem", color: "#c5cae9", textAlign: "center", padding: "2px", lineHeight: 1.2 }}>
                        {cellCard.name}
                    </span>
                )
            ) : TERRAIN_ICONS[terrainTile] ? (
                <img
                    src={TERRAIN_ICONS[terrainTile]}
                    alt={terrainTile}
                    style={{ width: "80%", height: "80%", objectFit: "cover", imageRendering: "auto" }}
                    draggable={false}
                />
            ) : null}
        </div>
    );
}

/**
 * World viewport with pan + zoom camera.
 * – Left-drag   → pan
 * – Scroll wheel → zoom toward cursor (0.5× – 3.0×)
 * – Middle-click → reset position and zoom
 * Only tiles at least partially inside the viewport are rendered.
 */
function WorldGrid({ worldGrid, onWorldDrop, worldMap }) {
    const viewportRef     = useRef(null);
    const [vpSize, setVpSize]       = useState({ w: 0, h: 0 });
    const [cam, setCam]             = useState({ x: 0, y: 0, zoom: 1.0 });
    const [isPanning, setIsPanning] = useState(false);
    const camRef         = useRef(cam);   // always holds latest cam without stale-closure issues
    const panRef         = useRef(null);  // { x, y, camX, camY } snapshot at pan-start
    const initializedRef = useRef(false); // guard: center the grid only once

    // Keep camRef current
    useEffect(() => { camRef.current = cam; }, [cam]);

    // Measure viewport; on first valid measurement center the grid
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            setVpSize({ w, h });
            if (!initializedRef.current && w > 0 && h > 0) {
                initializedRef.current = true;
                const init = {
                    x: Math.round((w - GRID_COLS * TILE_SIZE) / 2),
                    y: Math.round((h - GRID_ROWS * TILE_SIZE) / 2),
                    zoom: 1.0,
                };
                setCam(init);
                camRef.current = init;
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Wheel must be non-passive so preventDefault() works
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const handler = (e) => {
            e.preventDefault();
            const rect   = el.getBoundingClientRect();
            const mx     = e.clientX - rect.left;
            const my     = e.clientY - rect.top;
            const c      = camRef.current;
            const factor  = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            const newZoom = Math.min(3.0, Math.max(0.5, c.zoom * factor));
            // Keep the world point under the cursor stationary
            const worldX = (mx - c.x) / c.zoom;
            const worldY = (my - c.y) / c.zoom;
            const next = { zoom: newZoom, x: mx - worldX * newZoom, y: my - worldY * newZoom };
            camRef.current = next;
            setCam(next);
        };
        el.addEventListener("wheel", handler, { passive: false });
        return () => el.removeEventListener("wheel", handler);
    }, []);

    const onPointerDown = (e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsPanning(true);
        panRef.current = { x: e.clientX, y: e.clientY, camX: camRef.current.x, camY: camRef.current.y };
    };

    const onPointerMove = (e) => {
        if (!panRef.current) return;
        const next = {
            ...camRef.current,
            x: panRef.current.camX + (e.clientX - panRef.current.x),
            y: panRef.current.camY + (e.clientY - panRef.current.y),
        };
        camRef.current = next;
        setCam(next);
    };

    const onPointerUp = () => { panRef.current = null; setIsPanning(false); };

    // Middle mouse → reset camera
    const onMouseDown = (e) => {
        if (e.button !== 1) return;
        e.preventDefault(); // prevent browser auto-scroll
        const next = {
            x: Math.round((vpSize.w - GRID_COLS * TILE_SIZE) / 2),
            y: Math.round((vpSize.h - GRID_ROWS * TILE_SIZE) / 2),
            zoom: 1.0,
        };
        camRef.current = next;
        setCam(next);
    };

    // Compute visible tile range — tiles fully outside the viewport are skipped
    const { x: camX, y: camY, zoom } = cam;
    const tileW    = TILE_SIZE * zoom;
    const colStart = Math.max(0, Math.floor(-camX / tileW));
    const colEnd   = Math.min(GRID_COLS, Math.ceil((vpSize.w - camX) / tileW));
    const rowStart = Math.max(0, Math.floor(-camY / tileW));
    const rowEnd   = Math.min(GRID_ROWS, Math.ceil((vpSize.h - camY) / tileW));

    const tiles = [];
    for (let row = rowStart; row < rowEnd; row++) {
        for (let col = colStart; col < colEnd; col++) {
            const key = `${row}-${col}`;
            const terrainTile = worldMap ? worldMap[row * MAP_W + col] : null;
            tiles.push(
                <WorldCell
                    key={key}
                    cellKey={key}
                    cellCard={worldGrid[key] ?? null}
                    onDrop={onWorldDrop(key)}
                    left={camX + col * tileW}
                    top={camY + row * tileW}
                    size={tileW}
                    terrainTile={terrainTile}
                />
            );
        }
    }

    return (
        <div
            ref={viewportRef}
            className="flex-1 relative overflow-hidden"
            style={{ ...PANEL, minWidth: 0, cursor: isPanning ? "grabbing" : "grab", userSelect: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onMouseDown={onMouseDown}
        >
            <span style={{ position: "absolute", top: "0.5rem", left: "0.75rem", ...LABEL, zIndex: 10, pointerEvents: "none" }}>
                World
            </span>
            {tiles}
        </div>
    );
}

// ── Inner game content (must be a child of DragProvider) ─────────────────────
function GameScreenContent({ onMenu, startData }) {
    const [hand, setHand] = useState(SAMPLE_HAND);
    const [equipment, setEquipment] = useState(
        Object.fromEntries(Object.keys(EQUIPMENT_SLOTS).map((k) => [k, null]))
    );
    const [worldGrid, setWorldGrid] = useState({});
    const [worldMap, setWorldMap] = useState(() =>
        startData?.savedMap ? mapFromString(startData.savedMap) : generateMap(Date.now())
    );
    const loadFileRef = useRef(null);

    const handleSave = useCallback(() => {
        const content = mapToString(worldMap);
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "save.sav";
        a.click();
        URL.revokeObjectURL(url);
    }, [worldMap]);

    const handleLoad = useCallback(() => { loadFileRef.current?.click(); }, []);

    const onLoadFileChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try { setWorldMap(mapFromString(ev.target.result.trim())); } catch { /* invalid .sav */ }
        };
        reader.readAsText(file);
        e.target.value = "";
    }, []);

    const removeFromHand = useCallback((cardId) => {
        setHand((prev) => prev.filter((c) => c.id !== cardId));
    }, []);

    const handleEquip = useCallback((slotKey) => (card) => {
        setEquipment((prev) => ({ ...prev, [slotKey]: card }));
        removeFromHand(card.id);
    }, [removeFromHand]);

    const handleWorldDrop = useCallback((cellKey) => (card) => {
        setWorldGrid((prev) => ({ ...prev, [cellKey]: card }));
        removeFromHand(card.id);
    }, [removeFromHand]);

    return (
        <div
            className="min-h-screen flex flex-col overflow-hidden"
            style={{ background: "#03060f", color: "#e8eaf6", fontFamily: "'Inter', sans-serif" }}
        >
            {/* Ambient glow orbs */}
            <div aria-hidden="true" style={{ position: "fixed", top: "-10rem", left: "-8rem", width: "28rem", height: "28rem", background: "radial-gradient(circle, rgba(63,81,181,0.12) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div aria-hidden="true" style={{ position: "fixed", bottom: "-10rem", right: "-8rem", width: "28rem", height: "28rem", background: "radial-gradient(circle, rgba(0,188,212,0.09) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

            {/* ── Header ── */}
            <header
                className="relative z-20 flex items-center justify-between px-6 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", background: "rgba(3,6,15,0.7)", flexShrink: 0 }}
            >
                <span className="text-base font-semibold select-none" style={{ color: "#c5cae9", letterSpacing: "0.04em" }}>
                    Farmer in the Night
                </span>
                <nav className="flex items-center gap-2">
                    {[
                        { label: "Save", onClick: handleSave },
                        { label: "Load", onClick: handleLoad },
                        { label: "Menu", onClick: onMenu },
                    ].map(({ label, onClick }) => (
                        <button
                            key={label}
                            onClick={onClick}
                            className="text-xs font-medium"
                            style={{ padding: "0.35rem 0.9rem", borderRadius: "0.6rem", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", color: "#c5cae9", cursor: "pointer", transition: "background 0.2s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
            </header>

            {/* ── Body: Left | World | Right ── */}
            {/*  paddingBottom reserves space so the hand cards don't cover content */}
            <main
                className="relative z-10 flex flex-1 gap-3 p-3 overflow-hidden"
                style={
                    {
                        minHeight: 0,
                        paddingBottom: "calc(20vh + 0.75rem)"
                    }
                }
            >
                {/* Left Panel */}
                <aside className="flex flex-col shrink-0" style={{ width: 180, ...PANEL, padding: "0.85rem", overflowY: "auto" }}>
                    <PanelSection title="Player">
                        <div className="flex items-center gap-2">
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(63,81,181,0.25)", border: "1px solid rgba(63,81,181,0.4)", flexShrink: 0 }} />
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#c5cae9" }}>Farmer</span>
                        </div>
                    </PanelSection>
                    <PanelSection title="Stats">
                        <StatBar label="Energy" value={80} max={100} color="linear-gradient(90deg,#42a5f5,#1e88e5)" />
                        <StatBar label="Health" value={95} max={100} color="linear-gradient(90deg,#66bb6a,#43a047)" />
                        <StatBar label="Hunger" value={60} max={100} color="linear-gradient(90deg,#ffa726,#fb8c00)" />
                    </PanelSection>
                    <PanelSection title="Time">
                        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e8eaf6" }}>Night · Day 1</p>
                        <p style={{ ...LABEL, marginTop: "0.2rem", marginBottom: 0 }}>Spring · Year 1</p>
                    </PanelSection>
                    <PanelSection title="Resources">
                        {[["Gold", "0 g"], ["Wood", "0"], ["Stone", "0"]].map(([k, v]) => (
                            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#9fa8da", marginBottom: "0.3rem" }}>
                                <span>{k}</span><span style={{ color: "#e8eaf6" }}>{v}</span>
                            </div>
                        ))}
                    </PanelSection>
                </aside>

                {/* World Grid */}
                <WorldGrid worldGrid={worldGrid} onWorldDrop={handleWorldDrop} worldMap={worldMap} />

                {/* Right Panel — Equipment only */}
                <aside className="flex flex-col shrink-0" style={{ width: 180, ...PANEL, padding: "0.85rem", overflowY: "auto" }}>
                    <PanelSection title="Equipment">
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {Object.entries(EQUIPMENT_SLOTS).map(([key, def]) => (
                                <EquipSlot
                                    key={key}
                                    slotKey={key}
                                    slotDef={def}
                                    equippedCard={equipment[key]}
                                    onEquip={handleEquip(key)}
                                />
                            ))}
                        </div>
                    </PanelSection>
                </aside>
            </main>

            {/* ── Hand Cards fan overlay ── */}
            <HandCards hand={hand} />

            {/* hidden file input for in-game map loading */}
            <input
                ref={loadFileRef}
                type="file"
                accept=".sav"
                style={{ display: "none" }}
                onChange={onLoadFileChange}
            />

            {/* ── Footer ── */}
            <footer
                className="relative z-20 py-3 text-center text-xs"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#7986cb", background: "rgba(3,6,15,0.8)", flexShrink: 0 }}
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

// ── Public export — wraps content in DragProvider ────────────────────────────
export default function GameScreen({ onMenu, startData }) {
    return (
        <DragProvider>
            <GameScreenContent onMenu={onMenu} startData={startData} />
        </DragProvider>
    );
}
