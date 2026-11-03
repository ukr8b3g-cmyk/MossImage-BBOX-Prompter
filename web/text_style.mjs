import {createEmojiPicker} from './emoji_picker.mjs?v=20261028-dialogue1';
import { bindHelp } from "./help.mjs?v=1.0.11";
import { mountSpeechBubble } from "./speech_bubble.mjs?v=20261028-text-controls2";

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

export function mountTextStyle(slot, {type,language,changed,prompt,helpKey="individual_text_style"}) {
  const element=document.createElement("div");
  element.className="moss-text-style";
  element.dataset.slot=slot;
  element.style.cssText="grid-column:1/-1;min-width:0;display:none;padding-top:4px";
  const makeSelect=items=>{
    const el=document.createElement("select");el.className="moss-k2cf-select";el.style.cssText="width:100%;min-width:0";
    for(const [key,en] of items){const op=document.createElement("option");op.value=key;op.textContent=en;el.append(op);}
    return el;
  };
  const modeItems=[["common","Shared style","共通スタイル"],["individual","Custom style","個別スタイル"]];
  const mode=makeSelect(modeItems),font=makeSelect(FONTS),weight=makeSelect(WEIGHTS);
  const color=document.createElement("input"),extra=document.createElement("textarea");
  color.type="text";color.className="moss-k2cf-num";color.style.cssText="width:100%;min-width:0;flex:1;box-sizing:border-box";
  const popup=document.createElement("div"),popupTitle=document.createElement("span");
  popup.className="moss-text-color-presets";popup.popover="auto";
  popup.setAttribute("role","dialog");popup.setAttribute("aria-label",`${slot} text color presets`);
  popup.style.cssText="position:fixed;inset:auto;margin:0;padding:8px;border:1px solid #777;border-radius:5px;background:#222;color:#eee;box-sizing:border-box;max-width:calc(100vw - 8px);max-height:calc(100vh - 8px);overflow:auto;font:11px sans-serif";
  const popupHeader=document.createElement("div"),close=document.createElement("button"),grid=document.createElement("div");
  popupHeader.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px";
  close.type="button";close.textContent="×";close.className="moss-k2cf-btn";
  close.setAttribute("aria-label",`${slot} close color presets`);bindHelp(close,"close_color_presets");
  grid.style.cssText="display:grid;grid-template-columns:repeat(16,16px);gap:1px";
  const closePresets=()=>{if(popup.matches(":popover-open"))popup.hidePopover();};
  close.addEventListener("click",closePresets);
  const colorRows=[],colorParser=document.createElement("canvas").getContext("2d");
  let activeColor=null;
  const escapePresets=event=>{
    if(event.key!=="Escape"||!popup.matches(":popover-open"))return;
    event.preventDefault();event.stopPropagation();closePresets();activeColor.presets.focus({preventScroll:true});
  };
  popup.addEventListener("keydown",escapePresets);
  let swatches=[];
  function createSwatches(){
    if(swatches.length)return;
    swatches=PRESET_COLORS.map(value=>{
      const swatch=document.createElement("button");swatch.type="button";
      swatch.setAttribute("aria-label",value);bindHelp(swatch,"text_color_pick");
      swatch.style.cssText=`appearance:none;width:16px;height:16px;min-width:0;min-height:0;margin:0;padding:0;border:1px solid #888;border-radius:0;background:${value};cursor:pointer`;
      swatch.addEventListener("click",()=>{
        const target=activeColor;
        if(target.control.value!==value){target.control.value=value;target.onChange();}
        closePresets();target.presets.focus({preventScroll:true});
      });
      grid.append(swatch);return swatch;
    });
  }
  popupHeader.append(popupTitle,close);popup.append(popupHeader,grid);
  popup.addEventListener("toggle",()=>{
    for(const row of colorRows)row.presets.setAttribute("aria-expanded",String(row===activeColor&&popup.matches(":popover-open")));
  });
  // All five color fields share one palette; opening it never writes a value.
  function makeColorRow(control,prefix,onChange,help="text_color_palette",fallback="#ffffff") {
    const row=document.createElement("div"),palette=document.createElement("input"),presets=document.createElement("button");
    row.className="moss-dialogue-color";row.style.alignItems="center";
    palette.type="color";palette.value=fallback;
    palette.setAttribute("aria-label",`${prefix} palette`);bindHelp(palette,help);
    presets.type="button";presets.className="moss-k2cf-btn";presets.textContent="▦";
    presets.style.cssText="flex:0 0 24px;width:24px;height:22px;padding:0;line-height:18px;font-size:18px";
    presets.setAttribute("aria-label",`${prefix} presets`);presets.setAttribute("aria-expanded","false");bindHelp(presets,"text_color_presets");
    presets.addEventListener("keydown",escapePresets);
    const field={row,control,palette,presets,onChange,fallback};colorRows.push(field);row.append(palette,presets,control);
    const choose=()=>{if(control.value!==palette.value){control.value=palette.value;onChange();}};
    palette.addEventListener("input",choose);palette.addEventListener("change",choose);palette.addEventListener("pointerdown",closePresets);
    presets.addEventListener("click",()=>{
      const wasActive=activeColor===field&&popup.matches(":popover-open");closePresets();if(wasActive)return;
      activeColor=field;createSwatches();refreshSwatches();popup.showPopover();
      const anchor=presets.getBoundingClientRect(),bounds=popup.getBoundingClientRect();
      popup.style.left=`${Math.max(4,Math.min(anchor.left,innerWidth-bounds.width-4))}px`;
      popup.style.top=`${Math.max(4,Math.min(anchor.bottom+4,innerHeight-bounds.height-4))}px`;
    });
    return row;
  }
  const colorRow=makeColorRow(color,`${slot} text style`,()=>{mode.value="individual";refresh();changed();});
  function refreshSwatches(){
    if(!swatches.length)return;
    const value=activeColor?.control.value.trim()||"",valid=value!==""&&CSS.supports("color",value);
    colorParser.fillStyle="#ffffff";colorParser.fillStyle=value;
    const parsed=colorParser.fillStyle;
    const name=activeColor?.row.parentElement?.firstElementChild?.textContent||"";
    popupTitle.textContent=`${name} · ${language()==="ja"?"プリセット色（256）":"Preset colors (256)"}`;
    swatches.forEach((swatch,i)=>{
      const selected=valid&&parsed.toLowerCase()===PRESET_COLORS[i];swatch.setAttribute("aria-pressed",String(selected));
      swatch.style.outline=selected?"2px solid white":"";swatch.style.outlineOffset="-3px";
    });
  }
  extra.rows=2;extra.className="moss-k2cf-text";extra.style.cssText="width:100%;min-height:42px;height:42px;box-sizing:border-box";
  const entries=[[mode,"mode","Text style","文字スタイル",modeItems],
    [font,"font","Typeface","書体",FONTS],[weight,"weight","Weight","太さ",WEIGHTS],
    [color,"color","Text color","文字色"],[extra,"extra","Additional description","補足"]];
  const heading=document.createElement("div");
  heading.style.cssText="display:flex;align-items:flex-end;gap:4px;min-width:0";
  element.append(heading);
  const labels=[];
  for(const [control,key,en,jp,items] of entries){
    control.setAttribute("aria-label",`${slot} text style ${key}`);bindHelp(control,helpKey);
    const label=document.createElement(key==="color"?"div":"label"),title=document.createElement("span");
    label.style.cssText="display:flex;flex-direction:column;gap:2px;min-width:0";
    if(key==="extra")label.style.gridColumn="1/-1";
    if(key==="mode")label.style.flex="1";
    label.append(title,key==="color"?colorRow:control);if(key==="mode")heading.append(label);
    labels.push({key,label,title,en,jp,control,items});
    control.addEventListener(control.tagName==="SELECT"?"change":"input",()=>{if(key!=="mode")mode.value="individual";else if(mode.value==="individual")bubble.details.open=true;refresh();changed();});
  }
  const bubble=mountSpeechBubble(slot,{language,makeColorRow,apply(){mode.value="individual";refresh();changed();}});
  const emoji=document.createElement("button");emoji.type="button";emoji.className="moss-k2cf-btn moss-emoji-button";emoji.textContent="😀";
  emoji.setAttribute("aria-label",`${slot} insert emoji`);bindHelp(emoji,"emoji");
  let picker=null,pickerLanguage='';
  emoji.addEventListener('pointerdown',event=>event.preventDefault());
  emoji.addEventListener('click',()=>{
    if(!prompt||prompt.readOnly)return;
    if(!picker||pickerLanguage!==language()){picker?.destroy();pickerLanguage=language();picker=createEmojiPicker(pickerLanguage==='ja');}
    picker.button(prompt).click();
  });
  emoji.style.cssText="box-sizing:border-box;height:22px;min-width:34px;padding:0 6px;flex:0 0 auto";
  heading.append(emoji);
  const own=Object.fromEntries(labels.map(({key,label})=>[key,label])),b=bubble.labels;
  bubble.grid.replaceChildren(own.color,b.bubbleFill,b.outline,b.bubbleStroke,b.shadow,b.bubbleWeight,
    own.font,own.weight,b.size,b.direction,b.structure,b.tail,own.extra);
  element.append(bubble.element,popup);
  function refresh(){
    const ja=language()==="ja";
    emoji.disabled=Boolean(prompt?.readOnly);
    if(prompt)prompt.dataset.jpAssistFormat=type()==="text"?"literal":"prompt";
    element.style.display=type()==="text"?"block":"none";
    if(type()!=="text")picker?.close();
    bubble.refresh();
    if(type()!=="text" || mode.value!=="individual")closePresets();
    for(const {title,en,jp,control,items} of labels){
      title.textContent=ja?jp:en;
      if(items)items.forEach((item,i)=>control.options[i].textContent=item[ja?2:1]);
    }
    for(const row of colorRows){
      row.control.placeholder=ja?"未指定":"Unset";
      colorParser.fillStyle=row.fallback;colorParser.fillStyle=row.control.value.trim();
      row.palette.value=/^#[0-9a-f]{6}$/i.test(colorParser.fillStyle)?colorParser.fillStyle:row.fallback;
    }
    refreshSwatches();
  }
  return {element,refresh,dispose(){picker?.destroy();closePresets();},
    get(){return {mode:mode.value,font:font.value,weight:weight.value,color:color.value,extra:bubble.get(extra.value)};},
    set(value){
      closePresets();
      const saved=value && typeof value==="object"?value:{};
      for(const [control,key,,,items] of entries){
        control.value=items ? (items.some(item=>item[0]===saved[key])?saved[key]:items[0][0])
          : typeof saved[key]==="string"?saved[key]:"";
      }
      extra.value=bubble.set(extra.value);
      refresh();
    },
  };
}
