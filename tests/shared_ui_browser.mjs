// CPU browser fixture: runs the bundled standalone renderer, never contacts ComfyUI or queues a prompt.
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
const fixture = `<!DOCTYPE html><meta charset="utf-8"><title>MOSS Type fixture</title>
<style>body{background:#151515;color:white;font:14px sans-serif}.host{width:540px;height:1000px;display:inline-block;vertical-align:top;margin:12px}</style>
<h2>MOSS shared renderer — isolated CPU fixture</h2><canvas id="graph-canvas" hidden></canvas><main id="nodes"></main>
<script type="module">
const extensions=[];
const graph={_nodes:[],extra:{},setDirtyCanvas(){}};
const app={graph,rootGraph:graph,canvas:{canvas:document.querySelector('#graph-canvas'),ds:{scale:1}},
registerExtension(e){extensions.push(e)},queuePrompt(){},graphToPrompt(){}};
window.comfyAPI={app:{app}};
${process.env.KREA2_UI_SOURCE ? "await import('/external-krea.js');" : ""}
await import('/web/moss_shared_ui.js');const {installControls}=await import('/web/moss_controls.mjs');
const colors=['red','blue','yellow','green','magenta'];
const names=['scene','background',...colors.map(s=>s+'_prompt'),...colors.map(s=>s+'_type'),
'prompt_ui_data',...colors.map(s=>s+'_framing'),...colors.map(s=>s+'_angle')];
let sequence=0;
class Node {
 constructor(kind){this.type=kind;this.comfyClass=kind;this.id=++sequence;this.graph=graph;this.properties={};this.size=[540,990];
 this.widgets=names.map(name=>({name,value:name.endsWith('_type')?(kind==='MOSSSharedPrompter'?'object':'obj'):
 name.endsWith('_framing')||name.endsWith('_angle')?'Auto':'',options:{}}));
 this.host=document.createElement('section');this.host.className='host';document.querySelector('#nodes').append(this.host);
 graph._nodes.push(this);this.onNodeCreated();}
 addDOMWidget(name,type,element,options){this.host.append(element);const w={name,type,element,options};this.widgets.push(w);return w}
 setSize(size){this.size=Array.from(size)}
 computeSize(){return this.size}
 setDirtyCanvas(){}
 configure(info){this.properties=structuredClone(info.properties||{});info.widgets_values?.forEach((v,i)=>{if(this.widgets[i])this.widgets[i].value=v});this.onConfigure(info)}
 save(){const data={widgets_values:this.widgets.slice(0,names.length).map(w=>w.value),properties:structuredClone(this.properties),size:this.size.slice()};this.onSerialize?.(data);return data}
}
class Shared extends Node{constructor(){super('MOSSSharedPrompter')}}
class Moss extends Node{constructor(){super('MOSSSharedPrompter')}}
installControls(Shared,{name:'MOSSSharedPrompter'});
for(const e of extensions)await e.beforeRegisterNodeDef?.(Moss,{name:'MOSSSharedPrompter'});
window.nodes={first:new Moss(),original:new Shared()};
window.clone=(data)=>{const node=new Moss();node.configure(data);return node};
window.makeExternal=()=>{
 class External extends Node{constructor(){super('Krea2ElementFramingV1Prompt')}}
 for(const e of extensions)e.beforeRegisterNodeDef?.(External,{name:'Krea2ElementFramingV1Prompt'});
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
    else if (request.url === "/web/moss_shared_ui.js") content = await readFile(resolve(root, "web/moss_shared_ui.js"));
    else if (request.url === "/scripts/app.js") content = "export const app=window.comfyAPI.app.app;";
    else { response.writeHead(404); response.end(); return; }
    response.setHeader("Content-Type", request.url === "/" ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8");
    response.end(content);
  } catch (error) { response.writeHead(500); response.end(String(error)); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
console.log(JSON.stringify({fixture_pid:process.pid,port:server.address().port,launch:"node tests/shared_ui_browser.mjs",gpu:false}));
let browser;
try {
  browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:["--disable-gpu"]});
  const page = await browser.newPage({viewport:{width:1700,height:1150}});
  page.setDefaultTimeout(15000);
  const errors=[];page.on("pageerror", error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>window.ready);
  const first=page.locator('.host').nth(0);
  assert.deepEqual(await first.locator('.moss-k2cf-type').first().locator('option').evaluateAll(es=>es.map(e=>e.value)),['character','object','text']);
  await first.locator('.moss-k2cf-type').nth(0).selectOption('character');
  await first.locator('.moss-k2cf-type').nth(1).selectOption('object');
  await first.locator('.moss-k2cf-slot-head').nth(2).click();
  await first.locator('.moss-k2cf-type').nth(2).selectOption('text');
  await first.locator('.moss-k2cf-scene textarea').fill('MOSS 日本語 😀 {keep|原文}');
  const literal='  text: "A | B"\n日本語 😀\n\nlast line  ';
  await first.locator('.moss-k2cf-slot-card').nth(2).locator('textarea').fill(literal);
  const saved=await page.evaluate(()=>window.nodes.first.save());
  assert.deepEqual(saved.widgets_values.slice(7,10),['character','object','text']);
  assert.equal(saved.widgets_values[4],literal);
  await page.evaluate(data=>{window.nodes.copy=window.clone(data)},saved);
  await page.waitForFunction(()=>document.querySelectorAll('.host')[2]?.querySelectorAll('.moss-k2cf-type')[0]?.value==='character');
  assert.deepEqual(await page.locator('.host').nth(2).locator('.moss-k2cf-type').evaluateAll(es=>es.map(e=>e.value)),['character','object','text','object','object']);
  assert.equal(await page.locator('.host').nth(2).locator('.moss-k2cf-slot-card').nth(2).locator('textarea').inputValue(),literal);
  await page.locator('.host').nth(2).locator('.moss-k2cf-type').nth(0).selectOption('object');
  assert.equal(await first.locator('.moss-k2cf-type').nth(0).inputValue(),'character');
  const legacy=structuredClone(saved);legacy.widgets_values[7]='obj';legacy.properties.k2cfPromptState.widgets_values[7]='obj';
  await page.evaluate(data=>{window.nodes.legacy=window.clone(data)},legacy);
  await page.waitForFunction(()=>document.querySelectorAll('.host')[3]?.querySelectorAll('.moss-k2cf-type')[0]?.value==='object');
  assert.deepEqual(await page.locator('.host').nth(1).locator('.moss-k2cf-type').first().locator('option').evaluateAll(es=>es.map(e=>e.value)),['obj','text']);
  const untouched=await page.evaluate(()=>{
    let calls=0;window.comfyAPI.app.app.graph._nodes.push({type:'UnrelatedNode',__k2cfPromptUiSnapshot(){calls++}});
    window.dispatchEvent(new Event('blur'));return calls;
  });
  assert.equal(untouched,0);
  const results={standalone:!process.env.KREA2_UI_SOURCE,coexistence:!!process.env.KREA2_UI_SOURCE,unrelated_nodes_untouched:true,three_choices:true,latest_types_saved:true,clone_restores_types:true,literal_text_roundtrip:true,clone_isolation:true,legacy_obj_restores_object:true,raw_controls_unchanged:true,page_errors:errors};
  if(process.env.KREA2_UI_SOURCE){
    await page.evaluate(()=>window.makeExternal());
    assert.equal(await page.evaluate(()=>window.external.host.querySelectorAll('[class^="moss-k2cf-"]').length),0);
    assert.equal(await page.evaluate(()=>window.external.host.querySelectorAll('[class^="k2cf-"]').length>0),true);
  }
  assert.deepEqual(errors,[]);
  await page.screenshot({path:resolve(artifacts,'three-types-isolated.jpg'),type:'jpeg',quality:75});
  await writeFile(resolve(artifacts,'three-types-browser.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({fixture_stopped:true,http_listening:server.listening}));
}
