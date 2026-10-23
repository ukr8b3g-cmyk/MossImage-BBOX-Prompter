const slots = ['red','blue','yellow','green','magenta','cyan','orange'];
const colors = ['#ff4444','#4488ff','#ffdd22','#55bb55','#cc44bb','#00c8d7','#ff9500'];
const fail = code => { throw new Error(code); };
export function parseLayoutImport(raw) {
  let data;
  try { data = JSON.parse(raw); } catch { fail('json'); }
  if (!data || Array.isArray(data) || typeof data !== 'object') fail('format');
  const official = Array.isArray(data.items);
  if (official && (data.bbox_format !== 'yxyx' || data.bbox_coord_space !== 'abs_centralized')) fail('format');
  const boxes = official ? data.items : data.boxes;
  if (!Array.isArray(boxes) || !boxes.length) fail('empty');
  const items = boxes.map((b,i) => {
    if (!b || typeof b !== 'object') fail('coordinates');
    const coords = official ? b.bbox : [b.x1,b.y1,b.x2,b.y2];
    if (!Array.isArray(coords) || coords.length !== 4 || !coords.every(v=>typeof v==='number' && Number.isFinite(v))) fail('coordinates');
    if (coords[2]<=coords[0] || coords[3]<=coords[1]) fail('area');
    return {coords,slot:slots.includes(b.slot)?b.slot:slots[i%slots.length],label:String(b.label||`Box ${i+1}`)};
  });
  return {items,official,width:data.width,height:data.height};
}
export function prepareLayoutImport(parsed, {width,height,targetWidth,targetHeight,mapping,mode='append',existing=[]}) {
  if (![width,height,targetWidth,targetHeight].every(v=>Number.isFinite(v)&&v>0)) fail('size');
  if (!['append','replace'].includes(mode)) fail('format');
  if (mode==='replace' && existing.some(b=>b.locked===true)) fail('locked');
  return parsed.items.map((item,i)=>{
    const slot=mapping?.[i] ?? item.slot;
    if (!slots.includes(slot)) fail('format');
    let [x1,y1,x2,y2]=item.coords;
    if(parsed.official) [x1,y1,x2,y2]=[y1+Math.floor(width/2),x1+Math.floor(height/2),y2+Math.floor(width/2),x2+Math.floor(height/2)];
    const coords=[x1/width*targetWidth,y1/height*targetHeight,x2/width*targetWidth,y2/height*targetHeight];
    if(!coords.every(Number.isFinite)) fail('coordinates');
    return {slot,x1:coords[0],y1:coords[1],x2:coords[2],y2:coords[3],layoutImported:true};
  });
}

