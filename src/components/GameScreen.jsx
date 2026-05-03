// ─────────────────────────────────────────────
//  GameScreen — in-game layout
//  Left: player stats  |  Center: world grid  |  Right: equipment
//  Bottom overlay: HandCards (fan)
// ─────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from "react";
import { generateMap, toString as mapToString, fromString as mapFromString, MAP_W, MAP_H } from "../systems/mapGenerationSystem";

const _terrainIconsGlob = import.meta.glob("../assets/images/world_icons/*.png", { eager: true });
import { DragProvider, useDragContext } from "../systems/dragSystem";
import { canDrop, SAMPLE_HAND, getCardsById, ALL_CARDS } from "../systems/cardSystem";
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

// ── Population system ─────────────────────────────────────────────────────────
/**
 * Registry of all population types.
 * To add a new type, append an entry here — no other code needs changing.
 *   id            — unique key, must match keys in the population state object
 *   label         — display name
 *   icon          — React node (null = text placeholder until icon asset is ready)
 *   socialClasses — ordered list of { id, label, color } segments for the bar
 */
const POPULATION_TYPES = [
    {
        id: "zombie",
        label: "Zombie",
        icon: null, // replace with <img src={...} /> once icon asset is added
        socialClasses: [
            { id: "vulgar",  label: "Vulgar",  color: "#9e9e9e" },
            { id: "noble",   label: "Noble",   color: "#7c3aed" },
            { id: "soldier", label: "Soldier", color: "#dc143c" },
        ],
    },
    {
        id: "skeleton",
        label: "Skeleton",
        icon: null, // replace with <img src={...} /> once icon asset is added
        socialClasses: [
            { id: "vulgar",  label: "Vulgar",  color: "#9e9e9e" },
            { id: "noble",   label: "Noble",   color: "#7c3aed" },
            { id: "soldier", label: "Soldier", color: "#dc143c" },
        ],
    },
    // Add more population types here, e.g.:
    // { id: "human", label: "Human", icon: null, socialClasses: [...] },
];

