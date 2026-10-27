import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {FOCUS_OPTIONS,NEW_ANGLES,normalizeFocus,presetFocus,localizeCameraSelect} from '../web/camera_options.mjs';
import {exportLayout,parseLayoutImport,prepareLayoutImport} from '../web/layout_import.mjs';
import {createCanvasHistory} from '../web/canvas_editing.mjs';

test('Focus values are strict, bilingual display never changes stored values, and legacy presets preserve current Focus',()=>{
  assert.equal(FOCUS_OPTIONS.length,13);assert.equal(new Set(FOCUS_OPTIONS).size,13);
  assert(FOCUS_OPTIONS.includes('Breasts'));assert(FOCUS_OPTIONS.includes('Crotch'));
  for(const focus of FOCUS_OPTIONS)assert.equal(normalizeFocus(focus),focus);
  for(const invalid of [null,false,1,'','hands',{},[]])assert.throws(()=>normalizeFocus(invalid),/Focus/);
  assert.equal(normalizeFocus(),'Auto');assert.equal(presetFocus({},'Hands'),'Hands');
  assert.equal(presetFocus({focus:'Auto'},'Hands'),'Auto');assert.equal(presetFocus({focus:'Crotch'},'Auto'),'Crotch');
  assert.throws(()=>presetFocus({focus:null},'Hands'),/Focus/);
  const select={options:[...FOCUS_OPTIONS,...NEW_ANGLES].map(value=>({value}))};
  localizeCameraSelect(select,'ja');assert.equal(select.options.find(o=>o.value==='Breasts').textContent,'胸');
  const before=select.options.map(o=>o.value);localizeCameraSelect(select,'en');assert.deepEqual(select.options.map(o=>o.value),before);
});
const state=promptData=>({width:896,height:1184,boxes:[{id:'keep',slot:'red',x1:1,y1:2,x2:300,y2:400,locked:true,...(promptData?{promptData}: {})}]});
test('editable v2 is required only by actual per-ID non-Auto Focus or new Angle, including hidden Text settings',()=>{
  for(const focus of FOCUS_OPTIONS)for(const type of ['character','object','text'])for(const angle of ['Auto',...NEW_ANGLES]) {
    const source=state({type,prompt:'  日本語\n"A" | B  ',focus,angle,textStyle:{mode:'individual',extra:'keep bubble'}}),before=structuredClone(source);
    const data=exportLayout(source,'editable');assert.equal(data.version,focus==='Auto'&&angle==='Auto'?1:2);
    const restored=prepareLayoutImport(parseLayoutImport(JSON.stringify(data)),{width:896,height:1184,targetWidth:896,targetHeight:1184,contents:'editable',mode:'replace'});
    assert.equal(restored[0].promptData.focus||'Auto',focus);assert.equal(restored[0].promptData.prompt,source.boxes[0].promptData.prompt);
    assert.equal(restored[0].promptData.angle,angle);assert.deepEqual(source,before);
    const placement=exportLayout(source);assert.equal(placement.version,1);assert(!('promptData' in placement.boxes[0]));
  }
  assert.equal(exportLayout(state(),'editable').version,1,'inherited boxes stay inherited');
});
test('invalid editable data fails before existing layout or history can change, old reader rejects v2',async()=>{
  const source=state({type:'text',prompt:'exact',focus:'Hands',angle:'Auto'}),history=createCanvasHistory(),before=structuredClone(source);
  const valid=exportLayout(source,'editable');
  for(const value of [null,false,1,'hands','',[]]) {
    const data=structuredClone(valid);data.boxes[0].promptData.focus=value;
    assert.throws(()=>parseLayoutImport(JSON.stringify(data)),/Focus/);assert.deepEqual(source,before);assert(!history.canUndo);
  }
  const bad=structuredClone(valid);bad.version=1;assert.throws(()=>parseLayoutImport(JSON.stringify(bad)),/version2/);
  const old=await readFile(process.env.MOSS_FOCUS_BEFORE_ROOT+'/web/layout_import.mjs','utf8').catch(()=>null);
  if(old){const reader=new Function(old.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nreturn parseLayoutImport;')();assert.throws(()=>reader(JSON.stringify(valid)),/format/);}
  const duplicate=structuredClone(source.boxes[0]);duplicate.id='copy';duplicate.promptData=structuredClone(duplicate.promptData);
  const after=structuredClone(source);after.boxes.push(duplicate);history.record(source,after);after.boxes[1].promptData.focus='Eyes';
  assert.equal(after.boxes[0].promptData.focus,'Hands');assert.deepEqual(history.undo(after),before);
});
test('actual color preset Load validates Focus before modifying text, keeps legacy Focus and accepts explicit Auto',async()=>{
  const source=await readFile(new URL('../web/moss_controls.mjs',import.meta.url),'utf8');
  const start=source.indexOf('    promptLoad.addEventListener("click"'),end=source.indexOf('    promptDelete.addEventListener',start);
  let callback,preset,commits=0;const ta={value:'original'},focusSelect={value:'Hands'},state={textHeights:{},textHeightManual:{}};
  new Function('promptLoad','selectedPresetValue','promptPresetSelect','readPresetList','PROMPT_SLOT_PRESET_KEY','presetFocus','ta','focusSelect','promptUiState','promptName','applySavedTextHeight','sync','savePromptUiState',source.slice(start,end))
    ({addEventListener(_event,fn){callback=fn;}},()=> 'test',{},()=>[preset],'key',presetFocus,ta,focusSelect,state,'red_prompt',()=>{},()=>commits++,()=>{});
  preset={name:'test',text:'legacy'};callback();assert.equal(ta.value,'legacy');assert.equal(focusSelect.value,'Hands');
  preset={name:'test',text:'new',focus:'Auto'};callback();assert.equal(focusSelect.value,'Auto');
  preset={name:'test',text:'invalid',focus:null};assert.throws(callback,/Focus/);assert.equal(ta.value,'new');assert.equal(commits,2);
});
test('actual color preset Save captures explicit Auto and non-Auto without adding Type or Angle to text presets',async()=>{
  const source=await readFile(new URL('../web/moss_controls.mjs',import.meta.url),'utf8');
  const start=source.indexOf('    promptSave.addEventListener("click"'),end=source.indexOf('    promptLoad.addEventListener',start);
  let callback,saved;const focusSelect={value:'Auto'},state={textHeights:{red_prompt:400},textHeightManual:{},slotPreset:{}};
  new Function('promptSave','selectedPresetValue','promptPresetSelect','label','prompt','readPresetList','PROMPT_SLOT_PRESET_KEY','normalizeFocus','ta','focusSelect','promptUiState','promptName','k2cfElementPixelHeight','writePresetList','slot','refreshPromptSlotPresets','savePromptUiState',source.slice(start,end))
    ({addEventListener(_e,fn){callback=fn;}},()=>'',{},'RED',()=> 'saved',()=>[],'key',normalizeFocus,{value:'日本語\nexact'},focusSelect,state,'red_prompt',()=>125,(_key,items)=>saved=items,'red',()=>{},()=>{});
  for(const focus of ['Auto','Breasts','Crotch']){focusSelect.value=focus;callback();assert.deepEqual(saved,[{name:'saved',text:'日本語\nexact',height:400,focus}]);}
});
test('actual UI Angle list has 27 unique values, matches new candidates and omits looking-back',async()=>{
  const source=await readFile(new URL('../web/moss_controls.mjs',import.meta.url),'utf8');
  const angles=new Function(source.replace(/^import .*;\r?\n/gm,'').replace(/^export .*;\s*$/m,'')+'\nreturn ANGLE_OPTIONS;')();
  assert.equal(angles.length,27);assert.equal(new Set(angles).size,27);assert.deepEqual(angles.slice(24),NEW_ANGLES);
  assert.equal(angles.filter(v=>v==='Dutch angle').length,1);assert(!angles.some(v=>/looking back/i.test(v)));
});
