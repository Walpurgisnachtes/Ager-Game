// ─────────────────────────────────────────────
//  Card System — data structures, tags, and drop process rules
// ─────────────────────────────────────────────

import nightWheatImg from "../assets/images/night_wheat.png";

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
  art = null, // reserved for future image/component
} = {}) {
  return { id, name, rarity, tags, description, art };
}

// ── Sample hand for development ──────────────────────────────────────────────
export const SAMPLE_HAND = [
  createCard({
    id: "c1",
    name: "Straw Hat",
    rarity: "Common",
    tags: ["equipment-head"],
    description: "A simple woven hat.",
  }),
  createCard({
    id: "c2",
    name: "Night Wheat Seed",
    rarity: "Common",
    tags: ["seed", "item"],
    description: "Plant in tilled soil at night.",
    art: nightWheatImg,
  }),
  createCard({
    id: "c3",
    name: "Iron Hoe",
    rarity: "Rare",
    tags: ["tool", "equipment-hand"],
    description: "Tills the soil efficiently.",
  }),
  createCard({
    id: "c4",
    name: "Moon Cloak",
    rarity: "Epic",
    tags: ["equipment-body"],
    description: "Woven from solidified moonlight.",
  }),
  createCard({
    id: "c5",
    name: "Night Boots",
    rarity: "Legendary",
    tags: ["equipment-feet"],
    description: "Silent as the abyss.",
  }),
];
