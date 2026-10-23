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
app.ui={settings:{getSettingValue:()=>window.helpLocale||'en'}};
await import('/web/moss_help.js');
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
    else if (request.url === "/web/canvas_reference.mjs") content = await readFile(resolve(root, "web/canvas_reference.mjs"));
    else if (request.url === "/web/layout_import.mjs") content = await readFile(resolve(root, "web/layout_import.mjs"));
    else if (request.url === "/web/box_prompts.mjs") content = await readFile(resolve(root, "web/box_prompts.mjs"));
    else if (request.url === "/web/text_style.mjs") content = await readFile(resolve(root, "web/text_style.mjs"));
    else if (request.url === "/web/moss_shared_ui.js") content = await readFile(resolve(root, "web/moss_shared_ui.js"));
    else if (["/web/help.mjs", "/web/moss_help.js"].includes(request.url)) content = await readFile(resolve(root, request.url.slice(1)));
    else if (request.url === "/scripts/app.js") content = "export const app=window.comfyAPI.app.app;";
    else if (request.url === "/scripts/api.js") content = "export const api={apiURL:path=>path};";
    else if (request.url.startsWith('/view?')) {
      const query = new URL(request.url,'http://fixture').searchParams;
      if (query.get('filename') === 'missing.webp') {response.writeHead(404);response.end();return;}
      response.setHeader('Content-Type','image/svg+xml');
      response.end('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#ff0000"/></svg>'); return;
    }
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
  const helpCheck = await page.evaluate(() => {
    const node = window.moss;
    const before = node.widgets.filter(w=>!w.element).map(w=>w.value);
    const controls = [...node.host.querySelectorAll('button,input,select,textarea')].filter(e=>e.getClientRects().length);
    const missing = controls.filter(e=>!e.dataset.mossHelp).map(e=>e.outerHTML.slice(0,150));
    window.helpLocale='ja';
    const japanese = controls.every(e=>{e.dispatchEvent(new Event('pointerenter'));return /[ぁ-んァ-ヶ一-龠]/.test(e.title)});
    window.helpLocale='en';
    const english = controls.every(e=>{e.dispatchEvent(new Event('focusin'));return e.title && !/[ぁ-んァ-ヶ一-龠]/.test(e.title)});
    return {missing,japanese,english,count:controls.length,unchanged:JSON.stringify(before)===JSON.stringify(node.widgets.filter(w=>!w.element).map(w=>w.value))};
  });
  assert.deepEqual(helpCheck.missing, []);
  assert(helpCheck.japanese && helpCheck.english && helpCheck.unchanged, JSON.stringify(helpCheck));
  console.log('Localized hover coverage', JSON.stringify(helpCheck));
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
  await page.waitForFunction(()=>window.copy?.host.querySelector('.moss-k2cf-panels input[type=number]')?.value==='896');
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
  await moss.locator('select[data-moss-help=ui_language]').selectOption('Japanese');
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
    await guarded.locator('button[data-moss-help=show]').click();
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
  // Precision controls use real DOM edits and keyboard events, including serialization.
  await page.evaluate(() => {
    window.preciseNode = window.makeEditNode();
    document.querySelector('#nodes').prepend(window.preciseNode.host);
  });
  const precise = page.locator('.host').first();
  const preciseCanvas = precise.locator('.moss-k2cf-overlay');
  const precisionBox = () => page.evaluate(() => JSON.parse(window.preciseNode.widgets.find(w=>w.name==='layout_data').value).boxes[0]);
  const px = precise.getByRole('spinbutton',{name:'BBOX x',exact:true});
  const py = precise.getByRole('spinbutton',{name:'BBOX y',exact:true});
  const pw = precise.getByRole('spinbutton',{name:'BBOX width',exact:true});
  const ph = precise.getByRole('spinbutton',{name:'BBOX height',exact:true});
  const pu = precise.getByRole('button',{name:'Undo Canvas edit',exact:true});
  const pr = precise.getByRole('button',{name:'Redo Canvas edit',exact:true});
  assert.equal(await px.isVisible(),false);
  const precisionLayout = () => page.evaluate(async () => {
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const host=window.preciseNode.host, origin=host.getBoundingClientRect();
    return ['[aria-label="Selected BBOX geometry"]','.moss-k2cf-monitor','.moss-k2cf-overlay','.moss-k2cf-panels'].map(selector=>{
      const r=host.querySelector(selector).getBoundingClientRect();
      return {x:r.x-origin.x,y:r.y-origin.y,width:r.width,height:r.height};
    });
  });
  const unselectedLayout = await precisionLayout();
  assert(unselectedLayout[0].height > 0);
  const point = await coords(200,500,preciseCanvas);
  await page.mouse.click(point.x,point.y);
  await px.waitFor({state:'visible'});
  assert.deepEqual(await precisionLayout(),unselectedLayout);
  await precise.locator('button[data-moss-help=show]').click();
  assert.equal(await px.isVisible(),false);
  assert.deepEqual(await precisionLayout(),unselectedLayout);
  await precise.locator('button[data-moss-help=show]').click();
  assert.deepEqual(await precisionLayout(),unselectedLayout);
  await preciseCanvas.focus();await preciseCanvas.press('Delete');
  assert.equal(await px.isVisible(),false);
  assert.deepEqual(await precisionLayout(),unselectedLayout);
  await pu.click();
  assert.deepEqual(await precisionLayout(),unselectedLayout);
  await precise.locator('button[data-moss-help=draw]').click();
  await drag(600,400,780,700,preciseCanvas);
  assert.equal(await px.isVisible(),true);
  assert.deepEqual(await precisionLayout(),unselectedLayout);
  await pu.click();
  assert.deepEqual(await precisionLayout(),unselectedLayout);
  await page.mouse.click(point.x,point.y);
  const precisionInitial = geometry([await precisionBox()]);
  for (const [field,value] of [[pw,'200'],[ph,'400'],[px,'100'],[py,'300']]) {
    await field.fill(value); await field.press('Enter');
  }
  let pbox = await precisionBox();
  assert.deepEqual([pbox.x1,pbox.y1,pbox.x2,pbox.y2],[100,300,300,700]);
  for(let i=0;i<4;i++) await pu.click();
  assert.deepEqual(geometry([await precisionBox()]),precisionInitial);
  for(let i=0;i<4;i++) await pr.click();
  await preciseCanvas.focus(); await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  pbox=await precisionBox();
  assert.deepEqual([pbox.x1,pbox.y1,pbox.x2,pbox.y2],[101,310,301,710]);
  await preciseCanvas.press('Control+z');
  assert.equal((await precisionBox()).y1,300);
  await preciseCanvas.press('Control+y');
  assert.equal((await precisionBox()).y1,310);
  assert.equal(await py.inputValue(),'310');
  await preciseCanvas.press('ArrowLeft'); await preciseCanvas.press('Shift+ArrowUp');
  assert.deepEqual([(await precisionBox()).x1,(await precisionBox()).y1],[100,300]);
  await pu.click(); await pu.click();
  await preciseCanvas.focus(); await preciseCanvas.press('Control+ArrowRight');
  assert.equal((await precisionBox()).x1,101);
  // Input editing must not move the selected box until committed.
  await px.fill('123'); await px.press('ArrowLeft');
  assert.equal((await precisionBox()).x1,101);
  await px.press('Escape');
  for (const value of ['', '0', '-2']) {
    await pw.fill(value); await pw.press('Enter');
    assert.equal((await precisionBox()).x2-(await precisionBox()).x1,200);
  }
  await px.fill('-100'); await px.press('Enter');
  assert.equal((await precisionBox()).x1,28);
  await preciseCanvas.press('ArrowLeft');
  await pu.click(); // Boundary no-op adds no history.
  assert.equal((await precisionBox()).x1,101);
  await py.fill('99999'); await py.press('Enter');
  assert.equal((await precisionBox()).y2,1156);
  await pw.fill('99999'); await pw.press('Enter');
  assert.equal((await precisionBox()).x2,868);
  const savedPrecision = await page.evaluate(()=>window.preciseNode.save());
  await page.evaluate(data=>{window.precisionCopy=window.makeCopy(data)},savedPrecision);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(window.precisionCopy.widgets.find(w=>w.name==='layout_data').value).boxes),[await precisionBox()]);
  assert.equal(savedPrecision.widgets_values.length,9);
  await precise.screenshot({path:resolve(artifacts,'canvas-precision.jpg'),type:'jpeg',quality:85});
  Object.assign(result,{precision_inputs:true,precision_layout_stable:true,arrow_nudge:true,precision_history:true,precision_bounds:true,precision_reload:true});
  // Session-only guide snapping, exercised with real pointer events at two zooms.
  await page.evaluate(() => {
    window.snapNode = window.makeEditNode();
    document.querySelector('#nodes').prepend(window.snapNode.host);
    window.snapData = window.snapNode.save();
    const layout = JSON.parse(window.snapData.widgets_values[3]);
    layout.boxes = [{id:'snap',slot:'red',x1:100,y1:200,x2:260,y2:360}];
    window.snapData.widgets_values[3] = JSON.stringify(layout);
    window.snapData.properties = {};
    window.snapNode.configure(window.snapData);
  });
  const snapping = page.locator('.host').first();
  const snapCanvas = snapping.locator('.moss-k2cf-overlay');
  const snapToggle = snapping.getByRole('checkbox',{name:'Snap to guides',exact:true});
  const snapUndo = snapping.getByRole('button',{name:'Undo Canvas edit',exact:true});
  const snapRedo = snapping.getByRole('button',{name:'Redo Canvas edit',exact:true});
  const snapBoxes = () => page.evaluate(()=>JSON.parse(window.snapNode.widgets.find(w=>w.name==='layout_data').value).boxes);
  const assertClose = (actual,expected) => assert(Math.abs(actual-expected)<1e-6, `${actual} != ${expected}`);
  const snapInitial = geometry(await snapBoxes());
  assert.equal(await snapToggle.isChecked(),false);
  await drag(180,280,446,590,snapCanvas);
  let snappedBox=(await snapBoxes())[0];
  assert(Math.abs((snappedBox.x1+snappedBox.x2)/2-448)>1);
  await snapUndo.click();assert.deepEqual(geometry(await snapBoxes()),snapInitial);
  await snapToggle.check();
  assert.equal(await snapRedo.isDisabled(),false); // Toggle alone leaves redo intact.
  assert.deepEqual(geometry(await snapBoxes()),snapInitial);
  await drag(180,280,446,590,snapCanvas);
  snappedBox=(await snapBoxes())[0];
  assertClose((snappedBox.x1+snappedBox.x2)/2,448);
  assertClose((snappedBox.y1+snappedBox.y2)/2,592);
  assertClose(snappedBox.x2-snappedBox.x1,160);assertClose(snappedBox.y2-snappedBox.y1,160);
  const snappedGeometry=geometry(await snapBoxes());
  await snapUndo.click();assert.deepEqual(geometry(await snapBoxes()),snapInitial);
  await snapRedo.click();assert.deepEqual(geometry(await snapBoxes()),snappedGeometry);
  // Numeric coordinates and arrow steps remain exact even next to a guide.
  const snapX=snapping.getByRole('spinbutton',{name:'BBOX x',exact:true});
  await snapX.fill('447.5');await snapX.press('Enter');
  assert.equal((await snapBoxes())[0].x1,447.5);
  await snapCanvas.press('ArrowRight');assert.equal((await snapBoxes())[0].x1,448.5);
  await snapCanvas.press('Shift+ArrowLeft');assert.equal((await snapBoxes())[0].x1,438.5);
  await snapUndo.click();assert.equal((await snapBoxes())[0].x1,448.5);
  await snapRedo.click();assert.equal((await snapBoxes())[0].x1,438.5);
  // Resize only the dragged edges; fractional thirds survive save/reload.
  await page.evaluate(()=>window.snapNode.configure(window.snapData));
  assert.equal(await snapToggle.isChecked(),false);
  await snapToggle.check();
  await drag(260,360,300,396,snapCanvas);
  snappedBox=(await snapBoxes())[0];
  assertClose(snappedBox.x1,100);assertClose(snappedBox.y1,200);
  assertClose(snappedBox.x2,896/3);assertClose(snappedBox.y2,1184/3);
  const resizedSnap=geometry(await snapBoxes());
  await snapUndo.click();assert.deepEqual(geometry(await snapBoxes()),snapInitial);
  await snapRedo.click();assert.deepEqual(geometry(await snapBoxes()),resizedSnap);
  const snapSaved=await page.evaluate(()=>window.snapNode.save());
  assert.equal(snapSaved.widgets_values.length,9);
  await page.evaluate(saved=>window.snapNode.configure(saved),snapSaved);
  assert.equal(await snapToggle.isChecked(),false);
  assert.deepEqual(geometry(await snapBoxes()),resizedSnap);
  assert.equal(await snapUndo.isDisabled(),true);
  // Same physical threshold under a smaller displayed Canvas.
  await page.evaluate(()=>{window.snapNode.configure(window.snapData);window.snapNode.host.style.width='430px';window.snapNode.onResize?.()});
  await snapToggle.check();
  await drag(180,280,446,590,snapCanvas);
  snappedBox=(await snapBoxes())[0];
  assertClose((snappedBox.x1+snappedBox.x2)/2,448);assertClose((snappedBox.y1+snappedBox.y2)/2,592);
  // Threshold is six displayed pixels, including when the visible Grid is off.
  await snapUndo.click();
  await snapping.locator('select[data-moss-help=grid_mode]').selectOption('Off');
  const displayed = await snapCanvas.boundingBox();
  const nearX = 4 * 896 / displayed.width, nearY = 4 * 1184 / displayed.height;
  await drag(180,280,448-nearX,592-nearY,snapCanvas);
  snappedBox=(await snapBoxes())[0];
  assertClose((snappedBox.x1+snappedBox.x2)/2,448);assertClose((snappedBox.y1+snappedBox.y2)/2,592);
  await snapUndo.click();
  const farX = 9 * 896 / displayed.width, farY = 9 * 1184 / displayed.height;
  await drag(180,280,448-farX,592-farY,snapCanvas);
  snappedBox=(await snapBoxes())[0];
  assert(Math.abs((snappedBox.x1+snappedBox.x2)/2-448)>1);
  assert(Math.abs((snappedBox.y1+snappedBox.y2)/2-592)>1);
  await snapUndo.click();
  await snapping.locator('select[data-moss-help=grid_mode]').selectOption('Thirds');
  // Cancelling an in-progress snapped drag restores its starting geometry.
  const snapStart=await coords(180,280,snapCanvas),snapEnd=await coords(446,590,snapCanvas);
  await page.mouse.move(snapStart.x,snapStart.y);await page.mouse.down();await page.mouse.move(snapEnd.x,snapEnd.y);
  await snapCanvas.dispatchEvent('pointercancel');await page.mouse.up();
  assert.deepEqual(geometry(await snapBoxes()),snapInitial);
  await snapToggle.check();await snapping.getByRole('button',{name:'Reset Canvas',exact:true}).click();
  assert.equal(await snapToggle.isChecked(),false);
  await snapUndo.click();assert.deepEqual(geometry(await snapBoxes()),snapInitial);
  await snapToggle.check();
  await snapping.locator('select[data-moss-help=ui_language]').selectOption('Japanese');
  assert.equal(await snapToggle.locator('..').textContent(),'吸着');
  const assertGestureClose = (a,b) => assert(Math.abs(a-b)<1e-3,`${a} != ${b}`);
  // Modifier gestures: Alt-click selects; Alt-drag duplicates; Shift-resize preserves ratio.
  await page.evaluate(() => {
    window.gestureNode = window.makeEditNode();
    document.querySelector('#nodes').prepend(window.gestureNode.host);
    window.gestureData = window.gestureNode.save();
    const layout = JSON.parse(window.gestureData.widgets_values[3]);
    layout.boxes = [
      {id:'back',slot:'red',x1:100,y1:200,x2:300,y2:500},
      {id:'front',slot:'blue',x1:180,y1:280,x2:420,y2:650},
    ];
    window.gestureData.widgets_values[3] = JSON.stringify(layout);
    window.gestureData.properties = {};
    window.gestureNode.configure(window.gestureData);
  });
  const gestures = page.locator('.host').first();
  const gestureCanvas = gestures.locator('.moss-k2cf-overlay');
  const gu = gestures.getByRole('button',{name:'Undo Canvas edit',exact:true});
  const gr = gestures.getByRole('button',{name:'Redo Canvas edit',exact:true});
  const gestureBoxes = () => page.evaluate(() => JSON.parse(window.gestureNode.widgets.find(w=>w.name==='layout_data').value).boxes);
  const reloadGestures = () => page.evaluate(() => window.gestureNode.configure(window.gestureData));
  const clickAt = async (x,y) => { const p=await coords(x,y,gestureCanvas);await page.mouse.click(p.x,p.y); };
  const modifierDrag = async (key,x1,y1,x2,y2) => {
    await page.keyboard.down(key);
    try { await drag(x1,y1,x2,y2,gestureCanvas); }
    finally { await page.keyboard.up(key); }
  };
  const gestureOriginal = geometry(await gestureBoxes());
  await clickAt(130,240); // Select the covered red box through its exposed area.
  await modifierDrag('Alt',230,370,310,430);
  let duplicates = await gestureBoxes();
  assert.equal(duplicates.length,3);
  assert.deepEqual(geometry(duplicates.slice(0,2)),gestureOriginal);
  assert.equal(duplicates[2].slot,'red'); // Selected box wins over the front blue box.
  assert.equal(new Set(duplicates.map(b=>b.id)).size,3);
  assertGestureClose(duplicates[2].x1,180);assertGestureClose(duplicates[2].y1,260);
  assertGestureClose(duplicates[2].x2-duplicates[2].x1,200);
  assertGestureClose(duplicates[2].y2-duplicates[2].y1,300);
  const duplicateGeometry = geometry(duplicates);
  await gu.click();assert.deepEqual(geometry(await gestureBoxes()),gestureOriginal);
  assert.equal(await gu.isDisabled(),true); // One completed drag is exactly one edit.
  await page.keyboard.down('Alt');await clickAt(230,370);await page.keyboard.up('Alt');
  assert.deepEqual(geometry(await gestureBoxes()),gestureOriginal);
  assert.equal(await gu.isDisabled(),true);assert.equal(await gr.isDisabled(),false);
  await gr.click();assert.deepEqual(geometry(await gestureBoxes()),duplicateGeometry);
  const duplicateSaved=await page.evaluate(()=>window.gestureNode.save());
  await page.evaluate(saved=>window.gestureNode.configure(saved),duplicateSaved);
  assert.deepEqual(geometry(await gestureBoxes()),duplicateGeometry);
  assert.equal(await gu.isDisabled(),true);assert.equal(await gr.isDisabled(),true);

  // Sub-threshold Alt movement is a click, including with a scaled Canvas.
  await reloadGestures();await clickAt(130,240);
  const small=await coords(230,370,gestureCanvas);
  await page.keyboard.down('Alt');await page.mouse.move(small.x,small.y);await page.mouse.down();
  await page.mouse.move(small.x+2,small.y);await page.mouse.up();await page.keyboard.up('Alt');
  assert.deepEqual(geometry(await gestureBoxes()),gestureOriginal);
  assert.equal(await gu.isDisabled(),true);
  assertGestureClose(Number(await gestures.getByRole('spinbutton',{name:'BBOX x',exact:true}).inputValue()),180);

  // Cancelling a live duplicate removes the copy and does not create history.
  await reloadGestures();await clickAt(130,240);
  let gestureBegin=await coords(130,240,gestureCanvas),gestureEnd=await coords(210,300,gestureCanvas);
  await page.keyboard.down('Alt');await page.mouse.move(gestureBegin.x,gestureBegin.y);await page.mouse.down();
  await page.mouse.move(gestureEnd.x,gestureEnd.y);await gestureCanvas.dispatchEvent('pointercancel');
  await page.mouse.up();await page.keyboard.up('Alt');
  assert.deepEqual(geometry(await gestureBoxes()),gestureOriginal);
  assert.equal(await gu.isDisabled(),true);assert.equal(await gr.isDisabled(),true);

  // Duplicate movement uses existing bounds and snapping and creates fresh IDs every time.
  await modifierDrag('Alt',130,240,890,1180);
  duplicates=await gestureBoxes();assert.equal(duplicates.length,3);
  assert.deepEqual(geometry(duplicates.slice(0,2)),gestureOriginal);
  assertGestureClose(duplicates[2].x2,868);assertGestureClose(duplicates[2].y2,1156);
  await modifierDrag('Alt',750,1000,650,900);
  duplicates=await gestureBoxes();assert.equal(duplicates.length,4);
  assert.equal(new Set(duplicates.map(b=>b.id)).size,4);
  await gu.click();assert.equal((await gestureBoxes()).length,3);
  await gu.click();assert.deepEqual(geometry(await gestureBoxes()),gestureOriginal);

  await reloadGestures();await clickAt(130,240);
  await gestures.getByRole('checkbox',{name:'Snap to guides',exact:true}).check();
  await modifierDrag('Alt',130,240,376,480);
  let snappedDuplicate=(await gestureBoxes())[2];
  assertGestureClose((snappedDuplicate.x1+snappedDuplicate.x2)/2,448);
  assertGestureClose((snappedDuplicate.y1+snappedDuplicate.y2)/2,592);
  assert.deepEqual(geometry((await gestureBoxes()).slice(0,2)),gestureOriginal);
  await reloadGestures();
  await gestures.locator('button[data-moss-help="show"]').click();
  await modifierDrag('Alt',130,240,230,340);
  assert.deepEqual(geometry(await gestureBoxes()),gestureOriginal);
  await gestures.locator('button[data-moss-help="show"]').click();

  const singleGesture = async () => page.evaluate(() => {
    const data=structuredClone(window.gestureData);
    const layout=JSON.parse(data.widgets_values[3]);
    layout.boxes=[{id:'ratio',slot:'red',x1:200,y1:300,x2:400,y2:600}];
    data.widgets_values[3]=JSON.stringify(layout);window.gestureNode.configure(data);
  });
  for (const [name,start,target,anchor] of [
    ['nw',[200,300],[100,200],[400,600]],
    ['ne',[400,300],[500,200],[200,600]],
    ['sw',[200,600],[100,700],[400,300]],
    ['se',[400,600],[500,700],[200,300]],
  ]) {
    await singleGesture();
    await modifierDrag('Shift',...start,...target);
    const box=(await gestureBoxes())[0];assert.equal((await gestureBoxes()).length,1,name);
    assertGestureClose((box.x2-box.x1)/(box.y2-box.y1),2/3);
    assertGestureClose(name.includes('w')?box.x2:box.x1,anchor[0]);
    assertGestureClose(name.includes('n')?box.y2:box.y1,anchor[1]);
    const changed=geometry([box]);
    await gu.click();assert.deepEqual(geometry(await gestureBoxes()),[{id:'ratio',slot:'red',x1:200,y1:300,x2:400,y2:600}]);
    assert.equal(await gu.isDisabled(),true);
    await gr.click();assert.deepEqual(geometry(await gestureBoxes()),changed);
  }
  await singleGesture();
  await gestures.getByRole('checkbox',{name:'Snap to guides',exact:true}).check();
  await modifierDrag('Shift',400,600,890,1180);
  let ratio=(await gestureBoxes())[0];
  assertGestureClose((ratio.x2-ratio.x1)/(ratio.y2-ratio.y1),2/3);
  assert(ratio.x1>=28&&ratio.y1>=28&&ratio.x2<=868&&ratio.y2<=1156);
  assertGestureClose(ratio.x1,200);assertGestureClose(ratio.y1,300);

  // Shift can be released mid-drag; dimensions then follow the free pointer position.
  await singleGesture();
  gestureBegin=await coords(400,600,gestureCanvas);gestureEnd=await coords(500,700,gestureCanvas);
  await page.keyboard.down('Shift');await page.mouse.move(gestureBegin.x,gestureBegin.y);await page.mouse.down();
  await page.mouse.move(gestureEnd.x,gestureEnd.y);
  await page.keyboard.up('Shift');gestureEnd=await coords(510,730,gestureCanvas);
  await page.mouse.move(gestureEnd.x,gestureEnd.y);await page.mouse.up();
  ratio=(await gestureBoxes())[0];assertGestureClose(ratio.x2,510);assertGestureClose(ratio.y2,730);
  await gestures.getByRole('spinbutton',{name:'BBOX width',exact:true}).fill('321');
  await gestures.getByRole('spinbutton',{name:'BBOX width',exact:true}).press('Enter');
  ratio=(await gestureBoxes())[0];assertGestureClose(ratio.x2-ratio.x1,321);assertGestureClose(ratio.y2-ratio.y1,430);
  const beforeNudge=ratio.x1;await gestureCanvas.press('Shift+ArrowRight');
  assertGestureClose((await gestureBoxes())[0].x1,beforeNudge+10);

  // Shift has no aspect-lock effect when drawing a new box.
  await singleGesture();
  await gestures.getByRole('button',{name:'▭ Draw Box',exact:true}).click();
  await modifierDrag('Shift',50,50,150,250);
  const newDraw=(await gestureBoxes())[1];assertGestureClose(newDraw.x2-newDraw.x1,100);assertGestureClose(newDraw.y2-newDraw.y1,200);
  await gestures.screenshot({path:resolve(artifacts,'canvas-duplicate-ratio.jpg'),type:'jpeg',quality:85});
  Object.assign(result,{alt_drag_duplicate:true,alt_click_preserved:true,duplicate_threshold:true,duplicate_unique_ids:true,duplicate_cancel:true,duplicate_bounds:true,duplicate_snap:true,hidden_boxes_no_edit:true,duplicate_history:true,duplicate_reload:true,shift_ratio_all_corners:true,shift_ratio_bounds:true,shift_release_free_resize:true,modifier_numeric_keyboard_exact:true,shift_draw_unchanged:true});
  // A saved workflow can arrive with Draw Box armed; a second click must exit it.
  await singleGesture();
  await page.evaluate(() => {
    const data=window.gestureNode.save(), layout=JSON.parse(data.widgets_values[3]);
    layout.drawMode=true;data.widgets_values[3]=JSON.stringify(layout);
    data.properties={};window.gestureNode.configure(data);
  });
  const drawToggle=gestures.getByRole('button',{name:'▭ Draw Box',exact:true});
  const drawMode=()=>page.evaluate(()=>JSON.parse(window.gestureNode.widgets.find(w=>w.name==='layout_data').value).drawMode);
  assert.equal(await drawMode(),true);
  assert.equal(await drawToggle.evaluate(el=>el.classList.contains('primary')),true);
  const savedArmed=await page.evaluate(()=>window.gestureNode.save());
  await drawToggle.click();
  assert.equal(await drawMode(),false,'Draw Box must toggle OFF for an existing armed workflow');
  assert.equal(await drawToggle.evaluate(el=>el.classList.contains('primary')),false);
  assert.equal(await gu.isDisabled(),true);assert.equal(await gr.isDisabled(),true);
  const savedUnarmed=await page.evaluate(()=>window.gestureNode.save());
  await page.evaluate(data=>window.gestureNode.configure(data),savedUnarmed);
  assert.equal(await drawMode(),false);
  assert.equal(await drawToggle.evaluate(el=>el.classList.contains('primary')),false);
  await drag(250,400,290,430,gestureCanvas);
  let toggledBoxes=await gestureBoxes();assert.equal(toggledBoxes.length,1);
  assertGestureClose(toggledBoxes[0].x1,240);assertGestureClose(toggledBoxes[0].y1,330);
  await gu.click();assert.equal(await gr.isDisabled(),false);
  await drawToggle.click();assert.equal(await drawMode(),true);
  assert.equal(await drawToggle.evaluate(el=>el.classList.contains('primary')),true);
  await drawToggle.click();assert.equal(await drawMode(),false);
  assert.equal(await gu.isDisabled(),true);assert.equal(await gr.isDisabled(),false);
  await gr.click();assert.deepEqual(geometry(await gestureBoxes()),geometry(toggledBoxes));
  await gu.click();
  await modifierDrag('Shift',400,600,500,700);
  toggledBoxes=await gestureBoxes();assert.equal(toggledBoxes.length,1);
  assertGestureClose((toggledBoxes[0].x2-toggledBoxes[0].x1)/(toggledBoxes[0].y2-toggledBoxes[0].y1),2/3);
  await gu.click();await modifierDrag('Alt',250,400,300,450);
  assert.equal((await gestureBoxes()).length,2);
  await gu.click();assert.equal((await gestureBoxes()).length,1);
  await page.evaluate(data=>window.gestureNode.configure(data),savedArmed);
  assert.equal(await drawMode(),true);
  assert.equal(await drawToggle.evaluate(el=>el.classList.contains('primary')),true);
  await drawToggle.click();assert.equal(await drawMode(),false);
  Object.assign(result,{draw_mode_toggle:true,draw_mode_saved_on_off:true,draw_toggle_preserves_history:true,draw_toggle_restores_existing_editing:true});
  // Multiple selection is session-only; all group translations share one delta.
  await page.evaluate(() => {
    const data=structuredClone(window.gestureData), layout=JSON.parse(data.widgets_values[3]);
    layout.boxes=[
      {id:'a',slot:'red',text:'first',label:'character',x1:100,y1:200,x2:250,y2:400},
      {id:'b',slot:'blue',text:'second',label:'object',x1:350,y1:500,x2:500,y2:700},
      {id:'c',slot:'yellow',text:'title',label:'text',x1:650,y1:800,x2:800,y2:1000},
    ];
    data.widgets_values[3]=JSON.stringify(layout);data.properties={};
    window.multiData=data;window.gestureNode.configure(data);
  });
  const multiOriginal=await gestureBoxes();
  const resetMulti=()=>page.evaluate(()=>window.gestureNode.configure(window.multiData));
  const selectAt=async(x,y,key='Control')=>{
    await page.keyboard.down(key);
    try {await clickAt(x,y);} finally {await page.keyboard.up(key);}
  };
  const selectPair=async()=>{await clickAt(160,300);await selectAt(410,600);};
  const assertMoved=(actual,before,dx,dy)=>{
    assert.equal(actual.id,before.id);assert.equal(actual.slot,before.slot);
    for(const key of ['x1','x2'])assertGestureClose(actual[key],before[key]+dx);
    for(const key of ['y1','y2'])assertGestureClose(actual[key],before[key]+dy);
  };
  const multiLayoutHeight=await gestureCanvas.evaluate(el=>el.getBoundingClientRect().height);
  await selectPair();
  assert.equal(await gu.isDisabled(),true);
  assertGestureClose(await gestureCanvas.evaluate(el=>el.getBoundingClientRect().height),multiLayoutHeight);
  await drag(160,300,210,340,gestureCanvas); // Drag non-primary member, retaining both.
  let group=await gestureBoxes();
  assertMoved(group[0],multiOriginal[0],50,40);assertMoved(group[1],multiOriginal[1],50,40);
  assert.deepEqual(geometry([group[2]]),geometry([multiOriginal[2]]));
  const groupMoved=geometry(group);
  await gu.click();assert.deepEqual(geometry(await gestureBoxes()),geometry(multiOriginal));
  assert.equal(await gu.isDisabled(),true);assert.equal(await gr.isDisabled(),false);
  await selectAt(410,600);await selectAt(410,600); // Toggle off/on must preserve Redo.
  assert.equal(await gr.isDisabled(),false);
  await gr.click();assert.deepEqual(geometry(await gestureBoxes()),groupMoved);
  await gestureCanvas.press('Shift+ArrowRight');
  group=await gestureBoxes();assertMoved(group[0],multiOriginal[0],60,40);assertMoved(group[1],multiOriginal[1],60,40);
  await gu.click();await gu.click();
  await gestureCanvas.press('ArrowRight'); // Undo restored the original pair selection.
  group=await gestureBoxes();assertMoved(group[0],multiOriginal[0],1,0);assertMoved(group[1],multiOriginal[1],1,0);
  assert.equal(await gr.isDisabled(),true);

  // Meta-click is the macOS equivalent; Ctrl-click does not trigger a corner/delete handle.
  await resetMulti();await clickAt(160,300);await selectAt(500,500,'Meta');
  assert.equal((await gestureBoxes()).length,3);
  await gestureCanvas.press('ArrowDown');group=await gestureBoxes();
  assertMoved(group[0],multiOriginal[0],0,1);assertMoved(group[1],multiOriginal[1],0,1);
  await selectAt(410,600);await gestureCanvas.press('ArrowRight');group=await gestureBoxes();
  assertMoved(group[0],multiOriginal[0],1,1);assertMoved(group[1],multiOriginal[1],0,1);

  // Group bounds stop all members together rather than collapsing their spacing.
  await resetMulti();await selectPair();await drag(160,300,890,1180,gestureCanvas);
  group=await gestureBoxes();assertMoved(group[0],multiOriginal[0],368,456);assertMoved(group[1],multiOriginal[1],368,456);
  await gestureCanvas.press('ArrowRight');assert.deepEqual(geometry(await gestureBoxes()),geometry(group));
  await gu.click();assert.equal(await gu.isDisabled(),true); // Blocked arrow adds no edit.
  await drag(160,300,0,0,gestureCanvas);group=await gestureBoxes();
  assertMoved(group[0],multiOriginal[0],-72,-172);assertMoved(group[1],multiOriginal[1],-72,-172);

  // Snap uses the whole selection's outer bounds, preserving internal offsets.
  await resetMulti();await selectPair();
  await gestures.getByRole('checkbox',{name:'Snap to guides',exact:true}).check();
  await drag(160,300,306,440,gestureCanvas);group=await gestureBoxes();
  assertGestureClose((group[0].x1+group[1].x2)/2,448);
  assertGestureClose((group[0].y1+group[1].y2)/2,592);
  assertGestureClose(group[1].x1-group[0].x1,250);assertGestureClose(group[1].y1-group[0].y1,300);
  const snapGroup=structuredClone(group);await gestureCanvas.press('ArrowRight');group=await gestureBoxes();
  assertMoved(group[0],snapGroup[0],1,0);assertMoved(group[1],snapGroup[1],1,0);

  // One Alt drag duplicates every selected member once, keeps originals and metadata.
  await resetMulti();await selectPair();await modifierDrag('Alt',160,300,220,350);
  group=await gestureBoxes();assert.equal(group.length,5);assert.equal(new Set(group.map(b=>b.id)).size,5);
  assert.deepEqual(geometry(group.slice(0,3)),geometry(multiOriginal));
  for(let i=0;i<2;i++){
    assert.equal(group[3+i].text,multiOriginal[i].text);assert.equal(group[3+i].label,multiOriginal[i].label);
    assertMoved({...group[3+i],id:multiOriginal[i].id},multiOriginal[i],60,50);
  }
  const pairCopies=geometry(group);
  await gu.click();assert.deepEqual(geometry(await gestureBoxes()),geometry(multiOriginal));
  assert.equal(await gu.isDisabled(),true);
  await gr.click();assert.deepEqual(geometry(await gestureBoxes()),pairCopies);
  await gestureCanvas.press('ArrowRight');group=await gestureBoxes();
  assert.deepEqual(geometry(group.slice(0,3)),geometry(multiOriginal));
  assertGestureClose(group[3].x1,161);assertGestureClose(group[4].x1,411);
  const groupSaved=await page.evaluate(()=>window.gestureNode.save());
  assert.equal(groupSaved.widgets_values.length,9);
  assert.equal(JSON.stringify(groupSaved).includes('selectedIds'),false);
  const groupSavedGeometry=geometry(group);
  await page.evaluate(data=>window.gestureNode.configure(data),groupSaved);
  assert.deepEqual(geometry(await gestureBoxes()),groupSavedGeometry);
  await gestureCanvas.press('ArrowRight');assert.deepEqual(geometry(await gestureBoxes()),groupSavedGeometry);
  assert.equal(await gu.isDisabled(),true);assert.equal(await gr.isDisabled(),true);

  // Cancellation rolls back all copies/moves AND selection, with no history entry.
  for (const [key,event] of [['Alt','pointercancel'],[null,'lostpointercapture'],['Alt','Escape']]) {
    await resetMulti();await selectPair();
    const from=await coords(160,300,gestureCanvas),to=await coords(230,360,gestureCanvas);
    if(key)await page.keyboard.down(key);
    await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y);
    if(event==='Escape')await gestureCanvas.press('Escape');else await gestureCanvas.dispatchEvent(event);
    await page.mouse.up();if(key)await page.keyboard.up(key);
    assert.deepEqual(geometry(await gestureBoxes()),geometry(multiOriginal));assert.equal(await gu.isDisabled(),true);
    await gestureCanvas.press('ArrowRight');group=await gestureBoxes();
    assertMoved(group[0],multiOriginal[0],1,0);assertMoved(group[1],multiOriginal[1],1,0);
  }
  // Single-box edits, empty clicks and Escape have explicit selection behavior.
  await resetMulti();await selectPair();await clickAt(710,900);await gestureCanvas.press('ArrowRight');group=await gestureBoxes();
  assertMoved(group[0],multiOriginal[0],0,0);assertMoved(group[1],multiOriginal[1],0,0);assertMoved(group[2],multiOriginal[2],1,0);
  await resetMulti();await selectPair();await clickAt(550,80);await gestureCanvas.press('ArrowRight');
  assert.deepEqual(geometry(await gestureBoxes()),geometry(multiOriginal));assert.equal(await gu.isDisabled(),true);
  await selectPair();await gestureCanvas.press('Escape');await gestureCanvas.press('ArrowRight');
  assert.deepEqual(geometry(await gestureBoxes()),geometry(multiOriginal));
  await selectPair();await gestures.getByRole('spinbutton',{name:'BBOX x',exact:true}).fill('360');
  await gestures.getByRole('spinbutton',{name:'BBOX x',exact:true}).press('Enter');
  await gestureCanvas.press('ArrowRight');group=await gestureBoxes();
  assertMoved(group[0],multiOriginal[0],0,0);assertMoved(group[1],multiOriginal[1],11,0);
  await resetMulti();await selectPair();await modifierDrag('Shift',250,400,280,440);group=await gestureBoxes();
  assert.deepEqual(geometry([group[1]]),geometry([multiOriginal[1]]));
  assertGestureClose((group[0].x2-group[0].x1)/(group[0].y2-group[0].y1),.75);
  await gestureCanvas.press('ArrowRight');assertMoved((await gestureBoxes())[1],multiOriginal[1],0,0);

  // Delete applies to the selection; the corner X still removes only its own box.
  await resetMulti();await selectPair();await gestureCanvas.press('Delete');
  assert.deepEqual(geometry(await gestureBoxes()),geometry([multiOriginal[2]]));
  await gu.click();assert.deepEqual(geometry(await gestureBoxes()),geometry(multiOriginal));
  await gestureCanvas.press('ArrowRight');group=await gestureBoxes();
  assertMoved(group[0],multiOriginal[0],1,0);assertMoved(group[1],multiOriginal[1],1,0);
  await resetMulti();await selectPair();await clickAt(250,200);
  assert.deepEqual((await gestureBoxes()).map(b=>b.id),['b','c']);
  await gestureCanvas.press('ArrowRight');assertGestureClose((await gestureBoxes())[0].x1,351);

  // Existing Draw Box / hidden-box rules still govern selection gestures.
  await resetMulti();await selectPair();await drawToggle.click();
  await modifierDrag('Control',50,50,150,150);assert.equal((await gestureBoxes()).length,4);
  assert.equal(await drawMode(),false);
  await resetMulti();await selectPair();await gestures.locator('button[data-moss-help="show"]').click();
  await selectAt(710,900);await modifierDrag('Alt',160,300,230,360);await gestureCanvas.press('Delete');
  assert.deepEqual(geometry(await gestureBoxes()),geometry(multiOriginal));
  await gestures.locator('button[data-moss-help="show"]').click();
  await gestureCanvas.press('ArrowRight');group=await gestureBoxes();
  assertMoved(group[0],multiOriginal[0],1,0);assertMoved(group[1],multiOriginal[1],1,0);
  await gestures.screenshot({path:resolve(artifacts,'canvas-multi-selection.jpg'),type:'jpeg',quality:85});
  Object.assign(result,{multi_select_ctrl_meta:true,multi_select_toggle_history:true,multi_move:true,multi_move_bounds:true,
    multi_move_snap:true,multi_move_keyboard:true,multi_duplicate:true,multi_duplicate_metadata:true,multi_duplicate_history:true,
    multi_selection_restore:true,multi_selection_session_only:true,multi_reload:true,multi_cancel:true,multi_single_edit:true,
    multi_delete:true,multi_draw_hidden_rules:true,multi_layout_stable:true});
  // Compact arrangement menu: positions only, independent of Snap, one history edit.
  const arrangement=gestures.locator('select[aria-label="Align and distribute boxes"]');
  await resetMulti();assert.equal(await arrangement.isDisabled(),true);
  const arrangeRect=()=>gestureCanvas.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
  const arrangeStartRect=await arrangeRect();
  await clickAt(160,300);assert.equal(await arrangement.isDisabled(),true);
  await selectAt(410,600);assert.equal(await arrangement.isDisabled(),false);
  assert.equal(await arrangement.locator('option[value="horizontal"]').isDisabled(),true);
  await selectAt(710,900);assert.equal(await arrangement.locator('option[value="horizontal"]').isDisabled(),false);
  assert.deepEqual(await arrangeRect(),arrangeStartRect);
  for (const [mode,axis,end,target,factor] of [
    ['left','x1','x2',100,0],['center','x1','x2',450,.5],['right','x1','x2',800,1],
    ['top','y1','y2',200,0],['middle','y1','y2',600,.5],['bottom','y1','y2',1000,1],
    ['horizontal','x1','x2',null,null],['vertical','y1','y2',null,null]]) {
    await resetMulti();
    if(mode==='vertical') await page.evaluate(()=>{
      const data=structuredClone(window.multiData),layout=JSON.parse(data.widgets_values[3]);
      layout.boxes[1].y1=530;layout.boxes[1].y2=730;data.widgets_values[3]=JSON.stringify(layout);
      window.gestureNode.configure(data);
    });
    const arrangeOriginal=await gestureBoxes();
    await selectPair();await selectAt(710,900);
    await gestures.getByRole('checkbox',{name:'Snap to guides',exact:true}).check();
    await arrangement.selectOption(mode);const boxes=await gestureBoxes();
    if(target!==null) for(const b of boxes)assertGestureClose(b[axis]+(b[end]-b[axis])*factor,target);
    else {
      assertGestureClose(boxes[1][axis]-boxes[0][end],boxes[2][axis]-boxes[1][end]);
      assert.deepEqual(geometry([boxes[0],boxes[2]]),geometry([arrangeOriginal[0],arrangeOriginal[2]]));
    }
    boxes.forEach((b,i)=>{
      assertGestureClose(b.x2-b.x1,arrangeOriginal[i].x2-arrangeOriginal[i].x1);
      assertGestureClose(b.y2-b.y1,arrangeOriginal[i].y2-arrangeOriginal[i].y1);
      assert.equal(b.id,arrangeOriginal[i].id);assert.equal(b.text,arrangeOriginal[i].text);
    });
    assert.equal(await arrangement.inputValue(),'');
    await gu.click();assert.deepEqual(geometry(await gestureBoxes()),geometry(arrangeOriginal));
    assert.equal(await gu.isDisabled(),true);await gr.click();assert.deepEqual(geometry(await gestureBoxes()),geometry(boxes));
    await arrangement.selectOption(mode);await gu.click(); // Reapplying a no-op must not add history.
    assert.deepEqual(geometry(await gestureBoxes()),geometry(arrangeOriginal));
    assert.deepEqual(await arrangeRect(),arrangeStartRect);
  }
  await resetMulti();await selectPair();
  await gestures.getByRole('button',{name:'Lock selected boxes',exact:true}).click();
  assert.equal(await arrangement.isDisabled(),true);
  await gu.click();assert.equal(await arrangement.isDisabled(),false);
  await arrangement.selectOption('top');
  const arrangedSave=await page.evaluate(()=>window.gestureNode.save());const arrangedGeometry=geometry(await gestureBoxes());
  assert.equal(arrangedSave.widgets_values.length,9);
  await page.evaluate(data=>window.gestureNode.configure(data),arrangedSave);
  assert.deepEqual(geometry(await gestureBoxes()),arrangedGeometry);assert.equal(await arrangement.isDisabled(),true);
  await gestures.screenshot({path:resolve(artifacts,'canvas-arrangement.jpg'),type:'jpeg',quality:85});
  Object.assign(result,{arrange_six_modes:true,distribute_two_axes:true,arrange_snap_independent:true,
    arrange_locks:true,arrange_history:true,arrange_noop_history:true,arrange_reload:true,arrange_stable_layout:true});

  // Locked boxes remain selectable and serializable, but reject direct geometry edits.
  await resetMulti(); await selectPair();
  const lock=gestures.getByRole('button',{name:'Lock selected boxes',exact:true});
  await lock.click(); assert.deepEqual((await gestureBoxes()).map(b=>!!b.locked),[true,true,false]);
  const graphKeysBeforeLock=await page.evaluate(()=>window.graphHistoryKeys);
  await lock.press('Control+z');assert.deepEqual((await gestureBoxes()).map(b=>!!b.locked),[false,false,false]);
  await lock.press('Control+Shift+z');assert.deepEqual((await gestureBoxes()).map(b=>!!b.locked),[true,true,false]);
  assert.equal(await page.evaluate(()=>window.graphHistoryKeys),graphKeysBeforeLock);
  const lockedGeometry=geometry(await gestureBoxes());
  await drag(160,300,210,340,gestureCanvas);
  await modifierDrag('Shift',250,400,300,450);
  await modifierDrag('Alt',160,300,230,360);
  await gestureCanvas.press('Shift+ArrowRight'); await gestureCanvas.press('Delete');
  await clickAt(250,200); // Locked delete badge selects rather than deletes.
  assert.deepEqual(geometry(await gestureBoxes()),lockedGeometry);
  assert.equal(await gestures.getByRole('spinbutton',{name:'BBOX x',exact:true}).isDisabled(),true);
  await gu.click();assert.deepEqual((await gestureBoxes()).map(b=>!!b.locked),[false,false,false]);
  await gr.click();assert.deepEqual((await gestureBoxes()).map(b=>!!b.locked),[true,true,false]);
  const lockedSave=await page.evaluate(()=>window.gestureNode.save());
  await page.evaluate(data=>window.gestureNode.configure(data),lockedSave);
  await clickAt(160,300);await lock.click();
  await drag(160,300,170,310,gestureCanvas);
  assertMoved((await gestureBoxes())[0],multiOriginal[0],10,10);
  // Mixed selection cannot translate/duplicate; Delete preserves the locked member.
  await selectAt(410,600);const mixed=geometry(await gestureBoxes());
  await gestureCanvas.press('ArrowRight');await modifierDrag('Alt',170,310,240,370);
  assert.deepEqual(geometry(await gestureBoxes()),mixed);
  await gestureCanvas.press('Delete');assert.deepEqual((await gestureBoxes()).map(b=>b.id),['b','c']);
  await gu.click();assert.deepEqual(geometry(await gestureBoxes()),mixed);
  Object.assign(result,{locks_geometry:true,locks_group_guard:true,locks_delete_guard:true,locks_history:true,locks_reload:true,locks_unlock:true});

  // A direct Load Image connection reads the file without queueing a prompt.
  await resetMulti();
  await page.evaluate(()=>{
    window.queueCalls=0;window.comfyAPI.app.app.queuePrompt=()=>{window.queueCalls++};
    const node=window.gestureNode, graph=node.graph;
    window.referenceLoader={id:99999,type:'LoadImage',widgets:[{name:'image',value:'reference.webp'}]};
    graph._nodes.push(window.referenceLoader);graph.links.set(99998,{origin_id:99999,origin_slot:0});
    node.inputs.push({name:'reference_image',link:99998});
  });
  const refToggle=gestures.getByRole('button',{name:'Show reference image',exact:true});
  const refFit=gestures.getByRole('button',{name:'Match reference image size',exact:true});
  const refOpacity=gestures.getByRole('slider',{name:'Reference opacity',exact:true});
  await page.waitForFunction(()=>!window.gestureNode.host.querySelector('[aria-label="Match reference image size"]').disabled);
  assert.equal(await refToggle.getAttribute('aria-pressed'),'false'); assert.equal(await refOpacity.inputValue(),'50');
  const canvasSize=()=>page.evaluate(()=>window.gestureNode.widgets.slice(0,2).map(w=>w.value));
  assert.deepEqual(await canvasSize(),[896,1184]);assert.deepEqual(geometry(await gestureBoxes()),geometry(multiOriginal));
  const bgPixel=()=>page.evaluate(()=>{
    const c=window.gestureNode.host.querySelector('.moss-k2cf-bg');
    return [...c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data];
  });
  const offPixel=await bgPixel(); await refToggle.click();const halfPixel=await bgPixel();
  assert(halfPixel[0]>offPixel[0]+50);assert(halfPixel[0]<255);
  await refOpacity.fill('100');await refOpacity.dispatchEvent('input');assert.deepEqual(await bgPixel(),[255,0,0,255]);
  const topPixel=await page.evaluate(()=>[...window.gestureNode.host.querySelector('.moss-k2cf-bg').getContext('2d').getImageData(448,5,1,1).data]);
  assert(topPixel[0]<100,'letterboxing preserves aspect ratio');
  await refToggle.click();assert.deepEqual(await bgPixel(),offPixel);
  await refToggle.click();assert.equal(await gu.isDisabled(),true,'display-only changes are not Canvas history');
  await refFit.click();assert.deepEqual(await canvasSize(),[1200,800]);
  for (const [i,b] of (await gestureBoxes()).entries()) {
    assertGestureClose(b.x1,multiOriginal[i].x1/896*1200);
    assertGestureClose(b.y1,multiOriginal[i].y1/1184*800);
  }
  await gu.click();assert.deepEqual(await canvasSize(),[896,1184]);assert.deepEqual(geometry(await gestureBoxes()),geometry(multiOriginal));
  await gr.click();assert.deepEqual(await canvasSize(),[1200,800]);
  const refSaved=await page.evaluate(()=>window.gestureNode.save());
  await page.evaluate(data=>window.gestureNode.configure(data),refSaved);
  await page.waitForFunction(()=>!window.gestureNode.host.querySelector('[aria-label="Match reference image size"]').disabled);
  assert.equal(await refToggle.getAttribute('aria-pressed'),'true');assert.equal(await refOpacity.inputValue(),'100');
  assert.deepEqual(await canvasSize(),[1200,800]);
  await page.evaluate(()=>{window.gestureNode.inputs.push({name:'width_override',link:99997});});
  await page.waitForFunction(()=>window.gestureNode.host.querySelector('[aria-label="Match reference image size"]').disabled);
  await page.evaluate(()=>{window.gestureNode.inputs=window.gestureNode.inputs.filter(i=>i.name!=='width_override');window.referenceLoader.widgets[0].value='missing.webp';});
  await page.waitForFunction(()=>window.gestureNode.host.textContent.includes('Image unavailable'));
  assert.equal(await refFit.isDisabled(),true);
  assert.deepEqual(await canvasSize(),[1200,800]);
  await page.evaluate(()=>{window.gestureNode.inputs.find(i=>i.name==='reference_image').link=null;});
  await page.waitForFunction(()=>window.gestureNode.host.textContent.includes('Connect Load Image'));
  assert.equal(await refFit.isDisabled(),true);assert.equal(await page.evaluate(()=>window.queueCalls),0);
  await page.evaluate(()=>{window.gestureNode.inputs.find(i=>i.name==='reference_image').link=99998;window.referenceLoader.widgets[0].value='reference.webp';});
  await page.waitForFunction(()=>!window.gestureNode.host.querySelector('[aria-label="Match reference image size"]').disabled);
  await gestures.screenshot({path:resolve(artifacts,'canvas-lock-reference.jpg'),type:'jpeg',quality:85});
  // Non-Load Image execution data cannot override dimensions automatically.
  await page.evaluate(()=>{
    window.referenceLoader.type='IndependentImageSource';
    window.gestureNode.onExecuted({moss_canvas_reference:[{image:{filename:'reference.webp',type:'temp'},size:[641,479]}]});
  });
  await page.waitForFunction(()=>window.gestureNode.host.textContent.includes('641 × 479'));
  assert.deepEqual(await canvasSize(),[1200,800]);
  await refFit.click();assert.deepEqual(await canvasSize(),[640,480]);
  await refFit.press('Control+z');assert.deepEqual(await canvasSize(),[1200,800]);
  await refFit.press('Control+Shift+z');assert.deepEqual(await canvasSize(),[640,480]);
  assert.equal(await page.evaluate(()=>window.graphHistoryKeys),graphKeysBeforeLock);
  await page.evaluate(()=>{
    const node=window.gestureNode,data=node.save();data.widgets_values[3]='{"boxes": [';data.properties.k2cfCanvasState=undefined;node.configure(data);
    window.referenceLoader.type='LoadImage';
  });
  await page.waitForFunction(()=>window.gestureNode.host.textContent.includes('1200 × 800'));
  assert.equal(await refFit.isDisabled(),true);
  await refToggle.click();await refToggle.click();
  assert.equal(await page.evaluate(()=>window.gestureNode.save().widgets_values[3]),'{"boxes": [');
  assert.deepEqual(await canvasSize(),[640,480]);
  Object.assign(result,{reference_execution:true,reference_native_size_rounding:true,reference_button_keyboard_history:true,reference_corrupt_guard:true});
  Object.assign(result,{reference_default_off:true,reference_no_auto_resize:true,reference_opacity_pixels:true,
    reference_contain:true,reference_explicit_fit:true,reference_fit_history:true,reference_reload:true,
    reference_missing_disconnect:true,reference_external_size_guard:true,reference_no_queue:true});
  assert.deepEqual(errors,[]);
  await snapping.screenshot({path:resolve(artifacts,'canvas-snap.jpg'),type:'jpeg',quality:85});
  Object.assign(result,{snap_default_off:true,snap_center_move:true,snap_thirds_resize:true,snap_history:true,snap_numeric_keyboard_exact:true,snap_reload:true,snap_zoom:true,snap_cancel:true});
  Object.assign(result,{canvas_history:true,overlap_select_and_drag:true,keyboard_isolation:true,early_graph_shortcut_isolation:true,pointer_cancel:true,configure_during_drag:true,external_size_history:true});
  Object.assign(result,{corrupt_layouts_preserved:corruptLayouts.length,corrupt_serialization_roundtrip:true,corrupt_prompt_preparation:true,explicit_reset_recovery:true,valid_reload_recovery:true,intentional_empty_layouts:true});
  // The two new colors use the existing edit/history path, not a separate editor.
  await page.evaluate(()=>{window.sevenNode=window.makeEditNode();document.querySelector('#nodes').prepend(window.sevenNode.host)});
  const sevenHost=page.locator('.host').first(),sevenCanvas=sevenHost.locator('.moss-k2cf-overlay');
  const sevenUndo=sevenHost.getByRole('button',{name:'Undo Canvas edit',exact:true});
  const sevenRedo=sevenHost.getByRole('button',{name:'Redo Canvas edit',exact:true});
  const sevenBoxes=()=>page.evaluate(()=>JSON.parse(window.sevenNode.widgets.find(w=>w.name==='layout_data').value).boxes);
  assert.equal(await sevenHost.locator('.moss-k2cf-sw').count(),7);
  for(const width of [830,640,430]){
    await page.evaluate(width=>{window.sevenNode.host.style.width=width+'px';window.sevenNode.size[0]=width;window.sevenNode.onResize?.(window.sevenNode.size)},width);
    const layout=await sevenHost.evaluate(async host=>{
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const outer=host.getBoundingClientRect();
      return [...host.querySelectorAll('.moss-k2cf-toolbar button,.moss-k2cf-toolbar select,.moss-k2cf-toolbar label')].map(el=>{
        const r=el.getBoundingClientRect();return {label:el.getAttribute('aria-label')||el.dataset.slot||el.textContent,x:r.x-outer.x,right:r.right-outer.x};
      });
    });
    assert(layout.every(r=>r.x>=-1 && r.right<=width+1),JSON.stringify({width,layout}));
  }
  await page.evaluate(()=>{window.sevenNode.host.style.width='830px';window.sevenNode.size[0]=830;window.sevenNode.onResize?.(window.sevenNode.size)});
  for(const [slot,y,color] of [['cyan',300,'rgb(0, 200, 215)'],['orange',600,'rgb(255, 149, 0)']]){
    const swatch=sevenHost.locator(`.moss-k2cf-sw[data-slot="${slot}"]`);
    assert.equal(await swatch.evaluate(el=>getComputedStyle(el).backgroundColor),color);
    await swatch.click();await sevenHost.locator('button[data-moss-help="draw"]').click();
    await drag(640,y,780,y+180,sevenCanvas);
    assert.equal((await sevenBoxes()).at(-1).slot,slot);
  }
  const drawnSeven=geometry(await sevenBoxes());assert.equal(drawnSeven.length,3);
  await sevenUndo.click();assert.equal((await sevenBoxes()).length,2);
  await sevenRedo.click();assert.deepEqual(geometry(await sevenBoxes()),drawnSeven);
  const cyanPoint=await coords(710,390,sevenCanvas),orangePoint=await coords(710,690,sevenCanvas);
  await page.mouse.click(cyanPoint.x,cyanPoint.y);await page.keyboard.down('Control');
  await page.mouse.click(orangePoint.x,orangePoint.y);await page.keyboard.up('Control');
  await sevenCanvas.press('ArrowRight');
  const movedSeven=geometry(await sevenBoxes());
  assert.equal(movedSeven[1].x1,drawnSeven[1].x1+1);assert.equal(movedSeven[2].x1,drawnSeven[2].x1+1);
  await sevenUndo.click();assert.deepEqual(geometry(await sevenBoxes()),drawnSeven);
  await sevenRedo.click();assert.deepEqual(geometry(await sevenBoxes()),movedSeven);
  await page.keyboard.down('Alt');await drag(710,390,730,410,sevenCanvas);await page.keyboard.up('Alt');
  assert.deepEqual((await sevenBoxes()).map(b=>b.slot),['red','cyan','orange','cyan','orange']);
  await sevenHost.getByRole('button',{name:'Lock selected boxes',exact:true}).click();
  const lockedSeven=await sevenBoxes();assert(lockedSeven.slice(3).every(b=>b.locked===true));
  await sevenCanvas.press('ArrowRight');assert.deepEqual(await sevenBoxes(),lockedSeven);
  await sevenUndo.click();assert((await sevenBoxes()).slice(3).every(b=>!b.locked));
  await sevenUndo.click();assert.deepEqual(geometry(await sevenBoxes()),movedSeven);
  await sevenRedo.click();await sevenRedo.click();assert.deepEqual(await sevenBoxes(),lockedSeven);
  const sevenSave=await page.evaluate(()=>window.sevenNode.save());
  assert.equal(sevenSave.widgets_values.length,9);
  await page.evaluate(data=>window.sevenNode.configure(data),sevenSave);
  assert.deepEqual(await sevenBoxes(),lockedSeven);
  const boxSize=await sevenCanvas.boundingBox();await sevenHost.locator('.moss-k2cf-sw[data-slot="cyan"]').click();
  assert.deepEqual(await sevenCanvas.boundingBox(),boxSize);
  await sevenHost.screenshot({path:resolve(artifacts,'seven-slots-canvas.jpg'),type:'jpeg',quality:85});
  Object.assign(result,{seven_color_buttons:true,cyan_orange_draw:true,extra_color_history:true,
    extra_color_multi_move_duplicate:true,extra_color_locks:true,extra_color_reload:true,extra_color_stable_layout:true});
  await page.evaluate(()=>{window.importNode=window.makeEditNode();window.importNode.host.id='import-node';});
  const importHost=page.locator('#import-node');
  const importBoxes=()=>page.evaluate(()=>JSON.parse(window.importNode.widgets.find(w=>w.name==='layout_data').value).boxes);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const initialImport=await importBoxes();
  const importSize=await importHost.locator('.moss-k2cf-overlay').count();
  await importHost.getByText('JSON…',{exact:true}).click();
  const modal=page.locator('dialog.moss-layout-import');
  assert.equal(await modal.getByLabel('Mode',{exact:true}).inputValue(),'append');
  assert.equal(await modal.getByLabel('Size',{exact:true}).inputValue(),'current');
  await modal.locator('textarea').fill('{');
  assert(await modal.getByRole('button',{name:'Apply',exact:true}).isDisabled());
  assert.deepEqual(geometry(await importBoxes()),geometry(initialImport));
  const importRaw=JSON.stringify({width:896,height:1184,boxes:[{slot:'cyan',x1:0,y1:0,x2:200,y2:200},{slot:'orange',x1:200,y1:200,x2:400,y2:400}]});
  await modal.locator('textarea').fill(importRaw);
  await modal.getByRole('button',{name:'Apply',exact:true}).click();
  const imported=await importBoxes();assert.equal(imported.length,3);assert.equal(imported[1].x1,0);
  assert.equal(new Set(imported.map(b=>b.id)).size,3);
  await importHost.getByRole('button',{name:'Undo Canvas edit',exact:true}).click();assert.deepEqual(geometry(await importBoxes()),geometry(initialImport));
  await importHost.getByRole('button',{name:'Redo Canvas edit',exact:true}).click();assert.deepEqual(await importBoxes(),imported);
  const importSave=await page.evaluate(()=>window.importNode.save());
  await page.evaluate(data=>window.importNode.configure(data),importSave);assert.deepEqual(await importBoxes(),imported);
  await importHost.getByText('JSON…',{exact:true}).click();
  await modal.locator('textarea').fill(JSON.stringify({items:[{label:'text',bbox:[-256,-256,256,256]}],bbox_format:'yxyx',bbox_coord_space:'abs_centralized'}));
  assert(await modal.getByRole('button',{name:'Apply',exact:true}).isDisabled());
  await modal.getByLabel('Source width',{exact:true}).fill('512');await modal.getByLabel('Source height',{exact:true}).fill('512');
  await modal.getByLabel('Mode',{exact:true}).selectOption('replace');await modal.getByLabel('Size',{exact:true}).selectOption('source');
  await modal.getByLabel('Color 1',{exact:true}).selectOption('orange');
  await modal.getByRole('button',{name:'Apply',exact:true}).click();
  assert.equal((await importBoxes()).length,1);assert.equal((await importBoxes())[0].slot,'orange');assert.equal((await importBoxes())[0].x2,512);
  assert.deepEqual(await page.evaluate(()=>window.importNode.widgets.slice(0,2).map(w=>w.value)),[512,512]);
  await importHost.getByRole('button',{name:'Undo Canvas edit',exact:true}).click();assert.deepEqual(await importBoxes(),imported);
  assert.deepEqual(await page.evaluate(()=>window.importNode.widgets.slice(0,2).map(w=>w.value)),[896,1184]);
  await importHost.getByText('JSON…',{exact:true}).click();
  await modal.locator('input[type=file]').setInputFiles({name:'layout.json',mimeType:'application/json',buffer:Buffer.from(importRaw)});
  await modal.getByRole('button',{name:'Apply',exact:true}).click();assert.equal((await importBoxes()).length,5);
  await importHost.getByRole('button',{name:'Lock selected boxes',exact:true}).click();
  const importLocked=await importBoxes();assert(importLocked.slice(3).every(b=>b.locked));
  await importHost.getByText('JSON…',{exact:true}).click();await modal.locator('textarea').fill(importRaw);
  await modal.getByLabel('Mode',{exact:true}).selectOption('replace');assert(await modal.getByRole('button',{name:'Apply',exact:true}).isDisabled());
  await modal.getByLabel('Mode',{exact:true}).selectOption('append');await modal.getByRole('button',{name:'Apply',exact:true}).click();
  assert.deepEqual((await importBoxes()).slice(0,5),importLocked);
  assert.equal(await importHost.locator('.moss-k2cf-overlay').count(),importSize);
  Object.assign(result,{layout_import_file:true,layout_import_paste:true,layout_import_defaults:true,layout_import_invalid:true,layout_import_history:true,layout_import_edge_reload:true,layout_import_locks:true});
  // ComfyUI locale wins over the saved Canvas language in either direction.
  const beforeLocaleCheck=await importBoxes();
  await page.evaluate(()=>{window.helpLocale='ja';window.importNode.widgets.find(w=>w.name==='ui_language').value='English';});
  await importHost.getByText('JSON…',{exact:true}).click();
  assert.equal(await modal.locator('h3').innerText(),'配置JSONを読み込む');
  assert(await modal.getByText('ファイルが選択されていません',{exact:true}).isVisible());
  assert(await modal.locator('input[type=file]').isHidden());
  assert.equal(await modal.getByLabel('反映方法',{exact:true}).inputValue(),'append');
  assert.equal(await modal.getByLabel('サイズ',{exact:true}).inputValue(),'current');
  await modal.locator('textarea').fill('{');
  assert.equal(await modal.getByRole('status').innerText(),'JSONの構文が不正です。');
  const chooserPromise=page.waitForEvent('filechooser');
  await modal.getByRole('button',{name:'JSONファイルを選択',exact:true}).click();
  const chooser=await chooserPromise;
  await chooser.setFiles({name:'配置.json',mimeType:'application/json',buffer:Buffer.from(importRaw)});
  await page.waitForFunction(()=>document.querySelector('dialog textarea').value.startsWith('{"width"'));
  assert(await modal.getByText('配置.json',{exact:true}).isVisible());
  assert(await modal.getByRole('button',{name:'適用',exact:true}).isEnabled());
  await modal.getByRole('button',{name:'取消',exact:true}).click();
  await page.evaluate(()=>{window.helpLocale='en';window.importNode.widgets.find(w=>w.name==='ui_language').value='Japanese';});
  await importHost.getByText('JSON…',{exact:true}).click();
  assert.equal(await modal.locator('h3').innerText(),'Import layout JSON');
  assert(await modal.getByRole('button',{name:'Choose JSON file',exact:true}).isVisible());
  assert(await modal.getByText('No file selected',{exact:true}).isVisible());
  assert(await modal.locator('input[type=file]').isHidden());
  assert(!/[\u3040-\u30ff\u4e00-\u9fff]/u.test(await modal.innerText()));
  await modal.locator('textarea').fill('{');
  assert.equal(await modal.getByRole('status').innerText(),'Invalid JSON.');
  await modal.locator('textarea').fill(importRaw);
  assert(await modal.getByRole('button',{name:'Apply',exact:true}).isEnabled());
  await modal.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.deepEqual(await importBoxes(),beforeLocaleCheck);
  Object.assign(result,{layout_import_comfy_locale:true,layout_import_localized_file_chooser:true,layout_import_locale_cancel_preserves_boxes:true});
  assert.deepEqual(errors,[]);
  await writeFile(resolve(artifacts,'canvas-footer-checks.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({fixture_stopped:true,http_listening:server.listening}));
}
