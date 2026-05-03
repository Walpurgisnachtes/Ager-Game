// ─────────────────────────────────────────────
//  HandCards — fan-shaped card hand displayed at the bottom center.
//  • Cards spread in a fan with a pivot below each card
//  • Press Q to show / hide the hand
//  • Cards are draggable via useDraggable()
// ─────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useDraggable } from "../systems/dragSystem";
import "../assets/styles/cards.css";

// ── Layout constants ──────────────────────────────────────────────────────────
const CARD_W = 200;   // px
const CARD_H = CARD_W * 1.5;  // px
const SPREAD = 115;   // px between card centers horizontally
const ROT_STEP = 5;    // degrees of rotation per offset unit from center

/** ── Single card rendered inside the fan ──────────────────────────────────────
 * @param {Object} card  — card data
 * @param {number} delta — offset from center (0 = center, ±1 = adjacent, etc.). Left cards are negative, right cards are positive.
 * @param {number} total — total number of cards in hand
 */
function HandCard({ card, delta, total }) {
    const { isDragging, ...dragProps } = useDraggable(card);
    const rotation = delta * ROT_STEP;
    // Cards farther from center also sit slightly lower (natural arc)
    const arcY = delta * delta * 2.5;

    return (
        <div
            {...dragProps}
            className={`hand-card card-base card-rarity-${card.rarity.toLowerCase()}${isDragging ? " is-dragging" : ""}`}
            title={`${card.name}  [${card.rarity}]\nTags: ${card.tags.join(", ")}\n${card.description}`}
            style={{
                position: "absolute",
                left: `calc(50% + ${delta * SPREAD}px - ${CARD_W / 2}px)`,
                bottom: 0,
                width: CARD_W,
                height: CARD_H,
                cursor: "grab",
                userSelect: "none",
                // Pivot is below the card — creates the fan arc naturally
                transformOrigin: "bottom center",
                // Use individual transform properties so the CSS `scale` animation
                // composes with these without overriding them.
                rotate: `${rotation}deg`,
                translate: `0 ${arcY}px`,
                // Cards in the center sit on top
                zIndex: 50 - delta * 2,
                display: "flex",
                flexDirection: "column",
                padding: "0.4rem 0.35rem 0.35rem",
                background: "rgba(10, 13, 32, 0.93)",
                backdropFilter: "blur(10px)",
                color: "#c5cae9",
                boxSizing: "border-box",
                gap: "0.2rem",
                transition: "rotate 0.15s ease, translate 0.15s ease, scale 0.15s ease",
            }}
        >
            {/* Art area */}
            <div
                style={{
                    flex: "2 1 0%",
                    borderRadius: "0.3rem",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {card.art && (
                    <img
                        src={card.art}
                        alt={card.name}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            imageRendering: "pixelated",
                        }}
                        draggable={false}
                    />
                )}
            </div>

            {/* Card content container */}
            <div
                style={{
                    flex: "1 1 0%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >

                {/* Card name */}
                <span
                    style={{
                        fontWeight: 700,
                        fontSize: "1.25rem",
                        textAlign: "center",
                        lineHeight: 1.25,
                        color: "#e8eaf6",
                        letterSpacing: "0.01em",
                    }}
                >
                    {card.name}
                </span>

                {/* Tags row */}
                <span
                    style={{
                        color: "#7986cb",
                        fontSize: "0.75rem",
                        textAlign: "center",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {card.tags.join(" · ")}
                </span>

            </div>

        </div>
    );
}

// ── Hand container ────────────────────────────────────────────────────────────
export default function HandCards({ hand }) {
    const [visible, setVisible] = useState(true);

    // Press Q to toggle
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "q" || e.key === "Q") setVisible((v) => !v);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const n = hand.length;
    const center = (n - 1) / 2;
    // Container is wide enough to hold all spread cards + padding on each side
    const containerW = Math.max(CARD_W + 40, SPREAD * Math.max(n - 1, 0) + CARD_W + 40);

    return (
        /*
         * The outer wrapper fills the bottom strip (20vh) and is a fixed overlay.
         * It sits above the footer (z-25) and is pointer-events:none so the
         * footer link remains clickable when the hand is hidden.
         */
        <div
            aria-label="Hand cards"
            style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                height: "20vh",
                zIndex: 25,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                pointerEvents: "none",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(70px)",
            }}
        >
            {/* Fan card container */}
            <div
                style={{
                    position: "relative",
                    width: containerW,
                    height: "100%",
                    pointerEvents: visible ? "auto" : "none",
                    bottom: "12vh",
                }}
            >
                {hand.map((card, i) => (
                    <HandCard
                        key={card.id}
                        card={card}
                        delta={i - center}
                        total={n}
                    />
                ))}
            </div>

            {/* Keyboard hint */}
            <span
                style={{
                    position: "absolute",
                    bottom: "0.45rem",
                    right: "1rem",
                    fontSize: "0.58rem",
                    color: "rgba(121,134,203,0.4)",
                    pointerEvents: "none",
                    userSelect: "none",
                }}
            >
                [Q] {visible ? "hide" : "show"} hand
            </span>
        </div>
    );
}
