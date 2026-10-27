import {DIALOGUE_OPTIONS} from './dialogue_options.mjs?v=20261028-dialogue1';
import {bindHelp} from './help.mjs?v=1.0.11';

const KINDS=[['speech','Speech bubble','セリフ・吹き出し','White speech bubble with a black outline, containing spoken dialogue.'],
  ['thought','Thought bubble','心の声・雲形','White cloud-shaped thought bubble with a black outline, containing inner thoughts.'],
  ['shout','Shout bubble','叫び・トゲ形','White spiky speech bubble with a black outline, containing shouted dialogue.']];
const DIRECTIONS=[['auto','Auto','自動',''],['horizontal','Horizontal','横書き','Horizontal lettering, read from left to right.'],
  ['vertical','Vertical','縦書き','Vertical lettering, glyphs from top to bottom and columns from right to left.']];

// Ordinary appearance prose lives in the existing extra field; no new wire format.
export function readBubbleDescription(extra='') {
  const lines=String(extra).split('\n'),kind=KINDS.find(item=>item[3]===lines[0]);
  if(!kind)return {kind:'speech',direction:'auto',speaker:'',rest:String(extra)};
  lines.shift();
  const direction=DIRECTIONS.find(item=>item[3]&&item[3]===lines[0]);
  if(direction)lines.shift();
  const match=/^The (?:bubble's tail|thought bubble's small connecting bubbles) points? toward (.+)\.$/.exec(lines[0]||'');
  if(match)lines.shift();
  if(lines[0]==='')lines.shift();
  return {kind:kind[0],direction:direction?.[0]||'auto',speaker:match?.[1]||'',rest:lines.join('\n')};
}
export function bubbleDescription({kind='speech',direction='auto',speaker=''},extra='') {
  const shape=KINDS.find(item=>item[0]===kind)||KINDS[0],writing=DIRECTIONS.find(item=>item[0]===direction)||DIRECTIONS[0];
  const target=String(speaker).replace(/[\r\n]+/g,' ').trim();
  const relation=target?(kind==='thought'?`The thought bubble's small connecting bubbles point toward ${target}.`:`The bubble's tail points toward ${target}.`):'';
  const rest=readBubbleDescription(extra).rest;
  return [shape[3],writing[3],relation].filter(Boolean).join('\n')+(rest?'\n\n'+rest:'');
}

const FREE_FIELDS={outline:['Letter outline','文字の縁取り色','Letter outline color'],shadow:['Letter shadow','文字の影色','Letter shadow color'],bubbleFill:['Bubble fill','吹き出しの塗り','Bubble fill color'],bubbleStroke:['Bubble border','吹き出しの輪郭色','Bubble border color'],tail:['Tail / speaker','しっぽ・話者','Tail / speaker']};

export function readDialogueDescription(extra='') {
  const value={};let lines=String(extra).split('\n'),found=false;
  const old=readBubbleDescription(extra);
  if(KINDS.some(item=>item[3]===lines[0])) {
    value.role=old.kind==='thought'?'thought':'speech';value.shape=old.kind==='thought'?'cloud':old.kind==='shout'?'spiky':'oval';
    value.direction=old.direction;value.tail=old.speaker;
    return {value,rest:old.rest};
  }
  for(const [key,items] of Object.entries(DIALOGUE_OPTIONS)) {
    const item=items.find(item=>item[0]!=='auto'&&item[3]===lines[0]);
    if(item){value[key]=item[0];lines.shift();found=true;}
  }
  for(const [key,[,,prefix]] of Object.entries(FREE_FIELDS)) {
    if(lines[0]?.startsWith(prefix+': ')&&lines[0].endsWith('.')){value[key]=lines.shift().slice(prefix.length+2,-1);found=true;}
  }
  if(found&&lines[0]==='')lines.shift();
  return {value,rest:found?lines.join('\n'):String(extra)};
}
export function dialogueDescription(value={},rest='') {
  const lines=[];
  for(const [key,items] of Object.entries(DIALOGUE_OPTIONS)) {
    const item=items.find(item=>item[0]===value[key]);if(item&&item[0]!=='auto'&&item[3])lines.push(item[3]);
  }
  for(const [key,[,,prefix]] of Object.entries(FREE_FIELDS)) {
    const text=String(value[key]||'').replace(/[\r\n]+/g,' ').trim();if(text)lines.push(`${prefix}: ${text}.`);
  }
  return lines.join('\n')+(lines.length&&rest?'\n\n':'')+rest;
}