function PopulationRow({ typeDef, counts, viewMode }) {
    const total = typeDef.socialClasses.reduce((s, sc) => s + (counts[sc.id] ?? 0), 0);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ width: 18, height: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", opacity: 0.5 }}>
                {typeDef.icon ?? "☠"}
            </div>
            <span style={{ fontSize: "1rem", color: "#9fa8da", flexShrink: 0, minWidth: 44 }}>{typeDef.label}</span>
            {viewMode === "total" ? (
                <span style={{ fontSize: "1rem", color: "#e8eaf6", marginLeft: "auto" }}>{total}</span>
            ) : (
                <div style={{ flex: 1, display: "flex", height: 18, borderRadius: 3, overflow: "hidden", gap: 1 }}>
                    {typeDef.socialClasses.map((sc) => {
                        const count = counts[sc.id] ?? 0;
                        if (count === 0) return null;
                        const pct = (count / total) * 100;
                        return (
                            <div
                                key={sc.id}
                                title={`${sc.label}: ${count}`}
                                style={{
                                    width: `${pct}%`,
                                    background: sc.color,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1rem",
                                    color: "#fff",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    minWidth: 14,
                                }}
                            >
                                {count}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function PopulationPanel({ population, popView, onSetPopView }) {
    const grandTotal = POPULATION_TYPES.reduce((s, t) => {
        const c = population[t.id] ?? {};
        return s + Object.values(c).reduce((a, v) => a + v, 0);
    }, 0);
    return (
        <>
            <div style={{ marginBottom: "0.6rem" }}>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                    {[
                        { key: "total",  label: `Total  ${grandTotal}` },
                        { key: "social", label: "Social status" },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => onSetPopView(key)}
                            style={{
                                flex: 1,
                                padding: "0.25rem 0",
                                fontSize: "1rem",
                                borderRadius: "0.35rem",
                                border: popView === key ? "1px solid rgba(121,134,203,0.6)" : "1px solid rgba(255,255,255,0.08)",
                                background: popView === key ? "rgba(63,81,181,0.18)" : "rgba(255,255,255,0.04)",
                                color: popView === key ? "#c5cae9" : "#7986cb",
                                cursor: "pointer",
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {POPULATION_TYPES.map((typeDef) => (
                <PopulationRow
                    key={typeDef.id}
                    typeDef={typeDef}
                    counts={population[typeDef.id] ?? {}}
                    viewMode={popView}
                />
            ))}
        </>
    );
}

// ── World Grid ────────────────────────────────────────────────────────────────────────────────
const TILE_SIZE = 64; // px per tile at zoom 1×
const GRID_COLS = MAP_W;  // full 256-tile width
const GRID_ROWS = MAP_H;  // full 256-tile height

const TERRAIN_ICONS = Object.fromEntries(
    Object.entries(_terrainIconsGlob).map(([path, mod]) => [
        path.replace(/^.*\/([^/]+)\.png$/, "$1"),
        mod.default,
    ])
);

// Maps tile IDs to variant icon name arrays.
// When variants exist they are picked by a position hash (deterministic per tile).
// Falls back to an icon named after the tile ID itself if no variants match.
const TERRAIN_VARIANTS = {
    grass: ["grass_1", "grass_2", "grass_3"],
};

// Pre-create HTMLImageElement for every terrain icon URL (for canvas drawImage).
// Data-URI sources (singlefile build) load synchronously; regular URLs load async.
const TERRAIN_IMGS = {};
for (const [name, url] of Object.entries(TERRAIN_ICONS)) {
    const img = new Image();
    img.src = url;
    TERRAIN_IMGS[name] = img;
}

// Pre-create HTMLImageElement for every card's world art / card art.
// Keyed by card id for fast O(1) lookup during canvas paint.
const CARD_IMGS = {};
for (const card of ALL_CARDS) {
    const url = card.worldArt ?? card.art;
    if (!url) continue;
    const img = new Image();
    img.src = url;
    CARD_IMGS[card.id] = img;
}

function resolveTerrainImg(terrainTile, cellKey) {
    const names = TERRAIN_VARIANTS[terrainTile];
    if (names?.length) {
        const available = names.filter((k) => TERRAIN_IMGS[k]);
        if (available.length > 0) {
            const hash = cellKey.split('').reduce((acc, c) => (acc << 5) - acc + c.charCodeAt(0), 0);
            return TERRAIN_IMGS[available[Math.abs(hash) % available.length]];
        }
    }
    return TERRAIN_IMGS[terrainTile] ?? null;
}

// Rarity border colours used when drawing placed cards on canvas.
const RARITY_COLORS = {
    // common:    "#78909c",
    // rare:      "#42a5f5",
    // epic:      "#ab47bc",
    legendary: "#ffa726",
};

/**
 * Canvas-based world viewport.
 * Terrain is painted onto a <canvas> — zero per-tile DOM nodes.
 * Only placed-card overlays are DOM elements (at most a handful at a time).
 * – Left-drag    → pan
 * – Scroll wheel → zoom toward cursor (0.5× – 3.0×)
 * – Middle-click → re-center on Center of the World tile
 */
function WorldGrid({ worldGrid, onWorldDrop, worldMap }) {
    const containerRef  = useRef(null);
    const canvasRef     = useRef(null);
    const vpSizeRef     = useRef({ w: 0, h: 0 });
    const camRef        = useRef({ x: 0, y: 0, zoom: 1.0 });
    const [isPanning, setIsPanning] = useState(false);
    const panRef        = useRef(null);
    const initializedRef = useRef(false);
    const hoverTileRef  = useRef(null); // { row, col } | null  — highlighted during drag
    const rafRef        = useRef(null); // pending animation-frame id
    const drawCanvasRef = useRef(null); // always points to latest drawCanvas closure

    // Refs for latest props so drawCanvas never reads stale closure values
    const worldMapRef  = useRef(worldMap);
    const worldGridRef = useRef(worldGrid);
    useEffect(() => { worldMapRef.current  = worldMap;  schedDraw(); }, [worldMap]);   // eslint-disable-line
    useEffect(() => { worldGridRef.current = worldGrid; schedDraw(); }, [worldGrid]);  // eslint-disable-line

    const { dragging } = useDragContext();
    const draggingRef = useRef(dragging);
    useEffect(() => { draggingRef.current = dragging; schedDraw(); }, [dragging]); // eslint-disable-line

    /** Schedule one repaint per animation frame (deduplicated). */
    const schedDraw = useCallback(() => {
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            drawCanvasRef.current?.();
        });
    }, []);

    // Imperatively paint the canvas — all data comes from refs, never stale.
    // Assigned to drawCanvasRef.current each render so schedDraw always calls the fresh version.
    drawCanvasRef.current = function drawCanvas() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const { w, h } = vpSizeRef.current;
        if (w === 0 || h === 0) return;

        const { x: camX, y: camY, zoom } = camRef.current;
        const tileW = TILE_SIZE * zoom;

        ctx.clearRect(0, 0, w, h);

        const colStart = Math.max(0, Math.floor(-camX / tileW));
        const colEnd   = Math.min(MAP_W, Math.ceil((w - camX) / tileW));
        const rowStart = Math.max(0, Math.floor(-camY / tileW));
        const rowEnd   = Math.min(MAP_H, Math.ceil((h - camY) / tileW));

        const wMap   = worldMapRef.current;
        const wGrid  = worldGridRef.current;
        const hover  = hoverTileRef.current;
        const card   = draggingRef.current;

        for (let row = rowStart; row < rowEnd; row++) {
            for (let col = colStart; col < colEnd; col++) {
                const px  = Math.floor(camX + col * tileW);
                const py  = Math.floor(camY + row * tileW);
                const tw  = Math.ceil(tileW);
                const key = `${row}-${col}`;

                // Grid outline
                ctx.strokeStyle = "rgba(255,255,255,0.04)";
                ctx.lineWidth   = 1;
                ctx.strokeRect(px + 0.5, py + 0.5, tw - 1, tw - 1);

                // Terrain icon
                const terrainTile = wMap ? wMap[row * MAP_W + col] : null;
                const terrainImg  = resolveTerrainImg(terrainTile, key);
                if (terrainImg?.complete && terrainImg.naturalWidth > 0) {
                    const pad = tw * 0.1;
                    ctx.drawImage(terrainImg, px + pad, py + pad, tw - pad * 2, tw - pad * 2);
                }

                // Placed card — drawn on top of terrain
                const placedCard = wGrid[key];
                if (placedCard) {
                    const rarity = placedCard.rarity?.toLowerCase();
                    const borderColor = RARITY_COLORS[rarity] ?? "#00000000";
                    // Rarity border
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth   = Math.max(1.5, tw * 0.04);
                    ctx.strokeRect(px + 1, py + 1, tw - 2, tw - 2);
                    // Subtle background tint
                    ctx.fillStyle = "rgba(3,6,15,0.55)";
                    ctx.fillRect(px + 1, py + 1, tw - 2, tw - 2);
                    // Art image
                    const cardImg = CARD_IMGS[placedCard.id];
                    if (cardImg?.complete && cardImg.naturalWidth > 0) {
                        const pad = tw * 0.1;
                        ctx.drawImage(cardImg, px + pad, py + pad, tw - pad * 2, tw - pad * 2);
                    } else {
                        // Fallback: card name text
                        ctx.fillStyle = "#c5cae9";
                        ctx.font = `${Math.max(8, tw * 0.12)}px Inter,sans-serif`;
                        ctx.textAlign    = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(placedCard.name, px + tw / 2, py + tw / 2, tw - 4);
                    }
                }

                // Drop-hover highlight (only while dragging a card)
                if (card && hover && hover.row === row && hover.col === col) {
                    const ok = canDrop(card, "world");
                    ctx.fillStyle = ok ? "rgba(67,160,71,0.3)" : "rgba(229,57,53,0.3)";
                    ctx.fillRect(px + 1, py + 1, tw - 2, tw - 2);
                }
            }
        }
    };

    // ── Resize observer — also sets canvas backing-store size ────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            vpSizeRef.current = { w, h };
            if (canvasRef.current) {
                canvasRef.current.width  = w;
                canvasRef.current.height = h;
            }
            if (!initializedRef.current && w > 0 && h > 0) {
                initializedRef.current = true;
                const init = {
                    x: Math.round(w / 2 - (Math.floor(MAP_W / 2) + 0.5) * TILE_SIZE),
                    y: Math.round(h / 2 - (Math.floor(MAP_H / 2) + 0.5) * TILE_SIZE),
                    zoom: 1.0,
                };
                camRef.current = init;
            }
            schedDraw();
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [schedDraw]);

    // Trigger canvas repaints when async image loads complete (non-singlefile builds)
    useEffect(() => {
        const handlers = [];
        for (const img of [...Object.values(TERRAIN_IMGS), ...Object.values(CARD_IMGS)]) {
            if (!img.complete) {
                const fn = () => schedDraw();
                img.addEventListener("load", fn);
                handlers.push([img, fn]);
            }
        }
        return () => handlers.forEach(([img, fn]) => img.removeEventListener("load", fn));
    }, [schedDraw]);

    // ── Wheel zoom — non-passive so preventDefault works ──────────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handler = (e) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const c  = camRef.current;
            const factor  = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            const newZoom = Math.min(3.0, Math.max(0.5, c.zoom * factor));
            const worldX  = (mx - c.x) / c.zoom;
            const worldY  = (my - c.y) / c.zoom;
            const next = { zoom: newZoom, x: mx - worldX * newZoom, y: my - worldY * newZoom };
            camRef.current = next;
            schedDraw();
        };
        el.addEventListener("wheel", handler, { passive: false });
        return () => el.removeEventListener("wheel", handler);
    }, [schedDraw]);

    // ── Pointer events (pan) ─────────────────────────────────────────────────
    const onPointerDown = (e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsPanning(true);
        panRef.current = { x: e.clientX, y: e.clientY, camX: camRef.current.x, camY: camRef.current.y };
    };
    const onPointerMove = (e) => {
        if (!panRef.current) return;
        const next = { ...camRef.current, x: panRef.current.camX + (e.clientX - panRef.current.x), y: panRef.current.camY + (e.clientY - panRef.current.y) };
        camRef.current = next;
        schedDraw();
    };
    const onPointerUp = () => { panRef.current = null; setIsPanning(false); };

    // ── Middle-click: re-center on Center of the World ───────────────────────
    const onMouseDown = (e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        const { w, h } = vpSizeRef.current;
        const next = {
            x: Math.round(w / 2 - (Math.floor(MAP_W / 2) + 0.5) * TILE_SIZE),
            y: Math.round(h / 2 - (Math.floor(MAP_H / 2) + 0.5) * TILE_SIZE),
            zoom: 1.0,
        };
        camRef.current = next;
        schedDraw();
    };

    // ── Drag-over / drop — compute tile from cursor position ─────────────────
    const screenToTile = (screenX, screenY) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const { x, y, zoom } = camRef.current;
        const tileW = TILE_SIZE * zoom;
        const col = Math.floor((screenX - rect.left - x) / tileW);
        const row = Math.floor((screenY - rect.top  - y) / tileW);
        return (col >= 0 && col < MAP_W && row >= 0 && row < MAP_H) ? { row, col } : null;
    };

    const onDragOver = (e) => {
        e.preventDefault();
        const tile = screenToTile(e.clientX, e.clientY);
        const prev = hoverTileRef.current;
        if (!tile || tile.row !== prev?.row || tile.col !== prev?.col) {
            hoverTileRef.current = tile;
            schedDraw();
        }
    };
    const onDragLeave = (e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        hoverTileRef.current = null;
        schedDraw();
    };
    const onDrop = (e) => {
        e.preventDefault();
        const tile = screenToTile(e.clientX, e.clientY);
        hoverTileRef.current = null;
        schedDraw();
        const card = draggingRef.current;
        if (!tile || !card || !canDrop(card, "world")) return;
        onWorldDrop(`${tile.row}-${tile.col}`)(card);
    };

    return (
        <div
            ref={containerRef}
            className="flex-1 relative overflow-hidden"
            style={{ ...PANEL, minWidth: 0, cursor: isPanning ? "grabbing" : "grab", userSelect: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onMouseDown={onMouseDown}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", top: 0, left: 0, display: "block", pointerEvents: "none" }}
            />
            <span style={{ position: "absolute", top: "0.5rem", left: "0.75rem", ...LABEL, zIndex: 10, pointerEvents: "none" }}>
                World
            </span>
        </div>
    );
}

// ── Inner game content (must be a child of DragProvider) ─────────────────────
function GameScreenContent({ onMenu, startData }) {
    const [hand, setHand] = useState(SAMPLE_HAND);
    const [worldGrid, setWorldGrid] = useState(() => {
        const centerRow = Math.floor(MAP_H / 2);
        const centerCol = Math.floor(MAP_W / 2);
        const [centerCard] = getCardsById("0");
        if (!centerCard) return {};
        return { [`${centerRow}-${centerCol}`]: centerCard };
    });
    const [worldMap, setWorldMap] = useState(() =>
        startData?.savedMap ? mapFromString(startData.savedMap) : generateMap(Date.now())
    );
    const [population, setPopulation] = useState({
        zombie:   { vulgar: 47, noble: 8, soldier: 15 },
        skeleton: { vulgar: 30, noble: 4, soldier: 6 },
    });
    const [popView, setPopView] = useState("total"); // "total" | "social"
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

                {/* Right Panel — Population */}
                <aside className="flex flex-col shrink-0" style={{ width: 350, ...PANEL, padding: "0.85rem", overflowY: "auto" }}>
                    <PopulationPanel
                        population={population}
                        popView={popView}
                        onSetPopView={setPopView}
                    />
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
