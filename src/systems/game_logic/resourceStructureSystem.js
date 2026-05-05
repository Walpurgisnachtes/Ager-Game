// ─────────────────────────────────────────────────────────────────────────────
//  Resource Structure System
//  Drives per-structure production cycles: every `daysPerOutput` days a
//  structure attempts to consume its recipe inputs and produce its outputs.
//
//  MVP rules
//  ─────────
//  • Only the first recipe in a structure's `recipes` array is used.
//  • If a structure cannot produce (insufficient inputs) when its cycle
//    completes, the accumulator is NOT reset — it retries every subsequent
//    day until inputs are available, then resets and starts a fresh cycle.
//  • Output resources are automatically unlocked in the resource system the
//    first time they are produced.
//  • Resource name → ID normalization: lower-case + spaces → underscores.
//    e.g. "Night Wheat" → "night_wheat"
//
//  Cross-system communication uses CustomEvents on window:
//    Listens:   "day:advance"   (dispatched by daySystem)
// ─────────────────────────────────────────────────────────────────────────────

import _ from "lodash";

/**
 * Normalize a recipe resource name to a resource-system ID.
 * "Night Wheat Flour" → "night_wheat_flour"
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeResourceId(name) {
  return name.toLowerCase().replace(/\s+/g, "_");
}

export const ProductionErrorFlags = {
  OUT_OF_TERRITORY: 1,
  LABOR_SHORTAGE: 2,
  RESOURCE_SHORTAGE: 4,
};

/**
 * Creates a resource structure system instance.
 *
 * @param {Function} getWorldGrid    — () => current world grid
 * @param {Function} getResourceSys  — () => current resource system instance
 * @param {Function} getTerritorySet    — () => Set<tileKey> of tiles inside territory
 * @param {Function} [getResidentSys]    — () => resident system instance (for staffing checks)
 * @param {Function} [getConnectedTiles] — (tileKey) => tileKey[]  tiles reachable from source
 * @returns {{ syncWithWorld, destroy }}
 */
