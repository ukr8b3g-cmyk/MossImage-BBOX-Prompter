import assert from "node:assert/strict";
import test from "node:test";
import { previewPreferences } from "../web/preview_ui.mjs";

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
