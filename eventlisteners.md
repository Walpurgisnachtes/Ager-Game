# Event Listeners

All game-logic communication uses `window` `CustomEvent`s. DOM events (keyboard, wheel, image load) are listed separately at the bottom.

---

## Game CustomEvents

### `day:advance`

| Field | Value |
|---|---|
| **Dispatched by** | `daySystem.js` → `advanceDay()` |
| **Listened by** | `residentSystem.js` (internal), `GameScreen.jsx` (UI day counter) |
| **Timing** | Synchronous — all listeners run before `advanceDay()` returns |
| **`detail`** | `{ day: number }` — the new day number after increment |

**Usage**

Advance the in-game day and trigger all time-driven systems:

```js
daySysRef.current.advanceDay();
```

Listener example (inside `residentSystem`):

```js
window.addEventListener("day:advance", onDayAdvance);
// onDayAdvance grows resident counts and fires "residents:updated"
```

Listener example (GameScreen UI):

```js
const onDayTick = (e) => setDay(e.detail.day);
window.addEventListener("day:advance", onDayTick);
```

---

### `residents:updated`

| Field | Value |
|---|---|
| **Dispatched by** | `residentSystem.js` → `onDayAdvance()` |
| **Listened by** | `GameScreen.jsx` (population panel state) |
| **`detail`** | `{ population }` — full population snapshot |

**Population snapshot shape:**

```js
{
  [residentTypeKey]: { vulgar: number, noble: number, soldier: number },
  // e.g. zombie: { vulgar: 3, noble: 0, soldier: 1 }
}
```

**Usage**

Keep the React population state in sync with the resident system:

```js
const onUpdate = (e) => setPopulation(e.detail.population);
window.addEventListener("residents:updated", onUpdate);
```

To manually read the current population without waiting for the event:

```js
residentSysRef.current.getPopulation();
```

---

### `resources:updated`

| Field | Value |
|---|---|
| **Dispatched by** | `resourceSystem.js` — every mutation: `setAmount`, `addAmount`, `unlock`, `lockResource` |
| **Listened by** | `GameScreen.jsx` (resource panel state) |
| **`detail`** | `{ resources }` — full resource map snapshot (cloned, safe to read freely) |

**Resource map shape:**

```js
{
  [resourceId]: { amount: number, unlocked: boolean },
  // e.g. coin: { amount: 42, unlocked: true }
}
```

**Usage**

Keep the React resources state in sync with the resource system:

```js
const onResourceUpdate = (e) => setResources(e.detail.resources);
window.addEventListener("resources:updated", onResourceUpdate);
```

To mutate resources imperatively (event fires automatically):

```js
resourceSysRef.current.addAmount("coin", 10);   // + 10 coins
resourceSysRef.current.unlock("wood");           // reveal wood in UI
resourceSysRef.current.setAmount("stone", 0);   // reset stone
```

---

## DOM Events (UI / Canvas)

These are standard browser events, not part of the game-logic event system.

| Event | Element | Where | Purpose |
|---|---|---|---|
| `keydown` | `window` | `GameScreen.jsx` (×2) | Camera pan (WASD/arrow keys), debug shortcuts |
| `keydown` | `window` | `HandCards.jsx` | Keyboard card selection in hand |
| `wheel` | canvas element | `GameScreen.jsx` | Zoom in/out on the world map |
| `load` | `<img>` elements | `GameScreen.jsx` | Trigger canvas redraw when terrain/card images finish loading |
