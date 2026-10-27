import {mountTextStyle} from './text_style.mjs';
import {bindHelp} from './help.mjs';

export const BOX_EVENT='moss-bbox-edit';
export function notifyBoxEdit(node) {
  document.dispatchEvent(new CustomEvent(BOX_EVENT,{detail:node}));
}

function origin(graph,input,seen=new Set()) {
  if(input?.link==null)return null;
  const link=graph.links?.get?.(input.link) ?? graph.links?.[input.link];
  const id=link?.origin_id ?? (Array.isArray(link)?link[1]:null);
  if(id==null||seen.has(id))return null;
  seen.add(id);
  const node=graph.getNodeById?.(id);
  if(node?.type==='Reroute')return origin(graph,node.inputs?.[0],seen);
  return node;
}

export function linkedCanvases(prompt) {
  const graph=prompt.graph;
  if(!graph)return [];
  const found=[];
  for(const node of graph._nodes||[]) {
    if((node.comfyClass||node.type)!=='MOSSFromKrea2')continue;
    if(origin(graph,node.inputs?.find(i=>i.name==='prompt_ui_data'))!==prompt)continue;
    const canvas=origin(graph,node.inputs?.find(i=>i.name==='framing_data'));
    if(canvas?.__mossBoxEditor && !found.includes(canvas))found.push(canvas);
  }
  return found;
}

