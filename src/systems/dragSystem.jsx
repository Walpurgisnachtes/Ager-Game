// ─────────────────────────────────────────────
//  Drag System — context and hooks for card drag-and-drop
//  Built on the HTML5 Drag & Drop API
// ─────────────────────────────────────────────

import { createContext, useContext, useState, useCallback } from "react";

const DragCtx = createContext(null);

// ── Provider ─────────────────────────────────────────────────────────────────

/**
 * Wrap the game root in <DragProvider> to enable dragging everywhere inside.
 */
export function DragProvider({ children }) {
    const [dragging, setDragging] = useState(null); // card object | null

    const startDrag = useCallback((card, e) => {
        setDragging(card);
        e.dataTransfer.effectAllowed = "move";
        // Store card id in transfer data (useful for future server-side or multi-window support)
        e.dataTransfer.setData("text/plain", card.id);
    }, []);

    const endDrag = useCallback(() => setDragging(null), []);

    return (
        <DragCtx.Provider value={{ dragging, startDrag, endDrag }}>
            {children}
        </DragCtx.Provider>
    );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Access the raw drag context (dragging card, startDrag, endDrag). */
export function useDragContext() {
    const ctx = useContext(DragCtx);
    if (!ctx) throw new Error("useDragContext must be used inside <DragProvider>");
    return ctx;
}

/**
 * Returns props to spread onto a draggable element.
 *
 * Usage:
 *   const dragProps = useDraggable(card);
 *   return <div {...dragProps}>...</div>;
 */
export function useDraggable(card) {
    const { dragging, startDrag, endDrag } = useDragContext();
    const isDragging = dragging?.id === card.id;
    return {
        isDragging,
        draggable: true,
        onDragStart: (e) => startDrag(card, e),
        onDragEnd: endDrag,
    };
}

/**
 * Returns state + event props for a drop zone.
 *
 * @param {"equipment"|"world"} zoneType  — category of this drop target
 * @param {string}              slotKey   — unique id within the zone (e.g. "head", "3-4")
 * @param {Function}            canDropFn — (card, zoneType, slotKey) => boolean
 * @param {Function}            onDropCard — (card) => void  called on a valid drop
 *
 * Returns:
 *   isOver   — whether a card is currently hovering over this zone
 *   accepts  — whether the currently-dragged card is allowed here
 *   dropProps — spread these onto the drop zone element
 */
export function useDropZone(zoneType, slotKey, canDropFn, onDropCard) {
    const { dragging } = useDragContext();
    const [isOver, setIsOver] = useState(false);

    // Recomputed on every render; safe because canDropFn is pure
    const accepts = dragging ? canDropFn(dragging, zoneType, slotKey) : false;

    const dropProps = {
        onDragOver(e) {
            if (accepts) e.preventDefault(); // allows drop
        },
        onDragEnter(e) {
            if (accepts) {
                e.preventDefault();
                setIsOver(true);
            }
        },
        onDragLeave(e) {
            // Only clear if leaving to an element outside this zone
            if (!e.currentTarget.contains(e.relatedTarget)) {
                setIsOver(false);
            }
        },
        onDrop(e) {
            e.preventDefault();
            setIsOver(false);
            if (dragging && accepts) onDropCard(dragging);
        },
    };

    return { isOver, accepts, dropProps };
}
