import test from 'node:test';
import assert from 'node:assert/strict';
import {exportLayout,parseLayoutImport,prepareLayoutImport} from '../web/layout_import.mjs';
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

const editableSample=()=>({width:896,height:1184,boxes:Array.from({length:9},(_,i)=>({
  id:`box-${i}`,slot:i%2?'orange':'cyan',x1:-12.5+i*40,y1:18.25,x2:30+i*40,y2:1234.5,locked:i===0,
  promptData:{name:`Card ${i}`,prompt:i===8?'  日本語 | "literal"\n next  ':`Object ${i}`,type:i===8?'text':'object',framing:'Auto',angle:'Auto',
    textStyle:{mode:'individual',font:'serif',weight:'bold',color:'#a1b2c3',extra:'outline\n and shadow'}}
}))});
test('editable export preserves nine IDs, exact prompts/styles and locks across reload without aliases',()=>{
  const source=editableSample(),before=structuredClone(source),data=exportLayout(source,'editable');
  const parsed=parseLayoutImport(JSON.stringify(data));
  const boxes=prepareLayoutImport(parsed,{width:896,height:1184,targetWidth:896,targetHeight:1184,contents:'editable',mode:'replace'});
  assert.deepEqual(boxes.map(({layoutImported,...b})=>b),source.boxes);
  boxes[0].promptData.textStyle.extra='new';assert.deepEqual(source,before);assert.deepEqual(data.boxes,before.boxes);
});
test('placement export and editable import as placement omit all prompt identity and lock metadata',()=>{
  const source=editableSample(),data=exportLayout(source),parsed=parseLayoutImport(JSON.stringify(exportLayout(source,'editable')));
  assert.equal(data.contents,'placement');
  for(const box of data.boxes)assert.deepEqual(Object.keys(box),['slot','x1','y1','x2','y2']);
  const boxes=prepareLayoutImport(parsed,{width:896,height:1184,targetWidth:448,targetHeight:592});
  assert.equal(boxes[0].x1,source.boxes[0].x1/2);
  for(const b of boxes)for(const field of ['id','promptData','locked'])assert.equal(b[field],undefined);
});
test('native editable schema rejects invalid IDs, future versions and corrupt prompt metadata',()=>{
  const data=exportLayout(editableSample(),'editable');
  for(const mutate of [d=>d.version=2,d=>d.contents='all',d=>d.width=0,d=>d.boxes[0].id='',d=>d.boxes[1].id=d.boxes[0].id,
    d=>d.boxes[0].promptData=null,d=>d.boxes[0].promptData.prompt=5,d=>d.boxes[0].promptData.type='unknown',
    d=>d.boxes[0].promptData.textStyle.color={},d=>d.boxes[0].locked='false',d=>d.boxes[0].slot='unknown']){
    const bad=structuredClone(data);mutate(bad);assert.throws(()=>parseLayoutImport(JSON.stringify(bad)));
  }
  assert.throws(()=>prepareLayoutImport(parseLayoutImport(JSON.stringify(exportLayout(editableSample()))),{...opts,contents:'editable'}),/format/);
});
test('native empty layout roundtrips; inherited prompts remain inherited and metadata is whitelisted',()=>{
  for(const contents of ['placement','editable']){
    const empty=exportLayout({width:512,height:512,boxes:[]},contents);
    assert.deepEqual(prepareLayoutImport(parseLayoutImport(JSON.stringify(empty)),{...opts,contents}),[]);
  }
  const source=editableSample();delete source.boxes[0].promptData;
  source.boxes[1].promptData.unrelated='secret';source.boxes[1].nx1=.5;source.camera={iso:'200'};
  const data=exportLayout(source,'editable');
  assert.equal(data.boxes[0].promptData,undefined);assert.equal(data.boxes[1].promptData.unrelated,undefined);
  assert.equal(data.boxes[1].nx1,undefined);assert.equal(data.camera,undefined);
});
test('editable replacement respects existing locks, append preserves them, history restores full metadata',()=>{
  const parsed=parseLayoutImport(JSON.stringify(exportLayout(editableSample(),'editable'))),existing=[{id:'locked',locked:true}];
  const options={width:896,height:1184,targetWidth:896,targetHeight:1184,contents:'editable',existing};
  assert.throws(()=>prepareLayoutImport(parsed,{...options,mode:'replace'}),/locked/);
  const boxes=prepareLayoutImport(parsed,options),before={boxes:structuredClone(existing)},after={boxes:[...existing,...boxes]};
  const history=createCanvasHistory();history.record(before,after);
  assert.deepEqual(history.undo(after),before);assert.deepEqual(history.redo(before),after);
  assert.equal(boxes[0].locked,true);
});
