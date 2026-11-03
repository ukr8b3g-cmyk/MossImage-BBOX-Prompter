import {externalBindings} from './external_text.mjs?v=20261104-safety1';
import {graphInputs} from './graph_inputs.mjs?v=20261103-target1';

const kind=n=>n?.comfyClass||n?.type;
const fields=['x1','y1','x2','y2'];

// This is a transient request snapshot, never a second owner of saved box text.
function capture(node,item){
  const view=graphInputs(node.graph),binding=externalBindings(node).items.find(a=>a.analysis&&!a.error&&a.canvas===item.canvas&&a.box===item.box&&a.link===item.link);
  if(!binding||item.canvas.__mossBoxEditor.busy?.())throw Error('changed');
  const box=item.canvas.__mossBoxEditor.read().boxes.find(b=>b.id===item.box);
  if(!box)throw Error('changed');
  const effective=box.promptData||node.__mossPromptDefaults?.(box.slot)||{type:'object',prompt:''};
  const type=Object.hasOwn(effective,'type')?effective.type:'object';
  if(!['character','object','obj'].includes(type))throw Error('type');
  const analysis=view.entries.find(e=>e.id===item.link),identities=[],dependencies=[],watchedWidgets=[],imageWidgets=[],seen=new Set();
  if(!analysis)throw Error('changed');
  function visit(entry){
    if(!entry||seen.has(entry.id))return;
    seen.add(entry.id);identities.push(entry.node);
    if(kind(entry.node)==='LoadImage')identities.push(...(entry.node.imgs||[]));
    // Core advances sampling seeds after queueing. That next-run seed is not a
    // change to the image/target of the request identified by prompt_id.
    const widgets=(entry.node.widgets||[]).filter(w=>w.name&&w.options?.serialize!==false&&w.serialize!==false&&
      !(entry===analysis&&(w.name==='control_after_generate'||/(^|_)seed$/.test(w.name)))&&
      (entry.node!==item.canvas||['width','height','preset'].includes(w.name))).map(w=>{watchedWidgets.push(w);if(kind(entry.node)==='LoadImage'&&w.name==='image')imageWidgets.push(w);return [w.name,w.value];});
    const inputs=(entry.inputs||[]).map(input=>{
      const link=view.resolve(entry,input.name);if(!link)return [input.name,null];
      if(link.widgetInfo){watchedWidgets.push(...view.promoted(entry,input.name));return [input.name,'widget',link.widgetInfo.value];}
      const source=view.source(entry,input.name);visit(source);return [input.name,source?.id,link.origin_slot];
    });
    dependencies.push([entry.id,kind(entry.node),entry.node.mode,widgets,inputs]);
  }
  visit(view.source(view.entry(node),'external_text'));
  // Switch state and promoted target values are resolved by the same public DTOs.
  const links=externalBindings(node).signature;
  return {box,effective,analysis,canvasId:view.entry(item.canvas).id,nodeId:view.entry(node).id,identities,watchedWidgets,imageWidgets,
    signature:JSON.stringify([links,fields.map(k=>box[k]),box.slot,type,effective.prompt??'',dependencies])};
}

function queuedMatches(output,node,item,state){
  const frame=output[state.canvasId]?.inputs,analysis=output[item.link]?.inputs;
  if(!frame||!analysis)return false;
  let layout;try{layout=JSON.parse(frame.layout_data);}catch{return false;}
  const box=layout.boxes?.find(b=>b.id===item.box);
  if(!box||box.slot!==state.box.slot||fields.some(k=>box[k]!==state.box[k]))return false;
  const values=box.promptData||{type:output[state.nodeId]?.inputs?.[`${box.slot}_type`]??'object',prompt:output[state.nodeId]?.inputs?.[`${box.slot}_prompt`]??''};
  if((values.type||'object')!==(state.effective.type||'object')||(values.prompt??'')!==(state.effective.prompt??''))return false;
  const view=graphInputs(node.graph),image=view.source(state.analysis,'image');
  return kind(image?.node)!=='LoadImage'||output[image.id]?.inputs?.image===view.value(image,'image');
}

