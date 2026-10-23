// MOSS-only state. Krea2 Canvas interaction design: (c) 2026 ukr8b3g-cmyk, MIT; see LICENSE.
export const SCHEMA_VERSION = "moss_bbox_v1";
export const SLOTS = [
  ["red", "#ff3b30"], ["blue", "#2f80ff"], ["yellow", "#ffd91a"],
  ["green", "#35b84b"], ["magenta", "#d943c8"],
  ["cyan", "#00c8d7"], ["orange", "#ff9500"],
];
const slotIds = SLOTS.map(([id]) => id);
export const LABELS = ["character", "object", "text"];
export const clone = (value) => JSON.parse(JSON.stringify(value));

export function defaultState() {
  return { schema_version: SCHEMA_VERSION, prompt: "", width: 896, height: 1184,
    slots: Object.fromEntries(slotIds.map(id => [id, ""])), boxes: [],
    settings: { auto_position: false, active_slot: "red", draw_mode: false, selected_id: null } };
}

function string(value, name) {
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  return value;
}

export function parseState(value) {
  const source = typeof value === "string" ? JSON.parse(value) : value;
  if (!source || source.schema_version !== SCHEMA_VERSION) throw new Error(`Expected MOSS state schema_version=${SCHEMA_VERSION}`);
  const state = defaultState();
  state.prompt = string(source.prompt ?? "", "prompt");
  for (const key of ["width", "height"]) {
    const size = source[key] ?? state[key];
    if (!Number.isInteger(size) || size <= 0 || size % 16) throw new Error(`${key} must be a positive multiple of 16 to match the MOSS latent size`);
    state[key] = size;
  }
  const slots = source.slots ?? {};
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) throw new Error("slots must be an object");
  state.slots = Object.fromEntries(slotIds.map(id => [id, string(slots[id] ?? "", id)]));
  if (!Array.isArray(source.boxes ?? [])) throw new Error("boxes must be an array");
  const seen = new Set();
  state.boxes = (source.boxes ?? []).map(box => {
    const id = string(box?.id, "box id");
    if (!id || seen.has(id)) throw new Error("Box ids must be nonempty and unique");
    seen.add(id);
    if (!slotIds.includes(box.slot) || !LABELS.includes(box.label)) throw new Error(`Invalid slot or label for box ${id}`);
    const clean = { id, slot: box.slot, label: box.label, text: string(box.text ?? "", "box text") };
    for (const key of ["x1", "y1", "x2", "y2"]) {
      if (typeof box[key] !== "number" || !Number.isFinite(box[key])) throw new Error(`${id}.${key} must be finite`);
      clean[key] = box[key];
    }
    return clean;
  });
  const settings = source.settings ?? {};
  if (typeof settings !== "object" || Array.isArray(settings)) throw new Error("settings must be an object");
  for (const key of ["auto_position", "draw_mode"]) {
    const value = settings[key] ?? false;
    if (typeof value !== "boolean") throw new Error(`${key} must be boolean`);
    state.settings[key] = value;
  }
  if (!slotIds.includes(settings.active_slot ?? "red")) throw new Error("Invalid active_slot");
  state.settings.active_slot = settings.active_slot ?? "red";
  state.settings.selected_id = seen.has(settings.selected_id) ? settings.selected_id : null;
  return state;
}

export const normalizedBox = box => [Math.min(box.x1, box.x2), Math.min(box.y1, box.y2), Math.max(box.x1, box.x2), Math.max(box.y1, box.y2)];
const round9 = value => Number(value.toFixed(9));
export function pixelBBox(box, width, height) {
  const [x0, y0, x1, y1] = normalizedBox(box);
  return [Math.floor(round9(y0)) - Math.floor(height / 2), Math.floor(round9(x0)) - Math.floor(width / 2),
    Math.ceil(round9(y1)) - Math.floor(height / 2), Math.ceil(round9(x1)) - Math.floor(width / 2)];
}

export function positionHint(box, width, height) {
  const cx = (box.x1 + box.x2) / (2 * width), cy = (box.y1 + box.y2) / (2 * height);
  return `${cy < .34 ? "upper" : cy > .66 ? "lower" : "middle"}-${cx < .34 ? "left" : cx > .66 ? "right" : "center"} area`;
}

