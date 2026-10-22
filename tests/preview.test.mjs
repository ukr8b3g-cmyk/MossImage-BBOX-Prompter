import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { previewPreferences } from "../web/preview_ui.mjs";

test("Preview overrides ComfyUI's default zoom hiding without serializing the DOM widget", async () => {
  let extension;
  const source = await readFile(new URL("../web/moss_preview.js", import.meta.url), "utf8");
  new Function("app", "api", "mountPreview", source.replace(/^import .*;\r?\n/gm, ""))(
    {registerExtension(value) {extension = value;}}, {}, () => ({element:{}}));
  class Node {
    addDOMWidget(name, type, element, options) {
      this.options = {hideOnZoom:true, ...options}; // Installed ComfyUI default.
    }
    setSize() {}
  }
  extension.beforeRegisterNodeDef(Node, {name:"MOSSBBoxPreview"});
  const node = new Node();
  node.onNodeCreated();
  assert.equal(node.options.hideOnZoom, false);
  assert.equal(node.options.serialize, false);
});

test("Preview defaults and persisted OFF/zero opacity", () => {
  assert.deepEqual(previewPreferences(), {showBoxes:true, opacity:0.8});
  const saved = {showBoxes:false, opacity:0, extra:"keep"};
  assert.deepEqual(previewPreferences(saved), {showBoxes:false, opacity:0});
  assert.equal(saved.extra, "keep");
});

test("Preview preferences clamp opacity and tolerate missing/corrupt saved UI values", () => {
  for (const value of [null, {}, {opacity:NaN}, {opacity:"0.5"}])
    assert.equal(previewPreferences(value).opacity, 0.8);
  assert.equal(previewPreferences({opacity:10}).opacity, 1);
  assert.equal(previewPreferences({opacity:-1}).opacity, 0);
});
