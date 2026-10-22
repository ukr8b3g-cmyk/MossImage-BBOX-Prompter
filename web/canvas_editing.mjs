// Session-only Canvas history; workflow serialization stays in moss_controls.
function editKey(snapshot) {
  const { selectedId, activeSlot, drawMode, canvasPresetSelected, canvasSize, ...values } = snapshot;
  values.boxes = snapshot.boxes.map(({ id, slot, x1, y1, x2, y2 }) => ({ id, slot, x1, y1, x2, y2 }));
  return JSON.stringify(values);
}

export function createCanvasHistory(limit = 60) {
  const past = [], future = [];
  return {
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    record(before, after) {
      if (editKey(before) === editKey(after)) return false;
      past.push(structuredClone(before));
      if (past.length > limit) past.shift();
      future.length = 0;
      return true;
    },
    undo(current) {
      if (!past.length) return null;
      future.push(structuredClone(current));
      return past.pop();
    },
    redo(current) {
      if (!future.length) return null;
      past.push(structuredClone(current));
      return future.pop();
    },
    clear() { past.length = 0; future.length = 0; },
  };
}

export function nextOverlappingBox(boxes, point, selectedId) {
  const hits = boxes.filter(box => point.x >= Math.min(box.x1, box.x2)
    && point.x <= Math.max(box.x1, box.x2) && point.y >= Math.min(box.y1, box.y2)
    && point.y <= Math.max(box.y1, box.y2)).reverse();
  if (!hits.length) return null;
  const index = hits.findIndex(box => box.id === selectedId);
  return hits[(index + 1) % hits.length];
}

// A fixed opposite corner and one shared scale keep the starting ratio at bounds.
export function resizeBoxWithAspect(box, point, handle, bounds) {
  const left = Math.min(box.x1, box.x2), right = Math.max(box.x1, box.x2);
  const top = Math.min(box.y1, box.y2), bottom = Math.max(box.y1, box.y2);
  const width = right - left, height = bottom - top;
  if (!(width > 0 && height > 0)) return { ...box };
  const west = handle.includes("w"), north = handle.includes("n");
  const anchorX = west ? right : left, anchorY = north ? bottom : top;
  const roomX = west ? anchorX - bounds.minX : bounds.maxX - anchorX;
  const roomY = north ? anchorY - bounds.minY : bounds.maxY - anchorY;
  const maxScale = Math.min(roomX / width, roomY / height);
  if (!(maxScale > 0)) return { ...box };
  const scale = Math.min(maxScale, Math.max(Math.min(maxScale, 1 / width, 1 / height),
    (point.x - anchorX) * (west ? -1 : 1) / width,
    (point.y - anchorY) * (north ? -1 : 1) / height));
  const x = anchorX + (west ? -1 : 1) * width * scale;
  const y = anchorY + (north ? -1 : 1) * height * scale;
  return { ...box, x1: Math.min(x, anchorX), y1: Math.min(y, anchorY),
    x2: Math.max(x, anchorX), y2: Math.max(y, anchorY) };
}

// Work in canvas pixels; the caller converts the screen-space grab distance.
export function snapBoxToGuides(box, { width, height, bounds, toleranceX, toleranceY, handle = "move" }) {
  const result = { ...box };
  for (const [start, end, length, min, max, tolerance, leading, trailing] of [
    ["x1", "x2", width, bounds.minX, bounds.maxX, toleranceX, "w", "e"],
    ["y1", "y2", height, bounds.minY, bounds.maxY, toleranceY, "n", "s"],
  ]) {
    const moving = handle === "move";
    const edge = handle.includes(leading) ? start : handle.includes(trailing) ? end : null;
    if (!moving && !edge) continue;
    const anchors = moving ? [box[start], (box[start] + box[end]) / 2, box[end]] : [box[edge]];
    let correction = null;
    for (const anchor of anchors) {
      for (const guide of [length / 3, length / 2, length * 2 / 3]) {
        const delta = guide - anchor;
        if (Math.abs(delta) > tolerance || (correction !== null && Math.abs(delta) >= Math.abs(correction))) continue;
        const a = moving || edge === start ? box[start] + delta : box[start];
        const b = moving || edge === end ? box[end] + delta : box[end];
        if (Math.min(a, b) < min || Math.max(a, b) > max || Math.abs(b - a) < 1e-9) continue;
        correction = delta;
      }
    }
    if (correction !== null) {
      if (moving || edge === start) result[start] += correction;
      if (moving || edge === end) result[end] += correction;
    }
  }
  return result;
}
