import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createCanvasHistory, nextOverlappingBox } from "../web/canvas_editing.mjs";

const canvasSnapshot = x => ({ width: 896, height: 1184, boxes: [{ id: "a", slot: "red", x1: x, y1: 40, x2: x + 100, y2: 240 }] });

test("Canvas undo/redo keeps independent snapshots and clears redo only on an edit", () => {
  const history = createCanvasHistory();
  const before = canvasSnapshot(40), after = canvasSnapshot(80);
  history.record(before, after);
  before.boxes[0].x1 = 900;
  assert.deepEqual(history.undo(after), canvasSnapshot(40));
  after.boxes[0].x1 = 700;
  assert.deepEqual(history.redo(canvasSnapshot(40)), canvasSnapshot(80));
  history.undo(canvasSnapshot(80));
  assert.equal(history.record(canvasSnapshot(40), { ...canvasSnapshot(40), selectedId: "a", activeSlot: "blue", drawMode: true }), false);
  assert.equal(history.canRedo, true);
  history.record(canvasSnapshot(40), canvasSnapshot(100));
  assert.equal(history.canRedo, false);
  assert.equal(history.redo(canvasSnapshot(100)), null);
});

test("Canvas history ignores derived box metadata but records size, reset and camera edits", () => {
  const history = createCanvasHistory();
  const before = canvasSnapshot(40), derived = structuredClone(before);
  Object.assign(derived.boxes[0], { nx1: 40 / 896, bbox: [40, 40, 140, 240], z: 0, position_hint: "left" });
  assert.equal(history.record(before, derived), false);
  for (const after of [{ ...before, width: 1024 }, { ...before, boxes: [] }, { ...before, camera: { iso: "200" } }]) {
    assert.equal(history.record(before, after), true);
    assert.deepEqual(history.undo(after), before);
  }
});

test("Canvas history is bounded, clears on restore and is isolated per node", () => {
  const first = createCanvasHistory(2), second = createCanvasHistory();
  for (let x = 0; x < 3; x++) first.record(canvasSnapshot(x), canvasSnapshot(x + 1));
  assert.deepEqual(first.undo(canvasSnapshot(3)), canvasSnapshot(2));
  assert.deepEqual(first.undo(canvasSnapshot(2)), canvasSnapshot(1));
  assert.equal(first.undo(canvasSnapshot(1)), null);
  assert.equal(second.canUndo, false);
  first.clear();
  assert.equal(first.canUndo, false);
  assert.equal(first.canRedo, false);
});

test("Alt selection cycles overlapping boxes without reordering or changing coordinates", () => {
  const boxes = ["red", "blue", "green"].map(id => ({ id, x1: 40, y1: 40, x2: 200, y2: 240 }));
  boxes.push({ id: "other", x1: 300, y1: 300, x2: 400, y2: 400 });
  const before = structuredClone(boxes), p = { x: 100, y: 100 };
  let id = null;
  for (const expected of ["green", "blue", "red", "green"]) {
    id = nextOverlappingBox(boxes, p, id)?.id;
    assert.equal(id, expected);
  }
  assert.equal(nextOverlappingBox(boxes, { x: 500, y: 500 }, id), null);
  assert.equal(nextOverlappingBox(boxes, { x: 350, y: 350 }, "other").id, "other");
  assert.equal(nextOverlappingBox([{ id: "reversed", x1: 200, y1: 240, x2: 40, y2: 40 }], p, null).id, "reversed");
  assert.deepEqual(boxes, before);
});

const source = await readFile(new URL("../web/moss_shared_ui.js", import.meta.url), "utf8");
let extension;
let installControls = () => {};
const app = { registerExtension(value) { extension = value; } };
new Function("app", "installControls", source.replace(/^import .*;\r?\n/gm, ""))(app, (...args) => installControls(...args));

test("install bundled controls without registering any Krea2 node", () => {
  class SharedCanvas {}
  class MossCanvas {}

  let creates = 0;
  SharedCanvas.prototype.onNodeCreated = function () {
    creates++;
    this.savedValues = this.__k2cfConfiguredWidgetValues.slice();
    this.onSerialize = data => { data.widgets_values = this.widgets.map(widget => widget.value); };
  };
  SharedCanvas.prototype.onConfigure = function (info) { this.widgets[0].value = info.widgets_values[0]; };
  installControls = type => {
    type.prototype.onNodeCreated = SharedCanvas.prototype.onNodeCreated;
    type.prototype.onConfigure = SharedCanvas.prototype.onConfigure;
  };
  extension.beforeRegisterNodeDef(MossCanvas, { name: "MOSSSharedCanvas" });
  const node = new MossCanvas();
  node.widgets = [{ name: "width", value: 896 }];
  node.onNodeCreated();
  assert.equal(creates, 1);
  assert.deepEqual(node.savedValues, [896]);
  node.onConfigure({ widgets_values: [1024] });
  const data = {};
  node.onSerialize(data);
  assert.deepEqual(data.widgets_values, [1024]);
});

