// Straight-line distance between two { x, y } items in viewBox units.

export const itemDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
