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

/**
 * Creates a resource structure system instance.
 *
 * @param {Function} getWorldGrid    — () => current world grid
 * @param {Function} getResourceSys  — () => current resource system instance
 * @param {Function} getTerritorySet — () => Set<tileKey> of tiles inside territory
 * @returns {{ syncWithWorld, destroy }}
 */
export function initResourceStructureSystem(getWorldGrid, getResourceSys, getTerritorySet) {
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

        const wGrid     = getWorldGrid();
        const resSys    = getResourceSys();
        const territory = getTerritorySet ? getTerritorySet() : null;
        if (!resSys) return;

        for (const [key, card] of Object.entries(wGrid)) {
            if (!card.recipes?.length || !(key in dayAccumulators)) continue;

            // Structures outside territory are inert — neither accumulate nor produce.
            if (territory && !territory.has(key)) continue;

            // MVP: always use the first recipe.
            const recipe = card.recipes[0];
            const daysNeeded = card.daysPerOutput ?? 1;

            dayAccumulators[key] += 1;

            // Cycle not yet complete — keep accumulating.
            if (dayAccumulators[key] < daysNeeded) continue;

            // Cycle complete — check whether all inputs can be satisfied.
            const canProduce = recipe.input.every(({ name, amount }) => {
                const id  = normalizeResourceId(name);
                const res = resSys.getResource(id);
                return res !== null && res.amount >= amount;
            });

            if (!canProduce) {
                // Hold the accumulator at its ceiling so production fires on the
                // very next day that inputs become available.
                dayAccumulators[key] = daysNeeded;
                continue;
            }

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