export function initResourceStructureSystem(
  getWorldGrid,
  getResourceSys,
  getTerritorySet,
  getResidentSys,
  getConnectedTiles,
) {
  // { tileKey: number } — days accumulated toward the next production cycle
  const dayAccumulators = {};

  // ── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Reconcile internal state with the current world grid:
   * – New structures with recipes are registered (accumulator starts at 0).
   * – Structures removed from the world are pruned.
   */
  function syncWithWorld() {
    const wGrid = getWorldGrid();

    for (const [key, card] of Object.entries(wGrid)) {
      if (!card.recipes?.length) continue;
      if (!(key in dayAccumulators)) {
        dayAccumulators[key] = 0;
      }
    }

    for (const key of Object.keys(dayAccumulators)) {
      if (!getWorldGrid()[key]?.recipes?.length) {
        delete dayAccumulators[key];
      }
    }
  }

  // ── Event handler ─────────────────────────────────────────────────────────

  function onDayAdvance() {
    syncWithWorld();

    const wGrid = getWorldGrid();
    const resSys = getResourceSys();
    const territory = getTerritorySet ? getTerritorySet() : null;
    if (!resSys) return;

    // Per-tile occupancy tracking for this day's simulation.
    // dailyOccupancy[tileKey] = number of residents already claimed from that residential tile.
    // Resets every day; structures claim residents in world-grid iteration order.
    const dailyOccupancy = {};

    // Fetch per-tile resident counts once (populated by residentSystem).
    let perTileCounts = null;
    if (getResidentSys) {
      const resSysInst = getResidentSys();
      perTileCounts = resSysInst?.getResidentCountsPerTile?.() ?? null;
    }

    for (const [key, card] of Object.entries(wGrid)) {
      if (!_.includes(card.tags, "factory")) {
        continue;
      }

      if (!card.recipes?.length || !(key in dayAccumulators)) {
        // Broken data or sync issue — skip this tile until the next day when syncWithWorld runs again.
        console.error(
          `ResourceStructureSystem: tile ${key} has no recipes or accumulator`,
        );
        continue;
      }

      // Structures outside territory are inert — neither accumulate nor produce.
      if (territory && !territory.has(key)) {
        card.setSystemErrorFlag?.(
          "resourceStructure",
          ProductionErrorFlags.OUT_OF_TERRITORY,
        );
        continue;
      }

      // Spatial staffing check:
      // Structures without "independent" or "residential" tags must be
      // directly linked to residential buildings that supply enough workers.
      // An understaffed structure does not tick its accumulator (fully dormant).
      const isExempt =
        card.tags?.includes("independent") ||
        card.tags?.includes("residential");
      if (!isExempt && card.residentRequired) {
        const {
          name: requiredType,
          type: requiredSocialStatus,
          amount: requiredAmount,
        } = card.residentRequired;

        if (!getConnectedTiles || !perTileCounts) {
          card.setSystemErrorFlag?.(
            "resourceStructure",
            ProductionErrorFlags.LABOR_SHORTAGE,
          );
          continue;
        } // no linkage system

        // Find connected residential tiles that provide the required resident type.
        const connectedKeys = getConnectedTiles(key);
        const eligibleHouses = connectedKeys.filter((hKey) => {
          const hCard = wGrid[hKey];
          return (
            hCard?.tags?.includes("residential") &&
            hCard?.residentProvided?.name === requiredType &&
            (requiredSocialStatus
              ? hCard.residentProvided.socialStatus === requiredSocialStatus
              : true)
          );
        });

        // Sum available (not yet claimed) residents across all eligible houses.
        let totalAvailable = 0;
        for (const hKey of eligibleHouses) {
          const c = perTileCounts[hKey];
          if (!c) continue;
          const hTotal = c[requiredSocialStatus ?? "vulgar"] ?? 0;
          totalAvailable += Math.max(0, hTotal - (dailyOccupancy[hKey] ?? 0));
        }

        if (totalAvailable < requiredAmount) {
          card.setSystemErrorFlag?.(
            "resourceStructure",
            ProductionErrorFlags.LABOR_SHORTAGE,
          );
          continue;
        }

        // Greedy allocation: claim from eligible houses in order.
        let remaining = requiredAmount;
        for (const hKey of eligibleHouses) {
          if (remaining <= 0) break;
          const c = perTileCounts[hKey];
          if (!c) continue;
          const hTotal = c[requiredSocialStatus ?? "vulgar"] ?? 0;
          const available = Math.max(0, hTotal - (dailyOccupancy[hKey] ?? 0));
          const claim = Math.min(available, remaining);
          dailyOccupancy[hKey] = (dailyOccupancy[hKey] ?? 0) + claim;
          remaining -= claim;
        }
      }

      const recipe = card.recipes[card.selectedRecipeIndex];
      const daysNeeded = card.daysPerOutput ?? 1;

      // Cycle complete — check whether all inputs can be satisfied.
      const hasSufficientResources = recipe.input.every(({ name, amount }) => {
        const id = normalizeResourceId(name);
        const res = resSys.getResource(id);
        return res !== null && res.amount >= amount;
      });

      if (!hasSufficientResources) {
        card.setSystemErrorFlag?.(
          "resourceStructure",
          ProductionErrorFlags.RESOURCE_SHORTAGE,
        );
        continue;
      }

      dayAccumulators[key] = Math.min(dayAccumulators[key] + 1, daysNeeded);

      // Cycle not yet complete — keep accumulating.
      if (dayAccumulators[key] < daysNeeded) continue;

      // Reset cycle.
      dayAccumulators[key] = 0;

      // Consume inputs.
      for (const { name, amount } of recipe.input) {
        resSys.addAmount(normalizeResourceId(name), -amount);
      }

      // Produce outputs — unlock each resource the first time it appears.
      for (const { name, amount } of recipe.output) {
        const id = normalizeResourceId(name);
        resSys.unlock(id);
        resSys.addAmount(id, amount);
      }
    }
  }

  // ── Initialize ────────────────────────────────────────────────────────────
  syncWithWorld();
  window.addEventListener("day:advance", onDayAdvance);

  return {
    /** Call after any worldGrid change to register new / prune removed structures. */
    syncWithWorld,
    /** Remove event listeners; call on component unmount. */
    destroy() {
      window.removeEventListener("day:advance", onDayAdvance);
    },
  };
}