// Editor controls compile to the existing appearance field, separately from literal text.
export function mountSpeechBubble(slot,{language,apply}) {
  const element=document.createElement('div');element.className='moss-speech-bubble';
  const quick=document.createElement('div');quick.className='moss-dialogue-grid';
  const details=document.createElement('details'),summary=document.createElement('summary'),grid=document.createElement('div');
  details.className='moss-dialogue-details';bindHelp(summary,'speech_bubble');grid.className='moss-dialogue-grid';details.append(summary,grid);element.append(quick,details);
  const titles={role:['Usage','用途'],shape:['Shape','形状'],structure:['Structure','構造'],size:['Letter size','文字の大きさ'],direction:['Writing direction','文字方向'],bubbleWeight:['Border weight','輪郭の太さ']};
  const controls={},labels=[];let original='',baseline='',notes='';
  function field(key,en,jp,items) {
    const label=document.createElement('label'),title=document.createElement('span'),control=document.createElement(items?'select':'input');
    label.append(title,control);(key==='role'||key==='shape'?quick:grid).append(label);
    control.className=items?'moss-k2cf-select':'moss-k2cf-num';control.setAttribute('aria-label',`${slot} dialogue ${key}`);bindHelp(control,`dialogue_${key}`);
    for(const [value,,text] of items||[]){const option=document.createElement('option');option.value=value;option.textContent=text;control.append(option);}
    control.addEventListener(items?'change':'input',()=>{refresh();apply();});
    controls[key]=control;labels.push({title,en,jp,control,items});
    if(!items&&key!=='tail'){
      const picker=document.createElement('input');picker.type='color';picker.value='#000000';picker.setAttribute('aria-label',`${slot} dialogue ${key} palette`);bindHelp(picker,`dialogue_${key}`);
      picker.addEventListener('input',()=>{control.value=picker.value;refresh();apply();});const row=document.createElement('div');row.className='moss-dialogue-color';row.append(picker,control);label.append(row);labels.at(-1).picker=picker;
    }
  }
  for(const [key,items] of Object.entries(DIALOGUE_OPTIONS))field(key,...titles[key],items);
  for(const [key,[en,jp]] of Object.entries(FREE_FIELDS))field(key,en,jp);
  const current=()=>Object.fromEntries(Object.entries(controls).map(([key,control])=>[key,control.value]));
  function refresh(){
    const ja=language()==='ja';summary.textContent=ja?'文字・吹き出し':'Lettering / Bubbles';
    for(const item of labels){if(item.picker)item.picker.value=/^#[0-9a-f]{6}$/i.test(item.control.value)?item.control.value:'#000000';item.title.textContent=ja?item.jp:item.en;item.items?.forEach((row,i)=>item.control.options[i].textContent=row[ja?1:2]);}
    controls.tail.placeholder=ja?'話者・方向':'Speaker / direction';
  }
  return {element,details,grid,refresh,
    get(rest){return JSON.stringify({value:current(),rest})===baseline?original:dialogueDescription(current(),rest);},
    set(extra){original=String(extra||'');const parsed=readDialogueDescription(original);notes=parsed.rest;
      for(const [key,control] of Object.entries(controls))control.value=parsed.value[key]||(DIALOGUE_OPTIONS[key]?'auto':'');
      baseline=JSON.stringify({value:current(),rest:notes});refresh();return notes;}
  };
}