export function installAnalysisRequests(app,api,events=globalThis.document){
  const requests=new Map(),submitting=new Set(),graphs=new Map(),widgets=new Map(),prompters=new Set();
  const graph=()=>app.rootGraph||app.graph;
  const workflow=()=>app.extensionManager?.workflow?.activeWorkflow;
  const notify=node=>events?.dispatchEvent(Object.assign(new Event('moss-bbox-edit'),{detail:node}));
  const all=()=>[...requests.values(),...submitting].flatMap(request=>request.tickets);
  function valid(ticket){
    if(ticket.invalid||ticket.done)return false;
    try{
      if(graph()!==ticket.root||workflow()!==ticket.workflow)throw Error('changed');
      const now=capture(ticket.node,ticket.item);
      if(now.signature!==ticket.state.signature||now.identities.length!==ticket.state.identities.length||now.identities.some((n,i)=>n!==ticket.state.identities[i]))throw Error('changed');
      return true;
    }catch{ticket.invalid=true;ticket.node.__mossAnalysisNotice='stale';return false;}
  }
  const check=()=>{for(const ticket of all())valid(ticket);};
  function watchWidget(widget){
    if(widgets.has(widget))return;
    const previous=widget.callback;
    function changed(...args){
      const result=previous?.apply(this,args);
      // Upload/replace may reuse a filename. Its image-widget callback still
      // invalidates requests, without hashing pixels or adding saved state.
      for(const ticket of all())if(!ticket.done&&ticket.state.imageWidgets.includes(widget)){ticket.invalid=true;ticket.node.__mossAnalysisNotice='stale';}
      check();for(const node of prompters)notify(node);return result;
    }
    widget.callback=changed;widgets.set(widget,{previous,changed});
  }
  function watch(root){
    if(graphs.has(root))return;
    const previous=root.onAfterChange;
    function changed(...args){const result=previous?.apply(this,args);check();return result;}
    root.onAfterChange=changed;graphs.set(root,{previous,changed});
  }
  function reset(){
    for(const ticket of all())ticket.invalid=true;
    requests.clear();submitting.clear();
    for(const [root,{previous,changed}] of graphs)if(root.onAfterChange===changed)root.onAfterChange=previous;
    graphs.clear();
    for(const [widget,{previous,changed}] of widgets)if(widget.callback===changed)widget.callback=previous;
    widgets.clear();prompters.clear();
  }
  function receive(detail){
    const request=requests.get(detail.prompt_id);
    if(!request){for(const pending of submitting)if(pending.early.length<32)pending.early.push(detail);return;}
    const tickets=request.tickets.filter(t=>t.state.nodeId===String(detail.node));
    if(!tickets.length)return;
    // ComfyUI's own onExecuted handler runs during this event too. Commit after
    // dispatch, then refresh the card from the existing Canvas/Undo owner.
    queueMicrotask(()=>{
      for(const ticket of tickets){
        if(!valid(ticket)){notify(ticket.node);continue;}
        const items=Array.isArray(detail.output?.moss_external_text)?detail.output.moss_external_text:[];
        const item=items.find(i=>i.canvas===ticket.state.canvasId&&i.box===ticket.item.box&&i.link===ticket.item.link);
        if(!item||typeof item.text!=='string'||!item.text.trim())continue;
        const current=capture(ticket.node,ticket.item);
        ticket.done=true;
        if(current.effective.prompt!==item.text||!current.box.promptData)
          ticket.item.canvas.__mossBoxEditor.update(ticket.item.box,{...current.effective,prompt:item.text});
        ticket.node.__mossExternalResult=[...(ticket.node.__mossExternalResult||[]).filter(i=>i.link!==item.link),item];
        delete ticket.node.__mossAnalysisNotice;notify(ticket.node);
      }
    });
  }
  const original=api.queuePrompt;
  async function queue(number,payload,...args){
    check();const request={tickets:[],early:[],finished:[]},root=graph();
    if(root){
      let view;try{view=graphInputs(root);}catch{return original.call(this,number,payload,...args);}
      for(const entry of view.entries)if(kind(entry.node)==='MOSSSharedPrompter'&&payload.output?.[entry.id]){
        const node=entry.node;
        for(const item of externalBindings(node).items.filter(a=>a.analysis&&!a.error)){
          try{
            const state=capture(node,item);if(!queuedMatches(payload.output,node,item,state))throw Error('changed');
            for(const old of all())if(old.item.canvas===item.canvas&&old.item.box===item.box)old.invalid=true;
            request.tickets.push({node,item,state,root,workflow:workflow(),invalid:false,done:false});delete node.__mossAnalysisNotice;
            prompters.add(node);for(const widget of state.watchedWidgets)watchWidget(widget);
          }catch{node.__mossAnalysisNotice='stale';}
        }
      }
    }
    if(request.tickets.length){watch(root);submitting.add(request);}
    try{
      const response=await original.call(this,number,payload,...args);
      if(request.tickets.some(ticket=>!ticket.invalid)&&typeof response?.prompt_id==='string'){
        requests.set(response.prompt_id,request);
        const finished=request.finished.find(e=>e.prompt_id===response.prompt_id);
        if(finished&&finished.type!=='execution_success')for(const ticket of request.tickets)ticket.invalid=true;
        for(const detail of request.early)if(detail.prompt_id===response.prompt_id)receive(detail);
        if(finished)requests.delete(response.prompt_id);
      }
      return response;
    }finally{submitting.delete(request);}
  }
  const executed=event=>receive(event.detail);
  const terminal=event=>{
    const request=requests.get(event.detail?.prompt_id);
    if(!request)for(const pending of submitting)if(pending.finished.length<32)pending.finished.push({prompt_id:event.detail?.prompt_id,type:event.type});
    if(request&&event.type!=='execution_success')for(const ticket of request.tickets)ticket.invalid=true;
    requests.delete(event.detail?.prompt_id);
  };
  api.queuePrompt=queue;api.addEventListener('executed',executed);
  const terminals=['execution_success','execution_error','execution_interrupted'];
  for(const name of terminals)api.addEventListener(name,terminal);
  for(const name of ['moss-bbox-edit','litegraph:canvas','input','change'])events?.addEventListener(name,check);
  return {reset,dispose(){reset();if(api.queuePrompt===queue)api.queuePrompt=original;api.removeEventListener('executed',executed);
    for(const name of terminals)api.removeEventListener(name,terminal);
    for(const name of ['moss-bbox-edit','litegraph:canvas','input','change'])events?.removeEventListener(name,check);}};
}
