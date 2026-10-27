import {FOCUS_OPTIONS, normalizeFocus, localizeCameraSelect} from './camera_options.mjs?v=20261027-simple4';
import {mountTextStyle} from './text_style.mjs?v=1.0.11';
import {bindHelp} from './help.mjs?v=1.0.11';

export const BOX_PROMPT_HEIGHTS=Object.fromEntries(['red','blue','yellow','green','magenta','cyan','orange'].map(slot=>[slot,170]));
export const BOX_EVENT='moss-bbox-edit';
export function notifyBoxEdit(node) {
  document.dispatchEvent(new CustomEvent(BOX_EVENT,{detail:node}));
}

// The same fixed header action keeps optional controls outside the editing grid.
export function mountCardOptions(root,head,label) {
  const button=document.createElement('button'),popup=document.createElement('div');
  button.type='button';button.className='moss-k2cf-btn moss-card-menu';button.textContent='⋯';
  button.setAttribute('aria-label',`${label} options`);button.setAttribute('aria-expanded','false');bindHelp(button,'card_options');
  popup.className='moss-card-options';popup.popover='auto';popup.setAttribute('role','dialog');popup.setAttribute('aria-label',`${label} options`);
  const close=()=>{if(popup.matches(':popover-open'))popup.hidePopover();};
  button.onclick=event=>{
    event.stopPropagation();if(popup.matches(':popover-open')){close();return;}
    popup.showPopover();const anchor=button.getBoundingClientRect(),rect=popup.getBoundingClientRect();
    popup.style.left=`${Math.max(4,Math.min(anchor.right-rect.width,innerWidth-rect.width-4))}px`;
    popup.style.top=`${Math.max(4,Math.min(anchor.bottom+4,innerHeight-rect.height-4))}px`;
  };
  popup.addEventListener('toggle',()=>button.setAttribute('aria-expanded',String(popup.matches(':popover-open'))));
  head.insertBefore(button,head.children[head.children.length-1]);root.append(popup);
  return {popup,button,dispose:close};
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

export function mountBoxPrompts(node,wrap,{language,defaults,framing,angles,cameraReady=true,slotColor=()=> '#888',uiState=()=>null,saveUiState=()=>{}}) {
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const bar=el('div',null,'moss-box-prompt-bar');bar.style.cssText='display:flex;gap:4px;align-items:center;flex-wrap:wrap';
  const shared=el('details',null,'moss-shared-defaults'),colors=el('summary'),boxes=el('span');shared.append(colors);bindHelp(shared,'color_defaults');
  const source=el('select');source.style.maxWidth='170px';source.setAttribute('aria-label','Box card Canvas');
  const undo=el('button','↶','moss-k2cf-btn'),redo=el('button','↷','moss-k2cf-btn');
  undo.setAttribute('aria-label','Undo box prompt');redo.setAttribute('aria-label','Redo box prompt');
  for(const control of [boxes,source])bindHelp(control,'box_prompts');bindHelp(colors,'color_defaults');bindHelp(undo,'undo');bindHelp(redo,'redo');
  bar.append(boxes,source,undo,redo);
  const container=el('div',null,'moss-box-prompt-cards');container.style.cssText='display:flex;flex-direction:column;gap:8px';
  const note=el('div',null,'moss-k2cf-help');container.append(note);
  const colorCards=[...wrap.children].filter(e=>e.classList.contains('moss-k2cf-slot-card'));
  wrap.insertBefore(bar,colorCards[0]||null);for(const card of colorCards)shared.append(card);wrap.append(container,shared);
  let current=null,frame=null;
  const cards=new Map();
  let savedUi={},restoring=false;
  const ja=()=>language()==='ja';const text=(en,jp)=>ja()?jp:en;
  const read=()=>current?.__mossBoxEditor.read();
  const savedCard=id=>savedUi.cards?.find(item=>item.canvasId===String(current?.id)&&item.id===id);
  function persist() {
    if(restoring)return;
    const canvasId=String(current?.id);
    const entries=Array.isArray(savedUi.cards)?savedUi.cards.map(item=>({...item})):[];
    for(const [id,card] of cards) {
      if(!current)break;
      const index=entries.findIndex(item=>item.canvasId===canvasId&&item.id===id);
      const height=card.resizing||index<0?parseFloat(card.prompt.style.height)||BOX_PROMPT_HEIGHTS[read()?.boxes.find(b=>b.id===id)?.slot]||125:entries[index].height;
      const value={canvasId,id,open:!card.root.classList.contains('collapsed'),height};
      if(index<0)entries.push(value);else entries[index]=value;
    }
    savedUi={sharedOpen:shared.open,mode:'boxes',manualMode:true,sourceId:current?String(current.id):savedUi.sourceId||'',cards:entries};
    saveUiState(structuredClone(savedUi));
  }
  function restoreCard(card,id) {
    if(card.resizing)return;
    const saved=savedCard(id);
    if(!saved)return;
    card.root.classList.toggle('collapsed',saved.open===false);
    const height=Number(saved.height);
    if(Number.isFinite(height)&&height>=80&&height<=10000)card.prompt.style.height=`${height}px`;
  }
  function restore(value=uiState()) {
    savedUi=value&&typeof value==='object'?structuredClone(value):{};
    savedUi.cards=Array.isArray(savedUi.cards)?savedUi.cards.filter(item=>item&&typeof item==='object'):[];
    shared.open=savedUi.sharedOpen===true;
    restoring=true;
    for(const [id,card] of cards)restoreCard(card,id);
    restoring=false;
    schedule();
  }
  function pick(id) {
    current?.__mossBoxEditor.select(id);
    schedule();
  }
  function createCard(box) {
    const showSettings=Boolean(box.promptData||defaults(box.slot).prompt);
    const root=el('div',null,`moss-k2cf-slot-card${showSettings?'':' collapsed'}`);root.dataset.boxId=box.id;
    const head=el('div',null,'moss-k2cf-slot-head'),title=el('span'),fold=el('button','▶','moss-k2cf-btn moss-k2cf-foldmark');
    const dot=el('span',null,'moss-k2cf-dot'),labelText=el('span');
    dot.setAttribute('aria-hidden','true');title.append(dot,labelText);
    head.style.gap='6px';title.style.cssText='display:flex;align-items:center;gap:0;flex:1;min-width:0;color:#ddd';
    labelText.style.cssText='overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    fold.type='button';fold.style.cssText='flex:0 0 24px;padding:0';bindHelp(fold,'fold');bindHelp(head,'select_box_card');
    head.setAttribute('role','button');head.tabIndex=0;head.append(title,fold);root.append(head);
    const options=mountCardOptions(root,head,`Box ${box.id}`);
    const body=el('div',null,'moss-k2cf-slot-body');root.insertBefore(body,options.popup);
    const prompt=el('textarea',null,'moss-k2cf-text');prompt.style.cssText=`height:${BOX_PROMPT_HEIGHTS[box.slot]||125}px;min-height:170px`;prompt.setAttribute('aria-label',`Box ${box.id} prompt`);bindHelp(prompt,'box_prompt_text');
    const side=el('div',null,'moss-k2cf-slot-side');
    const fieldLabels=[];
    const field=(name,options,help)=>{
      const row=el('label'),caption=el('span',name),select=el('select',null,'moss-k2cf-select');fieldLabels.push({caption,name});row.append(caption);
      select.setAttribute('aria-label',`Box ${box.id} ${name}`);bindHelp(select,help);
      for(const value of options){const op=el('option',name==='Type'?value[0].toUpperCase()+value.slice(1):value);op.value=value;select.append(op);}row.append(select);side.append(row);return select;
    };
    const type=field('Type',['character','object','text'],'type'),fr=field('Framing',framing,'framing'),angle=field('Angle',angles,'angle');
    const focus=field('Focus',FOCUS_OPTIONS,'focus');
    focus.disabled=!cameraReady;
    if(!cameraReady)for(const op of angle.options)if(angles.indexOf(op.value)>=24)op.disabled=true;
    const inherit=el('button',null,'moss-k2cf-btn');bindHelp(inherit,'reset_box_settings');inherit.setAttribute('aria-label',`Box ${box.id} shared`);options.popup.append(inherit);
    body.append(prompt,side);
    const name=el('input',null,'moss-k2cf-num');name.placeholder=text('Optional name','任意の名前');name.setAttribute('aria-label',`Box ${box.id} name`);bindHelp(name,'box_name');const nameRow=el('label'),nameTitle=el('span');nameRow.append(nameTitle,name);options.popup.insertBefore(nameRow,inherit);
    const commit=patch=>{
      const live=read()?.boxes.find(b=>b.id===box.id);
      if(live)current.__mossBoxEditor.update(box.id,{...(live.promptData||defaults(live.slot)),...patch});
    };
    const style=mountTextStyle(`box-${box.id}`,{type:()=>type.value,language,changed:()=>commit({textStyle:style.get()}),prompt,helpKey:'box_text_style'});body.append(style.element);
    for(const [control,key] of [[prompt,'prompt'],[name,'name'],[type,'type'],[fr,'framing'],[angle,'angle'],[focus,'focus']])
      for(const event of ['input','change'])control.addEventListener(event,()=>commit({[key]:key==='focus'?normalizeFocus(control.value):control.value}));
    inherit.onclick=()=>{
      const live=read()?.boxes.find(b=>b.id===box.id);if(!live?.promptData)return;
      const next=defaults(live.slot),preview=String(next.prompt||'').slice(0,160);
      const message=text(`Shared settings\n\nText: ${preview||'(empty)'}`,`共通設定\n\n本文：${preview||'（空欄）'}`);
      if(window.confirm(message))current?.__mossBoxEditor.update(box.id,null);
    };
    head.onclick=()=>pick(box.id);
    head.addEventListener('keydown',event=>{if(event.target===head&&(event.key==='Enter'||event.key===' ')){event.preventDefault();pick(box.id);}});
    fold.onclick=event=>{event.stopPropagation();root.classList.toggle('collapsed');persist();schedule();};
    body.addEventListener('focusin',()=>pick(box.id));
    const card={root,prompt,refresh(b){
      const value=b.promptData||defaults(b.slot);
      const color=slotColor(b.slot),slot=b.slot.toUpperCase();
      const label=value.name&&!/^box_\d+_\d+$/.test(value.name)?value.name:'';
      labelText.textContent=`${slot}${label?' · '+label:''}`;dot.style.background=color;
      fold.style.color=color;
      root.style.borderLeft=`3px solid ${color}`;
      fold.textContent=root.classList.contains('collapsed')?'▶':'▼';
      fold.setAttribute('aria-label',text(`Expand/collapse box ${b.id}`,`枠 ${b.id} の開閉`));fold.setAttribute('aria-expanded',String(!root.classList.contains('collapsed')));
      inherit.textContent=text('Shared','共通設定');
      prompt.placeholder=text('Prompt','プロンプト');
      for(const {caption,name} of fieldLabels)caption.textContent=ja()?({Type:'タイプ',Framing:'構図',Angle:'角度',Focus:'フォーカス'}[name]||name):name;
      nameTitle.textContent=text('Name (optional)','名前（任意）');name.placeholder=text('Dialogue 1','セリフ1');
      inherit.disabled=!b.promptData;
      localizeCameraSelect(angle,language());localizeCameraSelect(focus,language());
      const model=JSON.stringify(value);
      if(card.model===model){style.refresh();return;}
      const styleChanged=!card.model||JSON.stringify(JSON.parse(card.model).textStyle)!==JSON.stringify(value.textStyle);
      const fields=[[prompt,value.prompt||''],[name,label],[type,value.type==='obj'?'object':value.type||'object'],[fr,value.framing||'Auto'],[angle,value.angle||'Auto'],[focus,normalizeFocus(value.focus)]];
      for(const [control,val] of fields)if(control.value!==val)control.value=val;
      focus.disabled=!cameraReady||type.value==='text';fr.disabled=type.value==='text';angle.disabled=type.value==='text';
      if(styleChanged)style.set(value.textStyle);else style.refresh();
      card.model=model;
    }};
    restoreCard(card,box.id);
    const startResize=event=>{
      const rect=prompt.getBoundingClientRect();
      card.resizing=event.clientX>=rect.right-28&&event.clientX<=rect.right+8&&event.clientY>=rect.bottom-28&&event.clientY<=rect.bottom+8;
    };
    const stopResize=()=>{if(card.resizing){persist();card.resizing=false;}};
    prompt.addEventListener('pointerdown',startResize);prompt.addEventListener('mousedown',startResize);
    const endEvents=['pointerup','mouseup','blur','pagehide','pointercancel'];
    for(const event of endEvents)window.addEventListener(event,stopResize);
    const stopWhenHidden=()=>{if(document.hidden)stopResize();};document.addEventListener('visibilitychange',stopWhenHidden);
    card.dispose=()=>{options.dispose();style.dispose();for(const event of endEvents)window.removeEventListener(event,stopResize);document.removeEventListener('visibilitychange',stopWhenHidden);};
    card.refresh(box);return card;
  }
  function refresh() {
    frame=null;
    if(!wrap.isConnected)return;
    const choices=linkedCanvases(node);
    if(!choices.includes(current)){
      current=choices.find(canvas=>String(canvas.id)===savedUi.sourceId)||(choices.length===1?choices[0]:null);
      for(const card of cards.values()){card.dispose();card.root.remove();}cards.clear();
    }
    const wanted=current?String(current.id):'';
    source.replaceChildren();
    const empty=el('option',text('Select Canvas','Canvasを選択'));empty.value='';source.append(empty);
    for(const canvas of choices){const op=el('option',`#${canvas.id} ${canvas.title||'Canvas'}`);op.value=String(canvas.id);source.append(op);}source.value=wanted;source.hidden=choices.length<2;
    const state=read(),list=state?.boxes||[];
    colors.textContent=text('Shared defaults','共通設定');boxes.textContent=current?text(`Prompts (${list.length})`,`プロンプト (${list.length})`):text('Shared','共通設定');
    shared.classList.toggle('standalone',choices.length===0);
    shared.hidden=choices.length>0&&!current;
    if(choices.length===0)shared.open=true;
    for(const card of colorCards)card.style.display='';
    container.style.display=current?'flex':'none';
    note.textContent=choices.length===0?text('Connect Canvas and this Prompter to the same MOSS BBOX Export.','CanvasとこのPrompterを同じMOSS BBOX Exportへ接続してください。'):!current?text('Choose the Canvas to edit.','編集するCanvasを選択してください。'):text('One card per box ID. Editing creates independent settings saved with the Canvas. Add a box on Canvas to add a card.','枠IDごとのカードです。編集すると独立した設定になりCanvasと一緒に保存されます。Canvasで枠を追加するとカードも増えます。');
    const ids=new Set(list.map(b=>b.id));for(const [id,card] of cards)if(!ids.has(id)){card.dispose();card.root.remove();cards.delete(id);}
    list.forEach(b=>{let card=cards.get(b.id);if(!card){card=createCard(b);cards.set(b.id,card);}else {restoreCard(card,b.id);card.refresh(b);}
      if(card.root.parentNode!==container)container.append(card.root);
      card.root.style.outline=b.id===state.selectedId?'1px solid #eee':'';
    });
    const selectedSlot=list.find(b=>b.id===state?.selectedId)?.slot;
    for(const [index,card] of colorCards.entries())card.style.outline=['red','blue','yellow','green','magenta','cyan','orange'][index]===selectedSlot?'1px solid #eee':'';
    undo.disabled=!state?.canUndo;redo.disabled=!state?.canRedo;
  }
  const schedule=()=>{if(frame==null)frame=requestAnimationFrame(refresh);};
  const resume=()=>{if(!document.hidden)schedule();};
  document.addEventListener('visibilitychange',resume);window.addEventListener('focus',resume);window.addEventListener('pageshow',resume);
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(resume):null;resizeObserver?.observe(wrap);
  shared.addEventListener('toggle',()=>{persist();schedule();});
  source.onchange=()=>{persist();current=linkedCanvases(node).find(n=>String(n.id)===source.value)||null;for(const card of cards.values()){card.dispose();card.root.remove();}cards.clear();savedUi.sourceId=current?String(current.id):'';saveUiState(structuredClone(savedUi));schedule();};
  undo.onclick=()=>{current?.__mossBoxEditor.undo();schedule();};redo.onclick=()=>{current?.__mossBoxEditor.redo();schedule();};
  const listener=event=>{if(event.detail?.graph===node.graph)schedule();};document.addEventListener(BOX_EVENT,listener);
  const connected=node.onConnectionsChange;node.onConnectionsChange=function(){const result=connected?.apply(this,arguments);schedule();return result;};
  const configured=node.onConfigure;node.onConfigure=function(){const result=configured?.apply(this,arguments);schedule();return result;};
  const removed=node.onRemoved;node.onRemoved=function(){document.removeEventListener(BOX_EVENT,listener);document.removeEventListener('visibilitychange',resume);window.removeEventListener('focus',resume);window.removeEventListener('pageshow',resume);resizeObserver?.disconnect();if(frame!=null)cancelAnimationFrame(frame);for(const card of cards.values())card.dispose();return removed?.apply(this,arguments);};
  restore();return {refresh:schedule,restore,selectColor(slot){const state=read(),box=state?.boxes.find(b=>b.slot===slot&&b.id===state.selectedId)||state?.boxes.find(b=>b.slot===slot);if(box)pick(box.id);}};
}
