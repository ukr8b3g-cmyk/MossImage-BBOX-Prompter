import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLayoutImport,prepareLayoutImport} from '../web/layout_import.mjs';
import {createCanvasHistory} from '../web/canvas_editing.mjs';
const raw=JSON.stringify({items:[{label:'text',text:' ignored ',bbox:[-50,-100,50,100]}],bbox_format:'yxyx',bbox_coord_space:'abs_centralized'});
const opts={width:400,height:200,targetWidth:800,targetHeight:400};
test('official centered yxyx converts exactly; placement only',()=>{
  const [b]=prepareLayoutImport(parseLayoutImport(raw),opts);
  assert.deepEqual(b,{slot:'red',x1:200,y1:100,x2:600,y2:300,layoutImported:true});
});
test('reject invalid documents, ambiguous format, nonnumeric and degenerate coordinates',()=>{
  for(const input of ['{','null','[]','{}','{"boxes":null}',JSON.stringify({items:[{}]}),JSON.stringify({boxes:[{x1:'0',y1:0,x2:2,y2:2}]}),JSON.stringify({boxes:[{x1:2,y1:0,x2:2,y2:2}]})])assert.throws(()=>parseLayoutImport(input));
  assert.throws(()=>prepareLayoutImport(parseLayoutImport(raw),{...opts,width:0}),/size/);
});
test('mapping, edges, input immutability, seven colors and unlimited boxes',()=>{
  const input={width:100,height:100,boxes:Array.from({length:9},()=>({slot:'orange',x1:0,y1:0,x2:100,y2:100}))};
  const parsed=parseLayoutImport(JSON.stringify(input));
  const result=prepareLayoutImport(parsed,{width:100,height:100,targetWidth:100,targetHeight:100,mapping:Array(9).fill('cyan')});
  assert.equal(result.length,9);assert.equal(result[0].x1,0);assert.equal(result[0].slot,'cyan');assert.equal(parsed.items[0].slot,'orange');
});
test('replace rejects locks; append leaves existing locked boxes intact',()=>{
  const existing=[{id:'a',locked:true,x1:10}];const before=structuredClone(existing);
  assert.throws(()=>prepareLayoutImport(parseLayoutImport(raw),{...opts,existing,mode:'replace'}),/locked/);
  prepareLayoutImport(parseLayoutImport(raw),{...opts,existing});assert.deepEqual(existing,before);
});
test('import batch can undo/redo as one edit',()=>{
  const history=createCanvasHistory(),before={boxes:[{id:'a',locked:true}]};
  const after={boxes:[...before.boxes,...prepareLayoutImport(parseLayoutImport(raw),opts)]};
  history.record(before,after);assert.deepEqual(history.undo(after),before);assert.deepEqual(history.redo(before),after);
});