export function positionConflict(text, box, width, height) {
  const cx = (box.x1 + box.x2) / (2 * width), cy = (box.y1 + box.y2) / (2 * height);
  const words = new Set(text.toLowerCase().match(/\b(left|right|top|bottom|upper|lower|center|middle)\b/g) ?? []);
  const left = words.has("left") || text.includes("左"), right = words.has("right") || text.includes("右");
  const top = words.has("top") || words.has("upper") || ["上部", "上側", "左上", "右上"].some(w => text.includes(w));
  const bottom = words.has("bottom") || words.has("lower") || ["下部", "下側", "左下", "右下"].some(w => text.includes(w));
  const center = words.has("center") || text.includes("中央") || text.includes("中心");
  return (left && cx > .66) || (right && cx < .34) || (top && cy > .66) || (bottom && cy < .34) || (center && (cx < .34 || cx > .66));
}

export function buildPrompt(value) {
  const state = parseState(value), { width, height } = state;
  const items = [], warnings = [], prose = state.prompt ? [state.prompt] : [], used = new Set();
  state.boxes.forEach((box, index) => {
    const caption = state.slots[box.slot];
    used.add(box.slot);
    const item = { label: box.label, caption };
    if (box.label === "text") item.text = box.text;
    item.bbox = pixelBBox(box, width, height);
    items.push(item);
    let description = `${box.label[0].toUpperCase() + box.label.slice(1)} (box ${index + 1}, ${box.slot}):\n${caption}`;
    if (box.label === "text") description += `\nText to render:\n${box.text}`;
    if (state.settings.auto_position) description += `\nPosition from current box: ${positionHint(box, width, height)}.`;
    prose.push(description);
    if (positionConflict(state.prompt + "\n" + caption, box, width, height)) warnings.push(`Box ${index + 1}: possible conflict with manual position words; original text kept.`);
    if (!caption.trim() && (box.label !== "text" || !box.text.trim())) warnings.push(`Box ${index + 1}: empty description/text is kept in the output.`);
    if (box.x1 === box.x2 || box.y1 === box.y2) warnings.push(`Box ${index + 1}: zero-area box is kept in the output.`);
  });
  for (const slot of slotIds) {
    if (!used.has(slot) && state.slots[slot]) {
      prose.push(`Unboxed description (${slot}):\n${state.slots[slot]}`);
      warnings.push(`${slot}: description has no box; included in prose only.`);
    }
  }
  const layout = { summary: { caption: state.prompt }, items, bbox_coord_space: "abs_centralized", bbox_format: "yxyx" };
  const moss_json = JSON.stringify(layout), natural = prose.join("\n\n");
  return { prompt: natural + (natural ? "\n\n" : "") + moss_json, moss_json, natural, width, height, warnings };
}

export function resizeState(value, width, height) {
  const state = parseState(value), sx = width / state.width, sy = height / state.height;
  for (const box of state.boxes) {
    box.x1 *= sx; box.x2 *= sx; box.y1 *= sy; box.y2 *= sy;
  }
  state.width = width; state.height = height;
  return parseState(state);
}

// Krea2-inspired four-corner interaction; screen-space handle tolerance is supplied by the view.
export function hitTest(boxes, point, tolerance) {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const box = boxes[i], [x1, y1, x2, y2] = normalizedBox(box);
    for (const [handle, x, y] of [["nw", x1, y1], ["ne", x2, y1], ["sw", x1, y2], ["se", x2, y2]]) {
      if (Math.abs(point.x - x) <= tolerance && Math.abs(point.y - y) <= tolerance) return { box, handle };
    }
    if (point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2) return { box, handle: "move" };
  }
  return null;
}

export function dragBox(box, handle, start, point, width, height) {
  let [x1, y1, x2, y2] = normalizedBox(box);
  if (handle === "move") {
    const dx = Math.max(-x1, Math.min(width - x2, point.x - start.x));
    const dy = Math.max(-y1, Math.min(height - y2, point.y - start.y));
    x1 += dx; x2 += dx; y1 += dy; y2 += dy;
  } else {
    if (handle.includes("w")) x1 = point.x;
    if (handle.includes("e")) x2 = point.x;
    if (handle.includes("n")) y1 = point.y;
    if (handle.includes("s")) y2 = point.y;
  }
  return { ...box, x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) };
}
