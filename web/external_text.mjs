import {graphInputs} from './graph_inputs.mjs?v=20261103-target1';

export function origin(graph,input,seen=new Set()) {
  if(input?.link==null)return null;
  const link=graph?.links?.get?.(input.link)??graph?.links?.[input.link];
  const id=link?.origin_id??(Array.isArray(link)?link[1]:null);
  if(id==null||seen.has(id))return null;
  seen.add(id);
  const node=graph.getNodeById?.(id);
  return node?.type==='Reroute'?origin(graph,node.inputs?.[0],seen):node;
}

const input=(node,name)=>node.inputs?.find(i=>i.name===name);
const kind=node=>node?.comfyClass||node?.type;
const targetBox=(canvas,target,analysis)=>String(target||(analysis?canvas?.__mossBoxEditor?.read().boxes[0]?.id:'')||'');

export function externalBindings(node) {
  const items=[],seen=new Set(),keys=new Set();let error='',analysisConfigured=false;
  const connected=input(node,'external_text')?.link!=null;
  if(!connected)return {items,error,connected:false,signature:'',analysisConfigured};
  try {
    const view=graphInputs(node.graph),root=view.entry(node);
    let link=view.source(root,'external_text');
    if(kind(link?.node)==='ComfySwitchNode'){
      analysisConfigured=kind(view.source(link,'on_true')?.node)==='MOSSBBoxImageAnalysis';
      const enabled=view.value(link,'switch');
      if(typeof enabled!=='boolean')throw Error('connection');
      const branch=enabled?'on_true':'on_false',resolved=view.source(link,branch);
      if(!enabled&&!resolved)return {items,error:'',connected:false,signature:'switch-off',analysisConfigured};
      link=resolved;
    }
    while(link) {
      const n=link.node,analysis=kind(n)==='MOSSBBoxImageAnalysis';
      if((kind(n)!=='MOSSBBoxTextLink'&&!analysis)||seen.has(link.id))throw Error('connection');
      seen.add(link.id);analysisConfigured ||= analysis;
      const canvas=view.source(link,'framing_data')?.node,box=targetBox(canvas,view.value(link,'target'),analysis);
      const textSource=view.source(link,analysis?'image':'text')?.node,key=JSON.stringify([canvas?.id,box]);
      const missing=kind(canvas)!=='MOSSSharedCanvas'||!box||!canvas.__mossBoxEditor?.read().boxes.some(b=>b.id===box);
      const issue=missing?'target':!textSource?'connection':keys.has(key)?'duplicate':'';
      keys.add(key);error ||= issue;
      items.push({canvas,box,link:String(link.id),textSource:String(textSource?.id??''),error:issue,analysis});
      const previous=view.source(link,'previous');
      if(view.resolve(link,'previous')&&!previous)throw Error('connection');
      link=previous;
    }
    if(!items.length)error='connection';
  }catch{error='connection';}
  if(error)for(const item of items)item.error=error;
  const signature=JSON.stringify(items.map(i=>[i.canvas?.id,i.box,i.link,i.textSource,i.error]));
  return {items,error,connected,signature,analysisConfigured};
}

export function installTextLink(nodeType,app) {
  const created=nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated=function() {
    const result=created?.apply(this,arguments),node=this,analysis=kind(node)==='MOSSBBoxImageAnalysis';
    if(analysis)node.widgets.find(w=>w.name==='system_prompt')?.element?.style.setProperty('--comfy-widget-min-height','100px');
    const original=node.widgets.find(w=>w.name==='target'),index=node.widgets.indexOf(original),values=[],labels=new Map();
    // A native combo can be promoted by ComfyUI. Backend values remain box IDs.
    node.widgets.splice(index,1);original.onRemove?.();
    const widget=node.addWidget('combo','target',original.value,()=>{
      try{
        const view=graphInputs(node.graph),e=view.entry(node),canvas=view.source(e,'framing_data')?.node;
        canvas?.__mossBoxEditor?.select(targetBox(canvas,view.value(e,'target'),analysis));
      }catch{}
      app.extensionManager?.workflow?.activeWorkflow?.changeTracker?.captureCanvasState();
      document.dispatchEvent(new CustomEvent('moss-bbox-edit',{detail:node}));
    },{values,getOptionLabel:value=>labels.get(String(value??''))||'Missing box'});
    // Keep the widget at its schema position for old positional saves.
    const last=node.widgets.indexOf(widget);if(last!==index){node.widgets.splice(last,1);node.widgets.splice(index,0,widget);}
    let lastCanvas=null;
    const refresh=()=>{
      let canvas,current=String(widget.value||''),promoted=[];
      try{const view=graphInputs(node.graph),e=view.entry(node);canvas=view.source(e,'framing_data')?.node;current=String(view.value(e,'target')||'');promoted=view.promoted(e,'target');}catch{}
      lastCanvas=canvas;
      const lang=canvas?.widgets?.find(w=>w.name==='ui_language')?.value;
      const ja=lang==='Japanese'||(lang!=='English'&&/^ja/.test(app.ui?.settings?.getSettingValue?.('Comfy.Locale')||navigator.language));
      widget.label=ja?'対象':'Box';labels.clear();labels.set('',ja?(canvas?'枠を選択':'Canvasを接続'):(canvas?'Select box':'Connect Canvas'));
      const boxes=canvas?.__mossBoxEditor?.read().boxes||[];
      const names=boxes.map(b=>String(b.slot).toUpperCase()+(b.promptData?.name?' · '+b.promptData.name:''));
      boxes.forEach((b,i)=>labels.set(b.id,names[i]+(names.filter(n=>n===names[i]).length>1?' ('+names.slice(0,i+1).filter(n=>n===names[i]).length+')':'')));
      if(analysis)labels.set('',`Auto · ${canvas?(labels.get(boxes[0]?.id)||(ja?'対象なし':'Missing box')):(ja?'Canvasを接続':'Connect Canvas')}`);
      if(current&&!labels.has(current))labels.set(current,ja?'対象なし':'Missing box');
      values.splice(0,values.length,...labels.keys());
      for(const outer of promoted){outer.options.values=[...values];outer.options.getOptionLabel=widget.options.getOptionLabel;}
      node.setDirtyCanvas?.(true,true);
    };
    for(const name of ['onConnectionsChange','onConfigure','onAdded']){
      const old=node[name];node[name]=function(){const value=old?.apply(this,arguments);queueMicrotask(()=>{refresh();document.dispatchEvent(new CustomEvent('moss-bbox-edit',{detail:node}));});return value;};
    }
    const listener=event=>{if(event.detail!==node&&(event.detail===lastCanvas||event.detail?.graph===(node.graph?.rootGraph||node.graph)))refresh();};
    const graphChanged=event=>{if(event.detail?.subType==='after-change')refresh();};
    document.addEventListener('moss-bbox-edit',listener);document.addEventListener('litegraph:canvas',graphChanged);
    const removed=node.onRemoved;node.onRemoved=function(){document.removeEventListener('moss-bbox-edit',listener);document.removeEventListener('litegraph:canvas',graphChanged);return removed?.apply(this,arguments);};
    refresh();return result;
  };
}
