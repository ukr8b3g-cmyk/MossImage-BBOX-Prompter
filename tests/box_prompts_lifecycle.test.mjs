import {DIALOGUE_OPTIONS} from '../web/dialogue_options.mjs';
import {FOCUS_OPTIONS,normalizeFocus,localizeCameraSelect} from '../web/camera_options.mjs';
import {origin,externalBindings} from '../web/external_text.mjs';
import {analysisStatus} from '../web/reference_analysis.mjs';
import {graphInputs} from '../web/graph_inputs.mjs';
import {installAnalysisRequests} from '../web/analysis_requests.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {createCanvasHistory,overlappingBoxes} from '../web/canvas_editing.mjs';

// Exercise DOM lifecycle ordering without launching a browser or ComfyUI.
const source=await readFile(process.env.MOSS_BOX_PROMPTS_SOURCE||new URL('../web/box_prompts.mjs',import.meta.url),'utf8');
const styleSource=await readFile(new URL('../web/text_style.mjs',import.meta.url),'utf8');
const bubbleSource=await readFile(new URL('../web/speech_bubble.mjs',import.meta.url),'utf8');
class Element extends EventTarget {
  constructor(tag='div') {
    super();this.tagName=tag;this.children=[];this.dataset={};this.style={};this.attributes={};this.className='';this.value='';this.isConnected=true;
    this.classList={contains:name=>this.className.split(' ').includes(name),
      toggle:(name,on)=>{const values=new Set(this.className.split(' ').filter(Boolean));on??=!values.has(name);if(on)values.add(name);else values.delete(name);this.className=[...values].join(' ');},
      remove:name=>this.classList.toggle(name,false)};
  }
  append(...items){for(const item of items){item.remove();item.parentNode=this;this.children.push(item);}}
  appendChild(item){this.append(item);return item;}
  prepend(item){item.remove();item.parentNode=this;this.children.unshift(item);}
  insertBefore(item,before){item.remove();item.parentNode=this;const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,item);}
  replaceChildren(...items){for(const child of [...this.children])child.remove();this.append(...items);}
  remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(c=>c!==this);this.parentNode=null;}}
  setAttribute(name,value){this.attributes[name]=value;}
  set value(value){this._value=String(value);if(this.tagName==='select'&&this.children.length&&!this.children.some(c=>c.value===this._value))this._value='';}
  get value(){return this._value;}
  get options(){return this.children;}
  matches(){return false;}
  getContext(){return {fillStyle:'#ffffff'};}
  contains(element){return element===this||this.children.some(child=>child.contains(element));}
  focus(){if(this.ownerDocument)this.ownerDocument.activeElement=this;}
  getBoundingClientRect(){return {top:0,left:0,bottom:125,right:300,width:300,height:125};}
}
function harness(initial={}) {
  const analysisCalls=[];
  const document=new EventTarget(),window=new EventTarget();window.confirm=()=>true;document.hidden=false;document.createElement=tag=>Object.assign(new Element(tag),{ownerDocument:document});
  const frames=new Map(),mutations=[],resizes=[];let sequence=0;
  class MutationObserver {constructor(callback){this.callback=callback;mutations.push(this);}observe(target){this.target=target;}disconnect(){this.target=null;}}
  class ResizeObserver {constructor(callback){this.callback=callback;resizes.push(this);}observe(target){this.target=target;}disconnect(){this.target=null;}}
  const requestAnimationFrame=callback=>{frames.set(++sequence,callback);return sequence;};
  const cancelAnimationFrame=id=>frames.delete(id);
  const flush=()=>{for(let i=0;frames.size;i++){assert(i<10,'refresh must settle');const next=[...frames.values()];frames.clear();for(const callback of next)callback();}};
  const {mountSpeechBubble,bubbleDescription}=new Function('document','bindHelp','DIALOGUE_OPTIONS',bubbleSource.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nreturn {mountSpeechBubble,bubbleDescription};')(document,()=>{},DIALOGUE_OPTIONS);
  const mountTextStyle=new Function('document','CSS','bindHelp','mountSpeechBubble','bubbleDescription','createEmojiPicker',styleSource.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nreturn mountTextStyle;')(document,{supports:()=>false},()=>{},mountSpeechBubble,bubbleDescription,()=>{throw Error('picker should be lazy');});
  const {mountBoxPrompts}=new Function('document','window','MutationObserver','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','mountTextStyle','bindHelp','FOCUS_OPTIONS','normalizeFocus','localizeCameraSelect','origin','externalBindings','analysisStatus','requestAnalysis','graphInputs',
    source.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nreturn {mountBoxPrompts};')
    (document,window,MutationObserver,ResizeObserver,requestAnimationFrame,cancelAnimationFrame,mountTextStyle,()=>{},FOCUS_OPTIONS,normalizeFocus,localizeCameraSelect,origin,externalBindings,initial.analysisStatus||analysisStatus,(...args)=>analysisCalls.push(args),graphInputs);
  const state=structuredClone(initial.state||{boxes:[{id:'red-1',slot:'red'},{id:'yellow-2',slot:'yellow'}],selectedId:null});
  const graph={_nodes:[],links:new Map([[1,{origin_id:10}],[2,{origin_id:20}]]),getNodeById:id=>graph._nodes.find(n=>n.id===id)};
  const node={id:20,type:'MOSSSharedPrompter',graph};
  const history=createCanvasHistory();
  const canvas={id:10,type:'MOSSSharedCanvas',graph,__mossBoxEditor:{read:()=>structuredClone(state),select:id=>{state.selectedId=id;api.refresh();},
    update(id,value){const before=structuredClone(state),box=state.boxes.find(b=>b.id===id);if(value===null)delete box.promptData;else box.promptData=structuredClone(value);history.record(before,state);document.dispatchEvent(Object.assign(new Event('moss-bbox-edit'),{detail:canvas}));api.refresh();},
    undo(){Object.assign(state,history.undo(state));document.dispatchEvent(Object.assign(new Event('moss-bbox-edit'),{detail:canvas}));api.refresh();},redo(){Object.assign(state,history.redo(state));document.dispatchEvent(Object.assign(new Event('moss-bbox-edit'),{detail:canvas}));api.refresh();}}};
  graph._nodes=[node,canvas,{type:'MOSSFromKrea2',inputs:[{name:'framing_data',link:1},{name:'prompt_ui_data',link:2}]}];
  const wrap=new Element(),colorCards=Array.from({length:7},()=>Object.assign(new Element(),{className:'moss-k2cf-slot-card'}));wrap.append(...colorCards);
  let saved=structuredClone(initial.ui||{mode:'boxes',manualMode:true,sourceId:'10',cards:[{canvasId:'10',id:'red-1',open:true,height:245},{canvasId:'10',id:'yellow-2',open:false,height:185}]});
  const defaults=initial.defaults||Object.fromEntries(['red','blue','yellow','green','magenta','cyan','orange'].map(slot=>[slot,{prompt:'unchanged',type:'character',framing:'Full body',angle:'Side view'}]));
  const api=mountBoxPrompts(node,wrap,{language:()=>initial.language?.()||'en',defaults:slot=>defaults[slot],framing:['Auto','Full body'],angles:['Auto','Side view'],slotColor:slot=>({red:'#ff3b30',blue:'#2f80ff',yellow:'#ffd91a',green:'#35b84b',magenta:'#d943c8',cyan:'#00c8d7',orange:'#ff9500'})[slot],uiState:()=>saved,saveUiState:value=>{saved=value;}});
  flush();
  const container=wrap.children.find(e=>e.classList.contains('moss-box-prompt-cards'));
  const card=id=>container.children.find(c=>c.dataset.boxId===id);
  const field=id=>card(id).children[1].children[0];
  const fold=id=>{card(id).children[0].children.at(-1).onclick(new Event('click'));flush();};
  const control=(id,name)=>descendant(card(id),e=>e.attributes['aria-label']===`Box ${id} ${name}`);
  const inherit=id=>descendant(card(id),e=>e.attributes['aria-label']===`Box ${id} shared`);
  const mutate=element=>mutations.filter(o=>o.target===element).forEach(o=>o.callback());
  const resume=()=>{document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));flush();};
  const executionApi=new EventTarget(),app={rootGraph:graph};let requestSequence=0;
  executionApi.queuePrompt=initial.queuePrompt|| (async()=>({prompt_id:`request-${++requestSequence}`}));
  executionApi.addEventListener('executed',event=>{if(String(event.detail.node)==='20')node.onExecuted(event.detail.output);});
  const requests=installAnalysisRequests(app,executionApi,document);
  const removed=node.onRemoved;node.onRemoved=function(){requests.dispose();return removed?.apply(this,arguments);};
  const changed=()=>{graph.onAfterChange?.();document.dispatchEvent(Object.assign(new Event('litegraph:canvas'),{detail:{subType:'after-change'}}));flush();};
  const payload=()=>{
    const output={};for(const n of graph._nodes)if(n.id!=null){
      const inputs=Object.fromEntries((n.widgets||[]).map(w=>[w.name,w.value]));
      for(const input of n.inputs||[]){const link=graph.links.get(input.link);if(link)inputs[input.name]=[String(link.origin_id),0];}
      output[String(n.id)]={class_type:n.type,inputs};
    }
    output['10'].inputs.layout_data=JSON.stringify({boxes:state.boxes});
    for(const [slot,value] of Object.entries(defaults))for(const key of ['type','prompt'])output['20'].inputs[`${slot}_${key}`]=value[key];
    return {output,workflow:{}};
  };
  const queue=async()=>{const response=await executionApi.queuePrompt(0,payload());return response.prompt_id;};
  const deliver=async(id,text,box='red-1',link='30',canvasId='10')=>{
    executionApi.dispatchEvent(Object.assign(new Event('executed'),{detail:{prompt_id:id,node:'20',output:{moss_external_text:[{canvas:canvasId,box,text,link}]}}}));
    await Promise.resolve();flush();
  };
  return {node,canvas,graph,wrap,state,api,container,card,field,fold,control,inherit,colorCards,defaults,document,window,flush,resume,mutate,resizes,mutations,analysisCalls,executionApi,app,changed,payload,queue,deliver,saved:()=>structuredClone(saved)};
}

function descendant(root,predicate){if(predicate(root))return root;for(const child of root.children){const found=descendant(child,predicate);if(found)return found;}return null;}

function connectExternal(h,box='red-1') {
  const link={id:30,type:'MOSSBBoxTextLink',graph:h.graph,widgets:[{name:'target',value:box}],
    inputs:[{name:'framing_data',link:1},{name:'text',link:4},{name:'previous',link:null}]};
  h.graph._nodes.push(link,{id:31,type:'StringSource'});
  h.graph.links.set(3,{origin_id:30});h.graph.links.set(4,{origin_id:31});
  h.node.inputs=[{name:'external_text',link:3}];h.node.onConnectionsChange();h.flush();return link;
}

function connectAnalysis(h){
  const analysis={id:30,type:'MOSSBBoxImageAnalysis',graph:h.graph,widgets:[{name:'target',value:'red-1'}],inputs:[{name:'framing_data',link:1},{name:'image',link:4}]};
  const sw={id:40,type:'ComfySwitchNode',graph:h.graph,widgets:[{name:'switch',value:true}],inputs:[{name:'on_true',link:5},{name:'on_false',link:null},{name:'switch',link:null}]};
  const image={id:31,type:'LoadImage',widgets:[{name:'image',value:'A.png'}]};h.graph._nodes.push(analysis,sw,image);h.graph.links.set(3,{origin_id:40});h.graph.links.set(4,{origin_id:31});h.graph.links.set(5,{origin_id:30});
  h.node.inputs=[{name:'external_text',link:3}];h.node.onConnectionsChange();h.flush();return {analysis,sw,image};
}

test('analysis Auto resolves the first box independent of color and explicit missing targets remain invalid',async()=>{
  const h=harness({state:{boxes:[{id:'blue-first',slot:'blue'},{id:'red-next',slot:'red'}]}}),{analysis}=connectAnalysis(h);
  analysis.widgets[0].value='';h.api.refresh();h.flush();
  assert.equal(externalBindings(h.node).items[0].box,'blue-first');assert.equal(externalBindings(h.node).error,'');
  await h.deliver(await h.queue(),'Blue analysis','blue-first');
  assert.equal(h.state.boxes[0].promptData.prompt,'Blue analysis');assert.equal(h.state.boxes[1].promptData,undefined);
  analysis.widgets[0].value='deleted';h.api.refresh();h.flush();assert.equal(externalBindings(h.node).error,'target');
  analysis.widgets[0].value='red-next';h.api.refresh();h.flush();assert.equal(externalBindings(h.node).items[0].box,'red-next');
  analysis.widgets[0].value='';h.state.boxes.shift();h.api.refresh();h.flush();assert.equal(externalBindings(h.node).items[0].box,'red-next');
  h.state.boxes=[];h.api.refresh();h.flush();assert.equal(externalBindings(h.node).error,'target');h.node.onRemoved();
});

test('successful analysis remains editable on OFF, saves with the box and uses existing Undo',async()=>{
  const h=harness(),before=structuredClone(h.state.boxes),height=h.field('red-1').style.height;
  const {sw}=connectAnalysis(h);assert.equal(h.field('red-1').readOnly,true);const request=await h.queue();
  await h.deliver(request,'Automatically analyzed subject');
  assert.equal(h.field('red-1').value,'Automatically analyzed subject');
  assert.deepEqual(h.state.boxes[0].promptData,{...h.defaults.red,prompt:'Automatically analyzed subject'});assert.deepEqual(h.state.boxes[1],before[1]);
  // Repeated delivery must not add a second Undo entry.
  await h.deliver(request,'Automatically analyzed subject');
  sw.widgets[0].value=false;h.document.dispatchEvent(Object.assign(new Event('litegraph:canvas'),{detail:{subType:'after-change'}}));h.flush();
  assert.equal(h.field('red-1').readOnly,false);assert.equal(h.field('red-1').value,'Automatically analyzed subject');assert.equal(h.field('red-1').style.height,height);
  h.canvas.__mossBoxEditor.undo();h.flush();assert.deepEqual(h.state.boxes,before);
  h.canvas.__mossBoxEditor.redo();h.flush();assert.equal(h.field('red-1').value,'Automatically analyzed subject');
  h.field('red-1').value='Completely different manual prompt';h.field('red-1').dispatchEvent(new Event('input'));h.flush();h.resume();
  assert.equal(h.state.boxes[0].promptData.prompt,'Completely different manual prompt');
  const reloaded=harness({state:h.state,ui:h.saved()});assert.equal(reloaded.field('red-1').value,'Completely different manual prompt');assert.equal(reloaded.control('red-1','Type').value,'character');assert.equal(reloaded.field('red-1').style.height,height);
  const {sw:nextSwitch}=connectAnalysis(reloaded);nextSwitch.widgets[0].value=false;reloaded.api.refresh();reloaded.flush();
  assert.equal(reloaded.field('red-1').value,'Completely different manual prompt');h.node.onRemoved();reloaded.node.onRemoved();
});

test('analysis saves only valid current results and preserves every other box setting',async()=>{
  const h=harness({state:{boxes:[{id:'red-1',slot:'red',promptData:{prompt:'Original',name:'Keep',type:'character',framing:'Full body',angle:'Side view',focus:'Face',textStyle:{mode:'individual',color:'#123456'}}},{id:'yellow-2',slot:'yellow'}]}});
  const before=structuredClone(h.state.boxes),{analysis,sw}=connectAnalysis(h);
  let request=await h.queue();const receive=(text,box='red-1',link='30',canvas='10')=>h.deliver(request,text,box,link,canvas);
  await receive('');await receive('   ');await receive('Wrong link','red-1','999');await receive('Wrong Canvas','red-1','30','999');assert.deepEqual(h.state.boxes,before);
  analysis.widgets[0].value='yellow-2';h.api.refresh();h.flush();h.changed();await receive('Stale target');assert.deepEqual(h.state.boxes,before);
  analysis.widgets[0].value='red-1';h.api.refresh();h.flush();sw.widgets[0].value=false;h.changed();await receive('Late after OFF');assert.deepEqual(h.state.boxes,before);
  sw.widgets[0].value=true;h.api.refresh();h.flush();h.changed();request=await h.queue();await receive('New analyzed body');assert.deepEqual(h.state.boxes[0].promptData,{...before[0].promptData,prompt:'New analyzed body'});assert.deepEqual(h.state.boxes[1],before[1]);h.node.onRemoved();
});

test('external card uses one read-only field, restores manual text on unlink and rejects formatter writes',()=>{
  const h=harness({state:{boxes:[{id:'red-1',slot:'red',promptData:{prompt:'こんにちは',type:'character'}}]}});
  const saved=structuredClone(h.state),height=h.field('red-1').style.height;
  connectExternal(h);
  assert.equal(h.field('red-1').readOnly,true);assert.equal(h.field('red-1').value,'');
  h.node.onExecuted({moss_external_text:[{canvas:'10',box:'red-1',link:'30',text:'ありがとう'}]});h.flush();
  assert.equal(h.field('red-1').value,'ありがとう');
  h.field('red-1').value='formatter must not save';h.field('red-1').dispatchEvent(new Event('input'));h.flush();
  assert.equal(h.field('red-1').value,'ありがとう');assert.deepEqual(h.state,saved);
  assert.equal(h.inherit('red-1').disabled,true);
  h.node.inputs[0].link=null;h.node.onConnectionsChange();h.flush();
  assert.equal(h.field('red-1').readOnly,false);assert.equal(h.field('red-1').value,'こんにちは');
  assert.equal(h.field('red-1').style.height,height);assert.deepEqual(h.state,saved);
  h.node.onRemoved();
});

test('external empty and missing input never reveal manual text; reconnect waits for execution',()=>{
  const h=harness();const link=connectExternal(h);
  h.node.onExecuted({moss_external_text:[{canvas:'10',box:'red-1',link:'30',text:''}]});h.flush();
  assert.equal(h.field('red-1').value,'');assert.equal(h.field('yellow-2').readOnly,false);
  link.inputs[1].link=null;h.api.refresh();h.flush();
  assert.equal(h.field('red-1').value,'');assert.equal(h.field('red-1').readOnly,true);
  assert.match(h.field('red-1').placeholder,/Check link/);
  link.inputs[1].link=4;h.api.refresh();h.flush();
  assert.match(h.field('red-1').placeholder,/Not run/);
  h.node.onRemoved();
});

test('two Exports, focus, configure and stale execution results cannot switch external targets or saved Type',()=>{
  const h=harness();const link=connectExternal(h);
  h.graph._nodes.push({id:41,type:'MOSSFromKrea2',inputs:[{name:'framing_data',link:1},{name:'prompt_ui_data',link:2}]});
  h.node.onExecuted({moss_external_text:[{canvas:'10',box:'red-1',link:'30',text:'First external'}]});h.flush();h.resume();
  assert.equal(h.field('red-1').value,'First external');
  h.control('red-1','Type').value='text';h.control('red-1','Type').dispatchEvent(new Event('change'));h.flush();
  assert.equal(h.state.boxes[0].promptData.type,'text');assert.equal(h.state.boxes[0].promptData.prompt,'unchanged');
  link.widgets[0].value='yellow-2';h.api.refresh();h.flush();
  assert.equal(h.field('red-1').readOnly,false);assert.equal(h.field('yellow-2').value,'');
  h.node.onExecuted({moss_external_text:[{canvas:'10',box:'red-1',link:'30',text:'Stale result'}]});h.flush();
  assert.equal(h.field('red-1').value,'unchanged');assert.equal(h.field('yellow-2').value,'');
  h.node.onConfigure({});h.flush();assert.equal(h.field('yellow-2').readOnly,true);
  h.node.onRemoved();
});

test('a pending manual composition survives unrelated refresh with unchanged saved model',()=>{
  const h=harness();h.field('red-1').value='日本語入力中';h.api.refresh();h.flush();
  assert.equal(h.field('red-1').value,'日本語入力中');h.node.onRemoved();
});
test('selection refresh cannot overwrite a pending Type choice when its underlying model has not changed',()=>{
  const h=harness({state:{boxes:[{id:'red-1',slot:'red',promptData:{type:'object',prompt:'keep'}}],selectedId:null}});
  h.control('red-1','Type').value='character';h.api.refresh();h.flush();
  assert.equal(h.control('red-1','Type').value,'character');h.node.onRemoved();
});
test('native select input immediately saves just that field and keeps independent model settings',()=>{
  const h=harness({state:{boxes:[{id:'red-1',slot:'red',promptData:{type:'object',prompt:'keep',framing:'Full body',angle:'Side view',focus:'Hands'}}],selectedId:null}});
  h.control('red-1','Type').value='character';h.control('red-1','Type').dispatchEvent(new Event('input'));h.flush();
  assert.equal(h.state.boxes[0].promptData.type,'character');assert.equal(h.state.boxes[0].promptData.prompt,'keep');
  // An unrelated stale form value must not be copied back with a prompt edit.
  h.control('red-1','Angle').value='Auto';h.field('red-1').value='new words';h.field('red-1').dispatchEvent(new Event('input'));h.flush();
  assert.equal(h.state.boxes[0].promptData.angle,'Side view');assert.equal(h.state.boxes[0].promptData.focus,'Hands');h.resume();
  assert.equal(h.control('red-1','Type').value,'character');h.node.onRemoved();
});
test('ID Focus keeps individual Auto, disables for Text without clearing, survives resume/reload and Undo',()=>{
  const h=harness({defaults:{red:{type:'character',prompt:'inherited',focus:'Hands'},yellow:{type:'object',prompt:'other'}}});
  const focus=()=>h.control('red-1','Focus');assert.equal(focus().value,'Hands');
  focus().value='Auto';focus().dispatchEvent(new Event('change'));h.flush();assert.equal(h.state.boxes[0].promptData.focus,'Auto');
  focus().value='Breasts';focus().dispatchEvent(new Event('change'));h.flush();
  h.control('red-1','Type').value='text';h.control('red-1','Type').dispatchEvent(new Event('change'));h.flush();
  assert.equal(focus().disabled,true);assert.equal(focus().value,'Breasts');h.resume();
  h.control('red-1','Type').value='character';h.control('red-1','Type').dispatchEvent(new Event('change'));h.flush();
  assert.equal(focus().disabled,false);assert.equal(focus().value,'Breasts');
  const loaded=harness({state:structuredClone(h.state),ui:h.saved()});assert.equal(loaded.control('red-1','Focus').value,'Breasts');loaded.node.onRemoved();
  h.inherit('red-1').onclick();h.flush();assert.equal(focus().value,'Hands');h.canvas.__mossBoxEditor.undo();h.flush();assert.equal(focus().value,'Breasts');h.node.onRemoved();
});
test('dialogue controls localize without changing saved data, and apply deliberate edits immediately',()=>{
 let language='ja';const h=harness({language:()=>language,state:{boxes:[{id:'red-1',slot:'red',promptData:{type:'text',prompt:'こんにちは',textStyle:{mode:'common',extra:'keep me'}}}],selectedId:null}});
 const before=structuredClone(h.state.boxes),find=k=>descendant(h.card('red-1'),e=>e.attributes['aria-label']===`box-red-1 dialogue ${k}`);
 assert.equal(find('role').options[1].textContent,'セリフ');language='en';h.resume();assert.equal(find('role').options[1].textContent,'Speech');assert.deepEqual(h.state.boxes,before);
 find('role').value='speech';find('role').dispatchEvent(new Event('change'));h.flush();
 assert.equal(h.state.boxes[0].promptData.textStyle.mode,'individual');assert.equal(h.field('red-1').value,'こんにちは');assert(h.state.boxes[0].promptData.textStyle.extra.endsWith('keep me'));h.node.onRemoved();
});
test('dialogue choices retain literal wording, notes, other boxes, Undo/Redo and workflow restore',()=>{
 const literal='  「こんにちは、世界！」\nReally, yes? | exact  ',original={mode:'individual',font:'serif',weight:'bold',color:'gold',extra:'Keep gold border.\n日本語の補足'};
 const h=harness({state:{boxes:[{id:'red-1',slot:'red',promptData:{type:'text',prompt:literal,textStyle:original}},{id:'yellow-2',slot:'yellow'}],selectedId:null}});
 const find=k=>descendant(h.card('red-1'),e=>e.attributes['aria-label']===`box-red-1 dialogue ${k}`);
 const other=structuredClone(h.state.boxes[1]);find('shape').value='cloud';find('shape').dispatchEvent(new Event('change'));h.flush();
 const applied=structuredClone(h.state.boxes[0].promptData);assert.equal(applied.prompt,literal);assert.match(applied.textStyle.extra,/cloud-shaped thought bubble/);assert(applied.textStyle.extra.endsWith(original.extra));assert.deepEqual(h.state.boxes[1],other);
 h.resume();assert.equal(find('shape').value,'cloud');h.canvas.__mossBoxEditor.undo();h.flush();assert.deepEqual(h.state.boxes[0].promptData.textStyle,original);h.canvas.__mossBoxEditor.redo();h.flush();assert.deepEqual(h.state.boxes[0].promptData,applied);
 const loaded=harness({state:JSON.parse(JSON.stringify(h.state)),ui:h.saved()});assert.equal(descendant(loaded.card('red-1'),e=>e.attributes['aria-label']==='box-red-1 dialogue shape').value,'cloud');assert.equal(loaded.field('red-1').value,literal);loaded.node.onRemoved();h.node.onRemoved();
});

test('custom prompt formatting markers follow Type and change-only formatter edits reach saved ID data',()=>{
  const h=harness();assert.equal(h.field('red-1').dataset.jpAssistFormat,'prompt');
  h.control('red-1','Type').value='text';h.control('red-1','Type').dispatchEvent(new Event('change'));h.flush();
  assert.equal(h.field('red-1').dataset.jpAssistFormat,'literal');
  h.field('red-1').value='explicitly formatted';h.field('red-1').dispatchEvent(new Event('change'));h.flush();
  assert.equal(h.state.boxes[0].promptData.prompt,'explicitly formatted');
  h.control('red-1','Type').value='object';h.control('red-1','Type').dispatchEvent(new Event('change'));h.flush();
  assert.equal(h.field('red-1').dataset.jpAssistFormat,'prompt');h.node.onRemoved();
});

test('browser visibility return restores card heights and open state without a Canvas click',()=>{
  const h=harness(),before=h.saved();
  h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));
  h.field('red-1').style.height='125px';h.mutate(h.field('red-1'));
  h.card('red-1').classList.toggle('collapsed',true);
  h.resume();
  assert.equal(h.card('red-1').classList.contains('collapsed'),false);
  assert.equal(h.field('red-1').style.height,'245px');
  assert.equal(h.card('yellow-2').classList.contains('collapsed'),true);
  assert.equal(h.field('yellow-2').style.height,'185px');
  assert.deepEqual(h.saved(),before);
});

