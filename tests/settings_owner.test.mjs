import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {normalizeFocus} from '../web/camera_options.mjs';

const source=await readFile(process.env.MOSS_CONTROLS_SOURCE||new URL('../web/moss_controls.mjs',import.meta.url),'utf8');
const sharedSource=await readFile(new URL('../web/moss_shared_ui.js',import.meta.url),'utf8');
const restore=new Function('app','normalizeFocus',sharedSource.replace(/^import .*;\r?\n/gm,'')+'\nreturn normalizeWidgetConfig;')({registerExtension(){}},normalizeFocus);
function helpers(app={}) {
  return new Function('app','window','normalizeFocus',source.replace(/^import .*;\r?\n/gm,'').replace(/^export .*;\s*$/m,'')+
    '\nreturn {k2cfBestSavedState,installNodePersistenceHooks,k2cfSnapshotAllPromptUi,k2cfReadNodeSizeState,PROMPT_WIDGETS};')(app,{},normalizeFocus);
}
test('live settings win over an older configured snapshot even when its timestamp is in the future',()=>{
  const h=helpers();
  for(const kind of ['prompt','canvas']){
    const key=kind==='prompt'?'k2cfPromptState':'k2cfCanvasState',configured=kind==='prompt'?'__k2cfConfiguredPromptState':'__k2cfConfiguredCanvasState';
    const live={widgets_values:['character','current'],saved_at:1},stale={widgets_values:['object','old'],saved_at:Date.now()+86400000};
    const node={properties:{[key]:live},[configured]:stale},before=structuredClone(node);
    assert.deepEqual(h.k2cfBestSavedState(node,kind).widgets_values,live.widgets_values);assert.deepEqual(node,before);
  }
});
test('prompt serialization keeps explicit Type, empty text, Auto and Focus without merging old nondefaults',()=>{
  const app={queuePrompt(){},graphToPrompt(){}};const h=helpers(app),names=['red_type','red_prompt','red_angle','red_focus'];
  for(const type of ['obj','object','character','text']){
    const current=[type,'','Auto','Auto'],stale=['character','old prompt','Side view','Hands'];
    const node={widgets:names.map((name,i)=>({name,value:current[i]})),properties:{k2cfPromptState:{widgets_values:stale,saved_at:1}},__k2cfAllowDefaultOverwrite:false};
    h.installNodePersistenceHooks(node,()=>{throw Error('serialization must not read/write DOM');},names,'k2cfPrompt');
    const before=structuredClone(node.properties),data={properties:structuredClone(node.properties)};node.onSerialize(data);
    assert.deepEqual(data.widgets_values,current);assert.deepEqual(node.properties,before);
    const loaded=restore(node,data,true),canonical=[type==='obj'?'object':type,...current.slice(1)];
    assert.deepEqual(loaded.widgets_values,canonical);assert.deepEqual(loaded.properties.k2cfPromptState.widgets_values,canonical);
  }
});
test('positional and named workflow values serialize the same current values without mutating live state',()=>{
  const h=helpers();
  for(const [tag,names,values] of [['k2cfPrompt',['red_prompt','red_type'],['','character']],['k2cfCanvas',['layout_data'],['{"boxes":[{"promptData":{"prompt":""}}]}']]]){
    const node={widgets:names.map((name,i)=>({name,value:values[i]})),properties:{},__k2cfAllowDefaultOverwrite:true};
    h.installNodePersistenceHooks(node,()=>{},names,tag);
    const before=structuredClone(node.properties),data={widgets_values_named:Object.fromEntries(names.map(n=>[n,'stale hidden text']))};node.onSerialize(data);
    assert.deepEqual(data.widgets_values,values);assert.deepEqual(data.widgets_values_named,Object.fromEntries(names.map((n,i)=>[n,values[i]])));assert.deepEqual(node.properties,before);
  }
});
test('focus/tab UI snapshots never resynchronize model values, and queue/graph APIs are left intact',()=>{
  let model=0,ui=0;const originalQueue=()=> 'queue',originalGraph=()=> 'graph';
  const app={queuePrompt:originalQueue,graphToPrompt:originalGraph,graph:{_nodes:[{type:'MOSSSharedPrompter',__k2cfPromptSync(){model++;},__k2cfCanvasSync(){model++;},__k2cfPromptUiSnapshot(){ui++;},__k2cfNodeSizeSnapshot(){ui++;}}]}};
  const h=helpers(app);h.k2cfSnapshotAllPromptUi();assert.equal(model,0);assert.equal(ui,2);
  h.installNodePersistenceHooks({widgets:[],properties:{}},()=>{},[],'k2cfPrompt');
  assert.equal(app.queuePrompt,originalQueue);assert.equal(app.graphToPrompt,originalGraph);
});
test('configure restores prompt controls synchronously before blur can save them',()=>{
  const pending=[];
  const install=new Function('app','window','normalizeFocus','requestAnimationFrame',
    source.replace(/^import .*;\r?\n/gm,'').replace(/^export .*;\s*$/m,'')+
    '\nk2cfInstallWorkflowLoadHook=()=>{};k2cfInstallPromptUiLifecycleHooks=()=>{};return installControls;')
    ({},{},normalizeFocus,callback=>pending.push(callback));
  class Prompt {}
  install(Prompt,{name:'MOSSSharedPrompter'});
  const node=new Prompt();
  node.widgets=[{name:'red_type',value:'object'},{name:'red_prompt',value:''}];
  let controls=['object',''];
  node.__k2cfApplyConfiguredValues=values=>node.widgets.forEach((w,i)=>w.value=values[i]);
  node.__k2cfHydrateFromWidgets=()=>{controls=node.widgets.map(w=>w.value);};
  for(const type of ['character','text','object']){
    node.onConfigure({widgets_values:[type,'keep exact 日本語']});
    // A blur immediately after configure reads the controls, just as the real UI does.
    node.widgets.forEach((w,i)=>w.value=controls[i]);
    assert.deepEqual(node.widgets.map(w=>w.value),[type,'keep exact 日本語']);
  }
  assert.equal(pending.length,0);
});
test('a Canvas geometry gesture cannot silently discard a prompt setting edit',()=>{
  const start=source.indexOf('  node.__mossBoxEditor = {'),end=source.indexOf('  hydrateCanvasFromWidgets();',start);
  const node={},state={boxes:[{id:'a',promptData:{type:'object',prompt:'keep'}}]};let writes=0;
  new Function('node','state','pointerStart','history','writeBoxes','app',source.slice(start,end))(node,state,{}, {},()=>writes++,{});
  node.__mossBoxEditor.update('a',{type:'character',prompt:'keep'});
  assert.equal(state.boxes[0].promptData.type,'character');assert.equal(writes,1);
});
test('prompt Type edits and manual card heights reach the native workflow snapshot before a tab can reopen it',()=>{
  const names=['red_type','prompt_ui_data'],widgets={red_type:{value:'object'},prompt_ui_data:{value:'{}'}},node={properties:{}},ui={textHeights:{red_prompt:800},boxCards:{cards:[{id:'a',height:800}]}};
  let capturedType='object',capturedHeight=125,captures=0;
  const app={graph:{setDirtyCanvas(){}},extensionManager:{workflow:{activeWorkflow:{changeTracker:{captureCanvasState(){captures++;capturedType=widgets.red_type.value;capturedHeight=JSON.parse(widgets.prompt_ui_data.value).boxCards.cards[0].height;}}}}}};
  const startUi=source.indexOf('  function savePromptUiState(markDirty = true) {'),endUi=source.indexOf('  function mergePromptUiState(',startUi);
  const setWidget=(name,value)=>widgets[name].value=value;
  const save=new Function('capturePromptSlotValues','promptUiState','node','K2CF_PROMPT_HEIGHT_CAPTURE_MODE','setWidget','k2cfSanitizePromptValues','PROMPT_WIDGETS','widgets','k2cfWriteLocalState','app',source.slice(startUi,endUi)+'\nreturn savePromptUiState;')
    (()=>{},ui,node,'test',setWidget,x=>x,names,widgets,()=>{},app);
  const promptStart=source.indexOf('function setupPromptNode('),start=source.indexOf('  function sync(',promptStart),end=source.indexOf('  const defaultPromptUiState',start);
  const sync=new Function('isHydrating','captureCurrentTextHeights','node','controls','PROMPT_WIDGETS','widgets','setWidget','k2cfSanitizePromptValues','applyConfiguredValuesToWidgets','k2cfWriteLocalState','app','notifyBoxEdit','savePromptUiState',source.slice(start,end)+'\nreturn sync;')
    (false,()=>{},node,{red_type:{value:'character'}},names,widgets,setWidget,x=>x,()=>{},()=>{},app,()=>{},save);
  sync();assert.equal(capturedType,'character');assert.equal(capturedHeight,800);assert.equal(captures,1);
  ui.boxCards.cards[0].height=950;save();assert.equal(capturedHeight,950);assert.equal(captures,2);
});
test('the existing 31-widget backend can serialize safely before its Focus schema is reloaded',()=>{
  const h=helpers(),names=h.PROMPT_WIDGETS;
  const node={properties:{},widgets:names.slice(0,31).map(name=>({name,value:name.endsWith('_type')?'character':name==='prompt_ui_data'?'{}':name.endsWith('_angle')||name.endsWith('_framing')?'Auto':'keep'}))};
  h.installNodePersistenceHooks(node,()=>{},names,'k2cfPrompt');const data={};node.onSerialize(data);
  assert.deepEqual(data.widgets_values.slice(31),Array(7).fill('Auto'));assert.equal(data.widgets_values[7],'character');
});
test('live node dimensions and saved UI field heights do not lose to future-dated configuration mirrors',()=>{
  const h=helpers(),node={properties:{k2cfPromptNodeSize:{size:[900,1100],saved_at:1}},__k2cfConfiguredPromptNodeSize:{size:[540,990],saved_at:Date.now()+86400000}};
  assert.deepEqual(h.k2cfReadNodeSizeState(node,'prompt').size,[900,1100]);
  const live={textHeights:{red_prompt:800},saved_at:1},stale={textHeights:{red_prompt:125},saved_at:Date.now()+86400000};
  const start=source.indexOf('  function refreshPromptUiState() {'),end=source.indexOf('  function readPresetList(',start);let merged=[];
  const refresh=new Function('node','widgets','k2cfReadJsonObject','k2cfPromptUiHasMeaningfulState','k2cfReadLocalState','mergePromptUiState',source.slice(start,end)+'\nreturn refreshPromptUiState;')
    ({properties:{k2cfPromptUiState:stale},__k2cfConfiguredPromptUiState:stale},{prompt_ui_data:{value:JSON.stringify(live)}},JSON.parse,()=>true,()=>null,value=>merged.push(value));
  refresh();assert.deepEqual(merged,[live]);
});
