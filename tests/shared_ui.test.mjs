import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
