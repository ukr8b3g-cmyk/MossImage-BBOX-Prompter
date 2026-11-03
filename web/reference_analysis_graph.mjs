// Only the installed frontend's public subgraph DTOs resolve execution IDs.
const allowed=new Set(['MOSSSharedCanvas','MOSSBBoxReferenceCrop','LoadImage','CLIPLoader','PrimitiveString','PrimitiveStringMultiline','TextGenerate','ComfySwitchNode']);
export const kind=n=>n?.comfyClass||n?.type;
export function analysisGraph(graph,canvas,boxId,type) {
  const subs=(graph?._nodes||[]).filter(n=>typeof n.getInnerNodes==='function');
  const seed=subs.flatMap(n=>n.getInnerNodes(new Map()));
  const DTO=seed[0]?.constructor;
  if(!DTO||DTO===Object)throw Error('E_CORE_CONTRACT');
  const map=new Map();
  for(const n of graph._nodes){const dto=new DTO(n,[],map);map.set(dto.id,dto);}
  for(const dto of [...map.values()])for(const inner of dto.getInnerNodes())map.set(inner.id,inner);
  const input=(dto,name)=>{const i=dto.inputs.findIndex(v=>v.name===name);return i<0?null:dto.resolveInput(i);};
  const source=(dto,name,expected)=>{const link=input(dto,name),src=map.get(link?.origin_id);if(!src||link.origin_slot!==0||!expected.includes(src.comfyClass))throw Error('E_BRANCH_UNSAFE');return src;};
  const crops=[...map.values()].filter(d=>d.comfyClass==='MOSSBBoxReferenceCrop'&&input(d,'framing_data')?.node?.node===canvas);
  if(crops.length!==1)throw Error(crops.length?'E_BRANCH_AMBIGUOUS':'E_BRANCH_MISSING');
  const crop=crops[0],sub=subs.find(s=>s.getInnerNodes(map).some(d=>d.node===crop.node));
  if(!sub)throw Error('E_BRANCH_UNSAFE');
  const members=sub.getInnerNodes(map),switches=members.filter(d=>d.comfyClass==='ComfySwitchNode');
  if(switches.length!==1)throw Error('E_BRANCH_AMBIGUOUS');
  const sw=switches[0],gen=source(sw,'on_true',['TextGenerate']),empty=source(sw,'on_false',['PrimitiveString','PrimitiveStringMultiline']);
  if(source(gen,'image',['MOSSBBoxReferenceCrop']).node!==crop.node)throw Error('E_BRANCH_UNSAFE');
  // A generation subgraph may contain a disconnected analysis branch. Only the
  // crop/generator/switch outputs must stay outside every other execution path.
  const isolated=new Set([crop.id,gen.id,sw.id]);
  for(const dto of map.values()){
    if(isolated.has(dto.id)||dto.node.isSubgraphNode?.())continue;
    for(let i=0;i<dto.inputs.length;i++){
      const link=dto.resolveInput(i);
      if(link&&!link.widgetInfo&&isolated.has(link.origin_id))throw Error('E_BRANCH_UNSAFE');
    }
  }
  const clip=source(gen,'clip',['CLIPLoader']),image=source(crop,'image',['LoadImage']);
  source(gen,'system_prompt',['PrimitiveString','PrimitiveStringMultiline']);
  const cdto=[...map.values()].find(d=>d.node===canvas);
  if(source(cdto,'reference_image',['LoadImage']).node!==image.node)throw Error('E_SOURCE_IMAGE');
  for(const name of ['width_override','height_override'])if(input(cdto,name))throw Error('E_EXTERNAL_SIZE');
  const output={},visiting=new Set();
  function visit(dto){
    if(output[dto.id])return;
    if(visiting.has(dto.id)||!allowed.has(dto.comfyClass)||[2,4].includes(dto.mode))throw Error('E_BRANCH_UNSAFE');
    visiting.add(dto.id);const inputs={};
    // These known nodes have scalar widget values. No whole-graph serialization,
    // virtual applyToGraph, randomization or unrelated widget hooks are invoked.
    for(const w of dto.widgets||[])if(w.name&&w.options?.serialize!==false&&w.serialize!==false){
      if(w.value!==null&&typeof w.value==='object')throw Error('E_CORE_CONTRACT');
      inputs[w.name]=w.value;
    }
    for(let i=0;i<dto.inputs.length;i++){
      const name=dto.inputs[i].name;
      if(dto===cdto&&name==='reference_image')continue;
      const link=dto.resolveInput(i);if(!link)continue;
      if(link.widgetInfo){inputs[name]=link.widgetInfo.value;continue;}
      const src=map.get(link.origin_id);if(!src)throw Error('E_CORE_CONTRACT');visit(src);inputs[name]=[link.origin_id,link.origin_slot];
    }
    output[dto.id]={class_type:dto.comfyClass,inputs};visiting.delete(dto.id);
  }
  visit(sw);
  const values=d=>output[d.id].inputs;
  const dimensions=String(values(cdto).preset).match(/^(\d+) x (\d+)$/);
  if(dimensions&&(Number(dimensions[1])!==values(cdto).width||Number(dimensions[2])!==values(cdto).height))throw Error('E_CROP_INVALID');
  if(values(sw).switch!==true)throw Error('E_ANALYSIS_DISABLED');
  if(values(empty).value!=='')throw Error('E_BRANCH_UNSAFE');
  if(values(clip).type!=='moss_image'||!/(^|[\\/])qwen3\.5_9b_int8_convrot\.safetensors$/.test(values(clip).clip_name))throw Error('E_ENCODER');
  if(values(gen).video||values(gen).audio||values(gen).sampling_mode!=='off')throw Error('E_BRANCH_UNSAFE');
  values(crop).box_id=boxId;
  values(gen).prompt=type==='character'?'Target kind: Character. Describe only the visible appearance of the main character in this crop.':'Target kind: Object. Describe only the main object in this crop.';
  return {output,switchId:sw.id,imageName:values(image).image,canvasInputs:values(cdto),sub,identity:[sub,crop.node,gen.node,clip.node,image.node,sw.node]};
}

export function cropBounds(cw,ch,iw,ih,box){
  const nums=[cw,ch,iw,ih,box.x1,box.x2,box.y1,box.y2];
  if(!nums.every(v=>typeof v==='number'&&Number.isFinite(v))||Math.min(cw,ch,iw,ih)<=0)throw Error('E_CROP_INVALID');
  const s=Math.min(cw/iw,ch/ih),ox=(cw-iw*s)/2,oy=(ch-ih*s)/2;
  const x1=Math.max(Math.min(box.x1,box.x2),ox),x2=Math.min(Math.max(box.x1,box.x2),ox+iw*s);
  const y1=Math.max(Math.min(box.y1,box.y2),oy),y2=Math.min(Math.max(box.y1,box.y2),oy+ih*s);
  if(x2<=x1||y2<=y1)throw Error('E_CROP_OUTSIDE');
  return [Math.max(0,Math.floor((x1-ox)/s)),Math.max(0,Math.floor((y1-oy)/s)),Math.min(iw,Math.ceil((x2-ox)/s)),Math.min(ih,Math.ceil((y2-oy)/s))];
}
