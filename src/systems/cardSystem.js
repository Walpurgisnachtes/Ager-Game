// ─────────────────────────────────────────────
//  Card System — data structures, tags, and drop process rules
// ─────────────────────────────────────────────

import cardListData from "../assets/jsons/cardlist.json";

// ── Image resolution ──────────────────────────────────────────────────────────
// Vite eagerly imports all images from the two asset subdirectories.
// The resulting map is keyed by "subdir/filename.png" to match JSON path values.
const _cardArtsGlob   = import.meta.glob("../assets/images/card_arts/*.png",   { eager: true });
const _worldIconsGlob = import.meta.glob("../assets/images/world_icons/*.png", { eager: true });

const _IMAGE_MAP = Object.fromEntries(
  [...Object.entries(_cardArtsGlob), ...Object.entries(_worldIconsGlob)].map(
    ([path, mod]) => [path.replace("../assets/images/", ""), mod.default]
  )
);

/** Resolve a JSON art path string (e.g. "card_arts/foo.png") to a bundled URL. */
function resolveArt(path) {
  return path ? (_IMAGE_MAP[path] ?? null) : null;
}

/** All rarity levels, lowest to highest */
export const RARITIES = ["Common", "Rare", "Epic", "Legendary"];

/**
 * Equipment slot definitions.
 * key    → slot id used throughout the codebase
 * label  → display name shown in the UI
 * accepts → array of card tags that can be dropped here
 */
export const EQUIPMENT_SLOTS = {
  head: { label: "Head", accepts: ["equipment-head"] },
  body: { label: "Body", accepts: ["equipment-body"] },
  feet: { label: "Feet", accepts: ["equipment-feet"] },
  hand: { label: "Hand", accepts: ["equipment-hand", "tool"] },
};

/**
 * Tags that any world grid cell will accept.
 * Extend this list as new card types are added.
 */
export const WORLD_GRID_ACCEPTS = [
  "item",
  "seed",
  "consumable",
  "tool",
  "structure",
];

/**
 * Process system — the single source of truth for drop legality.
 * Returns true if `card` may be dropped onto a zone.
 *
 * @param {Object}           card      — card object
 * @param {"equipment"|"world"} zoneType — category of the drop target
 * @param {string}           [slotKey] — slot id (required for "equipment" zones)
 */
export function canDrop(card, zoneType, slotKey) {
  if (!card?.tags?.length) return false;

  if (zoneType === "equipment") {
    const slot = EQUIPMENT_SLOTS[slotKey];
    if (!slot) return false;
    return card.tags.some((t) => slot.accepts.includes(t));
  }

  if (zoneType === "world") {
    return card.tags.some((t) => WORLD_GRID_ACCEPTS.includes(t));
  }

  return false;
}

/**
 * Card factory — always use this to create card objects
 * so the shape stays consistent.
 */
export function createCard({
  id,
  name,
  rarity = "Common",
  tags = [], // e.g. ["equipment-head"], ["seed", "item"]
  description = "",
  art = null,      // image shown on the hand card
  worldArt = null, // image shown when placed on the world grid (falls back to art)
} = {}) {
  return { id, name, rarity, tags, description, art, worldArt };
}

// ── Card registry ─────────────────────────────────────────────────────────────

/**
 * All cards loaded from cardlist.json, with art paths resolved to bundled URLs.
 * Use this as the single source of truth for card data.
 */
export const ALL_CARDS = cardListData.map((entry) =>
  createCard({
    ...entry,
    art:      resolveArt(entry.art),
    worldArt: resolveArt(entry.worldArt),
  })
);

/** Look up one or more cards by id. Unknown ids are silently skipped. */
export function getCardsById(...ids) {
  return ids.map((id) => ALL_CARDS.find((c) => c.id === id)).filter(Boolean);
}

// ── Sample hand for development ──────────────────────────────────────────────
export const SAMPLE_HAND = getCardsById("c1", "c2", "c3", "c4", "c5");
