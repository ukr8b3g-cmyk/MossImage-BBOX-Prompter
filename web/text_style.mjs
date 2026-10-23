import { bindHelp } from "./help.mjs";

const FONTS = [["auto","Auto","自動"],["serif","Serif / Mincho","セリフ体・明朝系"],
  ["sans","Sans-serif / Gothic","サンセリフ・ゴシック系"],["rounded","Rounded","丸文字"],
  ["script","Cursive / Script","筆記体"],["handwritten","Handwritten","手書き"],
  ["brush","Brush","筆文字"],["blackletter","Blackletter","ブラックレター"],["monospace","Monospace","等幅"]];
const WEIGHTS = [["auto","Auto","自動"],["light","Light","細字"],["regular","Regular","標準"],["bold","Bold","太字"]];
const hex = value => value.toString(16).padStart(2,"0");
const PRESET_COLORS = [
  ...Array.from({length:40},(_,i)=>"#"+hex(Math.round(i*255/39)).repeat(3)),
  ...[0,51,102,153,204,255].flatMap(r=>[0,51,102,153,204,255].flatMap(g=>
    [0,51,102,153,204,255].map(b=>"#"+hex(r)+hex(g)+hex(b)))),
];

export function mountTextStyle(slot, {type,language,changed,helpKey="individual_text_style"}) {
  const element=document.createElement("div");
  element.className="moss-text-style";
  element.dataset.slot=slot;
  element.style.cssText="grid-column:1/-1;min-width:0;display:none;padding-top:4px";
  const fields=document.createElement("div");
  fields.style.cssText="display:none;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;margin-top:4px";
  const makeSelect=items=>{
    const el=document.createElement("select");el.className="moss-k2cf-select";el.style.cssText="width:100%;min-width:0";
    for(const [key,en] of items){const op=document.createElement("option");op.value=key;op.textContent=en;el.append(op);}
    return el;
  };
  const modeItems=[["common","Use shared settings","共通設定を使用"],["individual","Individual settings","個別に指定"]];
  const mode=makeSelect(modeItems),font=makeSelect(FONTS),weight=makeSelect(WEIGHTS);
  const color=document.createElement("input"),palette=document.createElement("input"),extra=document.createElement("textarea");
  color.type="text";color.className="moss-k2cf-num";color.style.cssText="width:100%;min-width:0;flex:1;box-sizing:border-box";
  palette.type="color";palette.value="#ffffff";
  palette.style.cssText="flex:0 0 28px;width:28px;height:22px;padding:1px;box-sizing:border-box;cursor:pointer";
  palette.setAttribute("aria-label",`${slot} text style palette`);bindHelp(palette,"text_color_palette");
  const presets=document.createElement("button"),popup=document.createElement("div"),popupTitle=document.createElement("span");
  presets.type="button";presets.className="moss-k2cf-btn";presets.textContent="▦";
  presets.style.cssText="flex:0 0 24px;width:24px;height:22px;padding:0;line-height:18px;font-size:18px";
  presets.setAttribute("aria-label",`${slot} text style presets`);presets.setAttribute("aria-expanded","false");
  bindHelp(presets,"text_color_presets");
  popup.className="moss-text-color-presets";popup.popover="auto";
  popup.setAttribute("role","dialog");popup.setAttribute("aria-label",`${slot} text color presets`);
  popup.style.cssText="position:fixed;inset:auto;margin:0;padding:8px;border:1px solid #777;border-radius:5px;background:#222;color:#eee;box-sizing:border-box;max-width:calc(100vw - 8px);max-height:calc(100vh - 8px);overflow:auto;font:11px sans-serif";
  const popupHeader=document.createElement("div"),close=document.createElement("button"),grid=document.createElement("div");
  popupHeader.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px";
  close.type="button";close.textContent="×";close.className="moss-k2cf-btn";
  close.setAttribute("aria-label",`${slot} close color presets`);bindHelp(close,"close_color_presets");
  grid.style.cssText="display:grid;grid-template-columns:repeat(16,16px);gap:1px";
  const closePresets=()=>{if(popup.matches(":popover-open"))popup.hidePopover();};
  close.addEventListener("click",closePresets);palette.addEventListener("pointerdown",closePresets);
  const swatches=PRESET_COLORS.map(value=>{
    const swatch=document.createElement("button");swatch.type="button";
    swatch.setAttribute("aria-label",value);bindHelp(swatch,"text_color_pick");
    swatch.style.cssText=`appearance:none;width:16px;height:16px;min-width:0;min-height:0;margin:0;padding:0;border:1px solid #888;border-radius:0;background:${value};cursor:pointer`;
    swatch.addEventListener("click",()=>{
      if(color.value!==value){color.value=value;refresh();changed();}
      closePresets();presets.focus({preventScroll:true});
    });
    grid.append(swatch);return swatch;
  });
  popupHeader.append(popupTitle,close);popup.append(popupHeader,grid);
  popup.addEventListener("toggle",()=>presets.setAttribute("aria-expanded",String(popup.matches(":popover-open"))));
  presets.addEventListener("click",()=>{
    if(popup.matches(":popover-open")){closePresets();return;}
    popup.showPopover();
    const anchor=presets.getBoundingClientRect(),bounds=popup.getBoundingClientRect();
    popup.style.left=`${Math.max(4,Math.min(anchor.left,innerWidth-bounds.width-4))}px`;
    popup.style.top=`${Math.max(4,Math.min(anchor.bottom+4,innerHeight-bounds.height-4))}px`;
  });
  const colorRow=document.createElement("div");colorRow.style.cssText="display:flex;align-items:center;gap:4px;min-width:0";
  colorRow.append(palette,presets,color);
  // Use the browser's color parser for swatches only; preserve the user's wording.
  const colorParser=document.createElement("canvas").getContext("2d");
  const chooseColor=()=>{
    if(color.value===palette.value)return;
    color.value=palette.value;refresh();changed();
  };
  palette.addEventListener("input",chooseColor);palette.addEventListener("change",chooseColor);
  extra.rows=2;extra.className="moss-k2cf-text";extra.style.cssText="width:100%;min-height:42px;height:42px;box-sizing:border-box";
  const entries=[[mode,"mode","Text style","文字スタイル",modeItems],
    [font,"font","Typeface","書体",FONTS],[weight,"weight","Weight","太さ",WEIGHTS],
    [color,"color","Text color","文字色"],[extra,"extra","Additional description","補足"]];
  const labels=[];
  for(const [control,key,en,jp,items] of entries){
    control.setAttribute("aria-label",`${slot} text style ${key}`);bindHelp(control,helpKey);
    const label=document.createElement(key==="color"?"div":"label"),title=document.createElement("span");
    label.style.cssText="display:flex;flex-direction:column;gap:2px;font-size:10px;min-width:0";
    if(key==="extra")label.style.gridColumn="1/-1";
    label.append(title,key==="color"?colorRow:control);(key==="mode"?element:fields).append(label);
    labels.push({title,en,jp,control,items});
    control.addEventListener(control.tagName==="SELECT"?"change":"input",()=>{refresh();changed();});
  }
  const note=document.createElement("div");note.className="moss-k2cf-note";note.style.marginTop="3px";
  element.append(fields,note,popup);
  function refresh(){
    const ja=language()==="ja";
    element.style.display=type()==="text"?"block":"none";
    fields.style.display=mode.value==="individual"?"grid":"none";
    if(type()!=="text" || mode.value!=="individual")closePresets();
    popupTitle.textContent=ja?"プリセット色（256）":"Preset colors (256)";
    for(const {title,en,jp,control,items} of labels){
      title.textContent=ja?jp:en;
      if(items)items.forEach((item,i)=>control.options[i].textContent=item[ja?2:1]);
    }
    color.placeholder=ja?"例：金色、gold、#FFD700":"e.g. gold, dark blue, #FFD700";
    colorParser.fillStyle="#ffffff";
    colorParser.fillStyle=color.value.trim();
    const parsed=colorParser.fillStyle;
    palette.value=/^#[0-9a-f]{6}$/i.test(parsed)?parsed:"#ffffff";
    const valid=color.value.trim()!=="" && CSS.supports("color",color.value.trim());
    swatches.forEach((swatch,i)=>{
      const selected=valid && parsed.toLowerCase()===PRESET_COLORS[i];
      swatch.setAttribute("aria-pressed",String(selected));
      swatch.style.outline=selected?"2px solid white":"";swatch.style.outlineOffset="-3px";
    });
    note.textContent=ja?"Exportのliteralモードで使用。書体は描写指示で、フォントの厳密な再現は保証しません。"
      :"Used in Export literal mode. Typeface is a prompt hint, not an exact font renderer.";
  }
  return {element,refresh,
    get(){return {mode:mode.value,font:font.value,weight:weight.value,color:color.value,extra:extra.value};},
    set(value){
      closePresets();
      const saved=value && typeof value==="object"?value:{};
      for(const [control,key,,,items] of entries){
        control.value=items ? (items.some(item=>item[0]===saved[key])?saved[key]:items[0][0])
          : typeof saved[key]==="string"?saved[key]:"";
      }
      refresh();
    },
  };
}
