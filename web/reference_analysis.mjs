import {origin,externalBindings} from './external_text.mjs?v=20261104-controls1';
import {analysisGraph,cropBounds,kind} from './reference_analysis_graph.mjs?v=20261103-analysis1';

const input=(n,k)=>n.inputs?.find(i=>i.name===k);
const messages={
 E_BRANCH_MISSING:['Connect the analysis subgraph','解析サブグラフを接続してください'],
 E_BRANCH_AMBIGUOUS:['Use one analysis branch per Canvas','Canvasごとの解析枝を1つにしてください'],
 E_BRANCH_UNSAFE:['Check the analysis connections and settings','解析の接続・設定を確認してください'],
 E_CORE_CONTRACT:['Unsupported frontend or node version','未対応のフロントエンド・ノードです'],
 E_ANALYSIS_DISABLED:['Turn on the analysis Switch','解析SwitchをONにしてください'],
 E_SOURCE_IMAGE:['Connect the same Load Image to Canvas and Crop','同じLoad ImageをCanvasとCropに接続してください'],
 E_EXTERNAL_SIZE:['External dimensions are unsupported for analysis','外部寸法の接続中は解析できません'],
 E_ENCODER:['Use the supported MOSS text encoder','対応するMOSSテキストエンコーダーを選択してください'],
 E_EXTERNAL_TEXT:['Disconnect external text before analysis','外部テキストの接続中は解析できません'],
 E_SHARED_DEFAULTS_AMBIGUOUS:['Shared settings differ between Prompters','Prompter間で共通設定が異なります'],
 E_BOX_ID:['Select one existing Character or Object box','既存のCharacter・Object枠を選択してください'],
 E_CROP_INVALID:['Invalid crop dimensions','切り抜き寸法を確認してください'],
 E_CROP_OUTSIDE:['The box is outside the reference image','枠が参照画像と重なっていません'],
 E_RESULT_STALE:['Inputs changed. Analyze again.','入力が変わりました。再解析してください'],
 E_RESULT_EMPTY:['No text returned. Analyze again.','候補文が空です。再解析してください'],
 E_ANALYSIS_FAILED:['Analysis failed. Check ComfyUI history.','解析に失敗しました。ComfyUIの履歴を確認してください'],
 E_EDITOR_BUSY:['Finish editing the Canvas first','Canvasの編集を終えてください'],
 E_APPLY:['The text could not be applied','本文を適用できませんでした'],
 E_QUEUE_UNKNOWN:['Queue response missing. Check ComfyUI history before retrying.','送信結果が不明です。再実行前にComfyUIの履歴を確認してください'],
};
const message=(e,ja)=>messages[e?.message]?.[ja?1:0]|| (ja?'解析を開始できません。接続を確認してください':'Cannot analyze. Check the connections.');
let active=null;

