// Resolve subgraph boundaries and promoted values with the installed frontend's
// execution DTOs. No inferred parent:child IDs or additional saved state.
export function graphInputs(graph) {
  const root=graph?.rootGraph||graph,nodes=root?._nodes||[];
  const subs=nodes.filter(n=>typeof n.getInnerNodes==='function');
  let entries,map;
  if(subs.length){
    map=new Map();const seed=subs.flatMap(n=>n.getInnerNodes(new Map()));
    const DTO=seed[0]?.constructor;
    if(!DTO||DTO===Object)throw Error('Unsupported subgraph execution API');
    for(const n of nodes){const dto=new DTO(n,[],map);map.set(dto.id,dto);}
    for(const dto of [...map.values()])for(const inner of dto.getInnerNodes())map.set(inner.id,inner);
    entries=[...map.values()];
  }else entries=nodes.map(node=>({id:String(node.id),node,inputs:node.inputs||[]}));
  const entry=node=>{
    const found=entries.filter(e=>e.node===node);
    if(found.length!==1)throw Error('Ambiguous subgraph instance');
    return found[0];
  };
  function resolve(e,name){
    const index=e.inputs.findIndex(i=>i.name===name);if(index<0)return null;
    if(e.resolveInput)return e.resolveInput(index)||null;
    const slot=e.inputs[index];if(slot.link==null)return null;
    const link=root.links?.get?.(slot.link)??root.links?.[slot.link];
    const id=link?.origin_id??(Array.isArray(link)?link[1]:null);
    const source=entries.find(v=>String(v.node.id)===String(id));if(!source)return null;
    if((source.node.comfyClass||source.node.type)==='Reroute')return resolve(source,source.inputs[0]?.name);
    return {origin_id:source.id,node:source};
  }
  const source=(e,name)=>{const link=resolve(e,name);return link&&!link.widgetInfo?(map?.get(link.origin_id)||entries.find(v=>v.id===link.origin_id)):null;};
  const value=(e,name)=>{
    const link=resolve(e,name);
    if(link?.widgetInfo)return link.widgetInfo.value;
    if(link)throw Error('The widget is driven by an executable node');
    return e.node.widgets?.find(w=>w.name===name)?.value;
  };
  function promoted(e,name){
    const result=[];let index=e.inputs.findIndex(i=>i.name===name);
    while(e.subgraphNode&&index>=0){
      const link=e.graph.getLink(e.inputs[index].linkId);
      if(!link?.originIsIoNode)break;
      const owner=e.subgraphNode,slot=owner.inputs[link.origin_slot],widget=owner.getWidgetFromSlot(slot);
      if(widget)result.push(widget);
      index=link.origin_slot;e=entry(owner);
    }
    return result;
  }
  return {entries,entry,source,value,resolve,promoted};
}