test('reattached DOM recreates a missing ID card without changing its saved state',()=>{
  const h=harness();h.wrap.isConnected=false;h.api.refresh();h.flush();
  h.card('red-1').remove();h.resume();
  h.wrap.isConnected=true;for(const observer of h.resizes)observer.callback();h.flush();
  assert(h.card('red-1'));
  assert.equal(h.card('red-1').classList.contains('collapsed'),false);
  assert.equal(h.field('red-1').style.height,'245px');
});

test('only a resize grip gesture saves a new height; closing and reopening retains it',()=>{
  const h=harness(),field=h.field('red-1');
  field.dispatchEvent(Object.assign(new Event('pointerdown'),{clientX:298,clientY:123}));
  field.style.height='310px';h.mutate(field);
  assert.equal(h.saved().cards.find(c=>c.id==='red-1').height,245,'resizing does not repeatedly serialize the workflow');
  h.window.dispatchEvent(new Event('pointerup'));
  assert.equal(h.saved().cards.find(c=>c.id==='red-1').height,310);
  h.fold('red-1');
  assert.equal(h.card('red-1').classList.contains('collapsed'),true);
  h.resume();assert.equal(h.card('red-1').classList.contains('collapsed'),true);
  h.fold('red-1');
  assert.equal(h.field('red-1').style.height,'310px');
  field.style.height='125px';h.mutate(field);h.resume();
  assert.equal(field.style.height,'310px');
});
test('leaving a browser tab or cancelling an ID-card resize commits the final size and ends the gesture',()=>{
  for(const event of ['visibilitychange','pagehide','pointercancel']){
    const h=harness(),field=h.field('red-1');field.dispatchEvent(Object.assign(new Event('pointerdown'),{clientX:298,clientY:123}));field.style.height='800px';
    if(event==='visibilitychange'){h.document.hidden=true;h.document.dispatchEvent(new Event(event));}else h.window.dispatchEvent(new Event(event));
    assert.equal(h.saved().cards.find(c=>c.id==='red-1').height,800);
    field.style.height='125px';h.resume();assert.equal(field.style.height,'800px');h.node.onRemoved();
  }
});