export function mountBoxPrompts(node,wrap,{language,defaults,framing,angles,uiState=()=>null,saveUiState=()=>{}}) {
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const bar=el('div',null,'moss-box-prompt-bar');bar.style.cssText='display:flex;gap:4px;align-items:center;flex-wrap:wrap';
  const colors=el('button',null,'moss-k2cf-btn'),boxes=el('button',null,'moss-k2cf-btn');
  const source=el('select');source.style.maxWidth='170px';source.setAttribute('aria-label','Box card Canvas');
  const undo=el('button','↶','moss-k2cf-btn'),redo=el('button','↷','moss-k2cf-btn');
  undo.setAttribute('aria-label','Undo box prompt');redo.setAttribute('aria-label','Redo box prompt');
  for(const control of [colors,boxes,source])bindHelp(control,'box_prompts');bindHelp(undo,'undo');bindHelp(redo,'redo');
  bar.append(colors,boxes,source,undo,redo);
  const container=el('div',null,'moss-box-prompt-cards');container.style.cssText='display:flex;flex-direction:column;gap:8px';
  const note=el('div',null,'moss-k2cf-help');container.append(note);
  const colorCards=[...wrap.children].filter(e=>e.classList.contains('moss-k2cf-slot-card'));
  wrap.insertBefore(bar,colorCards[0]||null);wrap.append(container);
  let current=null,mode='colors',manualMode=false,selection=null,frame=null;
  const cards=new Map();
  let savedUi={},restoring=false;
  const ja=()=>language()==='ja';const text=(en,jp)=>ja()?jp:en;
  const read=()=>current?.__mossBoxEditor.read();
  const savedCard=id=>savedUi.cards?.find(item=>item.canvasId===String(current?.id)&&item.id===id);
  function persist() {
    if(restoring)return;
    const canvasId=String(current?.id);
    const entries=Array.isArray(savedUi.cards)?savedUi.cards.filter(item=>item.canvasId!==canvasId):[];
    for(const [id,card] of cards)entries.push({canvasId,id,open:!card.root.classList.contains('collapsed'),height:parseFloat(card.prompt.style.height)||125});
    savedUi={mode,manualMode,sourceId:current?String(current.id):savedUi.sourceId||'',cards:entries};
    saveUiState(structuredClone(savedUi));
  }
  function restoreCard(card,id) {
    const saved=savedCard(id);
    if(!saved)return;
    card.root.classList.toggle('collapsed',saved.open===false);
    const height=Number(saved.height);
    if(Number.isFinite(height)&&height>=80&&height<=10000)card.prompt.style.height=`${height}px`;
  }
  function restore(value=uiState()) {
    savedUi=value&&typeof value==='object'?structuredClone(value):{};
    savedUi.cards=Array.isArray(savedUi.cards)?savedUi.cards.filter(item=>item&&typeof item==='object'):[];
    mode=savedUi.mode==='boxes'?'boxes':'colors';manualMode=!!savedUi.manualMode;
    restoring=true;
    for(const [id,card] of cards)restoreCard(card,id);
    restoring=false;
    schedule();
  }
  function reveal(card) {
    const view=wrap.getBoundingClientRect(),rect=card.getBoundingClientRect();
    const scale=view.height/Math.max(1,wrap.clientHeight);
    if(rect.top<view.top || rect.bottom>view.bottom)wrap.scrollTop+=(rect.top-view.top)/Math.max(.01,scale);
  }
  function pick(id,scroll=false) {
    selection=id;
    current?.__mossBoxEditor.select(id);
    for(const [key,card] of cards){card.root.style.outline=key===id?'1px solid #eee':'';if(key===id){card.root.classList.remove('collapsed');if(scroll)reveal(card.root);}}
    persist();
  }
  function createCard(box,index) {
    const root=el('div',null,'moss-k2cf-slot-card collapsed');root.dataset.boxId=box.id;
    const head=el('div',null,'moss-k2cf-slot-head'),title=el('span');head.append(title);root.append(head);
    const body=el('div',null,'moss-k2cf-slot-body');root.append(body);
    const prompt=el('textarea',null,'moss-k2cf-text');prompt.style.cssText='height:125px;min-height:80px';prompt.setAttribute('aria-label',`Box ${box.id} prompt`);bindHelp(prompt,'box_prompt_text');
    const side=el('div',null,'moss-k2cf-slot-side');
    const field=(name,options,help)=>{
      const row=el('label',name),select=el('select',null,'moss-k2cf-select');
      select.setAttribute('aria-label',`Box ${box.id} ${name}`);bindHelp(select,help);
      for(const value of options){const op=el('option',value);op.value=value;select.append(op);}row.append(select);side.append(row);return select;
    };
    const type=field('Type',['character','object','text'],'type'),fr=field('Framing',framing,'framing'),angle=field('Angle',angles,'angle');
    const inherit=el('button',null,'moss-k2cf-btn');bindHelp(inherit,'box_prompts');side.append(inherit);
    body.append(prompt,side);
    const name=el('input',null,'moss-k2cf-num');name.placeholder=text('Optional name','任意の名前');name.setAttribute('aria-label',`Box ${box.id} name`);bindHelp(name,'box_prompts');side.prepend(name);
    const commit=()=>{
      const value={name:name.value,prompt:prompt.value,type:type.value,framing:fr.value,angle:angle.value,textStyle:style.get()};
      current?.__mossBoxEditor.update(box.id,value);
    };
    const style=mountTextStyle(`box-${box.id}`,{type:()=>type.value,language,changed:commit,helpKey:'box_text_style'});body.append(style.element);
    for(const control of [prompt,name])control.addEventListener('input',commit);
    for(const control of [type,fr,angle])control.addEventListener('change',()=>{style.refresh();commit();});
    inherit.onclick=()=>current?.__mossBoxEditor.update(box.id,null);
    head.onclick=()=>{const wasOpen=!root.classList.contains('collapsed');pick(box.id);root.classList.toggle('collapsed',wasOpen);persist();};
    body.addEventListener('focusin',()=>pick(box.id));
    const card={root,prompt,refresh(b,i){
      const value=b.promptData||defaults(b.slot);
      title.textContent=`#${i+1} · ${b.id} ${value.name||''} · ${b.slot.toUpperCase()}`;
      inherit.textContent=b.promptData?text('Use color settings','色別設定へ戻す'):text('Using color settings','色別設定を使用中');
      inherit.disabled=!b.promptData;
      const fields=[[prompt,value.prompt||''],[name,value.name||''],[type,value.type==='obj'?'object':value.type||'object'],[fr,value.framing||'Auto'],[angle,value.angle||'Auto']];
      for(const [control,val] of fields)if(control.value!==val)control.value=val;
      const serialized=JSON.stringify(value.textStyle||{});
      if(card.styleValue!==serialized){style.set(value.textStyle);card.styleValue=serialized;}else style.refresh();
    }};
    restoreCard(card,box.id);
    const observer=new MutationObserver(()=>{
      const height=parseFloat(prompt.style.height);
      if(Number.isFinite(height)&&height>=80&&height<=10000&&height!==savedCard(box.id)?.height)persist();
    });
    observer.observe(prompt,{attributes:true,attributeFilter:['style']});
    card.dispose=()=>observer.disconnect();
    card.refresh(box,index);return card;
  }
  function refresh() {
    frame=null;
    if(!wrap.isConnected)return;
    const choices=linkedCanvases(node);
    if(!choices.includes(current)){
      current=choices.find(canvas=>String(canvas.id)===savedUi.sourceId)||(choices.length===1?choices[0]:null);selection=null;
      for(const card of cards.values()){card.dispose();card.root.remove();}cards.clear();
    }
    const wanted=current?String(current.id):'';
    source.replaceChildren();
    const empty=el('option',text('Select Canvas','Canvasを選択'));empty.value='';source.append(empty);
    for(const canvas of choices){const op=el('option',`#${canvas.id} ${canvas.title||'Canvas'}`);op.value=String(canvas.id);source.append(op);}source.value=wanted;source.hidden=choices.length<2;
    const state=read(),list=state?.boxes||[];
    if(!manualMode&&(list.length>7||list.some(b=>b.promptData)))mode='boxes';
    if(state?.selectedId && state.selectedId!==selection){mode='boxes';manualMode=false;}
    colors.textContent=text('Color defaults','色別設定');boxes.textContent=text(`ID cards (${list.length})`,`ID別カード (${list.length})`);
    colors.classList.toggle('primary',mode==='colors');boxes.classList.toggle('primary',mode==='boxes');
    for(const card of colorCards)card.style.display=mode==='colors'?'':'none';
    container.style.display=mode==='boxes'?'flex':'none';
    note.textContent=choices.length===0?text('Connect Canvas and this Prompter to the same MOSS BBOX Export.','CanvasとこのPrompterを同じMOSS BBOX Exportへ接続してください。'):!current?text('Choose the Canvas to edit.','編集するCanvasを選択してください。'):text('One card per box ID. Editing creates independent settings saved with the Canvas. Add a box on Canvas to add a card.','枠IDごとのカードです。編集すると独立した設定になりCanvasと一緒に保存されます。Canvasで枠を追加するとカードも増えます。');
    const ids=new Set(list.map(b=>b.id));for(const [id,card] of cards)if(!ids.has(id)){card.dispose();card.root.remove();cards.delete(id);}
    list.forEach((b,i)=>{let card=cards.get(b.id);const existed=!!card;if(!card){card=createCard(b,i);cards.set(b.id,card);container.append(card.root);}else card.refresh(b,i);
      card.root.style.outline=b.id===state.selectedId?'1px solid #eee':'';
      if(b.id===state.selectedId && selection!==b.id && (existed||!savedCard(b.id))){card.root.classList.remove('collapsed');if(mode==='boxes')reveal(card.root);}
    });
    const nextSelection=state?.selectedId||null;
    if(nextSelection!==selection){selection=nextSelection;persist();}
    undo.disabled=!state?.canUndo;redo.disabled=!state?.canRedo;
  }
  const schedule=()=>{if(frame==null)frame=requestAnimationFrame(refresh);};
  colors.onclick=()=>{mode='colors';manualMode=true;selection=read()?.selectedId;persist();schedule();};
  boxes.onclick=()=>{mode='boxes';manualMode=true;persist();schedule();};
  source.onchange=()=>{persist();current=linkedCanvases(node).find(n=>String(n.id)===source.value)||null;selection=null;for(const card of cards.values()){card.dispose();card.root.remove();}cards.clear();savedUi.sourceId=current?String(current.id):'';saveUiState(structuredClone(savedUi));schedule();};
  undo.onclick=()=>{current?.__mossBoxEditor.undo();schedule();};redo.onclick=()=>{current?.__mossBoxEditor.redo();schedule();};
  const listener=event=>{if(event.detail?.graph===node.graph)schedule();};document.addEventListener(BOX_EVENT,listener);
  const connected=node.onConnectionsChange;node.onConnectionsChange=function(){const result=connected?.apply(this,arguments);schedule();return result;};
  const configured=node.onConfigure;node.onConfigure=function(){const result=configured?.apply(this,arguments);schedule();return result;};
  const removed=node.onRemoved;node.onRemoved=function(){document.removeEventListener(BOX_EVENT,listener);if(frame!=null)cancelAnimationFrame(frame);for(const card of cards.values())card.dispose();return removed?.apply(this,arguments);};
  restore();return {refresh:schedule,restore};
}
