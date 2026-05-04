// ─────────────────────────────────────────────────────────────────────────────
//  Resource System
//  Single source of truth for every in-game resource: current amount and
//  unlock status.
//
//  Design rules
//  ─────────────
//  • A resource is never removed or locked again once it has been unlocked.
//    (Use lockResource only when you explicitly need to override this rule.)
//  • All mutations go through the system so the "resources:updated" event
//    always fires and any subscriber stays in sync.
//
//  Cross-system communication uses CustomEvents on window:
//    Dispatches: "resources:updated"
//                detail: { resources }   — full snapshot of the resource map
//
//  Resource map shape (internal):
//    { [resourceId]: { amount: number, unlocked: boolean } }
// ─────────────────────────────────────────────────────────────────────────────

// ── Configurable constants ────────────────────────────────────────────────────
const MIN_AMOUNT = 0; // resources never go below this value

/**
 * Creates a resource system instance.
 *
 * @param {Object} initialResources
 *   Seed state: { [id]: { amount: number, unlocked: boolean } }
 *   Unrecognised keys are accepted — the system is definition-agnostic.
 *
 * @returns {{
 *   getResources,
 *   getResource,
 *   setAmount,
 *   addAmount,
 *   unlock,
 *   lockResource,
 *   destroy
 * }}
 */
export function initResourceSystem(initialResources = {}) {
    // Deep-clone to avoid mutating the caller's object.
    const state = Object.fromEntries(
        Object.entries(initialResources).map(([id, r]) => [
            id,
            { amount: r.amount ?? 0, unlocked: r.unlocked ?? false },
        ])
    );

    // ── Internal helpers ──────────────────────────────────────────────────────

    function snapshot() {
        // Return a shallow clone so callers can't mutate internal state.
        return Object.fromEntries(
            Object.entries(state).map(([id, r]) => [id, { ...r }])
        );
    }

    function dispatch() {
        window.dispatchEvent(
            new CustomEvent("resources:updated", { detail: { resources: snapshot() } })
        );
    }

    function ensureEntry(id) {
        if (!state[id]) {
            state[id] = { amount: 0, unlocked: false };
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Returns a snapshot of the full resource map. */
    function getResources() {
        return snapshot();
    }

    /**
     * Returns a snapshot of a single resource entry, or null if it doesn't exist.
     * @param {string} id
     */
    function getResource(id) {
        return state[id] ? { ...state[id] } : null;
    }

    /**
     * Set a resource's amount to an absolute value (clamped to MIN_AMOUNT).
     * @param {string} id
     * @param {number} amount
     */
    function setAmount(id, amount) {
        ensureEntry(id);
        state[id].amount = Math.max(MIN_AMOUNT, amount);
        dispatch();
    }

    /**
     * Add (or subtract) from a resource's amount. Pass a negative delta to spend.
     * The amount is clamped to MIN_AMOUNT; returns the actual delta applied.
     * @param {string} id
     * @param {number} delta
     * @returns {number}  actual delta applied
     */
    function addAmount(id, delta) {
        ensureEntry(id);
        const before = state[id].amount;
        state[id].amount = Math.max(MIN_AMOUNT, before + delta);
        const applied = state[id].amount - before;
        dispatch();
        return applied;
    }

    /**
     * Reduce a resource's amount by a specified delta. Pass a negative delta to increase.
     * The amount is clamped to MIN_AMOUNT; returns the actual delta applied.
     * @param {string} id
     * @param {number} delta
     * @returns {number}  actual delta applied
     */
    function reduceAmount(id, delta) {
        return addAmount(id, -delta);
    }

    /**
     * Unlock a resource so it appears in the UI.
     * Once unlocked a resource stays unlocked — this is intentional.
     * @param {string} id
     */
    function unlock(id) {
        ensureEntry(id);
        if (state[id].unlocked) return; // already unlocked — no-op, no event
        state[id].unlocked = true;
        dispatch();
    }

    /**
     * Lock a resource (hide it from the UI).
     * Provided for edge-case use only; prefer unlock() for normal gameplay.
     * This does NOT reset the resource's amount.
     * @param {string} id
     */
    function lockResource(id) {
        ensureEntry(id);
        if (!state[id].unlocked) return; // already locked — no-op
        state[id].unlocked = false;
        dispatch();
    }

    /** Remove event listeners. Call on component unmount. */
    function destroy() {
        // No internal listeners to clean up currently.
        // Placeholder for future subscriptions (e.g. day:advance for passive income).
    }

    return {
        getResources,
        getResource,
        setAmount,
        addAmount,
        reduceAmount,
        unlock,
        lockResource,
        destroy,
    };
}
