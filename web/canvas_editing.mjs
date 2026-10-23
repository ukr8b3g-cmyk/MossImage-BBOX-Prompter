// Session-only Canvas history; workflow serialization stays in moss_controls.
function editKey(snapshot) {
  const { selectedId, selectedIds, activeSlot, drawMode, canvasPresetSelected, canvasSize, ...values } = snapshot;
  values.boxes = snapshot.boxes.map(({ id, slot, x1, y1, x2, y2, locked, promptData }) => ({ id, slot, x1, y1, x2, y2, locked: locked === true, promptData }));
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

// Position-only edits; array order and all non-coordinate metadata stay intact.
export function arrangeBoxes(boxes, action, bounds) {
  const modes = {left:["x1","x2",0],center:["x1","x2",0.5],right:["x1","x2",1],
    top:["y1","y2",0],middle:["y1","y2",0.5],bottom:["y1","y2",1],
    horizontal:["x1","x2"],vertical:["y1","y2"]};
  const mode = modes[action], distribute = action === "horizontal" || action === "vertical";
  if (!mode || boxes.length < (distribute ? 3 : 2) || boxes.some(b => b.locked === true)) return null;
  const [start,end,anchor] = mode;
  const items = boxes.map((box,index) => ({box,index,lo:Math.min(box[start],box[end]),hi:Math.max(box[start],box[end])}));
  const positions = new Map();
  if (distribute) {
    const ordered = items.slice().sort((a,b) => a.lo-b.lo || a.index-b.index);
    const first = ordered[0], last = ordered.at(-1);
    const gap = (last.hi-first.lo-ordered.reduce((sum,b) => sum+b.hi-b.lo,0))/(boxes.length-1);
    let cursor = first.hi+gap;
    positions.set(first.index,0);positions.set(last.index,0);
    for (const item of ordered.slice(1,-1)) {
      positions.set(item.index,cursor-item.lo);cursor += item.hi-item.lo+gap;
    }
  } else {
    const lo=Math.min(...items.map(b=>b.lo)), hi=Math.max(...items.map(b=>b.hi));
    const target=lo+(hi-lo)*anchor;
    for (const item of items) positions.set(item.index,target-(item.lo+(item.hi-item.lo)*anchor));
  }
  const result=items.map(({box,index}) => {
    const delta=Math.abs(positions.get(index))<1e-9 ? 0 : positions.get(index);
    return {...box,[start]:box[start]+delta,[end]:box[end]+delta};
  });
  if (result.some(b => Math.min(b.x1,b.x2)<bounds.minX-1e-9 || Math.max(b.x1,b.x2)>bounds.maxX+1e-9
    || Math.min(b.y1,b.y2)<bounds.minY-1e-9 || Math.max(b.y1,b.y2)>bounds.maxY+1e-9)) return null;
  return result;
}

export function nextOverlappingBox(boxes, point, selectedId) {
  const hits = boxes.filter(box => point.x >= Math.min(box.x1, box.x2)
    && point.x <= Math.max(box.x1, box.x2) && point.y >= Math.min(box.y1, box.y2)
    && point.y <= Math.max(box.y1, box.y2)).reverse();
  if (!hits.length) return null;
  const index = hits.findIndex(box => box.id === selectedId);
  return hits[(index + 1) % hits.length];
}

// Translate a selection as one rectangle so clamping/snapping never changes spacing.
export function moveBoxSelection(boxes, dx, dy, bounds, snap = null) {
  if (!boxes.length) return [];
  const envelope = {
    x1: Math.min(...boxes.map(b => Math.min(b.x1, b.x2))),
    y1: Math.min(...boxes.map(b => Math.min(b.y1, b.y2))),
    x2: Math.max(...boxes.map(b => Math.max(b.x1, b.x2))),
    y2: Math.max(...boxes.map(b => Math.max(b.y1, b.y2))),
  };
  const limit = (delta, low, high) => low <= high ? Math.max(low, Math.min(high, delta)) : 0;
  dx = limit(dx, bounds.minX - envelope.x1, bounds.maxX - envelope.x2);
  dy = limit(dy, bounds.minY - envelope.y1, bounds.maxY - envelope.y2);
  if (snap) {
    const moved = { x1: envelope.x1 + dx, y1: envelope.y1 + dy,
      x2: envelope.x2 + dx, y2: envelope.y2 + dy };
    const snapped = snapBoxToGuides(moved, { ...snap, bounds, handle: "move" });
    dx += snapped.x1 - moved.x1; dy += snapped.y1 - moved.y1;
  }
  return boxes.map(b => ({ ...b, x1: b.x1 + dx, y1: b.y1 + dy,
    x2: b.x2 + dx, y2: b.y2 + dy }));
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
