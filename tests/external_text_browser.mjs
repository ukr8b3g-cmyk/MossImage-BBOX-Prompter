// Use only an isolated CPU ComfyUI server; never the user's active generation server.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const base=process.env.MOSS_EXTERNAL_TEST_URL;
assert(['http://127.0.0.1:8199','http://127.0.0.1:53107','http://127.0.0.1:53108'].includes(base),'Use the isolated CPU test server.');
const out=process.env.MOSS_TEST_ARTIFACTS;assert(out);
await mkdir(out,{recursive:true});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--disable-gpu']});
const checks=[],errors=[];let page;
try {
  page=await browser.newPage({viewport:{width:1800,height:1300}});
  page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(()=>window.comfyAPI?.app?.app&&window.LiteGraph?.registered_node_types?.MOSSBBoxTextLink,{},{timeout:60000});
  await page.waitForFunction(()=>window.comfyAPI.app.app.extensionManager?.workflow?.activeWorkflow,{},{timeout:60000});
  await page.keyboard.press('Escape');
  await page.evaluate(()=>{
    window.createBench=(blank=false)=>{
    const app=window.comfyAPI.app.app,graph=app.graph;graph.clear();
    const add=(type,x,y)=>{const node=LiteGraph.createNode(type);graph.add(node);node.pos=[x,y];return node;};
    const c=add('MOSSSharedCanvas',-1400,0),p=add('MOSSSharedPrompter',540,70);
    p.setSize([570,1150]);
    const source=add('PrimitiveStringMultiline',10,70),source2=add('PrimitiveStringMultiline',10,400);
    const link=add('MOSSBBoxTextLink',110,240),link2=add('MOSSBBoxTextLink',110,570);
    const a=add('MOSSFromKrea2',1200,70),b=add('MOSSFromKrea2',1200,400);
    const va=add('PreviewAny',1500,70),vb=add('PreviewAny',1500,400);
    const connect=(from,to,name)=>from.connect(0,to,to.inputs.findIndex(i=>i.name===name));
    for(const e of [a,b]){connect(c,e,'framing_data');connect(p,e,'prompt_ui_data');}
    connect(a,va,'source');connect(b,vb,'source');
    const original=c.serialize(),wi=c.widgets.findIndex(w=>w.name==='layout_data');
    const layout={boxes:[{id:'same-0',slot:'blue',x1:80,y1:80,x2:320,y2:250,promptData:{type:'text',prompt:blank?'':'Manual one',name:blank?'':'Caption A'}},
      {id:'same-1',slot:'blue',x1:420,y1:280,x2:750,y2:500,promptData:{type:'text',prompt:blank?'':'Manual two',name:blank?'':'Caption B'}}]};
    original.widgets_values[wi]=JSON.stringify(layout);if(original.widgets_values_named)original.widgets_values_named.layout_data=JSON.stringify(layout);c.configure(original);
    connect(c,link,'framing_data');connect(source,link,'text');
    connect(c,link2,'framing_data');connect(source2,link2,'text');
    source.widgets.find(w=>w.name==='value').value=blank?'':'  外部 A | "exact"\nnext line  ';
    source2.widgets.find(w=>w.name==='value').value=blank?'':'External B';
    a.widgets.find(w=>w.name==='output_mode').value='layout_json';b.widgets.find(w=>w.name==='output_mode').value='caption';
    a.widgets.find(w=>w.name==='text_mode').value='legacy';b.widgets.find(w=>w.name==='text_mode').value='literal';
    const root=p.widgets.find(w=>w.name==='krea2_prompt_ui').element;root.dataset.externalBench='1';


    window.bench={c,p,source,source2,link,link2,a,b,va,vb,connect,manual:structuredClone(layout.boxes)};
    app.canvas.ds.scale=.85;app.canvas.ds.offset[0]=0;app.canvas.ds.offset[1]=0;app.canvas.setDirty(true,true);
    };
    window.createBench();
  });
  const root=page.locator('[data-external-bench]'),card=id=>root.locator(`.moss-box-prompt-cards>[data-box-id="${id}"]`);
  const text=id=>card(id).locator('.moss-k2cf-slot-body>textarea');
  await root.locator('.moss-k2cf-language-select').selectOption('English');
  await page.evaluate(()=>{const w=bench.link.widgets.find(w=>w.name==='target');w.value='same-0';w.callback?.(w.value);});
  await page.evaluate(()=>{const w=bench.link2.widgets.find(w=>w.name==='target');w.value='same-1';w.callback?.(w.value);});
  assert.equal(await text('same-0').inputValue(),'Manual one');
  const initialHeight=await text('same-0').evaluate(e=>e.style.height);
  await page.evaluate(()=>{const t=window.bench;t.connect(t.link,t.link2,'previous');t.connect(t.link2,t.p,'external_text');});
  await page.waitForFunction(()=>document.querySelector('[data-box-id="same-0"] .moss-k2cf-slot-body>textarea')?.readOnly);
  assert.equal(await text('same-0').inputValue(),'');assert.equal(await text('same-1').inputValue(),'');
  checks.push('same-color targets selected by stable IDs; one read-only editor per card');

  async function run(label) {
    const queued=await page.evaluate(async()=>{
      const app=window.comfyAPI.app.app,{api}=await import('/scripts/api.js');
      const payload=await app.graphToPrompt();
      const allowed=new Set(['MOSSSharedCanvas','MOSSSharedPrompter','MOSSBBoxTextLink','MOSSFromKrea2','PrimitiveStringMultiline','PreviewAny']);
      if(Object.values(payload.output).some(n=>!allowed.has(n.class_type)))throw Error('Non-CPU test node in prompt');
      return api.queuePrompt(0,payload);
    });
    assert(queued.prompt_id,JSON.stringify(queued));
    let history;
    for(let attempt=0;attempt<100;attempt++){
      history=(await(await page.request.get(base+'/history/'+queued.prompt_id)).json())[queued.prompt_id];
      if(history?.status?.completed)break;
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    assert(history?.status?.completed,'CPU queue did not complete');
    await writeFile(`${out}/${label}.json`,JSON.stringify(history,null,2));
    assert.equal(history.status.status_str,'success',JSON.stringify(history.status));return history;
  }
  let history=await run('both-exports');
  const ids=await page.evaluate(()=>Object.fromEntries(['c','p','link','link2','a','b','va','vb'].map(k=>[k,String(window.bench[k].id)])));
  const literal='  外部 A | "exact"\nnext line  ';
  assert.equal(history.outputs[ids.p].moss_external_text[0].text,literal);
  assert.equal(history.outputs[ids.p].moss_external_text[1].text,'External B');
  const items=JSON.parse(history.outputs[ids.va].text[0]).items;
  assert.deepEqual(items.map(i=>i.text),[literal,'External B']);
  assert(history.outputs[ids.vb].text[0].includes(literal));
  assert.equal(await text('same-0').inputValue(),literal);assert.equal(await text('same-1').inputValue(),'External B');
  assert.equal(await text('same-0').evaluate(e=>e.style.height),initialHeight);
  await page.evaluate(()=>{const t=window.bench;for(const n of [t.b,t.a])window.comfyAPI.app.app.canvas.selectNode(n);window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await text('same-0').inputValue(),literal);
  checks.push('real CPU queue, two Export modes, one Prompter execution result, exact literal text');

  await page.evaluate(()=>window.bench.source.widgets.find(w=>w.name==='value').value='');
  history=await run('empty-external');
  assert.equal(history.outputs[ids.p].moss_external_text[0].text,'');
  assert(!history.outputs[ids.va].text[0].includes('Manual one'));
  assert.equal(await text('same-0').inputValue(),'');
  checks.push('empty external STRING never falls back to saved manual text');

  await page.evaluate(()=>{const t=window.bench;t.link.disconnectInput(t.link.inputs.findIndex(i=>i.name==='text'));});
  await page.waitForFunction(()=>document.querySelector('[data-box-id="same-0"] textarea')?.placeholder.includes('Check link'));
  assert.equal(await text('same-0').inputValue(),'');
  const invalid=await page.evaluate(async()=>{
    const payload=await window.comfyAPI.app.app.graphToPrompt();
    const r=await fetch('/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:payload.output})});return {status:r.status,data:await r.json()};
  });
  assert.equal(invalid.status,400);await writeFile(out+'/missing-input.json',JSON.stringify(invalid,null,2));
  await page.evaluate(()=>{const t=window.bench;t.connect(t.source,t.link,'text');t.source.widgets.find(w=>w.name==='value').value='Next external';});
  checks.push('broken STRING connection rejected by actual ComfyUI validation');

  await page.evaluate(()=>{const t=window.bench;t.p.disconnectInput(t.p.inputs.findIndex(i=>i.name==='external_text'));});
  await page.waitForFunction(()=>!document.querySelector('[data-box-id="same-0"] textarea')?.readOnly);
  assert.equal(await text('same-0').inputValue(),'Manual one');assert.equal(await text('same-1').inputValue(),'Manual two');
  history=await run('manual-restored');assert(history.outputs[ids.va].text[0].includes('Manual one'));
  await page.evaluate(()=>{const t=window.bench;t.connect(t.link2,t.p,'external_text');});
  await run('reconnected');assert.equal(await text('same-0').inputValue(),'Next external');
  const saved=await page.evaluate(()=>window.comfyAPI.app.app.graph.serialize());
  await page.evaluate(async data=>{await window.comfyAPI.app.app.loadGraphData(data);},saved);
  await page.waitForFunction(()=>document.querySelector('[data-box-id="same-0"] textarea')?.readOnly);
  const restored=page.locator('.moss-box-prompt-cards>[data-box-id="same-0"] .moss-k2cf-slot-body>textarea');
  assert.equal(await restored.inputValue(),'');
  await page.evaluate(()=>{const app=window.comfyAPI.app.app;window.bench.p=app.graph.getNodeById(Number(window.bench.p.id));window.bench.c=app.graph.getNodeById(Number(window.bench.c.id));});
  const cached=await run('saved-workflow');
  assert(cached.status.messages.some(([name,data])=>name==='execution_cached'&&data.nodes.includes(ids.p)));
  await page.waitForFunction(()=>document.querySelector('[data-box-id="same-0"] textarea')?.value==='Next external');
  assert.equal(await restored.inputValue(),'Next external');
  const manual=await page.evaluate(()=>window.bench.c.__mossBoxEditor.read().boxes.map(b=>b.promptData.prompt));
  assert.deepEqual(manual,['Manual one','Manual two']);checks.push('unlink, reconnect, native workflow save/reload keep original manual text and targets');
  await page.screenshot({path:out+'/external-connected.png',fullPage:true});

  const branches=await page.evaluate(()=>{
    const app=window.comfyAPI.app.app,t=window.bench;
    const add=type=>{const n=LiteGraph.createNode(type);app.graph.add(n);n.pos=[2800,100];return n;};
    const p2=add('MOSSSharedPrompter'),c2=add('MOSSSharedCanvas');
    const saved=t.c.serialize();saved.id=c2.id;saved.pos=[2800,100];saved.outputs=c2.serialize().outputs;c2.configure(saved);
    const s2=add('PrimitiveStringMultiline'),l2=add('MOSSBBoxTextLink'),x=add('MOSSFromKrea2'),y=add('MOSSFromKrea2'),vx=add('PreviewAny'),vy=add('PreviewAny');
    s2.widgets.find(w=>w.name==='value').value='Independent branch';
    l2.widgets.find(w=>w.name==='target').value='same-0';
    t.connect(s2,l2,'text');t.connect(t.c,l2,'framing_data');t.connect(l2,p2,'external_text');
    t.connect(t.c,x,'framing_data');t.connect(p2,x,'prompt_ui_data');t.connect(x,vx,'source');
    t.connect(c2,y,'framing_data');t.connect(t.p,y,'prompt_ui_data');t.connect(y,vy,'source');
    for(const e of [x,y]){e.widgets.find(w=>w.name==='output_mode').value='layout_json';e.widgets.find(w=>w.name==='text_mode').value='literal';}
    return {p2:p2.id,c2:c2.id,vx:vx.id,vy:vy.id};
  });
  const independent=await run('independent-branches');
  assert.deepEqual(JSON.parse(independent.outputs[branches.vx].text[0]).items.map(i=>i.text),['Independent branch','Manual two']);
  assert.deepEqual(JSON.parse(independent.outputs[branches.vy].text[0]).items.map(i=>i.text),['Manual one','Manual two']);
  assert.equal(await restored.first().inputValue(),'Next external');
  assert.equal(independent.outputs[branches.p2].moss_external_text[0].text,'Independent branch');
  checks.push('separate Prompter branch and another Canvas with identical box IDs do not mix text');

  // Build a fresh blank example; never derive it by deleting selected strings from test state.
  await page.evaluate(()=>window.createBench(true));
  await page.evaluate(()=>{const w=bench.link.widgets.find(w=>w.name==='target');w.value='same-0';w.callback?.(w.value);});
  await page.evaluate(()=>{const w=bench.link2.widgets.find(w=>w.name==='target');w.value='same-1';w.callback?.(w.value);});
  await page.evaluate(()=>{const t=window.bench;t.connect(t.link,t.link2,'previous');t.connect(t.link2,t.p,'external_text');});
  const blankRun=await run('blank-example');
  const previewIds=await page.evaluate(()=>[String(bench.va.id),String(bench.vb.id)]);
  assert.equal(JSON.parse(blankRun.outputs[previewIds[0]].text[0]).summary.caption,'');
  assert(JSON.parse(blankRun.outputs[previewIds[0]].text[0]).items.every(item=>item.text===''));
  assert.equal(blankRun.outputs[previewIds[1]].text[0],'""\n\n""'); // existing literal-caption representation of two empty Text boxes
  const blank=await page.evaluate(()=>{
    const t=window.bench,app=window.comfyAPI.app.app;
    t.c.pos=[40,100];t.c.setSize([620,1020]);t.p.pos=[1150,100];t.p.setSize([570,1150]);
    t.source.pos=[710,100];t.source2.pos=[710,570];t.source.setSize([350,230]);t.source2.setSize([350,230]);
    t.link.pos=[710,400];t.link2.pos=[710,870];
    t.a.pos=[1820,100];t.b.pos=[1820,570];t.va.pos=[2250,100];t.vb.pos=[2250,570];
    t.source.title='Text A';t.source2.title='Text B';t.a.title='Export · JSON';t.b.title='Export · Caption';
    app.canvas.ds.scale=.55;app.canvas.ds.offset[0]=40;app.canvas.ds.offset[1]=80;app.canvas.setDirty(true,true);
    return app.graph.serialize();
  });
  for(const n of blank.nodes)for(const [name,value] of Object.entries(n.widgets_values_named||{}))
    if(['scene','background','value','text_style'].includes(name)||name.endsWith('_prompt'))assert.equal(value,'',`${n.type}.${name}`);
  assert(!/Manual one|Manual two|Next external|External B|Caption A|Caption B/.test(JSON.stringify(blank)));
  await writeFile(out+'/MOSS_BBOX_External_Text_Blank.json',JSON.stringify(blank,null,2)+'\n');
  await page.evaluate(async data=>await window.comfyAPI.app.app.loadGraphData(data),blank);
  const blankReload=await run('blank-example-reloaded');
  assert.equal(blankReload.outputs[previewIds[1]].text[0],'""\n\n""');
  checks.push('fresh blank workflow saved, reloaded and CPU executed without any prompt text');
  assert.deepEqual(errors,[]);
  await writeFile(out+'/browser-result.json',JSON.stringify({checks,errors,cpu:true,gpu:false},null,2));console.log(JSON.stringify({checks,errors}));
} catch(error) {
  if(page)await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});
  console.error(JSON.stringify({checks,errors}));throw error;
} finally {await browser.close();}