test('temporary empty Canvas lists cannot erase remembered card sizes and expansion',()=>{
  const h=harness();h.fold('red-1');
  const before=h.saved().cards,boxes=h.state.boxes;h.state.boxes=[];h.state.selectedId=null;h.api.refresh();h.flush();
  assert.deepEqual(h.saved().cards,before);
  h.state.boxes=boxes;h.resume();
  assert.equal(h.card('red-1').classList.contains('collapsed'),true);
  assert.equal(h.field('red-1').style.height,'245px');
});

test('node removal disconnects visibility, size and style observers',()=>{
  const h=harness();h.node.onRemoved();h.wrap.isConnected=false;
  h.resume();assert(h.resizes.every(o=>o.target===null));assert(h.mutations.every(o=>o.target===null));
});

test('visible Analyze command targets only the selected box and never changes prompt settings',()=>{
  const h=harness({analysisStatus:()=>({enabled:true,reason:''})}),before=structuredClone(h.state.boxes);
  const action=descendant(h.wrap,e=>e.attributes['aria-label']==='Analyze selected box');
  assert(action);assert.equal(action.disabled,true);
  h.canvas.__mossBoxEditor.select('yellow-2');h.flush();assert.equal(action.disabled,false);action.onclick();
  assert.deepEqual(h.analysisCalls,[[h.canvas,'yellow-2','en']]);assert.deepEqual(h.state.boxes,before);
  const unavailable=harness();unavailable.canvas.__mossBoxEditor.select('red-1');unavailable.flush();
  assert.equal(descendant(unavailable.wrap,e=>e.attributes['aria-label']==='Analyze selected box').disabled,true);
  h.node.onRemoved();unavailable.node.onRemoved();
});

