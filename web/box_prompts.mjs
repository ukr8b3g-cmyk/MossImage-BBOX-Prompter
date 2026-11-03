import {FOCUS_OPTIONS, normalizeFocus, localizeCameraSelect} from './camera_options.mjs?v=20261027-simple4';
import {mountTextStyle} from './text_style.mjs?v=20261028-palette1';
import {bindHelp} from './help.mjs?v=1.0.11';
import {externalBindings} from './external_text.mjs?v=20261104-safety1';
import {graphInputs} from './graph_inputs.mjs?v=20261103-target1';
import {analysisStatus,requestAnalysis} from './reference_analysis.mjs?v=20261104-safety1';

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

export function linkedCanvases(prompt) {
  const graph=prompt.graph;
  if(!graph)return [];
  const found=[];
  let view;try{view=graphInputs(graph);}catch{return found;}
  for(const e of view.entries) {
    const node=e.node;if((node.comfyClass||node.type)!=='MOSSFromKrea2')continue;
    if(view.source(e,'prompt_ui_data')?.node!==prompt)continue;
    const canvas=view.source(e,'framing_data')?.node;
    if(canvas?.__mossBoxEditor && !found.includes(canvas))found.push(canvas);
  }
  return found;
}

export function mountBoxPrompts(node,wrap,{language,defaults,framing,angles,cameraReady=true,slotColor=()=> '#888',uiState=()=>null,saveUiState=()=>{}}) {
  node.__mossPromptDefaults=defaults;
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const bar=el('div',null,'moss-box-prompt-bar');bar.style.cssText='display:flex;gap:4px;align-items:center;flex-wrap:wrap';
  const shared=el('details',null,'moss-shared-defaults'),colors=el('summary'),boxes=el('span');shared.append(colors);bindHelp(shared,'color_defaults');
  const source=el('select');source.style.maxWidth='170px';source.setAttribute('aria-label','Box card Canvas');
  const undo=el('button','↶','moss-k2cf-btn'),redo=el('button','↷','moss-k2cf-btn');
  const analysisWrap=el('span'),analyzeSelected=el('button',null,'moss-k2cf-btn');analysisWrap.append(analyzeSelected);
  analysisWrap.style.cssText='display:inline-flex;height:22px';analyzeSelected.type='button';bindHelp(analyzeSelected,'analysis_command');
  undo.setAttribute('aria-label','Undo box prompt');redo.setAttribute('aria-label','Redo box prompt');
  for(const control of [boxes,source])bindHelp(control,'box_prompts');bindHelp(colors,'color_defaults');bindHelp(undo,'undo');bindHelp(redo,'redo');
  bar.append(boxes,source,undo,redo,analysisWrap);
  const container=el('div',null,'moss-box-prompt-cards');container.style.cssText='display:flex;flex-direction:column;gap:8px';
  const note=el('div',null,'moss-k2cf-help');container.append(note);
  const colorCards=[...wrap.children].filter(e=>e.classList.contains('moss-k2cf-slot-card'));
  wrap.insertBefore(bar,colorCards[0]||null);for(const card of colorCards)shared.append(card);wrap.append(container,shared);
  let current=null,frame=null,bindings=externalBindings(node);
  const cards=new Map();
  let savedUi={},restoring=false;
  const ja=()=>language()==='ja';const text=(en,jp)=>ja()?jp:en;
  const read=()=>current?.__mossBoxEditor.read();
  function refreshAnalysis(){
    analysisWrap.hidden=Boolean(bindings.analysisConfigured);
    analysisWrap.style.display=bindings.analysisConfigured?'none':'inline-flex';
    if(bindings.analysisConfigured)return;
    const id=read()?.selectedId,state=id?analysisStatus(current,id,language()):{enabled:false,reason:text('Select a Character or Object box on Canvas.','CanvasのCharacter・Object枠を選択してください。')};
    analyzeSelected.textContent=text('Analyze','解析');analyzeSelected.setAttribute('aria-label',text('Analyze selected box','選択枠を解析'));
    analyzeSelected.disabled=!state.enabled;analysisWrap.title=state.reason;
  }
  analysisWrap.addEventListener('pointerenter',refreshAnalysis);analysisWrap.addEventListener('focusin',refreshAnalysis);
  analyzeSelected.onclick=()=>{const id=read()?.selectedId;if(id)requestAnalysis(current,id,language());};
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
    savedUi={mode:'boxes',manualMode:true,sourceId:current?String(current.id):savedUi.sourceId||'',cards:entries};
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
    // Shared settings are opened explicitly, never restored from workflow UI state.
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
    const status=el('span');status.style.cssText='font:inherit;font-weight:normal;white-space:nowrap;color:#a8cbd4';bindHelp(status,'external_text');
    const dot=el('span',null,'moss-k2cf-dot'),labelText=el('span');
    dot.setAttribute('aria-hidden','true');title.append(dot,labelText);
    head.style.gap='6px';title.style.cssText='display:flex;align-items:center;gap:0;flex:1;min-width:0;color:#ddd';
    labelText.style.cssText='overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    fold.type='button';fold.style.cssText='flex:0 0 24px;padding:0';bindHelp(fold,'fold');bindHelp(head,'select_box_card');
    head.setAttribute('role','button');head.tabIndex=0;head.append(title,status,fold);root.append(head);
    const options=mountCardOptions(root,head,`Box ${box.id}`);
    const analyze=el('button',text('Analyze','解析'),'moss-k2cf-btn');options.popup.append(analyze);
    options.button.addEventListener('click',()=>{
      const state=analysisStatus(current,box.id,language());analyze.textContent=text('Analyze','解析');
      analyze.disabled=!state.enabled;analyze.title=state.reason;options.popup.title=state.reason;
    });
    analyze.onclick=event=>{event.stopPropagation();options.dispose();requestAnalysis(current,box.id,language());};
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
      if(prompt.readOnly&&Object.hasOwn(patch,'prompt')){schedule();return;}
      const live=read()?.boxes.find(b=>b.id===box.id);
      if(live)current.__mossBoxEditor.update(box.id,{...(live.promptData||defaults(live.slot)),...patch});
    };
    const style=mountTextStyle(`box-${box.id}`,{type:()=>type.value,language,changed:()=>commit({textStyle:style.get()}),prompt,helpKey:'box_text_style'});body.append(style.element);
    for(const [control,key] of [[prompt,'prompt'],[name,'name'],[type,'type'],[fr,'framing'],[angle,'angle'],[focus,'focus']])
      for(const event of ['input','change'])control.addEventListener(event,()=>commit({[key]:key==='focus'?normalizeFocus(control.value):control.value}));
    inherit.onclick=()=>{
      if(prompt.readOnly)return;
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
      const assignment=bindings.items.find(item=>item.canvas===current&&item.box===b.id);
      const received=!assignment?.error&&node.__mossExternalResult?.find(item=>item.canvas===String(current.id)&&item.box===b.id&&item.link===assignment?.link);
      const textTarget=assignment?.analysis&&value.type==='text';
      prompt.readOnly=Boolean(assignment&&!textTarget);
      const sourceLabel=assignment?.analysis?text('Analysis','解析'):text('External','外部');
      const label=textTarget?text('Analysis · Text excluded','解析・Text対象外'):assignment?.analysis&&node.__mossAnalysisNotice?text('Analysis · Run again','解析・再実行'):assignment?(assignment.error?`${sourceLabel} · ${text('Check link','接続確認')}`:received?`${sourceLabel} · ${text('Last run','前回実行')}`:`${sourceLabel} · ${text('Not run','未実行')}`):text('Manual','手入力');
      status.textContent=label;prompt.placeholder=assignment?label:text('Prompt','プロンプト');
      const displayed=assignment&&!assignment.analysis?(received?.text??''):(value.prompt||'');
      if((assignment||card.wasExternal||card.model!==JSON.stringify(value))&&prompt.value!==displayed)prompt.value=displayed;
      card.wasExternal=Boolean(assignment);
      const color=slotColor(b.slot),slot=b.slot.toUpperCase();
      const nameLabel=value.name&&!/^box_\d+_\d+$/.test(value.name)?value.name:'';
      labelText.textContent=`${slot}${nameLabel?' · '+nameLabel:''}`;dot.style.background=color;
      fold.style.color=color;
      root.style.borderLeft=`3px solid ${color}`;
      fold.textContent=root.classList.contains('collapsed')?'▶':'▼';
      fold.setAttribute('aria-label',text(`Expand/collapse box ${b.id}`,`枠 ${b.id} の開閉`));fold.setAttribute('aria-expanded',String(!root.classList.contains('collapsed')));
      inherit.textContent=text('Shared','共通設定');
      for(const {caption,name} of fieldLabels)caption.textContent=ja()?({Type:'タイプ',Framing:'構図',Angle:'角度',Focus:'フォーカス'}[name]||name):name;
      nameTitle.textContent=text('Name (optional)','名前（任意）');name.placeholder=text('Dialogue 1','セリフ1');
      inherit.disabled=Boolean(assignment)||!b.promptData;
      localizeCameraSelect(angle,language());localizeCameraSelect(focus,language());
      const model=JSON.stringify(value);
      if(card.model===model){style.refresh();return;}
      const styleChanged=!card.model||JSON.stringify(JSON.parse(card.model).textStyle)!==JSON.stringify(value.textStyle);
      const fields=[[name,nameLabel],[type,value.type==='obj'?'object':value.type||'object'],[fr,value.framing||'Auto'],[angle,value.angle||'Auto'],[focus,normalizeFocus(value.focus)]];
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
    const next=externalBindings(node);
    if(next.signature!==bindings.signature)delete node.__mossExternalResult;
    bindings=next;
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
    if(bindings.error)boxes.textContent+=text(' · Check Text Link','・Text Linkを確認');
    const standalone=choices.length===0;
    if(standalone||shared.classList.contains('standalone'))shared.open=standalone;
    shared.classList.toggle('standalone',standalone);
    shared.hidden=choices.length>0&&!current;
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
    refreshAnalysis();
  }
  const schedule=()=>{if(frame==null)frame=requestAnimationFrame(refresh);};
  const resume=()=>{if(!document.hidden)schedule();};
  document.addEventListener('visibilitychange',resume);window.addEventListener('focus',resume);window.addEventListener('pageshow',resume);
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(resume):null;resizeObserver?.observe(wrap);
  shared.addEventListener('toggle',()=>{persist();schedule();});
  source.onchange=()=>{persist();current=linkedCanvases(node).find(n=>String(n.id)===source.value)||null;for(const card of cards.values()){card.dispose();card.root.remove();}cards.clear();savedUi.sourceId=current?String(current.id):'';saveUiState(structuredClone(savedUi));schedule();};
  undo.onclick=()=>{current?.__mossBoxEditor.undo();schedule();};redo.onclick=()=>{current?.__mossBoxEditor.redo();schedule();};
  const listener=event=>{const graph=event.detail?.graph;if(graph&&(graph.rootGraph||graph)===(node.graph?.rootGraph||node.graph))schedule();};document.addEventListener(BOX_EVENT,listener);
  const graphChanged=event=>{if(event.detail?.subType==='after-change')schedule();};document.addEventListener('litegraph:canvas',graphChanged);
  const connected=node.onConnectionsChange;node.onConnectionsChange=function(){const result=connected?.apply(this,arguments);schedule();return result;};
  const executed=node.onExecuted;node.onExecuted=function(message){
    const result=executed?.apply(this,arguments);bindings=externalBindings(node);
    const analysisLinks=new Set(bindings.items.filter(a=>a.analysis).map(a=>a.link));
    // Analysis needs the API event's prompt_id. Only its request-checked handler
    // may save or preview that result; ordinary external STRINGs stay unchanged.
    const incoming=Array.isArray(message?.moss_external_text)?message.moss_external_text:[];
    node.__mossExternalResult=[...incoming.filter(i=>!analysisLinks.has(i.link)),
      ...(node.__mossExternalResult||[]).filter(i=>analysisLinks.has(i.link))];
    schedule();return result;
  };
  const configured=node.onConfigure;node.onConfigure=function(){shared.open=false;delete node.__mossExternalResult;delete node.__mossAnalysisNotice;const result=configured?.apply(this,arguments);schedule();return result;};
  const removed=node.onRemoved;node.onRemoved=function(){document.removeEventListener('litegraph:canvas',graphChanged);document.removeEventListener(BOX_EVENT,listener);document.removeEventListener('visibilitychange',resume);window.removeEventListener('focus',resume);window.removeEventListener('pageshow',resume);resizeObserver?.disconnect();if(frame!=null)cancelAnimationFrame(frame);for(const card of cards.values())card.dispose();return removed?.apply(this,arguments);};
  restore();return {refresh:schedule,restore,selectColor(slot){const state=read(),box=state?.boxes.find(b=>b.slot===slot&&b.id===state.selectedId)||state?.boxes.find(b=>b.slot===slot);if(box)pick(box.id);}};
}
