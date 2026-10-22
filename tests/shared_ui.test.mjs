import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createCanvasHistory, nextOverlappingBox, snapBoxToGuides } from "../web/canvas_editing.mjs";
import { HELP, helpText, setHelpLocaleReader, widgetHelpKey } from "../web/help.mjs";

test("All help entries have Japanese and English text; unsupported locales fall back to English", () => {
  for (const [key, pair] of Object.entries(HELP)) {
    assert.equal(pair.length, 2, key);
    assert.match(helpText(key, "ja-JP"), /[ぁ-んァ-ヶ一-龠]/, key);
    assert.equal(helpText(key, "fr"), pair[0], key);
    assert.equal(helpText(key, "en"), pair[0], key);
  }
  assert.match(helpText("auto_position_hint", "en"), /Does not move boxes/);
  assert.match(helpText("preview_empty", "ja"), /framing_data/);
});

test("Native MOSS tooltips follow Comfy.Locale without changing values, hooks or unrelated nodes", async () => {
  let extension, locale = "ja", calls = 0;
  const app = {ui:{settings:{getSettingValue:key=>{assert.equal(key,"Comfy.Locale");return locale;}}},
    registerExtension:value=>{extension=value;}};
  const source = await readFile(new URL("../web/moss_help.js", import.meta.url), "utf8");
  new Function("app", "helpText", "setHelpLocaleReader", "widgetHelpKey", source.replace(/^import .*;\r?\n/gm,""))
    (app,helpText,setHelpLocaleReader,widgetHelpKey);
  class Node { onNodeCreated() {calls++;return 42;} }
  const def = {name:"MOSSFromKrea2",input:{required:{auto_position_hint:["BOOLEAN",{default:false}],prompt_ui_data:["KREA2_ELEMENT_PROMPT_DATA"]}},output_name:["prompt","width","height","moss_json"]};
  extension.beforeRegisterNodeDef(Node,def);
  const node = new Node();
  node.widgets = [{name:"auto_position_hint",value:false}, {name:"text_style",value:"keep 日本語"}];
  const values=node.widgets.map(w=>w.value);
  assert.equal(node.onNodeCreated(),42);assert.equal(calls,1);
  assert.match(node.widgets[0].tooltip,/自動配置/);
  assert.match(def.input.required.prompt_ui_data[1].tooltip,/接続/);
  locale="en";
  assert.match(node.widgets[0].tooltip,/Does not move boxes/);
  assert.match(def.input.required.auto_position_hint[1].tooltip,/Does not move boxes/);
  assert.deepEqual(node.widgets.map(w=>w.value),values);
  class Other {}
  extension.beforeRegisterNodeDef(Other,{name:"Krea2ElementFramingV1Canvas"});
  assert.equal(Other.prototype.onNodeCreated,undefined);
  setHelpLocaleReader(()=>"en");
});

const canvasSnapshot = x => ({ width: 896, height: 1184, boxes: [{ id: "a", slot: "red", x1: x, y1: 40, x2: x + 100, y2: 240 }] });

const guideOptions = {
  width: 600, height: 900,
  bounds: { minX: 10, minY: 10, maxX: 590, maxY: 890 },
  toleranceX: 6, toleranceY: 6,
};

test("Guide movement chooses the nearest box edge or center on each axis and preserves size", () => {
  for (const [box, expected] of [
    [{ x1: 196, y1: 446, x2: 276, y2: 526 }, [200, 450, 280, 530]],
    [{ x1: 257, y1: 560, x2: 337, y2: 640 }, [260, 560, 340, 640]],
    [{ x1: 114, y1: 214, x2: 194, y2: 294 }, [120, 220, 200, 300]],
  ]) {
    const snapped = snapBoxToGuides(box, guideOptions);
    assert.deepEqual([snapped.x1, snapped.y1, snapped.x2, snapped.y2], expected);
    assert.equal(snapped.x2 - snapped.x1, box.x2 - box.x1);
    assert.equal(snapped.y2 - snapped.y1, box.y2 - box.y1);
  }
});