test('legacy shared-open state stays closed while individual text, Type, height and folding survive',()=>{
 const ui={sharedOpen:true,sourceId:'10',cards:[{canvasId:'10',id:'red-1',open:true,height:245},{canvasId:'10',id:'yellow-2',open:false,height:185}]};
 const state={boxes:[{id:'red-1',slot:'red',promptData:{prompt:'Keep my text',type:'character',focus:'Face'}},{id:'yellow-2',slot:'yellow'}],selectedId:null};
 const h=harness({ui,state}),before=structuredClone(h.state),shared=h.wrap.children.find(e=>e.classList.contains('moss-shared-defaults'));
 assert.equal(Boolean(shared.open),false);assert.equal(h.field('red-1').value,'Keep my text');assert.equal(h.control('red-1','Type').value,'character');
 assert.equal(h.field('red-1').style.height,'245px');assert.equal(h.card('yellow-2').classList.contains('collapsed'),true);
 shared.open=true;shared.dispatchEvent(new Event('toggle'));h.flush();h.api.restore(h.saved());h.flush();h.resume();
 assert.equal(shared.open,true);assert.equal(Object.hasOwn(h.saved(),'sharedOpen'),false);
 h.node.onConfigure();h.flush();assert.equal(shared.open,false);assert.deepEqual(h.state,before);
 assert.equal(h.field('red-1').style.height,'245px');assert.equal(h.card('yellow-2').classList.contains('collapsed'),true);h.node.onRemoved();
});

