// Bundled standalone Canvas renderer in a CPU-only fixture; never contacts ComfyUI.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const artifacts = process.env.MOSS_TEST_ARTIFACTS || resolve(root, "tests/artifacts");
await mkdir(artifacts, { recursive: true });
const moduleName = process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright";
const { chromium } = await import(moduleName);
const fixture = `<!DOCTYPE html><meta charset="utf-8"><title>MOSS compact Canvas fixture</title>
<style>body{background:#111;color:#ddd;font:14px sans-serif;margin:16px}#nodes{display:flex;gap:24px;align-items:start}.host{width:830px;height:980px;flex:none}.host h3{margin:0 0 8px}</style>
<h2>Bundled standalone Canvas renderer — isolated CPU comparison</h2><canvas id="graph-canvas" hidden></canvas><main id="nodes"></main>
<script type="module">
const extensions=[];
const graph={_nodes:[],extra:{},links:new Map(),getNodeById(id){return this._nodes.find(n=>n.id===id)},setDirtyCanvas(){}};
const app={graph,rootGraph:graph,canvas:{canvas:document.querySelector('#graph-canvas'),ds:{scale:1}},registerExtension(e){extensions.push(e)},queuePrompt(){},graphToPrompt(){}};
window.comfyAPI={app:{app}};
// ComfyUI registers this capture-phase shortcut observer before custom nodes.
window.graphHistoryKeys=0;
window.addEventListener('keydown',event=>{
  const el=document.activeElement;
  if(el?.tagName==='INPUT'||el?.tagName==='TEXTAREA'||el?.isContentEditable)return;
  if((event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase()))
    requestAnimationFrame(()=>window.graphHistoryKeys++);
},true);
${process.env.KREA2_UI_SOURCE ? "await import('/external-krea.js');" : ""}
await import('/web/moss_shared_ui.js');const {installControls}=await import('/web/moss_controls.mjs');
const legacyPresetKey='krea2_element_framing_v1_custom_latent_presets';
window.legacyPresets=JSON.stringify([{label:'User:832x1216',width:832,height:1216}]);
localStorage.setItem(legacyPresetKey,window.legacyPresets);
const names=['width','height','preset','layout_data','camera_data','grid_mode','ui_language','camera_set_data','canvas_preset_data'];
const defaults=[896,1184,'Custom',JSON.stringify({boxes:[{id:'one',slot:'red',x1:64,y1:240,x2:520,y2:1120}],activeSlot:'red',hideBoxes:false,drawMode:false}), '{}','Thirds','English','{"sets":[],"selected":""}','{"sets":[],"selected":""}'];
let sequence=0;
class Node{
 constructor(kind){this.type=kind;this.comfyClass=kind;this.id=++sequence;this.graph=graph;this.properties={};this.size=[830,980];this.inputs=[];
 this.widgets=names.map((name,i)=>({name,value:defaults[i],options:{}}));this.host=document.createElement('section');this.host.className='host';
 document.querySelector('#nodes').append(this.host);graph._nodes.push(this);this.onNodeCreated();}
 addDOMWidget(name,type,element,options){this.host.append(element);const widget={name,type,element,options};this.widgets.push(widget);return widget}
 setSize(size){this.size=Array.from(size)}computeSize(){return this.size}setDirtyCanvas(){}
 configure(info){this.properties=structuredClone(info.properties||{});info.widgets_values?.forEach((value,i)=>{if(this.widgets[i])this.widgets[i].value=value});this.onConfigure(info)}
 save(){const data={widgets_values:this.widgets.slice(0,names.length).map(w=>w.value),properties:structuredClone(this.properties),size:this.size.slice()};this.onSerialize?.(data);return data}
}
class Shared extends Node{constructor(){super('MOSSSharedCanvas')}}
class Moss extends Node{constructor(){super('MOSSSharedCanvas')}}
installControls(Shared,{name:'MOSSSharedCanvas'});
for(const e of extensions)await e.beforeRegisterNodeDef?.(Moss,{name:'MOSSSharedCanvas'});
window.original=new Shared();window.moss=new Moss();window.makeCopy=data=>{const node=new Moss();node.configure(data);return node};
window.makeEditNode=()=>window.makeCopy({widgets_values:defaults.slice(),properties:{}});
window.makeExternal=()=>{
 class External extends Node{constructor(){super('Krea2ElementFramingV1Canvas')}}
 for(const e of extensions)e.beforeRegisterNodeDef?.(External,{name:'Krea2ElementFramingV1Canvas'});
 window.external=new External();return true;
};
window.ready=true;
</script>`;
const server = createServer(async (request, response) => {
  try {
    let content;
    if (request.url === "/") content = fixture;
    else if (request.url === "/external-krea.js" && process.env.KREA2_UI_SOURCE) content = await readFile(process.env.KREA2_UI_SOURCE);
    else if (request.url === "/web/moss_controls.mjs") content = await readFile(resolve(root, "web/moss_controls.mjs"));
    else if (request.url === "/web/canvas_editing.mjs") content = await readFile(resolve(root, "web/canvas_editing.mjs"));
    else if (request.url === "/web/moss_shared_ui.js") content = await readFile(resolve(root, "web/moss_shared_ui.js"));
    else if (request.url === "/scripts/app.js") content = "export const app=window.comfyAPI.app.app;";
    else { response.writeHead(404); response.end(); return; }
    response.setHeader("Content-Type", request.url === "/" ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8");
    response.end(content);
  } catch (error) { response.writeHead(500); response.end(String(error)); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
console.log(JSON.stringify({fixture_pid:process.pid,port:server.address().port,launch:"node tests/canvas_ui_browser.mjs",gpu:false}));
let browser;
try {
  browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:["--disable-gpu"]});
  const page = await browser.newPage({viewport:{width:1740,height:1120}});
  page.setDefaultTimeout(15000);
  const errors=[];page.on("pageerror", error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>window.ready);
  const metrics=()=>page.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
    const footer=window.moss.host.querySelector('.moss-k2cf-panels');
    return {oldHeight:window.original.host.querySelector('.moss-k2cf-panels').getBoundingClientRect().height,
      height:footer.getBoundingClientRect().height,panels:[...footer.children].map(box),
      controls:[footer.querySelector('.moss-size-preset select'),...footer.querySelectorAll('.moss-size-dimensions input')].map(box),
      overflow:[...footer.querySelectorAll('.moss-k2cf-panel')].some(e=>e.scrollWidth>e.clientWidth+1)};
  });
  const initial=await metrics();
  assert.equal(await page.locator('.host').nth(1).locator('option[value="User:832x1216"]').count(),1);
  assert.equal(initial.panels.length,3);
  assert(initial.height<=initial.oldHeight*.75,JSON.stringify(initial));
  assert(initial.panels.every(p=>Math.abs(p.height-initial.panels[0].height)<1&&Math.abs(p.y-initial.panels[0].y)<1));
  assert(initial.controls.every(p=>Math.abs(p.y-initial.controls[0].y)<1));
  assert.equal(initial.overflow,false);
  const originalFooter=page.locator('.host').nth(0).locator('.moss-k2cf-panels');
  const moss=page.locator('.host').nth(1);
  const footer=moss.locator('.moss-k2cf-panels');
  await originalFooter.screenshot({path:resolve(artifacts,'canvas-footer-before.jpg'),type:'jpeg',quality:85});
  await footer.screenshot({path:resolve(artifacts,'canvas-footer-after.jpg'),type:'jpeg',quality:85});
  await page.screenshot({path:resolve(artifacts,'canvas-comparison.jpg'),type:'jpeg',quality:80});

  const values=()=>page.evaluate(()=>Object.fromEntries(window.moss.widgets.filter(w=>w.name).map(w=>[w.name,w.value])));
  await moss.locator('.moss-size-preset select').selectOption('1024 x 1024');
  assert.equal((await values()).width,1024);assert.equal((await values()).height,1024);
  await moss.locator('.moss-size-dimensions input').nth(0).fill('896');
  await moss.locator('.moss-size-dimensions input').nth(1).fill('1184');
  await moss.locator('.moss-size-dimensions input').nth(1).press('Tab');
  await moss.getByRole('button',{name:'Save Custom',exact:true}).click();
  assert.equal((await values()).preset,'User:896x1184');
  await moss.getByRole('button',{name:'Delete Custom',exact:true}).click();
  assert.equal((await values()).preset,'Custom');
  await moss.locator('.moss-k2cf-camera-cell select').nth(0).selectOption('200');
  await moss.locator('.moss-k2cf-camera-cell select').nth(3).selectOption('50mm');
  assert.equal(JSON.parse((await values()).camera_data).iso,'200');
  assert.equal(JSON.parse((await values()).camera_data).focal_length,'50mm');
  page.once('dialog',dialog=>dialog.accept('Compact footer fixture'));
  await moss.getByRole('button',{name:'Save Preset',exact:true}).click();
  await moss.locator('.moss-k2cf-camera-cell select').nth(0).selectOption('800');
  await moss.getByRole('button',{name:'Load',exact:true}).click();
  assert.equal(JSON.parse((await values()).camera_data).iso,'200');
  const saved=await page.evaluate(()=>window.moss.save());
  await page.evaluate(data=>{window.copy=window.makeCopy(data)},saved);
  await page.waitForFunction(()=>window.copy?.host.querySelector('input[type=number]')?.value==='896');
  assert.equal(await page.locator('.host').nth(2).locator('.moss-k2cf-panels>.moss-k2cf-panel').count(),3);
  assert.equal(await page.locator('.host').nth(2).locator('.moss-k2cf-camera-cell select').nth(0).inputValue(),'200');

  const responsive=[];
  for(const width of [940,830,640,430]){
    await page.evaluate(width=>{window.moss.host.style.width=width+'px';window.moss.size[0]=width;window.moss.onResize?.(window.moss.size)},width);
    const current=await metrics();
    assert.equal(current.overflow,false,JSON.stringify({width,...current}));
    assert(current.panels.every(p=>Math.abs(p.height-current.panels[0].height)<1));
    responsive.push({width,height:current.height});
  }
  await page.evaluate(()=>{window.moss.host.style.width='830px';window.moss.size[0]=830;window.moss.onResize?.(window.moss.size)});
  await moss.getByTitle('Choose Canvas UI language. Auto keeps English until a language is selected.').selectOption('Japanese');
  const translated=await metrics();assert.equal(translated.overflow,false);
  await page.evaluate(()=>{
    window.moss.graph._nodes.push({id:900,type:'PrimitiveNode',outputs:[{name:'width'}],widgets:[{name:'width',value:1280}]});
    window.moss.graph.links.set(99,{origin_id:900,origin_slot:0});
    window.moss.inputs=[{name:'width_override',link:99}];window.moss.onConnectionsChange();
  });
  await moss.locator('.moss-k2cf-external-badge').waitFor({state:'visible'});
  assert.equal(await moss.locator('.moss-size-dimensions input').nth(0).inputValue(),'1280');
  const external=await metrics();assert.equal(external.overflow,false);
  assert(external.panels.every(p=>Math.abs(p.height-external.panels[0].height)<1));
  assert.equal(await originalFooter.locator(':scope>.moss-k2cf-panel').count(),2);
  assert.equal(await originalFooter.locator('.moss-size-panel').count(),0);
  if(process.env.KREA2_UI_SOURCE){
    await page.evaluate(()=>window.makeExternal());
    assert.equal(await page.evaluate(()=>window.external.host.querySelectorAll('[class^="moss-k2cf-"]').length),0);
    assert.equal(await page.evaluate(()=>window.external.host.querySelectorAll('[class^="k2cf-"]').length>0),true);
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('krea2_element_framing_v1_custom_latent_presets')),await page.evaluate(()=>window.legacyPresets));
  assert(await page.evaluate(()=>localStorage.getItem('moss_bbox_custom_latent_presets')));
  // Real pointer and keyboard events against the same bundled renderer used by ComfyUI.
  await page.evaluate(() => {
    window.editNode = window.makeEditNode();
    document.querySelector('#nodes').prepend(window.editNode.host);
  });
  const editing = page.locator('.host').first();
  const overlay = editing.locator('.moss-k2cf-overlay');
  const undo = editing.getByRole('button', { name: 'Undo Canvas edit', exact: true });
  const redo = editing.getByRole('button', { name: 'Redo Canvas edit', exact: true });
  const editValues = () => page.evaluate(() => Object.fromEntries(window.editNode.widgets.filter(w => w.name).map(w => [w.name, w.value])));
  const boxes = async () => JSON.parse((await editValues()).layout_data).boxes;
  // Match the exporter's 9-decimal coordinate precision after resolution remapping.
  const geometry = list => list.map(({id,slot,x1,y1,x2,y2}) => ({id,slot,
    x1:Number(x1.toFixed(9)),y1:Number(y1.toFixed(9)),x2:Number(x2.toFixed(9)),y2:Number(y2.toFixed(9))}));
  const coords = async (x,y,canvas=overlay) => {
    await canvas.scrollIntoViewIfNeeded();
    const r = await canvas.boundingBox();
    const size = await canvas.evaluate(el => [el.width,el.height]);
    return { x:r.x+x*r.width/size[0], y:r.y+y*r.height/size[1] };
  };
  const drag = async (x1,y1,x2,y2,canvas=overlay) => {
    const start=await coords(x1,y1,canvas), end=await coords(x2,y2,canvas);
    await page.mouse.move(start.x,start.y); await page.mouse.down();
    await page.mouse.move(end.x,end.y,{steps:8}); await page.mouse.up();
  };
  await overlay.waitFor({state:'visible'});
  assert.equal(await undo.isDisabled(),true);
  const untouched = await page.evaluate(() => window.original.save());
  const originalBoxes = geometry(await boxes());
  assert.equal(originalBoxes.length,1);
  await editing.locator('[data-slot="blue"]').click();
  await editing.getByRole('button',{name:'▭ Draw Box',exact:true}).click();
  await drag(180,400,650,1000);
  const drawn = geometry(await boxes());
  assert.equal(drawn.length,2);
  await undo.click(); assert.deepEqual(geometry(await boxes()),originalBoxes);
  await redo.click(); assert.deepEqual(geometry(await boxes()),drawn);

  // Select the covered original box, then drag it without moving/reordering the front box.
  await page.keyboard.down('Alt');
  const overlap = await coords(300,600); await page.mouse.click(overlap.x,overlap.y);
  await page.keyboard.up('Alt');
  await drag(300,600,340,630);
  const moved = geometry(await boxes());
  assert(moved[0].x1 > drawn[0].x1 + 35);
  assert.deepEqual(moved[1],drawn[1]);
  await overlay.press('Control+z'); assert.deepEqual(geometry(await boxes()),drawn);
  await overlay.press('Control+Shift+z'); assert.deepEqual(geometry(await boxes()),moved);
  await overlay.press('Control+z');
  await overlay.press('Control+y'); assert.deepEqual(geometry(await boxes()),moved);
  await undo.click();

  // A click without movement must not add history or discard redo.
  const single = await coords(90,300); await page.mouse.click(single.x,single.y);
  assert.equal(await redo.isDisabled(),false);
  await redo.click(); assert.deepEqual(geometry(await boxes()),moved);
  await undo.click();
  await drag(64,240,84,260);
  const resized = geometry(await boxes());
  assert(resized[0].x1 > drawn[0].x1 + 15);
  assert.equal(await redo.isDisabled(),true);
  await undo.click(); assert.deepEqual(geometry(await boxes()),drawn);
  await redo.click(); assert.deepEqual(geometry(await boxes()),resized);

  await overlay.press('Delete'); assert.equal((await boxes()).length,1);
  await overlay.press('Control+z'); assert.deepEqual(geometry(await boxes()),resized);
  await editing.getByRole('button',{name:'Reset Canvas',exact:true}).click();
  assert.equal((await boxes()).length,0);
  await undo.click(); assert.deepEqual(geometry(await boxes()),resized);
  assert.equal((await editValues()).width,896); assert.equal((await editValues()).height,1184);
  await editing.locator('.moss-size-preset select').selectOption('1024 x 1024');
  const square = geometry(await boxes());
  await undo.click();assert.deepEqual(geometry(await boxes()),resized);
  assert.equal((await editValues()).width,896);assert.equal((await editValues()).height,1184);
  await redo.click();assert.deepEqual(geometry(await boxes()),square);
  await undo.click();
  await overlay.press('x');assert.equal(await overlay.innerHTML(),'');
  await undo.focus();await page.keyboard.press('x');assert.equal(await undo.textContent(),'↶');
  assert.equal(await page.evaluate(()=>window.graphHistoryKeys),0);

  // Native input undo/delete and other nodes must be left alone.
  const field = editing.locator('.moss-size-dimensions input').first();
  await field.focus(); await field.press('Delete');
  assert.deepEqual(geometry(await boxes()),resized);
  const stillUntouched = await page.evaluate(() => window.original.save());
  assert.deepEqual(stillUntouched.widgets_values,untouched.widgets_values);
  assert.deepEqual(stillUntouched.size,untouched.size);
  await page.evaluate(() => {
    const el=document.createElement('textarea');el.id='unrelated-input';document.body.append(el);el.focus();
  });
  await page.locator('#unrelated-input').press('Control+z');
  await page.locator('#unrelated-input').press('Delete');
  assert.deepEqual(geometry(await boxes()),resized);

  // Pointer cancellation and configure during a drag never replay stale edits.
  const start=await coords(300,600), end=await coords(360,650);
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y);
  await overlay.dispatchEvent('pointercancel');await page.mouse.up();
  assert.deepEqual(geometry(await boxes()),resized);
  const savedEdit=await page.evaluate(() => window.editNode.save());
  assert(!JSON.stringify(savedEdit).includes('canUndo'));
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y);
  await page.evaluate(saved => window.editNode.configure(saved), savedEdit);await page.mouse.up();
  assert.deepEqual(geometry(await boxes()),resized);
  assert.equal(await undo.isDisabled(),true);assert.equal(await redo.isDisabled(),true);
  await page.evaluate(() => {
    window.editNode.inputs=[{name:'width_override',link:99}];window.editNode.onConnectionsChange();
  });
  await editing.locator('.moss-k2cf-external-badge').waitFor({state:'visible'});
  assert.equal(await undo.isDisabled(),true);
  await editing.getByRole('button',{name:'Reset Canvas',exact:true}).click();
  await undo.click();
  assert.equal((await boxes()).length,resized.length);
  assert.equal((await editValues()).width,896);
  assert.equal(await editing.locator('.moss-size-dimensions input').first().inputValue(),'1280');
  await editing.screenshot({path:resolve(artifacts,'canvas-history.jpg'),type:'jpeg',quality:85});
  await page.evaluate(() => window.editNode.onRemoved?.());
  assert.equal(await overlay.evaluate(el => {
    el.focus();return el.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true}));
  }),true);

  // Corrupt workflow data stays verbatim through real controls, timers and save hooks.
  await page.evaluate(() => {
    window.guardNode = window.makeEditNode();
    document.querySelector('#nodes').prepend(window.guardNode.host);
    window.guardValid = window.guardNode.save();
  });
  const guarded = page.locator('.host').first();
  const guardedOverlay = guarded.locator('.moss-k2cf-overlay');
  const guardedUndo = guarded.getByRole('button',{name:'Undo Canvas edit',exact:true});
  const guardedRedo = guarded.getByRole('button',{name:'Redo Canvas edit',exact:true});
  const guardedLayout = () => page.evaluate(() => window.guardNode.widgets.find(w=>w.name==='layout_data').value);
  const corruptLayouts = ['{"boxes": [','[]','null','{"boxes":null}',' \n {"boxes": [ '];
  for (const raw of corruptLayouts) {
    await page.evaluate(raw => {
      const data=structuredClone(window.guardValid);data.widgets_values[3]=raw;data.properties={};
      window.guardInput=structuredClone(data);window.guardNode.configure(data);
    },raw);
    assert.equal(await guardedOverlay.getAttribute('aria-invalid'),'true');
    assert.match(await guardedOverlay.getAttribute('title'),/Original data is preserved/);
    assert.equal(await guardedUndo.isDisabled(),true);
    assert.equal(await guardedRedo.isDisabled(),true);
    await guarded.locator('[data-slot="blue"]').click();
    await guarded.getByTitle('Show or hide all D-boxes').click();
    await guarded.locator('.moss-k2cf-camera-cell select').first().selectOption('200');
    await drag(100,200,400,600,guardedOverlay);
    const saved=await page.evaluate(() => {
      window.guardNode.onResize?.(window.guardNode.size);
      window.guardNode.__k2cfCanvasSync(false);
      window.comfyAPI.app.app.graphToPrompt();
      window.comfyAPI.app.app.queuePrompt(); // Fixture stub: never contacts ComfyUI.
      return window.guardNode.save();
    });
    assert.equal(await guardedLayout(),raw);
    assert.equal(saved.widgets_values[3],raw);
    assert.equal(saved.properties.k2cfCanvasState.widgets_values[3],raw);
    assert.equal(await page.evaluate(()=>window.guardInput.widgets_values[3]),raw);
    // A serialized workflow reload must retain both the original and the error.
    await page.evaluate(saved=>window.guardNode.configure(saved),saved);
    assert.equal(await guardedLayout(),raw);
    assert.equal(await guardedOverlay.getAttribute('aria-invalid'),'true');
    if(raw===corruptLayouts[0]) await guarded.screenshot({path:resolve(artifacts,'canvas-corrupt-layout-preserved.jpg'),type:'jpeg',quality:85});
    await guarded.getByRole('button',{name:'Reset Canvas',exact:true}).click();
    assert.equal(await guardedOverlay.getAttribute('aria-invalid'),'false');
    assert.deepEqual(JSON.parse(await guardedLayout()).boxes,[]);
    assert.equal(await guardedUndo.isDisabled(),true);
    await drag(100,200,400,600,guardedOverlay);
    assert.equal(JSON.parse(await guardedLayout()).boxes.length,1);
    await guardedUndo.click();assert.deepEqual(JSON.parse(await guardedLayout()).boxes,[]);
    await guardedRedo.click();assert.equal(JSON.parse(await guardedLayout()).boxes.length,1);
    // Valid reload also clears the protection and starts a fresh editing history.
    await page.evaluate(raw => {
      const data=structuredClone(window.guardValid);data.widgets_values[3]=raw;data.properties={};
      window.guardNode.configure(data);window.guardNode.configure(window.guardValid);
    },raw);
    assert.equal(await guardedOverlay.getAttribute('aria-invalid'),'false');
    assert.equal(JSON.parse(await guardedLayout()).boxes.length,1);
    assert.equal(await guardedUndo.isDisabled(),true);
  }
  for(const raw of ['', ' \n ', '{}', '{"boxes":[]}']) {
    await page.evaluate(raw=>{
      const data=structuredClone(window.guardValid);data.widgets_values[3]=raw;data.properties={};
      window.guardNode.configure(data);window.guardNode.__k2cfCanvasSync(false);
    },raw);
    assert.equal(await guardedOverlay.getAttribute('aria-invalid'),'false');
    assert.deepEqual(JSON.parse(await guardedLayout()).boxes,[]);
  }
  await page.evaluate(()=>{
    window.guardNode.onRemoved?.();window.guardNode.host.remove();
    window.guardNode.graph._nodes=window.guardNode.graph._nodes.filter(node=>node!==window.guardNode);
  });
  assert.deepEqual(errors,[]);
  const result={standalone:!process.env.KREA2_UI_SOURCE,coexistence:!!process.env.KREA2_UI_SOURCE,legacy_presets_read:true,Krea_storage_unchanged:true,before_height:initial.oldHeight,after_height:initial.height,reduction_percent:Math.round(100*(1-initial.height/initial.oldHeight)),equal_panels:true,horizontal_latent_controls:true,size_presets:true,camera_values:true,canvas_preset_roundtrip:true,clone_restores:true,external_override_status:true,responsive,raw_controls_unchanged:true,page_errors:errors};
  Object.assign(result,{canvas_history:true,overlap_select_and_drag:true,keyboard_isolation:true,early_graph_shortcut_isolation:true,pointer_cancel:true,configure_during_drag:true,external_size_history:true});
  Object.assign(result,{corrupt_layouts_preserved:corruptLayouts.length,corrupt_serialization_roundtrip:true,corrupt_prompt_preparation:true,explicit_reset_recovery:true,valid_reload_recovery:true,intentional_empty_layouts:true});
  await writeFile(resolve(artifacts,'canvas-footer-checks.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({fixture_stopped:true,http_listening:server.listening}));
}
