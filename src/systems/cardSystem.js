// ─────────────────────────────────────────────
//  Card System — data structures, tags, and drop process rules
// ─────────────────────────────────────────────

import cardListData from "../assets/jsons/cardlist.json";

// ── Configurable constants ────────────────────────────────────────────────────
/** All rarity levels, lowest to highest */
export const RARITIES = ["Common", "Rare", "Epic", "Legendary"];

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
  "plant",
];

// ── Image resolution ──────────────────────────────────────────────────────────
// Vite eagerly imports all images from the two asset subdirectories.
// The resulting map is keyed by "subdir/filename.png" to match JSON path values.
const _cardArtsGlob = import.meta.glob("../assets/images/card_arts/*.png", {
  eager: true,
});
const _worldIconsGlob = import.meta.glob("../assets/images/world_icons/*.png", {
  eager: true,
});

const _IMAGE_MAP = Object.fromEntries(
  [...Object.entries(_cardArtsGlob), ...Object.entries(_worldIconsGlob)].map(
    ([path, mod]) => [path.replace("../assets/images/", ""), mod.default],
  ),
);

/** Resolve a JSON art path string (e.g. "card_arts/foo.png") to a bundled URL. */
function resolveArt(path) {
  return path ? (_IMAGE_MAP[path] ?? null) : null;
}

/**
 * Process system — the single source of truth for drop legality.
 * Returns true if `card` may be dropped onto a zone.
 *
 * @param {Object} card     — card object
 * @param {string} zoneType — category of the drop target ("world", etc.)
 */
export function canDrop(card, zoneType) {
  if (!card?.tags?.length) return false;

  if (zoneType === "world") {
    return true; // TEMP: allow all cards to be dropped on the world for testing
    // return card.tags.some((t) => WORLD_GRID_ACCEPTS.includes(t));
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
  type = "Unknown",
  tags = [], // e.g. ["equipment-head"], ["seed", "item"]
  description = "",
  art = null, // image shown on the hand card
  worldArt = null, // image shown when placed on the world grid (falls back to art)
} = {}) {
  return { id, name, rarity, type, tags, description, art, worldArt };
}

// ── Card registry ─────────────────────────────────────────────────────────────

/**
 * All cards loaded from cardlist.json, with art paths resolved to bundled URLs.
 * Use this as the single source of truth for card data.
 */
export const ALL_CARDS = cardListData.map((entry) =>
  createCard({
    ...entry,
    art: resolveArt(entry.art),
    worldArt: resolveArt(entry.worldArt),
  }),
);

/** Look up one or more cards by id. Unknown ids are silently skipped. */
export function getCardsById(...ids) {
  return ids.map((id) => ALL_CARDS.find((c) => c.id === id)).filter(Boolean);
}

// ── Sample hand for development ──────────────────────────────────────────────
export const SAMPLE_HAND = getCardsById("1", "2", "3", "4", "5");
