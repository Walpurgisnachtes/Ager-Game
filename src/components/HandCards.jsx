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
const CARD_W = 200; // px
const CARD_H = CARD_W * 1.5; // px
const SPREAD = 115; // px between card centers horizontally
const ROT_STEP = 5; // degrees of rotation per offset unit from center

const RARITY_COLORS = {
  common: "#90a4ae",
  rare: "#42a5f5",
  epic: "#ab47bc",
  legendary: "#ffa726",
};

// ── Card preview panel shown on the left when hovering a hand card ────────────
function CardPreview({ card }) {
  if (!card) return null;
  const rarityColor = RARITY_COLORS[card.rarity?.toLowerCase()] ?? "#90a4ae";
  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(20vh + 1.5rem)",
        left: "1rem",
        width: `${CARD_W * 2}px`,
        borderRadius: "0.75rem",
        border: `2px solid ${rarityColor}`,
        boxShadow: `0 0 28px ${rarityColor}55, 0 8px 36px rgba(0,0,0,0.7)`,
        background: "rgba(10,13,32,0.97)",
        backdropFilter: "blur(14px)",
        color: "#c5cae9",
        zIndex: 60,
        padding: "0.55rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        pointerEvents: "none",
        animation: "cardPreviewIn 0.15s ease",
      }}
    >
      {/* Art */}
      <div
        style={{
          borderRadius: "0.4rem",
          overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          aspectRatio: "1 / 1",
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
              width: "105%",
              height: "105%",
              objectFit: "contain",
              imageRendering: "auto",
            }}
            draggable={false}
          />
        )}
      </div>

      {/* Rarity · type badge */}
      <span
        style={{
          fontSize: "1rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: rarityColor,
          fontWeight: 700,
        }}
      >
        {card.rarity} · {card.type}
      </span>

      {/* Name */}
      <div
        style={{
          fontSize: "1.45rem",
          fontWeight: 700,
          color: "#e8eaf6",
          lineHeight: 1.2,
          marginTop: "-0.15rem",
        }}
      >
        {card.name}
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: `linear-gradient(90deg, ${rarityColor}70, transparent)`,
        }}
      />

      {/* Description */}
      <p
        style={{
          fontSize: "1.12rem",
          color: "#9fa8da",
          lineHeight: 1.55,
          margin: 0,
          minHeight: "2.5em",
        }}
      >
        {card.description ? (
          card.description
        ) : (
          <em style={{ opacity: 0.45 }}>No description.</em>
        )}
      </p>

      {/* Tags */}
      {card.tags?.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.2rem",
            marginTop: "0.1rem",
          }}
        >
          {card.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "0.95rem",
                padding: "0.1rem 0.4rem",
                borderRadius: 99,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#7986cb",
                letterSpacing: "0.05em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** ── Single card rendered inside the fan ──────────────────────────────────────
 * @param {Object}   card      — card data
 * @param {number}   delta     — offset from center (0 = center, ±1 = adjacent, etc.). Left cards are negative, right cards are positive.
 * @param {number}   total     — total number of cards in hand
 * @param {Function} onHover   — called with card on mouseenter
 * @param {Function} onHoverEnd — called on mouseleave
 */
function HandCard({ card, delta, total, onHover, onHoverEnd }) {
  const { isDragging, ...dragProps } = useDraggable(card);
  const rotation = delta * ROT_STEP;
  // Cards farther from center also sit slightly lower (natural arc)
  const arcY = delta * delta * 2.5;

  return (
    <div
      {...dragProps}
      onMouseEnter={() => onHover(card)}
      onMouseLeave={onHoverEnd}
      className={`hand-card card-base card-rarity-${card.rarity.toLowerCase()}${isDragging ? " is-dragging" : ""}`}
      title={`${card.name}  [${card.rarity}]\nType: ${card.type}\n${card.description}`}
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
              imageRendering: "auto",
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
          {card.type}
        </span>
      </div>
    </div>
  );
}

// ── Hand container ────────────────────────────────────────────────────────────
export default function HandCards({ hand }) {
  const [visible, setVisible] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);

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
  const containerW = Math.max(
    CARD_W + 40,
    SPREAD * Math.max(n - 1, 0) + CARD_W + 40,
  );

  return (
    <>
      <CardPreview card={hoveredCard} />
      {/*
       * The outer wrapper fills the bottom strip (20vh) and is a fixed overlay.
       * It sits above the footer (z-25) and is pointer-events:none so the
       * footer link remains clickable when the hand is hidden.
       */}
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
              onHover={setHoveredCard}
              onHoverEnd={() => setHoveredCard(null)}
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
    </>
  );
}
