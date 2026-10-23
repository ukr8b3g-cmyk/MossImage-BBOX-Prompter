import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvasHistory} from '../web/canvas_editing.mjs';
import {linkedCanvases} from '../web/box_prompts.mjs';
test('per-ID prompt and typography changes participate in isolated history',()=>{
  const h=createCanvasHistory(),before={boxes:[{id:'a',slot:'red',locked:true}]};
  const after=structuredClone(before);after.boxes[0].promptData={prompt:'a',type:'text',textStyle:{color:'red'}};
  assert(h.record(before,after));after.boxes[0].promptData.prompt='later';
  const saved=h.undo(after);assert.deepEqual(saved,before);
  assert.equal(h.redo(saved).boxes[0].promptData.prompt,'later');
  const copy=structuredClone(after);copy.boxes[0].promptData.textStyle.color='blue';assert(h.record(after,copy));
});
test('link association uses same Export, graph and explicit connections',()=>{
  const graph={_nodes:[],links:new Map(),getNodeById(id){return this._nodes.find(n=>n.id===id)}};
  const prompt={id:1,graph},other={id:2,graph},canvas={id:3,__mossBoxEditor:{}},unrelated={id:4,__mossBoxEditor:{}};
  const exportNode={type:'MOSSFromKrea2',inputs:[{name:'prompt_ui_data',link:1},{name:'framing_data',link:2}]};
  graph._nodes=[prompt,other,canvas,unrelated,exportNode];graph.links.set(1,{origin_id:1});graph.links.set(2,{origin_id:3});
  assert.deepEqual(linkedCanvases(prompt),[canvas]);assert.deepEqual(linkedCanvases(other),[]);
  graph.links.delete(2);assert.deepEqual(linkedCanvases(prompt),[]);
});