test("keep Canvas and Prompter renderer state separate and leave unrelated nodes alone", () => {
  class SharedPrompt {}
  class MossPrompt {}
  class Unrelated {}

  extension.beforeRegisterNodeDef(Unrelated, { name: "CLIPTextEncode" });
  SharedPrompt.prototype.onNodeCreated = function () { this.promptValues = this.__k2cfConfiguredWidgetValues.slice(); };
  SharedPrompt.prototype.onConfigure = function (info) { this.widgets[0].value = info.widgets_values[0]; };
  installControls = type => {
    type.prototype.onNodeCreated = SharedPrompt.prototype.onNodeCreated;
    type.prototype.onConfigure = SharedPrompt.prototype.onConfigure;
  };
  extension.beforeRegisterNodeDef(MossPrompt, { name: "MOSSSharedPrompter" });
  const first = new MossPrompt();
  first.widgets = [{ name: "scene", value: "original" }];
  first.onNodeCreated();
  const second = new MossPrompt();
  second.widgets = [{ name: "scene", value: "other" }];
  second.onNodeCreated();
  first.onConfigure({ widgets_values: [""] });
  assert.equal(first.widgets[0].value, "");
  assert.equal(second.widgets[0].value, "other");
  assert.equal(Unrelated.prototype.onNodeCreated, undefined);
});

test("restore legacy obj as object while retaining character and immutable saved state", () => {
  class SharedPrompt {}
  class MossPrompt {}

  let configured;
  SharedPrompt.prototype.onNodeCreated = function () {};
  SharedPrompt.prototype.onConfigure = function (info) { configured = info; };
  installControls = type => {
    type.prototype.onNodeCreated = SharedPrompt.prototype.onNodeCreated;
    type.prototype.onConfigure = SharedPrompt.prototype.onConfigure;
  };
  extension.beforeRegisterNodeDef(MossPrompt, { name: "MOSSSharedPrompter" });
  const node = new MossPrompt();
  node.widgets = [{ name: "scene", value: "unchanged" }, { name: "red_type", value: "obj" },
                  { name: "blue_type", value: "character" }, { name: "yellow_type", value: "text" }];
  node.onNodeCreated();
  assert.deepEqual(node.widgets.map(widget => widget.value), ["unchanged", "object", "character", "text"]);
  const input = { widgets_values: ["scene", "obj", "character", "text"], properties: {
    k2cfPromptState: { widgets_values: ["scene", "obj", "character", "text"], saved_at: 10 },
  } };
  const before = structuredClone(input);
  node.onConfigure(input);
  assert.deepEqual(input, before);
  assert.deepEqual(configured.widgets_values, ["scene", "object", "character", "text"]);
  assert.deepEqual(configured.properties.k2cfPromptState.widgets_values, configured.widgets_values);
  assert.equal(configured.properties.k2cfPromptState.saved_at, 10);
});

test("restore widgets-only workflows before the shared renderer reads its creation snapshot", () => {
  class SharedPrompt {}
  class MossPrompt {}

  SharedPrompt.prototype.onNodeCreated = function () {
    this.properties.k2cfPromptState = { widgets_values: ["", "object"], saved_at: Date.now() };
  };
  SharedPrompt.prototype.onConfigure = function (info) {
    this.widgets.forEach((widget, i) => { widget.value = info.widgets_values[i]; });
    this.widgets.forEach((widget, i) => { widget.value = this.properties.k2cfPromptState.widgets_values[i]; });
  };
  installControls = type => {
    type.prototype.onNodeCreated = SharedPrompt.prototype.onNodeCreated;
    type.prototype.onConfigure = SharedPrompt.prototype.onConfigure;
  };
  extension.beforeRegisterNodeDef(MossPrompt, { name: "MOSSSharedPrompter" });
  const node = new MossPrompt();
  node.properties = {};
  node.widgets = [{ name: "scene", value: "" }, { name: "red_type", value: "object" }];
  node.onNodeCreated();
  const input = { widgets_values: ["Cafe 日本語", "character"], properties: {} };
  const before = structuredClone(input);
  node.onConfigure(input);
  assert.deepEqual(node.widgets.map(widget => widget.value), input.widgets_values);
  assert.deepEqual(input, before);
  node.onConfigure({ widgets_values: ["", "text"], properties: {} });
  assert.deepEqual(node.widgets.map(widget => widget.value), ["", "text"]);
});
