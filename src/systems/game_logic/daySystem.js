// ─────────────────────────────────────────────────────────────────────────────
//  Day System
//  Tracks the current in-game day and dispatches "day:advance" events.
//
//  Dispatches: "day:advance"   detail: { day }   (synchronous CustomEvent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a day system instance.
 *
 * @param {number} startDay  Initial day counter (default 0).
 * @returns {{ getDay, advanceDay }}
 */
export function initDaySystem(startDay = 0) {
    let currentDay = startDay;

    function getDay() {
        return currentDay;
    }

    /**
     * Increments the day counter by 1 and synchronously dispatches
     * a "day:advance" CustomEvent so all subscribed systems update.
     *
     * @returns {number}  The new day number.
     */
    function advanceDay() {
        currentDay += 1;
        window.dispatchEvent(
            new CustomEvent("day:advance", { detail: { day: currentDay } })
        );
        return currentDay;
    }

    return { getDay, advanceDay };
}