test("Thirds retain fractional canvas coordinates with separate X and Y tolerances", () => {
  const x = 896 / 3, y = 1184 * 2 / 3;
  const box = { x1: x - 2.25, y1: y + 3, x2: x + 97.75, y2: y + 63 };
  const snapped = snapBoxToGuides(box, {
    width: 896, height: 1184,
    bounds: { minX: 28, minY: 28, maxX: 868, maxY: 1156 },
    toleranceX: 2.5, toleranceY: 2.5,
  });
  assert(Math.abs(snapped.x1 - x) < 1e-9);
  assert(Math.abs(snapped.x2 - (x + 100)) < 1e-9);
  assert.equal(snapped.y1, box.y1);
  assert.equal(snapped.y2, box.y2);
});

test("Each resize corner snaps only its two moving edges", () => {
  const box = { x1: 198, y1: 448, x2: 402, y2: 602 };
  for (const [handle, expected] of [
    ["nw", [200, 450, 402, 602]],
    ["ne", [198, 450, 400, 602]],
    ["sw", [200, 448, 402, 600]],
    ["se", [198, 448, 400, 600]],
  ]) {
    const snapped = snapBoxToGuides(box, { ...guideOptions, handle });
    assert.deepEqual([snapped.x1, snapped.y1, snapped.x2, snapped.y2], expected);
  }
});

test("Guide snapping rejects distant or out-of-bounds movement and zero-size resize", () => {
  const distant = { x1: 60, y1: 80, x2: 100, y2: 100 };
  assert.deepEqual(snapBoxToGuides(distant, guideOptions), distant);
  const bounded = { x1: 195, y1: 380, x2: 590, y2: 570 };
  assert.deepEqual(snapBoxToGuides(bounded, { ...guideOptions, toleranceX: 10 }), bounded);
  const narrow = { x1: 200, y1: 480, x2: 203, y2: 600 };
  assert.deepEqual(snapBoxToGuides(narrow, { ...guideOptions, handle: "ne" }), narrow);
});

test("Guide snapping copies coordinates without changing input or metadata", () => {
  const box = { id: "red-1", slot: "red", label: "Character", extra: { text: "keep" },
    x1: 196, y1: 446, x2: 276, y2: 526 };
  const original = structuredClone(box);
  const snapped = snapBoxToGuides(box, guideOptions);
  assert.notEqual(snapped, box);
  assert.deepEqual(box, original);
  assert.deepEqual({ ...snapped, x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2 }, original);
});

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

const controlsSource = await readFile(new URL("../web/moss_controls.mjs", import.meta.url), "utf8");
function canvasLayoutHarness(raw, previousRaw = raw) {
  const app = { graph: { _nodes: [] },
    graphToPrompt() { return this.graph._nodes.map(node => node.widgets.find(w => w.name === "layout_data").value); },
    queuePrompt() { return this.graphToPrompt(); } };
  const window = { comfyAPI: { app: { app } } };
  const helpers = new Function("app", "window", "createCanvasHistory", "nextOverlappingBox",
    controlsSource.replace(/^import .*;\r?\n/gm, "").replace(/^export .*;\s*$/m, "") +
    "\nreturn { CANVAS_WIDGETS, k2cfParseCanvasLayout, k2cfIsDefaultValue, k2cfMergeWithPrevious, k2cfBestSavedState, applyConfiguredValuesToWidgets, k2cfWriteLocalState, installNodePersistenceHooks };")
    (app, window, createCanvasHistory, nextOverlappingBox);
  const values = [896, 1184, "Custom", raw, "{}", "Thirds", "English", '{"sets":[],"selected":""}', '{"sets":[],"selected":""}'];
  const widgets = Object.fromEntries(helpers.CANVAS_WIDGETS.map((name, i) => [name, { name, value: values[i] }]));
  const previous = values.slice(); previous[3] = previousRaw;
  const node = { type: "MOSSSharedCanvas", widgets: Object.values(widgets), size: [830, 980],
    properties: { k2cfCanvasState: { widgets_values: previous, saved_at: 1 } } };
  app.graph._nodes.push(node);
  const state = { boxes: [], activeSlot: "red", hideBoxes: false, drawMode: false, layoutError: null };
  // Execute the renderer's actual restore/sync functions with no DOM or service.
  const functions = ["setWidget", "sync", "restoreCanvasLayout"].map(name => {
    const start = controlsSource.indexOf(`  function ${name}(`);
    assert(start >= 0, name);
    const end = controlsSource.indexOf("\n  }", start);
    return controlsSource.slice(start, end + 4);
  }).join("\n");
  const bindings = { ...helpers, app, node, widgets, state, controls: {},
    externalPreviewSize: { width: null, height: null }, localStorage: { setItem() {} },
    CANVAS_GRID_KEY: "grid", CANVAS_LANGUAGE_KEY: "language" };
  const actions = new Function(...Object.keys(bindings),
    `let isHydrating = false, historyState = null;\n${functions}\nreturn { sync, restoreCanvasLayout };`)
    (...Object.values(bindings));
  helpers.installNodePersistenceHooks(node, actions.sync, helpers.CANVAS_WIDGETS, "k2cfCanvas");
  const save = () => { const data = { properties: structuredClone(node.properties) }; node.onSerialize(data); return data; };
  return { ...helpers, ...actions, app, node, widgets, state, save };
}

