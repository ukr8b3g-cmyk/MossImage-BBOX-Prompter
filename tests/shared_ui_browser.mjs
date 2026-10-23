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
<style>body{background:#151515;color:white;font:14px sans-serif}.host{width:540px;height:1000px;display:inline-block;vertical-align:top;margin:12px}.host>.moss-k2cf-prompt-wrap{height:100%}</style>
<h2>MOSS shared renderer — isolated CPU fixture</h2><canvas id="graph-canvas" hidden></canvas><main id="nodes"></main>
<script type="module">
const extensions=[];
const graph={_nodes:[],extra:{},setDirtyCanvas(){}};
const app={graph,rootGraph:graph,canvas:{canvas:document.querySelector('#graph-canvas'),ds:{scale:1}},
registerExtension(e){extensions.push(e)},queuePrompt(){},graphToPrompt(){}};
window.comfyAPI={app:{app}};
app.ui={settings:{getSettingValue:()=>window.helpLocale||'en'}};
await import('/web/moss_help.js');
${process.env.KREA2_UI_SOURCE ? "await import('/external-krea.js');" : ""}
await import('/web/moss_shared_ui.js');const {installControls}=await import('/web/moss_controls.mjs');
const colors=['red','blue','yellow','green','magenta'];
const names=['scene','background',...colors.map(s=>s+'_prompt'),...colors.map(s=>s+'_type'),
'prompt_ui_data',...colors.map(s=>s+'_framing'),...colors.map(s=>s+'_angle'),
...['cyan','orange'].flatMap(s=>[s+'_prompt',s+'_type',s+'_framing',s+'_angle'])];
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
    else if (request.url === "/web/canvas_editing.mjs") content = await readFile(resolve(root, "web/canvas_editing.mjs"));
    else if (["/web/canvas_reference.mjs","/web/text_style.mjs","/web/layout_import.mjs","/web/box_prompts.mjs"].includes(request.url)) content = await readFile(resolve(root, request.url.slice(1)));
    else if (request.url === "/web/moss_shared_ui.js") content = await readFile(resolve(root, "web/moss_shared_ui.js"));
    else if (["/web/help.mjs", "/web/moss_help.js"].includes(request.url)) content = await readFile(resolve(root, request.url.slice(1)));
    else if (request.url === "/scripts/app.js") content = "export const app=window.comfyAPI.app.app;";
    else if (request.url === "/scripts/api.js") content = "export const api={apiURL:path=>path};";
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
  const helpCheck = await page.evaluate(() => {
    const node = window.nodes.first;
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
  const first=page.locator('.host').nth(0);
  assert.deepEqual(await first.locator('.moss-k2cf-type').first().locator('option').evaluateAll(es=>es.map(e=>e.value)),['character','object','text']);
  await first.locator('.moss-k2cf-type').nth(0).selectOption('character');
  await first.locator('.moss-k2cf-type').nth(1).selectOption('object');
  await first.locator('.moss-k2cf-slot-head').nth(2).click();
  await first.locator('.moss-k2cf-type').nth(2).selectOption('text');
  await first.locator('.moss-k2cf-scene textarea').fill('MOSS 日本語 😀 {keep|原文}');
  const literal='  text: "A | B"\n日本語 😀\n\nlast line  ';
  await first.locator('.moss-k2cf-slot-card').nth(2).locator('.moss-k2cf-slot-body > textarea').fill(literal);
  const saved=await page.evaluate(()=>window.nodes.first.save());
  assert.deepEqual(saved.widgets_values.slice(7,10),['character','object','text']);
  assert.equal(saved.widgets_values[4],literal);
  await page.evaluate(data=>{window.nodes.copy=window.clone(data)},saved);
  await page.waitForFunction(()=>document.querySelectorAll('.host')[2]?.querySelectorAll('.moss-k2cf-type')[0]?.value==='character');
  assert.deepEqual(await page.locator('.host').nth(2).locator('.moss-k2cf-type').evaluateAll(es=>es.map(e=>e.value)),['character','object','text','object','object','object','object']);
  assert.equal(await page.locator('.host').nth(2).locator('.moss-k2cf-slot-card').nth(2).locator('.moss-k2cf-slot-body > textarea').inputValue(),literal);
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
  // Text-only individual styles live inside the existing prompt_ui_data widget.
  const yellow=first.locator('.moss-k2cf-slot-card').nth(2);
  if(await yellow.evaluate(el=>el.classList.contains('collapsed')))await yellow.locator('.moss-k2cf-slot-head').click();
  const style=first.locator('.moss-text-style[data-slot="yellow"]');
  const mode=style.getByRole('combobox',{name:'yellow text style mode',exact:true});
  assert.equal(await mode.inputValue(),'common');
  assert.equal(await style.getByRole('combobox',{name:'yellow text style font',exact:true}).isVisible(),false);
  await mode.selectOption('individual');
  const color=style.getByRole('textbox',{name:'yellow text style color',exact:true});
  const palette=style.locator('input[type="color"]');
  assert.equal(await color.inputValue(),'');
  assert.equal(JSON.parse((await page.evaluate(()=>window.nodes.first.save())).widgets_values[12]).slotValues.yellow.textStyle.color,'');
  const beforePalette=await style.boundingBox();
  const presets=style.getByRole('button',{name:'yellow text style presets',exact:true});
  const popup=style.getByRole('dialog',{name:'yellow text color presets',exact:true});
  await presets.click();
  assert.equal(await popup.isVisible(),true);
  assert.equal(await popup.locator('button[aria-pressed]').count(),256);
  assert.equal(await color.inputValue(),'');
  assert.equal((await style.boundingBox()).height,beforePalette.height);
  const gridSize=await popup.locator('button[aria-pressed]').first().evaluate(el=>{
    const rect=el.getBoundingClientRect();return [rect.width,rect.height,getComputedStyle(el.parentElement).gridTemplateColumns.split(' ').length];
  });
  assert.deepEqual(gridSize,[16,16,16]);
  await page.screenshot({path:resolve(artifacts,'text-color-presets.jpg'),type:'jpeg',quality:85});
  await popup.getByRole('button',{name:'#ff9900',exact:true}).click();
  assert.equal(await popup.isVisible(),false);
  assert.equal(await color.inputValue(),'#ff9900');assert.equal(await palette.inputValue(),'#ff9900');
  assert.equal(JSON.parse((await page.evaluate(()=>window.nodes.first.save())).widgets_values[12]).slotValues.yellow.textStyle.color,'#ff9900');
  await presets.click();
  assert.equal(await popup.getByRole('button',{name:'#ff9900',exact:true}).getAttribute('aria-pressed'),'true');
  await page.keyboard.press('Escape');assert.equal(await popup.isVisible(),false);
  assert.equal(await color.inputValue(),'#ff9900');
  await presets.click();await page.locator('h2').click();assert.equal(await popup.isVisible(),false);
  await presets.click();await popup.getByRole('button',{name:'yellow close color presets',exact:true}).click();
  assert.equal(await popup.isVisible(),false);assert.equal(await color.inputValue(),'#ff9900');
  // The top-layer popup escapes the node's clipping and graph zoom, without resizing it.
  await first.evaluate(el=>{el.style.transform='scale(0.67)';el.style.transformOrigin='top left';el.style.overflow='hidden'});
  await presets.click();
  const zoomBounds=await popup.boundingBox();
  assert.equal(await popup.locator('button[aria-pressed]').first().evaluate(el=>el.getBoundingClientRect().width),16);
  assert.ok(zoomBounds.x>=0 && zoomBounds.y>=0);
  assert.ok(zoomBounds.x+zoomBounds.width<=await page.evaluate(()=>innerWidth));
  await popup.getByRole('button',{name:'#00ff00',exact:true}).click();assert.equal(await color.inputValue(),'#00ff00');
  await first.evaluate(el=>{el.style.transform='';el.style.overflow=''});
  await presets.click();await mode.selectOption('common');assert.equal(await popup.isVisible(),false);
  await mode.selectOption('individual');
  await palette.fill('#123456');await palette.dispatchEvent('input');await palette.dispatchEvent('change');
  assert.equal(await color.inputValue(),'#123456');
  assert.equal(JSON.parse((await page.evaluate(()=>window.nodes.first.save())).widgets_values[12]).slotValues.yellow.textStyle.color,'#123456');
  await color.fill('gold');assert.equal(await palette.inputValue(),'#ffd700');assert.equal(await color.inputValue(),'gold');
  await color.fill('#abc');assert.equal(await palette.inputValue(),'#aabbcc');assert.equal(await color.inputValue(),'#abc');
  await color.fill('淡い金色');assert.equal(await color.inputValue(),'淡い金色');assert.equal(await palette.inputValue(),'#ffffff');
  await color.fill('');assert.equal(await color.inputValue(),'');
  assert.equal(JSON.parse((await page.evaluate(()=>window.nodes.first.save())).widgets_values[12]).slotValues.yellow.textStyle.color,'');
  assert.equal((await style.boundingBox()).height,beforePalette.height);
  await style.getByRole('combobox',{name:'yellow text style font',exact:true}).selectOption('serif');
  await style.getByRole('combobox',{name:'yellow text style weight',exact:true}).selectOption('bold');
  await style.getByRole('textbox',{name:'yellow text style color',exact:true}).fill('#FFD700');
  await style.getByRole('textbox',{name:'yellow text style extra',exact:true}).fill('thin black outline');
  assert.equal(await yellow.locator('.moss-k2cf-slot-body > textarea').inputValue(),literal);
  const styled=await page.evaluate(()=>window.nodes.first.save());
  assert.equal(styled.widgets_values.length,saved.widgets_values.length);
  const yellowStyle=JSON.parse(styled.widgets_values[12]).slotValues.yellow.textStyle;
  assert.deepEqual(yellowStyle,{mode:'individual',font:'serif',weight:'bold',color:'#FFD700',extra:'thin black outline'});
  assert.equal(JSON.parse(styled.widgets_values[12]).slotValues.red.textStyle.mode,'common');
  await page.evaluate(data=>{window.nodes.styled=window.clone(data)},styled);
  const styledHost=page.locator('.host').nth(4);
  assert.equal(await styledHost.getByRole('combobox',{name:'yellow text style font',exact:true}).inputValue(),'serif');
  assert.equal(await styledHost.getByRole('textbox',{name:'yellow text style color',exact:true}).inputValue(),'#FFD700');
  assert.equal(await styledHost.locator('.moss-text-style[data-slot="yellow"] input[type="color"]').inputValue(),'#ffd700');
  await mode.selectOption('common');
  assert.equal(await style.getByRole('textbox',{name:'yellow text style color',exact:true}).isVisible(),false);
  assert.equal(await palette.isVisible(),false);
  assert.equal(await styledHost.getByRole('combobox',{name:'yellow text style mode',exact:true}).inputValue(),'individual');
  await mode.selectOption('individual');
  await first.locator('.moss-k2cf-type').nth(2).selectOption('object');assert.equal(await style.isVisible(),false);
  await first.locator('.moss-k2cf-type').nth(2).selectOption('text');assert.equal(await mode.inputValue(),'individual');
  const tooltips=await page.evaluate(()=>{
    window.helpLocale='ja';
    const es=[...window.nodes.first.host.querySelectorAll('.moss-text-style[data-slot="yellow"] select,.moss-text-style[data-slot="yellow"] input,.moss-text-style[data-slot="yellow"] textarea,.moss-text-style[data-slot="yellow"] button')];
    return es.every(el=>{el.dispatchEvent(new Event('pointerenter'));return /[ぁ-んァ-ヶ一-龠]/.test(el.title)});
  });
  assert.equal(tooltips,true);
  await writeFile(resolve(artifacts,'text-style-browser-wire.json'),JSON.stringify({widgets_values:styled.widgets_values}));
  // Load a genuinely old workflow into the same node: custom styles must not leak.
  const oldStyleFree=structuredClone(saved);
  for(const state of [oldStyleFree.properties.k2cfPromptUiState,JSON.parse(oldStyleFree.widgets_values[12])])
    if(state?.slotValues)for(const value of Object.values(state.slotValues))delete value.textStyle;
  const oldUi=JSON.parse(oldStyleFree.widgets_values[12]);
  for(const value of Object.values(oldUi.slotValues||{}))delete value.textStyle;
  oldStyleFree.widgets_values[12]=JSON.stringify(oldUi);
  oldStyleFree.properties.k2cfPromptState.widgets_values=oldStyleFree.widgets_values.slice();
  await page.evaluate(data=>window.nodes.first.configure(data),oldStyleFree);
  await page.waitForFunction(()=>window.nodes.first.host.querySelector('[aria-label="yellow text style mode"]').value==='common');
  assert.equal(await first.locator('select[aria-label="yellow text style mode"]').inputValue(),'common');
  await page.evaluate(data=>window.nodes.first.configure(data),styled);
  await page.waitForFunction(()=>window.nodes.first.host.querySelector('[aria-label="yellow text style mode"]').value==='individual');
  assert.equal(await mode.inputValue(),'individual');
  await first.screenshot({path:resolve(artifacts,'text-style-isolated.jpg'),type:'jpeg',quality:85});
  // Extra colors append eight optional widgets, leaving all old indices intact.
  assert.equal(await first.locator('.moss-k2cf-slot-card').count(),7);
  assert.equal(saved.widgets_values.length,31);
  const cyan=first.locator('.moss-k2cf-slot-card').nth(5),orange=first.locator('.moss-k2cf-slot-card').nth(6);
  assert.equal(await cyan.evaluate(el=>el.classList.contains('collapsed')),true);
  assert.equal(await orange.evaluate(el=>el.classList.contains('collapsed')),true);
  await cyan.locator('.moss-k2cf-slot-head').click();await orange.locator('.moss-k2cf-slot-head').click();
  await cyan.locator('.moss-k2cf-slot-body > textarea').fill('Cyan character 日本語');
  await cyan.locator('.moss-k2cf-type').selectOption('character');
  await cyan.locator('select').nth(1).selectOption('Full body');
  await cyan.locator('select').nth(2).selectOption('Front view');
  const orangeText='  Orange | "日本語"\nsecond line  ';
  await orange.locator('.moss-k2cf-slot-body > textarea').fill(orangeText);
  await orange.locator('.moss-k2cf-type').selectOption('text');
  const orangeStyle=orange.locator('.moss-text-style');
  await orangeStyle.getByRole('combobox',{name:'orange text style mode',exact:true}).selectOption('individual');
  await orangeStyle.getByRole('combobox',{name:'orange text style font',exact:true}).selectOption('sans');
  await orangeStyle.getByRole('combobox',{name:'orange text style weight',exact:true}).selectOption('bold');
  await orangeStyle.getByRole('button',{name:'orange text style presets',exact:true}).click();
  await orangeStyle.getByRole('button',{name:'#ff9900',exact:true}).click();
  const seven=await page.evaluate(()=>window.nodes.first.save());
  assert.deepEqual(seven.widgets_values.slice(23),['Cyan character 日本語','character','Full body','Front view',orangeText,'text','Auto','Auto']);
  assert.equal(JSON.parse(seven.widgets_values[12]).slotValues.orange.textStyle.color,'#ff9900');
  await page.evaluate(data=>{window.nodes.seven=window.clone(data)},seven);
  const sevenHost=page.locator('.host').nth(5);
  await page.waitForFunction(()=>window.nodes.seven.host.querySelector('[aria-label="orange text style font"]')?.value==='sans');
  assert.equal(await sevenHost.locator('.moss-k2cf-slot-card').nth(6).locator('.moss-k2cf-slot-body > textarea').inputValue(),orangeText);
  assert.equal(await sevenHost.getByRole('textbox',{name:'orange text style color',exact:true}).inputValue(),'#ff9900');
  const five=structuredClone(saved);five.widgets_values=five.widgets_values.slice(0,23);
  const fiveUi=JSON.parse(five.widgets_values[12]);
  for(const state of [fiveUi,five.properties.k2cfPromptUiState])for(const slot of ['cyan','orange']){
    delete state.slotValues?.[slot];delete state.slotOpen?.[slot];delete state.textHeights?.[slot+'_prompt'];delete state.textHeightManual?.[slot+'_prompt'];
  }
  five.widgets_values[12]=JSON.stringify(fiveUi);five.properties.k2cfPromptState.widgets_values=five.widgets_values.slice();
  await page.evaluate(data=>window.nodes.first.configure(data),five);
  await page.waitForFunction(()=>window.nodes.first.widgets.find(w=>w.name==='cyan_prompt').value==='');
  await page.waitForFunction(()=>window.nodes.first.host.querySelectorAll('.moss-k2cf-slot-body > textarea')[5]?.value==='');
  for(const [card,slot] of [[cyan,'cyan'],[orange,'orange']]){
    assert.equal(await card.locator('.moss-k2cf-slot-body > textarea').inputValue(),'');
    assert.equal(await card.locator('.moss-k2cf-type').inputValue(),'object');
    assert.equal(await card.locator('select').nth(1).inputValue(),'Auto');
    assert.equal(await card.locator('select').nth(2).inputValue(),'Auto');
    assert.equal(await card.locator(`select[aria-label="${slot} text style mode"]`).inputValue(),'common');
  }
  const restoredFive=await page.evaluate(()=>window.nodes.first.save());
  assert.deepEqual(restoredFive.widgets_values.slice(0,12),five.widgets_values.slice(0,12));
  assert.deepEqual(restoredFive.widgets_values.slice(13,23),five.widgets_values.slice(13,23));
  await page.evaluate(data=>window.nodes.first.configure(data),seven);
  await page.waitForFunction(()=>window.nodes.first.host.querySelector('[aria-label="orange text style font"]')?.value==='sans');
  await writeFile(resolve(artifacts,'seven-slots-browser-wire.json'),JSON.stringify({widgets_values:seven.widgets_values}));
  for(const card of await first.locator('.moss-k2cf-slot-card').all())if(!(await card.evaluate(el=>el.classList.contains('collapsed'))))await card.locator('.moss-k2cf-slot-head').click();
  await first.screenshot({path:resolve(artifacts,'seven-slots-prompter.jpg'),type:'jpeg',quality:85});
  const results={standalone:!process.env.KREA2_UI_SOURCE,coexistence:!!process.env.KREA2_UI_SOURCE,unrelated_nodes_untouched:true,three_choices:true,latest_types_saved:true,clone_restores_types:true,literal_text_roundtrip:true,clone_isolation:true,legacy_obj_restores_object:true,raw_controls_unchanged:true,page_errors:errors};
  if(process.env.KREA2_UI_SOURCE){
    await page.evaluate(()=>window.makeExternal());
    assert.equal(await page.evaluate(()=>window.external.host.querySelectorAll('[class^="moss-k2cf-"]').length),0);
    assert.equal(await page.evaluate(()=>window.external.host.querySelectorAll('[class^="k2cf-"]').length>0),true);
  }
  assert.deepEqual(errors,[]);
  Object.assign(results,{individual_style:true,style_defaults_common:true,style_text_exact:true,
    seven_cards:true,extra_cards_default_closed:true,extra_widgets_appended:true,extra_character_and_text:true,
    extra_style_palette:true,extra_save_clone_reload:true,old_five_workflow_no_stale_extras:true,
    color_palette:true,color_palette_blank_preserved:true,color_palette_manual_names_hex:true,color_palette_reload:true,color_palette_stable_height:true,
    preset_grid_256:true,preset_cells_16px:true,preset_click_save:true,preset_dismiss_unchanged:true,preset_zoom_clipping:true,preset_shared_hides_popup:true,
    style_saved_widget_count:true,style_clone_reload:true,style_common_switch:true,style_type_toggle:true,
    style_old_workflow_reset:true,style_japanese_hover:true});
  await page.screenshot({path:resolve(artifacts,'three-types-isolated.jpg'),type:'jpeg',quality:75});
  await page.evaluate(async()=>{
    const {installControls}=await import('/web/moss_controls.mjs');
    const graph=window.nodes.first.graph;graph.links=new Map();graph.getNodeById=id=>graph._nodes.find(n=>n.id===id);
    const names=['width','height','preset','layout_data','camera_data','grid_mode','ui_language','camera_set_data','canvas_preset_data'];
    const boxes=Array.from({length:9},(_,i)=>({id:'id-'+i,slot:'red',x1:40+i*90,y1:100,x2:100+i*90,y2:260}));
    const values=[896,1184,'Custom',JSON.stringify({boxes,drawMode:false}),'{}','Thirds','English','{"sets":[]}','{"sets":[]}'];
    class Canvas {
      constructor(){this.id=100;this.type=this.comfyClass='MOSSSharedCanvas';this.graph=graph;this.properties={};this.size=[830,980];this.inputs=[];
        this.widgets=names.map((name,i)=>({name,value:values[i],options:{}}));this.__k2cfConfiguredWidgetValues=values.slice();this.host=document.createElement('section');this.host.id='id-canvas';this.host.style.cssText='width:830px;height:980px';document.body.append(this.host);graph._nodes.push(this);this.onNodeCreated();}
      addDOMWidget(name,type,element,options){this.host.append(element);const w={name,type,element,options};this.widgets.push(w);return w;}
      setSize(s){this.size=s}computeSize(){return this.size}setDirtyCanvas(){}
      save(){const data={widgets_values:this.widgets.slice(0,9).map(w=>w.value),properties:structuredClone(this.properties),size:this.size.slice()};this.onSerialize?.(data);return data;}
      configure(data){this.properties=structuredClone(data.properties);data.widgets_values.forEach((v,i)=>this.widgets[i].value=v);this.onConfigure(data);}
    }
    installControls(Canvas,{name:'MOSSSharedCanvas'});window.idCanvas=new Canvas();
    graph._nodes.push({id:101,type:'MOSSFromKrea2',inputs:[{name:'framing_data',link:100},{name:'prompt_ui_data',link:101}]});
    graph.links.set(100,{origin_id:100});graph.links.set(101,{origin_id:window.nodes.first.id});window.nodes.first.onConnectionsChange?.();
  });
  const idCards=first.locator('.moss-box-prompt-cards');await page.waitForFunction(()=>document.querySelectorAll('.host:first-child .moss-box-prompt-cards [data-box-id]').length===9);
  const eighth=idCards.locator('[data-box-id="id-7"]'),ninth=idCards.locator('[data-box-id="id-8"]');
  await eighth.locator('.moss-k2cf-slot-head').click();
  assert.equal(await page.evaluate(()=>window.idCanvas.__mossBoxEditor.read().selectedId),'id-7');
  await eighth.getByRole('textbox',{name:'Box id-7 prompt',exact:true}).fill('Independent eighth');
  await ninth.locator('.moss-k2cf-slot-head').click();
  await ninth.getByRole('combobox',{name:'Box id-8 Type',exact:true}).selectOption('object');
  await ninth.getByRole('textbox',{name:'Box id-8 prompt',exact:true}).fill('  Ninth | "日本語"\ntext  ');
  await ninth.getByRole('combobox',{name:'Box id-8 Type',exact:true}).selectOption('text');
  const idRead=()=>page.evaluate(()=>window.idCanvas.__mossBoxEditor.read());
  assert.equal((await idRead()).boxes[7].promptData.prompt,'Independent eighth');
  assert.equal((await idRead()).boxes[8].promptData.type,'text');
  await first.getByRole('button',{name:'Undo box prompt',exact:true}).click();assert.equal((await idRead()).boxes[8].promptData.type,'object');
  await first.getByRole('button',{name:'Redo box prompt',exact:true}).click();assert.equal((await idRead()).boxes[8].promptData.type,'text');
  const idSave=await page.evaluate(()=>window.idCanvas.save());
  await page.evaluate(data=>window.idCanvas.configure(data),idSave);
  await page.waitForFunction(()=>document.querySelector('[aria-label="Box id-8 Type"]')?.value==='text');
  assert.equal((await idRead()).boxes[8].promptData.prompt,'  Ninth | "日本語"\ntext  ');
  const canvas=page.locator('#id-canvas .moss-k2cf-overlay');await canvas.scrollIntoViewIfNeeded();
  const rect=await canvas.boundingBox();await page.mouse.click(rect.x+70/896*rect.width,rect.y+180/1184*rect.height);
  await page.waitForFunction(()=>window.idCanvas.__mossBoxEditor.read().selectedId==='id-0');
  await page.waitForFunction(()=>!document.querySelector('[data-box-id="id-0"]').classList.contains('collapsed'));
  assert.equal(await idCards.getByRole('textbox',{name:'Box id-0 prompt',exact:true}).inputValue(),await first.locator('.moss-k2cf-slot-card').first().locator('.moss-k2cf-slot-body > textarea').inputValue());
  await first.getByRole('button',{name:'Color defaults',exact:true}).click();
  await first.getByRole('button',{name:'ID cards (9)',exact:true}).click();
  await eighth.locator('.moss-k2cf-slot-head').click();
  await eighth.getByRole('button',{name:'Use color settings',exact:true}).click();assert.equal((await idRead()).boxes[7].promptData,undefined);
  await first.getByRole('button',{name:'Undo box prompt',exact:true}).click();assert.equal((await idRead()).boxes[7].promptData.prompt,'Independent eighth');
  await canvas.scrollIntoViewIfNeeded();
  const dragRect=await canvas.boundingBox();
  await page.keyboard.down('Alt');
  await page.mouse.move(dragRect.x+700/896*dragRect.width,dragRect.y+180/1184*dragRect.height);await page.mouse.down();
  await page.mouse.move(dragRect.x+710/896*dragRect.width,dragRect.y+380/1184*dragRect.height,{steps:5});await page.mouse.up();await page.keyboard.up('Alt');
  await page.waitForFunction(()=>window.idCanvas.__mossBoxEditor.read().boxes.length===10);
  const duplicate=(await idRead()).boxes.at(-1);assert.notEqual(duplicate.id,'id-7');assert.equal(duplicate.promptData.prompt,'Independent eighth');
  await idCards.getByRole('textbox',{name:`Box ${duplicate.id} prompt`,exact:true}).fill('Copy only');
  assert.equal((await idRead()).boxes[7].promptData.prompt,'Independent eighth');
  await first.getByRole('button',{name:'Undo box prompt',exact:true}).click();assert.equal((await idRead()).boxes.at(-1).promptData.prompt,'Independent eighth');
  await first.getByRole('button',{name:'Undo box prompt',exact:true}).click();assert.equal((await idRead()).boxes.length,9);
  await canvas.press('Delete');assert.equal((await idRead()).boxes.length,8);
  await first.getByRole('button',{name:'Undo box prompt',exact:true}).click();assert.equal((await idRead()).boxes[7].promptData.prompt,'Independent eighth');
  const jsonCanvas=page.locator('#id-canvas');
  await page.evaluate(()=>window.helpLocale='en');
  await jsonCanvas.getByText('JSON…',{exact:true}).click();
  const jsonDialog=page.locator('dialog.moss-layout-import');
  await jsonDialog.getByRole('button',{name:'Export',exact:true}).click();
  await jsonDialog.getByLabel('Export contents',{exact:true}).selectOption('editable');
  const editableJSON=await jsonDialog.getByRole('textbox',{name:'Export JSON',exact:true}).inputValue();
  assert.equal(JSON.parse(editableJSON).boxes.length,9);
  await jsonDialog.getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>{const editor=window.idCanvas.__mossBoxEditor;const data=editor.read().boxes[7].promptData;editor.update('id-7',{...data,prompt:'Temporary before reimport'});});
  await jsonCanvas.getByText('JSON…',{exact:true}).click();
  await jsonDialog.locator('textarea:not([readonly])').fill(editableJSON);
  await jsonDialog.getByLabel('Mode',{exact:true}).selectOption('replace');
  await jsonDialog.getByRole('button',{name:'Apply',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="Box id-7 prompt"]')?.value==='Independent eighth');
  assert.equal((await idRead()).boxes.length,9);
  assert.equal(await ninth.getByRole('textbox',{name:'Box id-8 prompt',exact:true}).inputValue(),'  Ninth | "日本語"\ntext  ');
  await first.getByRole('button',{name:'Undo box prompt',exact:true}).click();assert.equal((await idRead()).boxes[7].promptData.prompt,'Temporary before reimport');
  await first.getByRole('button',{name:'Redo box prompt',exact:true}).click();assert.equal((await idRead()).boxes[7].promptData.prompt,'Independent eighth');
  const reimportSave=await page.evaluate(()=>window.idCanvas.save());
  await page.evaluate(data=>window.idCanvas.configure(data),reimportSave);
  await page.waitForFunction(()=>document.querySelector('[aria-label="Box id-8 prompt"]')?.value==='  Ninth | "日本語"\ntext  ');
  Object.assign(results,{editable_json_id_cards:true,editable_json_prompt_history:true,editable_json_card_reload:true});
  await writeFile(resolve(artifacts,'id-prompts-browser-wire.json'),JSON.stringify({canvas:await page.evaluate(()=>window.idCanvas.save()),prompter:await page.evaluate(()=>window.nodes.first.save())}));
  assert.deepEqual(errors,[]);
  Object.assign(results,{id_cards_nine:true,id_prompts_independent:true,id_prompt_type:true,id_prompt_history:true,id_prompt_reload:true,id_selection_two_way:true,id_color_fallback:true,id_duplicate_independent:true,id_delete_restore:true});
  await writeFile(resolve(artifacts,'three-types-browser.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({fixture_stopped:true,http_listening:server.listening}));
}