export function openLayoutImport({ja,currentSize,getExisting,canResize,apply}) {
  const t=(en,jp)=>ja?jp:en;
  const messages={json:t('Invalid JSON.','JSONの構文が不正です。'),format:t('Unsupported layout format or coordinates.','未対応の配置形式・座標形式です。'),empty:t('No boxes found.','読み込める枠がありません。'),coordinates:t('Coordinates must be finite numbers.','座標は有限の数値で指定してください。'),area:t('Boxes must have positive width and height.','幅・高さが正の枠を指定してください。'),size:t('Enter the original image width and height.','元画像の幅・高さを入力してください。'),locked:t('Unlock existing boxes before replacing or resizing.','置き換え・サイズ変更の前に既存枠のロックを解除してください。'),changed:t('Canvas changed. Check the preview again.','Canvasが変更されました。もう一度確認してください。')};
  const dialog=document.createElement('dialog');
  dialog.className='moss-layout-import';
  dialog.lang=ja?'ja':'en';
  dialog.style.cssText='background:#222;color:#eee;border:1px solid #777;border-radius:8px;width:min(640px,85vw);max-height:85vh;overflow:auto;padding:18px;font:14px sans-serif';
  const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
  const title=el('h3',t('Import layout JSON','配置JSONを読み込む'));dialog.append(title);
  const note=el('p',t('Placement only. New boxes use the current Prompter color defaults. Edit ID cards after importing to give each box its own prompt.','配置のみ取り込みます。新しい枠は現在のPrompterの色別設定を使用します。取り込み後にID別カードで枠ごとの文章を編集できます。'));dialog.append(note);
  const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
  const choose=el('button',t('Choose JSON file','JSONファイルを選択'));choose.type='button';choose.onclick=()=>file.click();
  const filename=el('span',t('No file selected','ファイルが選択されていません'));filename.style.cssText='overflow-wrap:anywhere;min-width:0';filename.setAttribute('aria-live','polite');
  const fileRow=el('div');fileRow.style.cssText='display:flex;align-items:center;gap:8px';choose.style.flexShrink='0';fileRow.append(choose,filename,file);dialog.append(fileRow);
  const raw=el('textarea');raw.placeholder=t('Or paste layout JSON here','または配置JSONをここに貼り付け');raw.setAttribute('aria-label',raw.placeholder);raw.style.cssText='display:block;width:100%;height:100px;box-sizing:border-box;margin:10px 0';dialog.append(raw);
  const field=(label,control)=>{const row=el('label',label+' ');row.style.cssText='display:inline-block;margin:5px';row.append(control);dialog.append(row);control.setAttribute('aria-label',label);return control;};
  const w=field(t('Source width','元の幅'),el('input')),h=field(t('Source height','元の高さ'),el('input'));
  for(const input of [w,h]){input.type='number';input.min='1';input.style.width='85px';}
  const select=(label,options)=>{const s=el('select');for(const [value,text] of options){const o=el('option',text);o.value=value;s.append(o);}return field(label,s);};
  const mode=select(t('Mode','反映方法'),[['append',t('Add to existing boxes','既存枠に追加')],['replace',t('Replace boxes','枠を置き換え')]]);
  const sizing=select(t('Size','サイズ'),[['current',t('Keep current Canvas size','現在のCanvasサイズを維持')],['source',t('Use source size','元のサイズに合わせる')]]);
  const table=el('div');table.style.cssText='max-height:150px;overflow:auto;margin:8px 0';dialog.append(table);
  const preview=el('canvas');preview.width=400;preview.height=250;preview.style.cssText='width:100%;max-height:250px;object-fit:contain;background:#111';dialog.append(preview);
  const status=el('p');status.setAttribute('role','status');dialog.append(status);
  const cancel=el('button',t('Cancel','取消')),ok=el('button',t('Apply','適用'));ok.disabled=true;dialog.append(cancel,ok);
  let parsed=null,mapping=[],prepared=null,revision=0;
  const update=()=>{
    ok.disabled=true;prepared=null;
    const ctx=preview.getContext('2d');ctx.clearRect(0,0,400,250);
    if(!parsed)return;
    try{
      const [cw,ch]=currentSize();const sw=Number(w.value),sh=Number(h.value);
      const resize=sizing.value==='source';
      if(resize && (!canResize() || getExisting().some(b=>b.locked)))fail('locked');
      const tw=resize?sw:cw,th=resize?sh:ch;
      if(resize && (!Number.isInteger(sw)||!Number.isInteger(sh)||sw%16||sh%16))fail('size');
      const boxes=prepareLayoutImport(parsed,{width:sw,height:sh,targetWidth:tw,targetHeight:th,mapping,mode:mode.value,existing:getExisting()});
      const scale=Math.min(400/tw,250/th),ox=(400-tw*scale)/2,oy=(250-th*scale)/2;
      ctx.strokeStyle='#777';ctx.strokeRect(ox,oy,tw*scale,th*scale);
      for(const b of [...(mode.value==='append'?getExisting():[]),...boxes]){ctx.strokeStyle=colors[slots.indexOf(b.slot)]||'#888';ctx.strokeRect(ox+b.x1*scale,oy+b.y1*scale,(b.x2-b.x1)*scale,(b.y2-b.y1)*scale);}
      const outside=boxes.some(b=>b.x1<0||b.y1<0||b.x2>tw||b.y2>th);
      status.textContent=`${boxes.length} BBOX · ${sw} × ${sh} → ${tw} × ${th}`+(sw/sh!==tw/th?t(' · Aspect ratio changes',' · 縦横比が変わります'):'')+(outside?t(' · Outside Canvas; coordinates preserved',' · Canvas外の座標を含みます（保持します）'):'');
      prepared={boxes,width:tw,height:th,resize,mode:mode.value};ok.disabled=false;
    }catch(error){status.textContent=messages[error.message]||String(error.message);}
  };
  const parse=()=>{
    parsed=null;table.replaceChildren();ok.disabled=true;prepared=null;
    try{
      parsed=parseLayoutImport(raw.value);mapping=parsed.items.map(b=>b.slot);
      w.value=Number.isFinite(parsed.width)?parsed.width:'';h.value=Number.isFinite(parsed.height)?parsed.height:'';
      parsed.items.forEach((item,i)=>{
        const row=el('label',`${i+1}. ${item.label.slice(0,80)} → `),s=el('select');s.setAttribute('aria-label',`${t('Color','色')} ${i+1}`);
        for(const slot of slots){const o=el('option',slot.toUpperCase());o.value=slot;s.append(o);}s.value=mapping[i];s.onchange=()=>{mapping[i]=s.value;update();};row.append(s);row.style.display='block';table.append(row);
      });update();
    }catch(error){status.textContent=messages[error.message]||error.message;preview.getContext('2d').clearRect(0,0,400,250);}
  };
  raw.addEventListener('input',()=>{revision++;parse();});
  file.addEventListener('change',async()=>{
    const selected=file.files[0];if(!selected)return;
    const token=++revision;ok.disabled=true;filename.textContent=selected.name;
    try{const value=await selected.text();if(token!==revision||!dialog.isConnected)return;raw.value=value;parse();}
    catch{if(token===revision&&dialog.isConnected)status.textContent=t('Could not read file.','ファイルを読み込めません。');}
  });
  for(const control of [w,h,mode,sizing])control.addEventListener('input',update);
  cancel.onclick=()=>dialog.close();
  ok.onclick=()=>{update();if(!prepared)return;try{apply(prepared);dialog.close();}catch(error){ok.disabled=true;status.textContent=messages[error.message]||error.message;}};
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);dialog.showModal();return dialog;
}