test('standalone common editor closes when Canvas connects, including reconnection',()=>{
 const h=harness(),before=structuredClone(h.state),shared=h.wrap.children.find(e=>e.classList.contains('moss-shared-defaults'));
 const exportNode=h.graph._nodes.find(n=>n.type==='MOSSFromKrea2');
 for(let round=0;round<2;round++){
  h.graph._nodes=h.graph._nodes.filter(n=>n!==exportNode);h.node.onConnectionsChange();h.flush();
  assert.equal(shared.open,true);assert.equal(h.container.style.display,'none');
  h.graph._nodes.push(exportNode);h.node.onConnectionsChange();h.flush();
  assert.equal(shared.open,false);assert.equal(h.container.style.display,'flex');assert.deepEqual(h.state,before);
 }
 h.node.onRemoved();
});

test('selection/focus and advanced shared settings never replace or hide the box editor',()=>{
 const h=harness();const before=structuredClone(h.state.boxes),shared=h.wrap.children.find(e=>e.className==='moss-shared-defaults');
 shared.open=true;shared.dispatchEvent(new Event('toggle'));h.flush();h.card('red-1').children[0].onclick();h.resume();
 assert.equal(h.container.style.display,'flex');assert.equal(h.card('red-1').classList.contains('collapsed'),false);assert.deepEqual(h.state.boxes,before);
 shared.open=false;shared.dispatchEvent(new Event('toggle'));h.flush();assert.equal(h.container.style.display,'flex');assert.deepEqual(h.state.boxes,before);h.node.onRemoved();
});

test('all seven colors and three Types survive edits, focus, card selection, reload, reset, Undo and Redo',()=>{
  const slots=['red','blue','yellow','green','magenta','cyan','orange'];
  const h=harness({state:{boxes:slots.map(slot=>({id:slot,slot})),selectedId:null}});
  for(const slot of slots)for(const type of ['character','object','text']) {
    const text=`${slot} ${type} 日本語\n"literal" | exact`;
    h.control(slot,'Type').value=type;h.control(slot,'Type').dispatchEvent(new Event('change'));h.flush();
    h.field(slot).value=text;h.field(slot).dispatchEvent(new Event('input'));h.flush();
    h.control(slot,'Framing').value='Auto';h.control(slot,'Framing').dispatchEvent(new Event('change'));h.flush();
    h.control(slot,'Angle').value='Auto';h.control(slot,'Angle').dispatchEvent(new Event('change'));h.flush();
    const saved=structuredClone(h.state.boxes);
    h.card(slot).children[0].onclick();h.resume();h.api.restore(h.saved());h.flush();
    assert.equal(h.control(slot,'Type').value,type);assert.equal(h.field(slot).value,text);
    assert.equal(h.control(slot,'Framing').value,'Auto');assert.equal(h.control(slot,'Angle').value,'Auto');
    assert.deepEqual(h.state.boxes,saved);
    const loaded=harness({state:JSON.parse(JSON.stringify(h.state)),ui:h.saved()});
    assert.equal(loaded.control(slot,'Type').value,type);assert.equal(loaded.field(slot).value,text);loaded.node.onRemoved();
  }
  for(const slot of slots) {
    const before=structuredClone(h.state.boxes),individual=before.find(b=>b.id===slot).promptData;
    assert.match(h.inherit(slot).textContent,/^Shared$/);h.inherit(slot).onclick();h.flush();
    assert.equal(h.state.boxes.find(b=>b.id===slot).promptData,undefined);
    assert.equal(h.control(slot,'Type').value,'character');assert.equal(h.inherit(slot).disabled,true);
    assert.deepEqual(h.state.boxes.filter(b=>b.id!==slot),before.filter(b=>b.id!==slot));
    h.canvas.__mossBoxEditor.undo();h.flush();assert.deepEqual(h.state.boxes.find(b=>b.id===slot).promptData,individual);
    h.canvas.__mossBoxEditor.redo();h.flush();assert.equal(h.control(slot,'Type').value,'character');
  }
});

test('auto-generated numeric IDs stay internal, and card colors remain visible while selecting',()=>{
  const id='box_1793090474403_1',h=harness({state:{boxes:[{id,slot:'yellow'}],selectedId:null}});
  const label=h.card(id).children[0].children[0];
  const dot=label.children[0],text=label.children[1];
  assert.equal(text.textContent,'YELLOW');assert.equal(label.title,undefined);
  h.card(id).children[0].onclick();h.resume();
  assert.equal(dot.style.background,'#ffd91a');assert.equal(label.style.color,undefined);assert.equal(h.card(id).style.borderLeft,'3px solid #ffd91a');
  assert.equal(h.state.boxes[0].id,id);
});
test('all seven card headers keep a colored dot and readable color/name without exposing IDs or ordinal numbers',()=>{
  const slots=['red','blue','yellow','green','magenta','cyan','orange'];
  const h=harness({state:{boxes:slots.map((slot,i)=>({id:`box_1793096214898_${i}`,slot,promptData:{type:'character',prompt:'keep',name:i===1?'Alice':`box_1793096214898_${i}`}})),selectedId:null}});
  for(const [i,slot] of slots.entries()){
    const id=`box_1793096214898_${i}`,head=h.card(id).children[0].children[0],dot=head.children[0],label=head.children[1];
    assert.equal(label.textContent,slot.toUpperCase()+(i===1?' · Alice':''));assert(!label.textContent.includes('box_'));assert(!label.textContent.includes('#'));
    const color=['#ff3b30','#2f80ff','#ffd91a','#35b84b','#d943c8','#00c8d7','#ff9500'][i];assert.equal(dot.style.background,color);h.card(id).children[0].onclick();h.resume();assert.equal(dot.style.background,color);assert.equal(h.state.boxes[i].id,id);
  }
  h.node.onRemoved();
});
test('actual Canvas controls put language at the lower row end and Snap immediately after reference status',async()=>{
  const source=await readFile(new URL('../web/moss_controls.mjs',import.meta.url),'utf8');
  const start=source.indexOf('  const precisionBar = document.createElement("div");'),end=source.indexOf('  const monitor =',start);
  const wrap=new Element(),languageBox=new Element(),snapBox=new Element(),document={createElement:tag=>new Element(tag)};
  const {precisionBar}=new Function('document','wrap','languageBox','snapBox','button','option','bindHelp',source.slice(start,end)+'\nreturn {precisionBar};')
    (document,wrap,languageBox,snapBox,text=>Object.assign(new Element('button'),{textContent:text}),(value,text)=>Object.assign(new Element('option'),{value,textContent:text}),()=>{});
  const status=new Element('span'),reference={element:new Element()};reference.element.append(status);
  const line=source.indexOf('  reference.element.append(snapBox);');assert(line>=0);
  const stop=source.indexOf('  const oldExecuted =',line);
  new Function('reference','snapBox','wrap','precisionBar',source.slice(line,stop))(reference,snapBox,wrap,precisionBar);
  assert.equal(languageBox.parentNode,precisionBar);assert.equal(precisionBar.children.at(-1),languageBox);
  assert.equal(languageBox.style.cssText,'margin-left:auto;flex-wrap:nowrap;white-space:nowrap');
  assert.equal(snapBox.parentNode,reference.element);assert.equal(reference.element.children.at(-2),status);assert.equal(reference.element.children.at(-1),snapBox);
});

