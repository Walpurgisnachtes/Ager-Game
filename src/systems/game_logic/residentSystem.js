// ─────────────────────────────────────────────
//  Resident System
//  Derives and evolves resident counts from structures placed on the world grid.
//
//  Population model (per structure instance):
//    residentProvided.type                     — resident type key (e.g. "Zombie")
//    residentProvided.initialResidents         — { amount, socialStatus }
//                                                Immediately granted on placement.
//    residentProvided.dayPerResidentIncrement  — every N days, +1 resident (same socialStatus)
//    residentProvided.maxResidents             — hard cap (across all social classes)
//
//  Cross-system communication uses CustomEvents on window:
//    Listens:   "day:advance"       (dispatched by daySystem; no detail required)
//    Dispatches: "residents:updated" detail: { population }
//
//  Population shape:
//    { [residentTypeKey]: { vulgar: N, noble: N, soldier: N }, ... }
// ─────────────────────────────────────────────

const SOCIAL_CLASSES = ["vulgar", "noble", "soldier"];

/** Returns a zeroed social-class count object. */
function zeroCounts() {
    return { vulgar: 0, noble: 0, soldier: 0 };
}

/** Total residents across all classes for a count object. */
function totalCounts(counts) {
    return SOCIAL_CLASSES.reduce((s, cls) => s + (counts[cls] ?? 0), 0);
}

/**
 * Pure helper — builds the initial population object from a world grid snapshot.
 * Sums initialResidents for every structure that has a residentProvided field.
 *
 * @param {Object} worldGrid  — { [tileKey]: cardObject }
 * @returns {Object}  population state  { [typeKey]: { vulgar, noble, soldier } }
 */
export function buildInitialPopulation(worldGrid) {
    const pop = {};
    for (const card of Object.values(worldGrid)) {
        const rp = card.residentProvided;
        if (!rp) continue;
        const typeKey = rp.type.toLowerCase();
        if (!pop[typeKey]) pop[typeKey] = zeroCounts();
        const { amount, socialStatus } = rp.initialResidents;
        const cls = SOCIAL_CLASSES.includes(socialStatus) ? socialStatus : "vulgar";
        pop[typeKey][cls] += amount;
    }
    return pop;
}

/**
 * Creates a resident system instance.
 * Call this once on game mount; call destroy() on unmount.
 *
 * @param {Function} getWorldGrid  — () => currentWorldGrid  (use a ref getter)
 * @returns {{ syncWithWorld, getPopulation, destroy }}
 */
export function initResidentSystem(getWorldGrid) {
    // Per-placed-structure tracking (keyed by tile key, e.g. "115-115")
    // residentCounts[tileKey] = { vulgar: N, noble: N, soldier: N }
    const residentCounts  = {};
    const dayAccumulators = {}; // { tileKey: number } — days toward next increment

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Reconcile internal state with the current world:
     * – New structures immediately receive their initialResidents in the correct
     *   social class.
     * – Structures no longer in the world are pruned.
     */
    function syncWithWorld() {
        const wGrid = getWorldGrid();

        // Register newly placed resident-providing structures
        for (const [key, card] of Object.entries(wGrid)) {
            const rp = card.residentProvided;
            if (!rp) continue;
            if (key in residentCounts) continue; // already tracked

            const counts = zeroCounts();
            const { amount, socialStatus } = rp.initialResidents;
            const cls = SOCIAL_CLASSES.includes(socialStatus) ? socialStatus : "vulgar";
            counts[cls] = Math.min(rp.maxResidents, amount);

            residentCounts[key]  = counts;
            dayAccumulators[key] = 0;
        }

        // Prune structures removed from the world
        for (const key of Object.keys(residentCounts)) {
            if (!getWorldGrid()[key]?.residentProvided) {
                delete residentCounts[key];
                delete dayAccumulators[key];
            }
        }
    }

    /**
     * Derive a population snapshot by summing per-structure counts by type.
     */
    function getPopulation() {
        const wGrid = getWorldGrid();
        const pop = {};
        for (const [key, counts] of Object.entries(residentCounts)) {
            const rp = wGrid[key]?.residentProvided;
            if (!rp) continue;
            const typeKey = rp.type.toLowerCase();
            if (!pop[typeKey]) pop[typeKey] = zeroCounts();
            for (const cls of SOCIAL_CLASSES) {
                pop[typeKey][cls] += counts[cls] ?? 0;
            }
        }
        return pop;
    }

    // ── Event handler ─────────────────────────────────────────────────────────

    function onDayAdvance() {
        syncWithWorld();
        const wGrid = getWorldGrid();

        for (const [key, card] of Object.entries(wGrid)) {
            const rp = card.residentProvided;
            if (!rp || !(key in residentCounts)) continue;

            dayAccumulators[key] += 1;
            if (dayAccumulators[key] >= rp.dayPerResidentIncrement) {
                dayAccumulators[key] = 0;
                const counts  = residentCounts[key];
                const current = totalCounts(counts);
                if (current < rp.maxResidents) {
                    // New arrivals share the same social class as initial residents
                    const { socialStatus } = rp.initialResidents;
                    const cls = SOCIAL_CLASSES.includes(socialStatus) ? socialStatus : "vulgar";
                    counts[cls] += 1;
                }
            }
        }

        window.dispatchEvent(
            new CustomEvent("residents:updated", { detail: { population: getPopulation() } })
        );
    }

    // ── Initialize ────────────────────────────────────────────────────────────
    syncWithWorld();
    window.addEventListener("day:advance", onDayAdvance);

    return {
        /** Call after any worldGrid change to pick up newly placed structures. */
        syncWithWorld,
        /** Returns current population snapshot. */
        getPopulation,
        /** Remove all event listeners; call on component unmount. */
        destroy() {
            window.removeEventListener("day:advance", onDayAdvance);
        },
    };
}
