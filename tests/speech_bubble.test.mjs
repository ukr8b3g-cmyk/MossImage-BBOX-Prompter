import {DIALOGUE_OPTIONS} from '../web/dialogue_options.mjs';
import {dialogueDescription,readDialogueDescription} from '../web/speech_bubble.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {bubbleDescription,readBubbleDescription} from '../web/speech_bubble.mjs';
import {exportLayout,parseLayoutImport,prepareLayoutImport} from '../web/layout_import.mjs';

test('bubble appearance round trips all shapes and directions without consuming unrelated notes',()=>{
  const notes='Keep gold border.\n  日本語の補足、改行と空白  ';
  for(const kind of ['speech','thought','shout'])for(const direction of ['auto','horizontal','vertical']) {
    const settings={kind,direction,speaker:'the mouth of the woman on the left'};
    const extra=bubbleDescription(settings,notes);
    assert.deepEqual(readBubbleDescription(extra),{...settings,rest:notes});
    assert.equal(bubbleDescription(settings,extra),extra,'reapply must not accumulate hints');
    assert.equal((extra.match(/White /g)||[]).length,1);
  }
});
test('replacing bubble hints keeps user notes and supports no speaker and unknown ordinary descriptions',()=>{
  const old=bubbleDescription({kind:'shout',direction:'vertical',speaker:'person A'},'keep me');
  const next=bubbleDescription({kind:'thought',direction:'horizontal',speaker:''},old);
  assert.deepEqual(readBubbleDescription(next),{kind:'thought',direction:'horizontal',speaker:'',rest:'keep me'});
  assert(!next.includes('person A'));assert(!next.includes('shouted'));
  assert.equal(readBubbleDescription('my custom speech bubble\nunchanged').rest,'my custom speech bubble\nunchanged');
});
test('applied speech appearance and exact literal wording use the existing editable JSON contract',()=>{
  const prompt='  「こんにちは、世界！」\nReally, yes? | exact  ';
  const textStyle={mode:'individual',font:'serif',weight:'bold',color:'#112233',extra:bubbleDescription({kind:'speech',direction:'vertical',speaker:'the woman on the left'},'keep outline')};
  const boxes=[{id:'speaker',slot:'red',x1:1,y1:2,x2:50,y2:80,promptData:{type:'character',prompt:'Woman speaking, mouth slightly open.'}},
    {id:'dialogue',slot:'yellow',x1:55,y1:2,x2:90,y2:40,promptData:{type:'text',prompt,textStyle}}];
  const data=exportLayout({boxes,width:100,height:100},'editable');
  const parsed=parseLayoutImport(JSON.stringify(data));
  const restored=prepareLayoutImport(parsed,{width:100,height:100,targetWidth:100,targetHeight:100,mode:'replace',contents:'editable'});
  assert.deepEqual(restored.map(b=>b.promptData),boxes.map(b=>b.promptData));
});

test('all imported dialogue choices restore exactly and never accumulate or consume unrelated notes',()=>{
 const notes='  Original notes.\n日本語の補足 😀  ';
 for(const [key,items] of Object.entries(DIALOGUE_OPTIONS))for(const [value] of items){
  const setting={[key]:value},extra=dialogueDescription(setting,notes),parsed=readDialogueDescription(extra);
  assert.equal(parsed.rest,notes);assert.equal(parsed.value[key]||'auto',value);assert.equal(dialogueDescription(parsed.value,parsed.rest),extra);
 }
 const settings={role:'thought',shape:'cloud',structure:'shared',size:'large',direction:'vertical',bubbleWeight:'thick',outline:'gold',shadow:'#112233',bubbleFill:'white',bubbleStroke:'black',tail:'person A'};
 const extra=dialogueDescription(settings,notes);assert.deepEqual(readDialogueDescription(extra),{value:settings,rest:notes});assert.equal(dialogueDescription({},''),'');
});
test('old speech helpers migrate to equivalent controls without losing custom notes',()=>{
 for(const kind of ['speech','thought','shout']){
  const old=bubbleDescription({kind,direction:'vertical',speaker:'left person'},'Keep my notes');
  const parsed=readDialogueDescription(old);assert.equal(parsed.rest,'Keep my notes');assert.equal(parsed.value.tail,'left person');assert.equal(parsed.value.direction,'vertical');assert.equal(parsed.value.shape,{speech:'oval',thought:'cloud',shout:'spiky'}[kind]);
 }
});
