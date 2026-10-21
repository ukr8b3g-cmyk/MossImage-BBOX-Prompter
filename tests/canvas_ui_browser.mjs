// Actual shared Canvas renderer in a CPU-only fixture; never contacts ComfyUI.
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
<h2>Actual shared Canvas renderer — isolated CPU comparison</h2><canvas id="graph-canvas" hidden></canvas><main id="nodes"></main>
<script type="module">
const extensions=[];
const graph={_nodes:[],extra:{},links:new Map(),getNodeById(id){return this._nodes.find(n=>n.id===id)},setDirtyCanvas(){}};
const app={graph,rootGraph:graph,canvas:{canvas:document.querySelector('#graph-canvas'),ds:{scale:1}},registerExtension(e){extensions.push(e)},queuePrompt(){},graphToPrompt(){}};
window.comfyAPI={app:{app}};
await import('/shared.js');await import('/web/moss_shared_ui.js');
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
class Shared extends Node{constructor(){super('Krea2ElementFramingV1Canvas')}}
class Moss extends Node{constructor(){super('MOSSSharedCanvas')}}
for(const [type,name]of [[Shared,'Krea2ElementFramingV1Canvas'],[Moss,'MOSSSharedCanvas']])for(const extension of extensions)await extension.beforeRegisterNodeDef?.(type,{name});
window.original=new Shared();window.moss=new Moss();window.makeCopy=data=>{const node=new Moss();node.configure(data);return node};
window.ready=true;
</script>`;
const server = createServer(async (request, response) => {
  try {
    let content;
    if (request.url === "/") content = fixture;
    else if (request.url === "/shared.js") content = await readFile(resolve(root, "../Krea2-BBOX-Prompter/web/krea2_element_framing_v1.js"));
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
    const footer=window.moss.host.querySelector('.k2cf-panels');
    return {oldHeight:window.original.host.querySelector('.k2cf-panels').getBoundingClientRect().height,
      height:footer.getBoundingClientRect().height,panels:[...footer.children].map(box),
      controls:[footer.querySelector('.moss-size-preset select'),...footer.querySelectorAll('.moss-size-dimensions input')].map(box),
      overflow:[...footer.querySelectorAll('.k2cf-panel')].some(e=>e.scrollWidth>e.clientWidth+1)};
  });
  const initial=await metrics();
  assert.equal(initial.panels.length,3);
  assert(initial.height<=initial.oldHeight*.75,JSON.stringify(initial));
  assert(initial.panels.every(p=>Math.abs(p.height-initial.panels[0].height)<1&&Math.abs(p.y-initial.panels[0].y)<1));
  assert(initial.controls.every(p=>Math.abs(p.y-initial.controls[0].y)<1));
  assert.equal(initial.overflow,false);
  const originalFooter=page.locator('.host').nth(0).locator('.k2cf-panels');
  const moss=page.locator('.host').nth(1);
  const footer=moss.locator('.k2cf-panels');
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
  await moss.locator('.k2cf-camera-cell select').nth(0).selectOption('200');
  await moss.locator('.k2cf-camera-cell select').nth(3).selectOption('50mm');
  assert.equal(JSON.parse((await values()).camera_data).iso,'200');
  assert.equal(JSON.parse((await values()).camera_data).focal_length,'50mm');
  page.once('dialog',dialog=>dialog.accept('Compact footer fixture'));
  await moss.getByRole('button',{name:'Save Preset',exact:true}).click();
  await moss.locator('.k2cf-camera-cell select').nth(0).selectOption('800');
  await moss.getByRole('button',{name:'Load',exact:true}).click();
  assert.equal(JSON.parse((await values()).camera_data).iso,'200');
  const saved=await page.evaluate(()=>window.moss.save());
  await page.evaluate(data=>{window.copy=window.makeCopy(data)},saved);
  await page.waitForFunction(()=>window.copy?.host.querySelector('input[type=number]')?.value==='896');
  assert.equal(await page.locator('.host').nth(2).locator('.k2cf-panels>.k2cf-panel').count(),3);
  assert.equal(await page.locator('.host').nth(2).locator('.k2cf-camera-cell select').nth(0).inputValue(),'200');

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
  await moss.locator('.k2cf-external-badge').waitFor({state:'visible'});
  assert.equal(await moss.locator('.moss-size-dimensions input').nth(0).inputValue(),'1280');
  const external=await metrics();assert.equal(external.overflow,false);
  assert(external.panels.every(p=>Math.abs(p.height-external.panels[0].height)<1));
  assert.equal(await originalFooter.locator(':scope>.k2cf-panel').count(),2);
  assert.equal(await originalFooter.locator('.moss-size-panel').count(),0);
  assert.deepEqual(errors,[]);
  const result={before_height:initial.oldHeight,after_height:initial.height,reduction_percent:Math.round(100*(1-initial.height/initial.oldHeight)),equal_panels:true,horizontal_latent_controls:true,size_presets:true,camera_values:true,canvas_preset_roundtrip:true,clone_restores:true,external_override_status:true,responsive,original_Krea_unchanged:true,page_errors:errors};
  await writeFile(resolve(artifacts,'canvas-footer-checks.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({fixture_stopped:true,http_listening:server.listening}));
}
