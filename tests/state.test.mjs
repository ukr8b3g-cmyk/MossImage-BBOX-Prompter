import assert from "node:assert/strict";
import test from "node:test";
import { defaultState, parseState, resizeState, pixelBBox, buildPrompt, hitTest, dragBox } from "../web/state.mjs";

const box = { id: "one", slot: "red", label: "object", text: "", x1: 100, y1: 200, x2: 400, y2: 800 };

test("portrait defaults, resize, and source immutability", () => {
  const state = defaultState(); state.boxes = [box]; state.slots.red = "Original 日本語";
  assert.deepEqual([state.width, state.height], [896, 1184]);
  const before = JSON.stringify(state), next = resizeState(state, 1792, 592);
  assert.deepEqual([next.boxes[0].x1, next.boxes[0].y1, next.boxes[0].x2, next.boxes[0].y2], [200, 100, 800, 400]);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(resizeState(next, 896, 1184), state);
  assert.deepEqual(parseState(JSON.stringify(next)), next);
  assert.deepEqual([buildPrompt(next).width, buildPrompt(next).height], [1792, 592]);
});

test("hit all four resize corners, movement, and overlap order", () => {
  for (const [handle, x, y] of [["nw", 100, 200], ["ne", 400, 200], ["sw", 100, 800], ["se", 400, 800]]) {
    assert.equal(hitTest([box], { x, y }, 8).handle, handle);
    const changed = dragBox(box, handle, { x, y }, { x: x + 20, y: y + 30 }, 896, 1184);
    assert.equal(changed[handle.includes("w") ? "x1" : "x2"], x + 20);
    assert.equal(changed[handle.includes("n") ? "y1" : "y2"], y + 30);
  }
  assert.equal(hitTest([box], { x: 250, y: 500 }, 8).handle, "move");
  assert.equal(hitTest([box, { ...box, id: "front" }], { x: 250, y: 500 }, 8).box.id, "front");
  assert.equal(hitTest([box], { x: 800, y: 500 }, 8), null);
  const moved = dragBox(box, "move", { x: 250, y: 500 }, { x: 2000, y: -1000 }, 896, 1184);
  assert.deepEqual([moved.x1, moved.y1, moved.x2, moved.y2], [596, 0, 896, 600]);
});

test("position prose and JSON recompute after reload without derived state", () => {
  const state = defaultState(); state.boxes = [{ ...box, position_hint: "stale" }];
  state.settings.auto_position = true;
  const saved = parseState(JSON.stringify(state));
  assert.equal(saved.boxes[0].position_hint, undefined);
  const previous = buildPrompt(saved);
  const moved = parseState(saved); moved.boxes[0].x1 = 700; moved.boxes[0].x2 = 896;
  assert.notEqual(buildPrompt(moved).natural, previous.natural);
  assert.notEqual(buildPrompt(moved).moss_json, previous.moss_json);
  assert.equal(JSON.stringify(saved), JSON.stringify(parseState(saved)));
});

test("fractional edges retain pixels and near integers follow round(9)", () => {
  assert.deepEqual(pixelBBox({ ...box, x1: 0, y1: 0, x2: 1.1, y2: 1.1 }, 896, 1184), [-592, -448, -590, -446]);
  assert.deepEqual(pixelBBox({ ...box, x1: 64 - 1e-10, y1: 64 - 1e-10, x2: 128 + 1e-10, y2: 128 + 1e-10 }, 896, 1184), [-528, -384, -464, -320]);
});

test("blank replacement and copy isolation", () => {
  const state = defaultState(); state.prompt = "previous"; state.boxes = [box];
  const other = parseState(JSON.stringify(state)); other.prompt = ""; other.boxes = [];
  assert.equal(state.prompt, "previous"); assert.equal(state.boxes.length, 1);
  assert.equal(buildPrompt(other).natural, "");
  assert.equal(JSON.parse(buildPrompt(other).moss_json).items.length, 0);
  assert.throws(() => parseState({ schema_version: "krea2" }));
});
