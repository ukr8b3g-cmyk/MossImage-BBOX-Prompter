// Isolated Chromium fixture, never connects to a running ComfyUI or submits a queue.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, extname, relative } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const artifacts = process.env.MOSS_TEST_ARTIFACTS || resolve(root, "tests/artifacts");
await mkdir(artifacts, { recursive: true });
const moduleName = process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright";
const { chromium } = await import(moduleName);
const fixture = `<!DOCTYPE html><html><meta charset="utf-8"><title>MOSS isolated test</title>
<style>body{background:#111721;color:white;font:14px system-ui;margin:20px} .host{width:800px;height:1000px;margin-bottom:20px}</style>
<h2>MOSS BBOX — isolated DOM fixture (not ComfyUI)</h2><div id="nodes"></div>
<script type="module">
import {defaultState} from '/web/state.mjs';
await import('/web/moss_bbox.js');
class MockNodeBase {
  constructor(value=JSON.stringify(defaultState())) {
    this.widgets=[{name:'moss_state',value,options:{}}];
    this.host=document.createElement('div');this.host.className='host';document.querySelector('#nodes').append(this.host);
    this.undoStack=[];this.redoStack=[];
    // Current ComfyUI records the canvas events, not the legacy graph callbacks.
    const canvas={emitBeforeChange:()=>{this.before=this.widgets[0].value},emitAfterChange:()=>{
      if(this.before!==this.widgets[0].value){this.undoStack.push(this.before);this.redoStack=[]}this.before=undefined}};
    this.graph={beforeChange(){},afterChange(){},canvasAction:callback=>callback(canvas)};
    this.onNodeCreated();
  }
  addDOMWidget(name,type,element,options){this.host.append(element);this.widgets.push({name,type,options,serializeValue:()=>undefined})}
  setSize(size){this.size=size}
  setDirtyCanvas(){}
  save(){const data={};this.onSerialize(data);return JSON.parse(JSON.stringify(data))}
  undo(){if(!this.undoStack.length)return;this.redoStack.push(this.widgets[0].value);this.onConfigure({widgets_values:[this.undoStack.pop()]})}
  redo(){if(!this.redoStack.length)return;this.undoStack.push(this.widgets[0].value);this.onConfigure({widgets_values:[this.redoStack.pop()]})}
}
class MockNode extends MockNodeBase {}
class CanvasNode extends MockNodeBase {}
class PromptNode extends MockNodeBase {}
window.registered.beforeRegisterNodeDef(MockNode,{name:'MOSSBBoxCanvasPrompt'});
window.registered.beforeRegisterNodeDef(CanvasNode,{name:'MOSSBBoxCanvas'});
window.registered.beforeRegisterNodeDef(PromptNode,{name:'MOSSBBoxPrompter'});
window.makeMoss=(value)=>new MockNode(value);window.node=window.makeMoss();window.ready=true;
window.makeSplit=()=>{
  window.node.host.hidden=true;
  const state=JSON.parse(window.node.widgets[0].value);
  window.canvasNode=new CanvasNode(JSON.stringify({...state,prompt:'',slots:defaultState().slots}));
  window.promptNode=new PromptNode(JSON.stringify({...state,boxes:[]}));
  canvasNode.id=10;promptNode.id=11;
  canvasNode.outputs=[{type:'MOSS_BBOX_LAYOUT',links:[1]}];promptNode.inputs=[{name:'canvas_data',link:1}];
  for(const node of [canvasNode,promptNode]){
    node.graph.links=new Map([[1,{origin_id:10,target_id:11}]]);
    node.graph.getNodeById=id=>id===10?canvasNode:id===11?promptNode:null;
  }
  canvasNode.host.style.cssText='width:640px;height:1150px;display:inline-block;vertical-align:top;margin-right:20px';
  promptNode.host.style.cssText='width:470px;height:1150px;display:inline-block;vertical-align:top';
  promptNode.onConnectionsChange();
};
</script></html>`;
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/") { res.setHeader("Content-Type", "text/html"); res.end(fixture); return; }
    if (pathname === "/scripts/app.js") { res.setHeader("Content-Type", "text/javascript"); res.end("export const app={registerExtension:extension=>{window.registered=extension}};"); return; }
    const path = resolve(root, "." + decodeURIComponent(pathname));
    if (relative(root, path).startsWith("..")) { res.writeHead(403); res.end(); return; }
    res.setHeader("Content-Type", [".js", ".mjs"].includes(extname(path)) ? "text/javascript" : "application/json");
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
console.log(JSON.stringify({fixture_pid:process.pid,port:server.address().port,launch:"node tests/browser_smoke.mjs",gpu:false}));
let browser;
const checks = [];
try {
  browser = await chromium.launch({ headless: true, args:["--disable-gpu"], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1500 } });
  const errors = [];
  page.on("pageerror", err => errors.push(err.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => window.ready);
  const editor = page.locator(".moss-bbox").first();
  assert.equal(await editor.getByLabel("Width", { exact: true }).inputValue(), "896");
  assert.equal(await editor.getByLabel("Height", { exact: true }).inputValue(), "1184");
  await editor.getByLabel("Whole image prompt (original text)").fill('原文保持 "quotes" \\ {a|b}\nCafe 😀');
  await editor.getByLabel("red description (shared)", { exact: true }).fill("red original 左側");
  const source = async () => page.evaluate(() => JSON.parse(window.node.widgets[0].value));
  assert.equal((await source()).prompt, '原文保持 "quotes" \\ {a|b}\nCafe 😀');
  checks.push("input updates source before blur; Unicode/quotes/backslash/dynamic prompt braces kept");

  const canvas = editor.locator("canvas");
  async function drag(x0, y0, x1, y1, finish = true) {
    await canvas.scrollIntoViewIfNeeded();
    const rect = await canvas.boundingBox();
    await page.mouse.move(rect.x + rect.width * x0, rect.y + rect.height * y0); await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * x1, rect.y + rect.height * y1, { steps: 4 });
    if (finish) await page.mouse.up();
  }
  await drag(.1, .2, .4, .7, false);
  assert.equal((await source()).boxes.length, 1);
  assert.equal(await page.evaluate(() => JSON.parse(window.node.widgets[0].serializeValue()).boxes.length), 1);
  await page.mouse.up();
  await editor.getByRole("button", { name: "Draw new box", exact: true }).click();
  await drag(.6, .3, .85, .8);
  assert.equal((await source()).boxes.length, 2);
  assert.equal((await source()).boxes[0].slot, "red");
  assert.equal((await source()).boxes[1].slot, "red");
  checks.push("draw two shared-color boxes; queue serialization reads live drawing value");

  // Move the topmost second box and check latest API serialization while still dragging.
  const beforeMove = (await source()).boxes[1];
  await drag(.7, .5, .65, .45, false);
  const live = await page.evaluate(() => JSON.parse(window.node.widgets[0].serializeValue()).boxes[1]);
  assert.ok(live.x1 < beforeMove.x1);
  await page.mouse.up();
  checks.push("move updates source and API serialization during pointer gesture");

  for (const corner of ["nw", "ne", "sw", "se"]) {
    const current = (await source()).boxes[1];
    const x = corner.includes("w") ? current.x1 : current.x2, y = corner.includes("n") ? current.y1 : current.y2;
    await drag(x / 896, y / 1184, x / 896 + .01, y / 1184 + .01);
    const after = (await source()).boxes[1];
    assert.ok(after[corner.includes("w") ? "x1" : "x2"] > x);
    assert.ok(after[corner.includes("n") ? "y1" : "y2"] > y);
  }
  checks.push("all four corners resize with real browser pointer events");

  await editor.getByLabel("Selected box type", { exact: true }).selectOption("text");
  await editor.getByLabel("Text to render (separate from description)", { exact: true }).fill('描画 "MOSS Café"');
  let output = await editor.getByLabel("Final output", { exact: true }).inputValue();
  assert.ok(output.includes('Text to render:\n描画 "MOSS Café"'));
  assert.ok(output.includes('"text":"描画 \\"MOSS Café\\""'.replaceAll('\\\\', '\\')));
  checks.push("per-box text type and rendered string remain separate from shared caption");

  const saved = await page.evaluate(() => window.node.save());
  const beforeSerialize = await page.evaluate(() => window.node.widgets[0].value);
  await page.evaluate(() => window.node.save());
  assert.equal(await page.evaluate(() => window.node.widgets[0].value), beforeSerialize);
  await page.evaluate(saved => window.node.onConfigure(saved), saved);
  assert.equal(await editor.getByLabel("Final output", { exact: true }).inputValue(), output);
  const copyValue = saved.widgets_values[0];
  await page.evaluate(copyValue => { window.other = window.makeMoss(copyValue); window.node.host.hidden = true; }, copyValue);
  await page.locator(".moss-bbox").nth(1).getByLabel("red description (shared)", { exact: true }).fill("other tab only");
  await page.evaluate(() => { window.other.host.hidden = true; window.node.host.hidden = false; });
  assert.equal(await editor.getByLabel("red description (shared)", { exact: true }).inputValue(), "red original 左側");
  checks.push("save is read-only; configure reload; duplicate and simulated tab isolation");

  await editor.getByLabel("Width", { exact: true }).fill("1792");
  await editor.getByLabel("Height", { exact: true }).fill("592");
  const oldBox = (await source()).boxes[0];
  await editor.getByRole("button", { name: "Apply resolution", exact: true }).click();
  assert.equal((await source()).width, 1792); assert.equal((await source()).height, 592);
  assert.equal((await source()).boxes[0].x1, oldBox.x1 * 2);
  assert.equal((await source()).boxes[0].y1, oldBox.y1 / 2);
  await page.evaluate(() => window.node.undo());
  assert.equal((await source()).width, 896);
  await page.evaluate(() => window.node.redo());
  assert.equal((await source()).width, 1792);
  checks.push("resolution rescales pixels; graph transaction undo/redo with mock graph");

  await editor.getByLabel("Whole image prompt (original text)").fill("");
  await page.evaluate(() => window.node.onConfigure(window.node.save()));
  assert.equal(await editor.getByLabel("Whole image prompt (original text)").inputValue(), "");
  await editor.getByRole("button", { name: "Delete selected", exact: true }).click();
  assert.equal((await source()).boxes.length, 1);
  await page.evaluate(() => window.node.undo());
  assert.equal((await source()).boxes.length, 2);
  const fileChooser = page.waitForEvent("filechooser");
  await editor.getByRole("button", { name: "Import MOSS state", exact: true }).click();
  await (await fileChooser).setFiles({ name: "state.json", mimeType: "application/json", buffer: Buffer.from(copyValue) });
  await page.waitForFunction(value => window.node.widgets[0].value === value, copyValue);
  assert.equal((await source()).width, 896);
  checks.push("intentional blank survives reload; delete/undo; state JSON import recomputes output");

  await editor.getByLabel("Width", { exact: true }).fill("897");
  await editor.getByRole("button", { name: "Apply resolution", exact: true }).click();
  assert.equal((await source()).width, 896);
  assert.ok((await editor.locator(".moss-error").textContent()).includes("multiple of 16"));
  await page.evaluate(value => window.node.onConfigure({ widgets_values: [value] }), copyValue);
  checks.push("invalid latent resolution leaves saved state intact");

  await editor.getByRole("button", { name: "Draw new box", exact: true }).click();
  await drag(.05, .05, .15, .15, false);
  await page.evaluate(value => window.node.onConfigure({ widgets_values: [value] }), copyValue);
  await page.mouse.up();
  assert.equal(await page.evaluate(() => window.node.widgets[0].value), copyValue);
  checks.push("configure during a drag drops the old gesture without overwriting restored state");

  // Copy uses the current value even when the browser denies clipboard access.
  await editor.getByRole("button", { name: "Copy full output", exact: true }).click();
  await editor.evaluate(el => { el.scrollTop = 0; el.style.height = "auto"; el.style.overflow = "visible"; el.parentElement.style.height = "auto"; });
  await page.screenshot({ path: resolve(artifacts, "isolated-editor.jpg"), type: "jpeg", quality: 80, fullPage: true });
  await page.evaluate(() => { window.other.onRemoved(); window.other.host.remove(); });
  assert.equal(await page.locator(".moss-bbox").count(), 1);
  assert.deepEqual(errors, []);
  checks.push("copy action, screenshot, cleanup and zero browser errors");
  await page.evaluate(() => window.makeSplit());
  const canvasEditor = page.getByLabel("MOSS BBOX Canvas", { exact: true });
  const promptEditor = page.getByLabel("MOSS BBOX Prompter", { exact: true });
  assert.equal(await canvasEditor.getByLabel("Whole image prompt (original text)").count(), 0);
  assert.equal(await promptEditor.locator("canvas").count(), 0);
  assert.equal(await promptEditor.getByLabel("Canvas connection").textContent(), "Canvas connected · 896 × 1184 · 2 boxes");
  await promptEditor.getByLabel("red description (shared)", { exact: true }).fill("Split prompt caption 左側");
  assert.equal(await page.evaluate(() => JSON.parse(window.canvasNode.widgets[0].value).slots.red), "");
  assert.ok((await promptEditor.getByLabel("Final output", { exact: true }).inputValue()).includes("Split prompt caption 左側"));
  const beforeScale = await promptEditor.getByLabel("Final output", { exact: true }).inputValue();
  await canvasEditor.getByLabel("Width", { exact: true }).fill("1184");
  await canvasEditor.getByLabel("Height", { exact: true }).fill("896");
  await canvasEditor.getByRole("button", { name: "Apply resolution", exact: true }).click();
  assert.equal(await promptEditor.getByLabel("Canvas connection").textContent(), "Canvas connected · 1184 × 896 · 2 boxes");
  assert.notEqual(await promptEditor.getByLabel("Final output", { exact: true }).inputValue(), beforeScale);
  await page.evaluate(() => window.canvasNode.undo());
  assert.equal(await promptEditor.getByLabel("Final output", { exact: true }).inputValue(), beforeScale);
  checks.push("split Canvas and Prompter own separate state; connected previews follow size changes and Undo");
  await promptEditor.locator(".moss-slot").filter({ hasText: "GREEN" }).locator("summary").click();
  await promptEditor.getByLabel("green description (shared)", { exact: true }).fill("temporary green");
  await promptEditor.getByLabel("green description (shared)", { exact: true }).fill("");
  const splitSaved = await page.evaluate(() => ({ canvas: canvasNode.save(), prompt: promptNode.save() }));
  await page.evaluate(saved => {canvasNode.onConfigure(saved.canvas);promptNode.onConfigure(saved.prompt)}, splitSaved);
  assert.equal(await promptEditor.getByLabel("green description (shared)", { exact: true }).inputValue(), "");
  await canvasEditor.getByLabel("Grid", { exact: true }).selectOption("Quarters");
  await canvasEditor.getByRole("button", { name: "Show Boxes", exact: true }).click();
  assert.equal(await page.evaluate(() => canvasNode.properties.mossBBoxView.showBoxes), false);
  await canvasEditor.getByRole("button", { name: "Show Boxes", exact: true }).click();
  await canvasEditor.getByLabel("Grid", { exact: true }).selectOption("Thirds");
  await page.screenshot({ path: resolve(artifacts, "split-editor.jpg"), type: "jpeg", quality: 85, fullPage: true });
  assert.deepEqual(errors, []);
  assert.equal(await promptEditor.locator('details.moss-slot').count(),7);
  checks.push("seven collapsible prompt cards, blank restore, grid/show controls and split UI screenshot");
  console.log(JSON.stringify({ passed: true, checks, note: "Isolated DOM fixture; actual ComfyUI LiteGraph/Vue, tab manager, queue and image drag/drop not exercised." }, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  console.log(JSON.stringify({fixture_stopped:true,http_listening:server.listening}));
}
