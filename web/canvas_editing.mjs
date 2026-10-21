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
