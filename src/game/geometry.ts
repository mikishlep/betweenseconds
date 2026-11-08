export interface Point { x: number; y: number; }
export interface Rect extends Point { width: number; height: number; }
// Slab intersection returns the earliest hit, including a stationary overlap.
export function segmentHit(a: Point, b: Point, box: Rect, padding = 0): number | null {
    let near = 0, far = 1;
    for (const axis of ["x", "y"] as const) {
        const half = (axis === "x" ? box.width : box.height) / 2 + padding;
        const delta = b[axis] - a[axis];
        const low = box[axis] - half, high = box[axis] + half;
        if (Math.abs(delta) < 1e-9) {
            if (a[axis] < low || a[axis] > high) return null;
        } else {
            const t1 = (low - a[axis]) / delta, t2 = (high - a[axis]) / delta;
            near = Math.max(near, Math.min(t1, t2));
            far = Math.min(far, Math.max(t1, t2));
            if (near > far) return null;
        }
    }
    return near;
}
export function relativeHit(a: Point, b: Point, previous: Point, target: Rect, size: Rect): number | null {
    return segmentHit({ x: a.x - previous.x, y: a.y - previous.y },
        { x: b.x - target.x, y: b.y - target.y },
        { x: 0, y: 0, width: target.width + size.width, height: target.height + size.height });
}