const brokenLayouts = ['{"boxes": [', "[]", "null", '{"boxes":null}', ' \n {"boxes": [ '];

test("Canvas layout parsing distinguishes intentional empty layouts from corrupt JSON and shape", () => {
  const { k2cfParseCanvasLayout: parse } = canvasLayoutHarness("");
  for (const raw of ["", " ", "{}", '{"boxes":[]}']) assert.deepEqual(parse(raw).boxes || [], []);
  const data = { boxes: [{ id: "one", slot: "red", x1: 10, y1: 20, x2: 30, y2: 40 }] };
  assert.deepEqual(parse(JSON.stringify(data)), data);
  for (const raw of [...brokenLayouts, "false", "3", '"text"', '{"boxes":{}}']) assert.throws(() => parse(raw));
});

test("Corrupt nonempty Canvas values are not defaults and survive saved-state merging", () => {
  const { k2cfIsDefaultValue: isDefault, k2cfMergeWithPrevious: merge } = canvasLayoutHarness("");
  const previous = JSON.stringify({ boxes: [{ id: "old" }] });
  for (const raw of brokenLayouts) {
    assert.equal(isDefault("layout_data", raw), false);
    assert.deepEqual(merge(["layout_data"], [raw], [previous]), [raw]);
  }
  for (const raw of ["", " ", "{}", '{"boxes":[]}']) assert.equal(isDefault("layout_data", raw), true);
});

test("Canvas restore, implicit sync, serialization and prompt preparation preserve corrupt originals", () => {
  for (const raw of brokenLayouts) {
    const h = canvasLayoutHarness(raw, JSON.stringify({ boxes: [{ id: "old" }] }));
    h.restoreCanvasLayout();
    assert.equal(h.state.layoutError.raw, raw);
    assert(h.state.layoutError.message);
    assert.deepEqual(h.state.boxes, []);
    h.state.activeSlot = "blue"; h.state.hideBoxes = true;
    for (const allowOverwrite of [true, false]) {
      h.sync(allowOverwrite);
      assert.equal(h.widgets.layout_data.value, raw);
      assert.equal(h.node.widgets_values[3], raw);
      assert.equal(h.node.properties.k2cfCanvasState.widgets_values[3], raw);
    }
    const before = structuredClone(h.node.properties), saved = h.save();
    assert.equal(saved.widgets_values[3], raw);
    assert.equal(saved.properties.k2cfCanvasState.widgets_values[3], raw);
    assert.deepEqual(h.node.properties, before);
    assert.deepEqual(h.app.graphToPrompt(), [raw]);
    assert.deepEqual(h.app.queuePrompt(), [raw]);
    assert.equal(h.widgets.layout_data.value, raw);
  }
});

test("Reloading a valid Canvas clears the error and resumes ordinary synchronization", () => {
  for (const valid of ["", " \n ", "{}", '{"boxes":[]}', JSON.stringify({ boxes: [{ id: "new", slot: "red", x1: 10, y1: 20, x2: 30, y2: 40 }] })]) {
    const h = canvasLayoutHarness(brokenLayouts[0]);
    h.restoreCanvasLayout(); h.sync(false);
    h.widgets.layout_data.value = valid;
    h.restoreCanvasLayout();
    assert.equal(h.state.layoutError, null);
    h.sync();
    assert.deepEqual(JSON.parse(h.save().widgets_values[3]).boxes, h.state.boxes);
  }
});