export function targetContext(canvas,id){
  const graph=canvas.graph,editor=canvas.__mossBoxEditor;
  if(!graph||graph.getNodeById(canvas.id)!==canvas||!editor)throw Error('E_RESULT_STALE');
  const matches=editor.read().boxes.filter(b=>b.id===id);
  if(matches.length!==1)throw Error('E_BOX_ID');
  const box=matches[0],prompts=new Set();
  for(const e of graph._nodes||[])if(kind(e)==='MOSSFromKrea2'&&origin(graph,input(e,'framing_data'))===canvas){
    const p=origin(graph,input(e,'prompt_ui_data'));if(p)prompts.add(p);
  }
  for(const p of graph._nodes||[])if(kind(p)==='MOSSSharedPrompter'){
    const b=externalBindings(p);
    if((b.error&&b.connected)||b.items.some(i=>i.canvas===canvas&&i.box===id))throw Error('E_EXTERNAL_TEXT');
  }
  let effective=box.promptData;
  if(!effective){
    const defaults=[...prompts].map(p=>p.__mossPromptDefaults?.(box.slot));
    if(!defaults.length||defaults.some(v=>!v)||defaults.some(v=>JSON.stringify(v)!==JSON.stringify(defaults[0])))throw Error('E_SHARED_DEFAULTS_AMBIGUOUS');
    effective=defaults[0];
  }
  if(!['character','object','obj'].includes(effective.type))throw Error('E_BOX_ID');
  return {graph,canvas,box,effective,type:effective.type==='obj'?'object':effective.type};
}
function capture(canvas,id){
  const c=targetContext(canvas,id),branch=analysisGraph(c.graph,canvas,id,c.type);
  const fingerprint=structuredClone(branch.output);
  // Other boxes and non-analysis settings are not analysis inputs.
  for(const n of Object.values(fingerprint))if(n.class_type==='MOSSSharedCanvas'){
    n.inputs={width:n.inputs.width,height:n.inputs.height,preset:n.inputs.preset};
  }
  return {...c,branch,signature:JSON.stringify([fingerprint,[c.box.x1,c.box.y1,c.box.x2,c.box.y2],c.type,c.effective.prompt??''])};
}
export function analysisStatus(canvas,id,language='en'){
  try{capture(canvas,id);return {enabled:true,reason:''};}catch(e){return {enabled:false,reason:message(e,language==='ja')};}
}
export async function requestAnalysis(canvas,id,language='en'){
  if(active?.canvas===canvas&&active?.id===id)return;
  active?.close();
  const ja=language==='ja',t=(en,jp)=>ja?jp:en;
  let initial;
  try{initial=capture(canvas,id);}catch(e){window.alert(message(e,ja));return;}
  const [{api},{app}]=await Promise.all([import('../../scripts/api.js'),import('../../scripts/app.js')]);
  if(active)return;
  const dialog=document.createElement('dialog');dialog.setAttribute('aria-label',t('Reference analysis','参照画像解析'));
  dialog.style.cssText='width:560px;max-width:90vw;max-height:85vh;overflow:auto;background:#222;color:#ddd;border:1px solid #777;border-radius:6px;font:11px sans-serif;padding:12px';
  const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;dialog.append(e);return e;};
  make('strong',`${initial.box.slot.toUpperCase()}${initial.effective.name?' · '+initial.effective.name:''}`);
  const preview=make('canvas');preview.style.cssText='display:block;max-width:100%;max-height:240px;object-fit:contain;margin:8px auto';
  const status=make('p'),candidate=make('textarea');candidate.setAttribute('aria-label',t('Candidate','候補'));candidate.style.cssText='box-sizing:border-box;width:100%;height:130px;font:inherit;background:#151515;color:#ddd';
  const current=make('details'),summary=document.createElement('summary'),body=document.createElement('pre');summary.textContent=t('Current text','現在の本文');body.style.whiteSpace='pre-wrap';body.textContent=initial.effective.prompt||'';current.append(summary,body);
  const footer=make('div');footer.style.cssText='display:flex;gap:6px;justify-content:flex-end;margin-top:8px';
  const button=(en,jp)=>{const b=document.createElement('button');b.textContent=t(en,jp);b.style.cssText='font:inherit;height:22px';footer.append(b);return b;};
  const retry=button('Reanalyze','再解析'),apply=button('Apply','適用'),close=button('Close','閉じる');apply.disabled=true;
  candidate.title=t('Up to 384 tokens by default. Check for incomplete sentences. Apply replaces the current text.','初期値は最大384トークン。文の途中で切れていないか確認してください。適用すると現在の本文を置き換えます。');
  const workflow=app.extensionManager?.workflow?.activeWorkflow,graph=initial.graph;
  let request=0,promptId=null,sink=null,closed=false,stale=false,ready=false,queued=false,applying=false,pending=[],staged=null;
  const handlers=new Map();
  const fail=e=>{ready=false;apply.disabled=true;status.textContent=message(e,ja);};
  const valid=()=>{
    if(applying)return true;
    if(closed||stale)return false;
    try{
      if(app.rootGraph!==graph||app.extensionManager?.workflow?.activeWorkflow!==workflow)throw Error('E_RESULT_STALE');
      const now=capture(canvas,id);
      if(now.signature!==initial.signature||now.branch.identity.some((n,i)=>n!==initial.branch.identity[i]))throw Error('E_RESULT_STALE');
      return true;
    }catch(e){stale=true;fail(e);return false;}
  };
  const oldChange=graph.onAfterChange;
  function changed(...args){const r=oldChange?.apply(this,args);valid();return r;}
  graph.onAfterChange=changed;
  const timer=setInterval(valid,500);
  const finish=()=>{
    if(closed)return;closed=true;++request;clearInterval(timer);
    if(graph.onAfterChange===changed)graph.onAfterChange=oldChange;
    document.removeEventListener('moss-bbox-edit',valid);document.removeEventListener('change',valid,true);document.removeEventListener('input',valid,true);
    for(const [name,fn] of handlers)api.removeEventListener(name,fn);
    dialog.remove();preview.width=preview.height=0;candidate.value='';pending=[];staged=null;if(active?.close===finish)active=null;
  };
  active={canvas,id,close:finish};close.onclick=finish;dialog.addEventListener('cancel',finish);
  dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.addEventListener('pointerdown',e=>e.stopPropagation());
  document.addEventListener('moss-bbox-edit',valid);document.addEventListener('change',valid,true);document.addEventListener('input',valid,true);
  function event(name,d){
    if(closed||!queued)return;
    if(!promptId){if(d.node===sink&&pending.length<8)pending.push([name,d]);return;}
    if(d.prompt_id!==promptId||!valid())return;
    if(name==='execution_error'||name==='execution_interrupted'){queued=false;retry.disabled=false;fail(Error('E_ANALYSIS_FAILED'));}
    if(name==='executed'&&String(d.node)===sink){
      const v=d.output?.text;
      if(!Array.isArray(v)||v.length!==1||typeof v[0]!=='string'||!v[0].trim()){fail(Error('E_RESULT_EMPTY'));return;}
      staged=v[0];
    }
    if(name==='execution_success'){complete(staged);}
  }
  function complete(text){
    queued=false;retry.disabled=false;
    if(!valid())return;
    if(typeof text!=='string'||!text.trim()){fail(Error('E_RESULT_EMPTY'));return;}
    candidate.value=text;ready=true;apply.disabled=false;status.textContent=t('Review the candidate, then apply.','候補を確認して適用してください。');
  }
  for(const name of ['executed','execution_success','execution_error','execution_interrupted']){
    const fn=e=>event(name,e.detail);handlers.set(name,fn);api.addEventListener(name,fn);
  }
  async function run(){
    const nonce=++request;ready=false;stale=false;queued=false;promptId=null;staged=null;pending=[];apply.disabled=true;retry.disabled=true;candidate.value='';
    try{
      initial=capture(canvas,id);body.textContent=initial.effective.prompt||'';status.textContent=t('Analyzing…','解析中…');
      const image=new Image(),filename=initial.branch.imageName;
      if(typeof filename!=='string'||!filename)throw Error('E_SOURCE_IMAGE');
      const parts=filename.replace(/\\/g,'/').split('/'),file=parts.pop();
      image.src=api.apiURL('/view?'+new URLSearchParams({filename:file,subfolder:parts.join('/'),type:'input'}));await image.decode();
      if(closed||nonce!==request||!valid())return;
      const v=initial.branch.canvasInputs;
      // Canvas presets resolve to dimensions in the existing backend. The editor's
      // width/height widgets are already the saved resolved dimensions.
      const [l,t0,r,b]=cropBounds(Number(v.width),Number(v.height),image.naturalWidth,image.naturalHeight,initial.box);
      preview.width=r-l;preview.height=b-t0;preview.getContext('2d').drawImage(image,l,t0,r-l,b-t0,0,0,r-l,b-t0);
      sink='moss-analysis-'+crypto.randomUUID();const output=structuredClone(initial.branch.output);
      output[sink]={class_type:'PreviewAny',inputs:{source:[initial.branch.switchId,0]}};
      queued=true;
      // No app.queuePrompt, global serializer, seed hooks or graph mutation.
      const response=await api.queuePrompt(0,{output,workflow:undefined});
      if(closed||nonce!==request)return;
      promptId=response.prompt_id;
      if(typeof promptId!=='string'||!promptId)throw Error('E_QUEUE_UNKNOWN');
      for(const [name,d] of pending)event(name,d);pending=[];
      // Exact history also handles cached sinks and WebSocket/HTTP races.
      while(!closed&&nonce===request&&queued){
        await new Promise(resolve=>setTimeout(resolve,2000));
        if(closed||nonce!==request||!queued)break;
        const response=await api.fetchApi('/history/'+encodeURIComponent(promptId));
        if(response.ok){const record=(await response.json())[promptId];if(record?.status?.completed){
          if(record.status.status_str==='success')complete(record.outputs?.[sink]?.text?.[0]);else {queued=false;fail(Error('E_ANALYSIS_FAILED'));}break;
        }
        if(!record){const queueResponse=await api.fetchApi('/queue');if(queueResponse.ok){
          const queue=await queueResponse.json();
          if(![...(queue.queue_running||[]),...(queue.queue_pending||[])].some(item=>item[1]===promptId))throw Error('E_QUEUE_UNKNOWN');
        }}}
      }
    }catch(e){if(!closed&&nonce===request){queued=false;fail(e);}}
    finally{if(!closed&&nonce===request)retry.disabled=false;}
  }
  retry.onclick=()=>{if(!queued)run();};
  apply.onclick=()=>{
    if(!ready||!valid()||!candidate.value.trim())return;
    try{
      const now=targetContext(canvas,id);if(canvas.__mossBoxEditor.busy?.())throw Error('E_EDITOR_BUSY');
      if(now.effective.prompt===candidate.value){finish();return;}
      const next={...structuredClone(now.effective),prompt:candidate.value};
      // Our own commit must not invalidate the completed request.
      ready=false;applying=true;apply.disabled=true;
      canvas.__mossBoxEditor.update(id,next);
      if(canvas.__mossBoxEditor.read().boxes.find(b=>b.id===id)?.promptData?.prompt!==next.prompt)throw Error('E_APPLY');
      finish();
    }catch(e){applying=false;fail(e);}
  };
  document.body.append(dialog);dialog.showModal();await run();
}
