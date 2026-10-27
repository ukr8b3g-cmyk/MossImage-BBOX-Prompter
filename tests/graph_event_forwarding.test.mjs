import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../web/moss_controls.mjs',import.meta.url),'utf8');
test('graph drag forwarding ignores its own move events and detaches before forwarding mouseup',()=>{
 const listeners=new Map(),root={handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}},sent=[];
 const window={addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);}};
 const canvas={dispatchEvent(ev){sent.push(ev.type);assert(sent.length<10,'forwarded event re-entered itself');ev.target=canvas;for(const fn of [...(listeners.get(ev.type)||[])])fn(ev);}};
 class MouseEvent{constructor(type,values){this.type=type;Object.assign(this,values);}preventDefault(){}stopPropagation(){}}
 const forward=source.slice(source.indexOf('function k2cfForwardMouseEventToGraph('),source.indexOf('function k2cfPanGraphBy('));
 const pan=source.slice(source.indexOf('function k2cfAllowGraphPanOnEmptySpace('),source.indexOf('function button(',source.indexOf('function k2cfAllowGraphPanOnEmptySpace(')));
 const install=new Function('window','MouseEvent','k2cfIsPointerInteractiveTarget','k2cfGraphCanvas','k2cfStartMiddlePan',forward+pan+';return k2cfAllowGraphPanOnEmptySpace;')(window,MouseEvent,()=>false,()=>canvas,()=>false);
 install(root);const event=type=>Object.assign(new MouseEvent(type,{button:0,target:root}),{preventDefault(){},stopPropagation(){}});
 root.handlers.mousedown(event('mousedown'));
 for(const fn of [...listeners.get('mousemove')])fn(event('mousemove'));
 for(const fn of [...listeners.get('mouseup')])fn(event('mouseup'));
 assert.deepEqual(sent,['mousedown','mousemove','mouseup']);assert.equal(listeners.get('mousemove').size,0);assert.equal(listeners.get('mouseup').size,0);
});
test('input labels and details summaries retain native interaction instead of starting graph drags',()=>{
 const start=source.indexOf('function k2cfIsPointerInteractiveTarget('),end=source.indexOf('function k2cfGraphCanvas(',start);
 let selector='';const check=new Function(source.slice(start,end)+'return k2cfIsPointerInteractiveTarget;')();
 assert(check({closest(value){selector=value;return {};}}));assert(selector.includes('summary'));assert(selector.includes('label'));assert(selector.includes('input'));
});