test('color-card heading selects only; its arrow alone changes expansion',async()=>{
  const source=await readFile(new URL('../web/moss_controls.mjs',import.meta.url),'utf8');
  const start=source.indexOf('    function applyOpen() {'),end=source.indexOf('    promptPresetSelect.addEventListener(',start);
  assert(start>=0&&end>start);
  const card=new Element(),head=new Element(),fold=new Element(),state={slotOpen:{red:true}};
  let selected=0,saves=0;
  new Function('card','head','foldMark','promptUiState','slot','savePromptUiState','boxPrompts',source.slice(start,end))
    (card,head,fold,state,'red',()=>saves++,{selectColor:slot=>{assert.equal(slot,'red');selected++;}});
  head.dispatchEvent(new Event('click'));assert.equal(selected,1);assert.equal(saves,0);assert.equal(state.slotOpen.red,true);
  fold.dispatchEvent(new Event('click'));assert.equal(selected,1);assert.equal(saves,1);assert.equal(state.slotOpen.red,false);assert(card.classList.contains('collapsed'));
  fold.dispatchEvent(new Event('click'));assert.equal(state.slotOpen.red,true);assert(!card.classList.contains('collapsed'));
});

test('overlap menu selects a fully covered or locked box without changing order or data',async()=>{
  const source=await readFile(new URL('../web/box_selection.mjs',import.meta.url),'utf8');
  const document=new EventTarget(),window=new EventTarget();document.createElement=tag=>Object.assign(new Element(tag),{ownerDocument:document});
  document.body=new Element();window.innerWidth=1200;window.innerHeight=800;
  const overlay=document.createElement('canvas'),boxes=[{id:'behind',slot:'red',x1:0,y1:0,x2:100,y2:100,locked:true},{id:'box_1793090474403_1',slot:'yellow',x1:0,y1:0,x2:100,y2:100}];
  const before=structuredClone(boxes),selected=[];
  const mount=new Function('document','window','overlappingBoxes','bindHelp',source.replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nreturn mountBoxSelectionMenu;')(document,window,overlappingBoxes,()=>{});
  const menu=mount(overlay,{boxes:()=>boxes,point:e=>({x:e.clientX,y:e.clientY}),color:()=> '#f00',language:()=> 'en',select:id=>selected.push(id)});
  const open=()=>overlay.dispatchEvent(Object.assign(new Event('contextmenu',{cancelable:true}),{clientX:30,clientY:30}));
  open();let popup=document.body.children[0];assert.equal(popup.children.length,2);assert.match(popup.children[1].textContent,/behind.*🔒/);
  assert.equal(popup.children[0].textContent,'#2 · YELLOW');popup.children[1].onclick();
  assert.deepEqual(selected,['behind']);assert.deepEqual(boxes,before);assert.equal(document.body.children.length,0);
  open();window.dispatchEvent(Object.assign(new Event('keydown',{cancelable:true}),{key:'Escape'}));assert.equal(document.body.children.length,0);
  open();window.dispatchEvent(new Event('blur'));assert.equal(document.body.children.length,0);
  const empty=Object.assign(new Event('contextmenu',{cancelable:true}),{clientX:500,clientY:500});overlay.dispatchEvent(empty);assert.equal(empty.defaultPrevented,false);
  menu.dispose();open();assert.equal(document.body.children.length,0);
});

async function colorResizeHarness() {
  const source=await readFile(new URL('../web/moss_controls.mjs',import.meta.url),'utf8');
  const start=source.indexOf('  function bindTextHeight('),end=source.indexOf('  const wrap = document.createElement(',start);
  const window=new EventTarget(),document=new EventTarget(),timers=new Map(),observers=[],disposers=[];let sequence=0,now=0;
  document.hidden=false;
  const promptUiState={textHeights:{red_prompt:125},textHeightManual:{red_prompt:true}};
  const setTimeout=(callback,delay)=>{timers.set(++sequence,{callback,delay});return sequence;};
  const clearTimeout=id=>timers.delete(id);
  window.setInterval=()=>++sequence;window.clearInterval=()=>{};
  class MutationObserver {constructor(callback){this.callback=callback;observers.push(this);}observe(target){this.target=target;}disconnect(){this.target=null;}}
  window.MutationObserver=MutationObserver;
  const field=new Element('textarea');field.style.height='125px';field.dataset.k2cfAppliedHeight='125px';
  const helpers=new Function(source.replace(/^import .*;\r?\n/gm,'').replace(/^export .*;\s*$/m,'')+'\nreturn {k2cfPromptTextHeightInRange};')();
  const saveStart=source.indexOf('  function recordTextHeight('),saveEnd=source.indexOf('  function applySavedTextHeight(',saveStart);
  const save=new Function('promptUiState','k2cfPromptTextHeightInRange','k2cfElementPixelHeight','savePromptUiState',source.slice(saveStart,saveEnd)+'\nreturn saveObservedTextHeight;')
    (promptUiState,helpers.k2cfPromptTextHeightInRange,element=>parseFloat(element.style.height),()=>{});
  const bind=new Function('window','document','Date','setTimeout','clearTimeout','MutationObserver','textHeightDisposers','applySavedTextHeight','saveObservedTextHeight',
    source.slice(start,end)+'\nreturn bindTextHeight;')
    (window,document,{now:()=>now},setTimeout,clearTimeout,MutationObserver,disposers,()=>{},save);
  bind('red_prompt',field);
  const begin=()=>field.dispatchEvent(Object.assign(new Event('pointerdown'),{clientX:298,clientY:123}));
  return {window,document,field,timers,observers,disposers,begin,advance:ms=>{now+=ms;},mutate:()=>observers.filter(o=>o.target===field).forEach(o=>o.callback()),saved:()=>promptUiState.textHeights.red_prompt};
}

test('final color resize height is saved synchronously before immediate workflow serialization',async()=>{
  const h=await colorResizeHarness();h.begin();h.field.style.height='800px';h.window.dispatchEvent(new Event('pointerup'));
  assert.equal(h.saved(),800);h.disposers.forEach(dispose=>dispose());
});

test('consecutive color resizes commit independently without a delayed settlement',async()=>{
  const h=await colorResizeHarness();h.begin();h.field.style.height='600px';h.window.dispatchEvent(new Event('pointerup'));
  const oldCallbacks=[...h.timers.values()].map(timer=>timer.callback);
  h.begin();h.field.style.height='900px';oldCallbacks.forEach(callback=>callback());
  assert.equal(h.field.__k2cfResizingTextHeight,true);
  assert.equal(h.saved(),600);assert.equal(h.timers.size,0);
  h.window.dispatchEvent(new Event('pointerup'));assert.equal(h.saved(),900);
  h.disposers.forEach(dispose=>dispose());
});

test('removing a color prompt node disposes resize listeners, observers and pending saves',async()=>{
  const h=await colorResizeHarness();h.begin();h.field.style.height='600px';h.window.dispatchEvent(new Event('pointerup'));
  const oldCallbacks=[...h.timers.values()].map(timer=>timer.callback),saved=h.saved();
  assert.equal(h.disposers.length,1);h.disposers.forEach(dispose=>dispose());
  h.field.style.height='125px';h.window.dispatchEvent(new Event('mouseup'));oldCallbacks.forEach(callback=>callback());
  assert.equal(h.saved(),saved);assert.equal(h.timers.size,0);assert(h.observers.every(observer=>observer.target===null));
});

test('a deliberate color resize can shrink after holding the grip for more than 3.5 seconds',async()=>{
  const h=await colorResizeHarness();h.begin();h.field.style.height='800px';h.mutate();assert.equal(h.field.style.height,'800px');assert.equal(h.saved(),125);
  h.advance(5000);h.field.style.height='400px';h.mutate();h.window.dispatchEvent(new Event('pointerup'));
  assert.equal(h.saved(),400);h.disposers.forEach(dispose=>dispose());
});

test('tab blur, page hide and visibility loss end resize capture before automatic layout changes',async()=>{
  for(const event of ['blur','pagehide','visibilitychange','pointercancel','touchcancel']) {
    const h=await colorResizeHarness();h.begin();h.field.style.height='800px';h.mutate();
    if(event==='visibilitychange'){h.document.hidden=true;h.document.dispatchEvent(new Event(event));}
    else h.window.dispatchEvent(new Event(event));
    assert.equal(h.field.__k2cfResizingTextHeight,false,event);assert.equal(h.timers.size,0,event);
    h.field.style.height='125px';h.mutate();for(const timer of h.timers.values())timer.callback();
    assert.equal(h.saved(),800,event);h.disposers.forEach(dispose=>dispose());
  }
});

test('right-click selection uses the actual Canvas point rather than clamping blank margins into a box',async()=>{
  const source=await readFile(new URL('../web/moss_controls.mjs',import.meta.url),'utf8');
  const start=source.indexOf('  function point('),end=source.indexOf('  function frameBounds(',start);
  const point=new Function('overlay','frameBounds','clamp',source.slice(start,end)+'\nreturn point;')
    ({width:100,height:100,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},()=>({minX:28,minY:28,maxX:72,maxY:72}),(value,min,max)=>Math.max(min,Math.min(max,value)));
  const event={clientX:5,clientY:40};assert.equal(point(event).x,28);assert.equal(point(event,false).x,5);
  const boxes=[{id:'edge',slot:'red',x1:28,y1:28,x2:60,y2:60}];
  assert.equal(overlappingBoxes(boxes,point(event,false)).length,0);
});

test('legacy workflows without a saved view show existing independent prompts directly',()=>{
  const h=harness({ui:{},state:{boxes:[{id:'red-1',slot:'red',promptData:{prompt:'actual generated text',type:'character'}}],selectedId:null}});
  assert.equal(h.container.style.display,'flex');
  assert.equal(h.field('red-1').value,'actual generated text');
  assert.equal(h.card('red-1').classList.contains('collapsed'),false);
  const bar=h.wrap.children.find(e=>e.classList.contains('moss-box-prompt-bar'));
  const shared=h.wrap.children.find(e=>e.className==='moss-shared-defaults');shared.open=true;shared.dispatchEvent(new Event('toggle'));h.flush();
  assert.equal(h.container.style.display,'flex');assert.equal(bar.children.length,5);
  h.canvas.__mossBoxEditor.select('red-1');h.flush();assert.equal(h.container.style.display,'flex');assert.equal(h.state.boxes[0].promptData.prompt,'actual generated text');
  h.node.onRemoved();
});

test('legacy saved color view cannot hide actual box text, while saved folding remains intact',()=>{
  const h=harness({ui:{mode:'colors',manualMode:true,sourceId:'10',cards:[{canvasId:'10',id:'red-1',open:false,height:245}]},state:{boxes:[{id:'red-1',slot:'red',promptData:{prompt:'kept independent text',type:'character'}}],selectedId:null}});
  assert.equal(h.container.style.display,'flex');assert.equal(h.card('red-1').classList.contains('collapsed'),true);
  h.resume();assert.equal(h.container.style.display,'flex');assert.equal(h.card('red-1').classList.contains('collapsed'),true);
  h.node.onRemoved();
});

test('replacing individual text requires confirmation with the actual replacement preview',()=>{
 const h=harness({state:{boxes:[{id:'red-1',slot:'red',promptData:{type:'text',prompt:'こんにちは'}}],selectedId:null}});
 let message='';h.window.confirm=text=>{message=text;return false;};h.inherit('red-1').onclick();h.flush();assert.equal(h.state.boxes[0].promptData.prompt,'こんにちは');assert(message.includes('unchanged'));
 h.window.confirm=()=>true;h.inherit('red-1').onclick();h.flush();assert.equal(h.state.boxes[0].promptData,undefined);h.canvas.__mossBoxEditor.undo();h.flush();assert.equal(h.state.boxes[0].promptData.prompt,'こんにちは');h.node.onRemoved();
});

test('all seven colors start with the same compact height and keep optional actions outside the sidebar',()=>{
 const slots=['red','blue','yellow','green','magenta','cyan','orange'];const h=harness({ui:{},state:{boxes:slots.map(slot=>({id:slot,slot})),selectedId:null}});
 for(const slot of slots){assert.match(h.field(slot).style.cssText,/height:170px/);const side=h.card(slot).children[1].children[1];assert.equal(side.children.length,4);assert(h.inherit(slot));assert.equal(h.inherit(slot).parentNode.className,'moss-card-options');}
 h.node.onRemoved();
});


test('request identity rejects stale image results without changing visible or saved text',async()=>{
 const h=harness(),{image}=connectAnalysis(h),before=structuredClone(h.state.boxes);const id=await h.queue();
 image.widgets[0].value='B.png';h.changed();await h.deliver(id,'Description of image A');
 assert.deepEqual(h.state.boxes,before);assert.equal(h.field('red-1').value,h.defaults.red.prompt);assert.equal(h.node.__mossAnalysisNotice,'stale');h.node.onRemoved();
});
test('image A -> B -> A invalidates the old request permanently',async()=>{
 const h=harness(),{image}=connectAnalysis(h),before=structuredClone(h.state.boxes);const id=await h.queue();
 image.widgets[0].value='B.png';h.changed();image.widgets[0].value='A.png';h.changed();await h.deliver(id,'Old result');
 assert.deepEqual(h.state.boxes,before);await h.deliver(await h.queue(),'New requested result');assert.equal(h.state.boxes[0].promptData.prompt,'New requested result');h.node.onRemoved();
});
test('OFF -> manual edit -> ON never revives an earlier request',async()=>{
 const h=harness(),{sw}=connectAnalysis(h);const id=await h.queue();sw.widgets[0].value=false;h.changed();
 h.field('red-1').value='Edited while OFF';h.field('red-1').dispatchEvent(new Event('input'));h.flush();sw.widgets[0].value=true;h.changed();
 await h.deliver(id,'Old analysis');assert.equal(h.state.boxes[0].promptData.prompt,'Edited while OFF');assert.equal(h.field('red-1').value,'Edited while OFF');h.node.onRemoved();
});
test('edit -> Undo while waiting cannot resurrect an invalidated request',async()=>{
 const h=harness(),{sw}=connectAnalysis(h),before=structuredClone(h.state.boxes);const id=await h.queue();sw.widgets[0].value=false;h.changed();
 h.canvas.__mossBoxEditor.update('red-1',{...h.defaults.red,prompt:'Temporary edit'});h.canvas.__mossBoxEditor.undo();h.flush();sw.widgets[0].value=true;h.changed();
 assert.deepEqual(h.state.boxes,before);await h.deliver(id,'Old analysis');assert.deepEqual(h.state.boxes,before);h.node.onRemoved();
});
test('coordinate changes and restoration invalidate the old request',async()=>{
 const h=harness();connectAnalysis(h);h.state.boxes[0].x1=0;const id=await h.queue();h.state.boxes[0].x1=40;h.changed();h.state.boxes[0].x1=0;h.changed();
 await h.deliver(id,'Old crop');assert.equal(h.state.boxes[0].promptData,undefined);h.node.onRemoved();
});
test('Type changes and restoration invalidate pending analysis',async()=>{
 const h=harness();connectAnalysis(h);const id=await h.queue();h.control('red-1','Type').value='text';h.control('red-1','Type').dispatchEvent(new Event('change'));h.flush();
 h.control('red-1','Type').value='character';h.control('red-1','Type').dispatchEvent(new Event('change'));h.flush();
 const before=structuredClone(h.state.boxes);await h.deliver(id,'Old result');assert.deepEqual(h.state.boxes,before);h.node.onRemoved();
});
test('individual Text literal is never replaced by analysis or a bare onExecuted callback',async()=>{
 const literal='Hello! 日本語 (12:30)',h=harness();h.state.boxes[0].promptData={type:'text',prompt:literal,textStyle:{mode:'individual',color:'red'}};connectAnalysis(h);
 const before=structuredClone(h.state.boxes);await h.deliver(await h.queue(),'A person with blue hair.');
 h.node.onExecuted({moss_external_text:[{canvas:'10',box:'red-1',link:'30',text:'Another description'}]});h.flush();
 assert.deepEqual(h.state.boxes,before);assert.equal(h.field('red-1').value,literal);assert.equal(h.field('red-1').readOnly,false);h.node.onRemoved();
});
test('shared Text literal stays intact and does not create individual state',async()=>{
 const h=harness();h.defaults.red={type:'text',prompt:'Shared literal 日本語'};connectAnalysis(h);await h.deliver(await h.queue(),'A person.');
 assert.equal(h.state.boxes[0].promptData,undefined);assert.equal(h.field('red-1').value,'Shared literal 日本語');h.node.onRemoved();
});
test('unrequested and wrong prompt_id results cannot write analysis text',async()=>{
 const h=harness();connectAnalysis(h);const before=structuredClone(h.state.boxes);await h.deliver('no-request','Unrequested');assert.deepEqual(h.state.boxes,before);
 const id=await h.queue();await h.deliver('different-request','Wrong job');assert.deepEqual(h.state.boxes,before);await h.deliver(id,'Correct job');assert.equal(h.state.boxes[0].promptData.prompt,'Correct job');h.node.onRemoved();
});
test('a newer queued request supersedes older results even when they arrive last',async()=>{
 const h=harness();connectAnalysis(h);const old=await h.queue(),latest=await h.queue();await h.deliver(latest,'Latest result');await h.deliver(old,'Old result');
 assert.equal(h.state.boxes[0].promptData.prompt,'Latest result');assert.equal(h.field('red-1').value,'Latest result');h.node.onRemoved();
});
test('results arriving before the HTTP queue reply still match the returned prompt_id',async()=>{
 let resolve;const reply=new Promise(r=>resolve=r),h=harness({queuePrompt:()=>reply});connectAnalysis(h);const queued=h.queue();
 h.executionApi.dispatchEvent(Object.assign(new Event('executed'),{detail:{prompt_id:'early',node:'20',output:{moss_external_text:[{canvas:'10',box:'red-1',link:'30',text:'Early result'}]}}}));
 h.executionApi.dispatchEvent(Object.assign(new Event('execution_success'),{detail:{prompt_id:'early'}}));resolve({prompt_id:'early'});await queued;await Promise.resolve();h.flush();
 assert.equal(h.state.boxes[0].promptData.prompt,'Early result');h.node.onRemoved();
});
test('a failed or interrupted request cannot save a late result',async()=>{
 for(const type of ['execution_error','execution_interrupted']){const h=harness();connectAnalysis(h);const id=await h.queue();h.executionApi.dispatchEvent(Object.assign(new Event(type),{detail:{prompt_id:id}}));
 await h.deliver(id,'Late failed result');assert.equal(h.state.boxes[0].promptData,undefined);h.node.onRemoved();}
});
test('queue rejection preserves the body and rejects later unsolicited output',async()=>{
 const h=harness({queuePrompt:async()=>{throw Error('Queue failed');}});connectAnalysis(h);await assert.rejects(h.queue(),/Queue failed/);await h.deliver('unknown','Unsolicited');assert.equal(h.state.boxes[0].promptData,undefined);h.node.onRemoved();
});
test('snapshot and queued image must agree before a result can be accepted',async()=>{
 const h=harness(),{image}=connectAnalysis(h),payload=h.payload();image.widgets[0].value='B.png';const {prompt_id:id}=await h.executionApi.queuePrompt(0,payload);
 await h.deliver(id,'Queued A despite current B');assert.equal(h.state.boxes[0].promptData,undefined);h.node.onRemoved();
});
test('unrelated boxes, saved style and ordinary browser focus do not invalidate valid analysis',async()=>{
 const h=harness();connectAnalysis(h);const id=await h.queue();h.canvas.__mossBoxEditor.update('yellow-2',{...h.defaults.yellow,prompt:'Other box edit'});
 h.resume();await h.deliver(id,'Target result');assert.equal(h.state.boxes[0].promptData.prompt,'Target result');assert.equal(h.state.boxes[1].promptData.prompt,'Other box edit');h.node.onRemoved();
});
test('a deleted then restored target cannot revive a previous result',async()=>{
 const h=harness();connectAnalysis(h);const before=structuredClone(h.state.boxes),id=await h.queue();h.state.boxes.splice(0,1);h.changed();h.state.boxes.splice(0,0,before[0]);h.changed();
 await h.deliver(id,'Old deleted-box result');assert.deepEqual(h.state.boxes,before);h.node.onRemoved();
});

test('Core next-run sampling seed advance does not discard a valid current request',async()=>{
 const h=harness(),{analysis}=connectAnalysis(h);analysis.widgets.push({name:'seed',value:10},{name:'control_after_generate',value:'increment'});const id=await h.queue();
 analysis.widgets.find(w=>w.name==='seed').value=11;h.changed();await h.deliver(id,'Current requested analysis');assert.equal(h.state.boxes[0].promptData.prompt,'Current requested analysis');h.node.onRemoved();
});
test('analysis instructions changed and restored still invalidate an old request',async()=>{
 const h=harness(),{analysis}=connectAnalysis(h);analysis.widgets.push({name:'system_prompt',value:'Appearance only'});const id=await h.queue();
 analysis.widgets.at(-1).value='Different instructions';h.changed();analysis.widgets.at(-1).value='Appearance only';h.changed();await h.deliver(id,'Old instructions result');assert.equal(h.state.boxes[0].promptData,undefined);h.node.onRemoved();
});
test('workflow changes and returning to the original workflow do not revive a request',async()=>{
 const h=harness();connectAnalysis(h);const id=await h.queue();h.app.rootGraph={_nodes:[]};h.changed();h.app.rootGraph=h.graph;h.changed();await h.deliver(id,'Old workflow result');assert.equal(h.state.boxes[0].promptData,undefined);h.node.onRemoved();
});

test('native Switch callbacks alone refresh editability and permanently invalidate OFF -> ON',async()=>{
 const h=harness(),{sw}=connectAnalysis(h),id=await h.queue();sw.widgets[0].value=false;sw.widgets[0].callback(false);h.flush();assert.equal(h.field('red-1').readOnly,false);
 sw.widgets[0].value=true;sw.widgets[0].callback(true);h.flush();assert.equal(h.field('red-1').readOnly,true);await h.deliver(id,'Old native-switch result');assert.equal(h.state.boxes[0].promptData,undefined);h.node.onRemoved();
});

test('replacing an image under the same filename invalidates the pending request',async()=>{
 const h=harness(),{image}=connectAnalysis(h),id=await h.queue();image.widgets[0].callback('A.png');await h.deliver(id,'Old pixels with the same filename');assert.equal(h.state.boxes[0].promptData,undefined);h.node.onRemoved();
});
