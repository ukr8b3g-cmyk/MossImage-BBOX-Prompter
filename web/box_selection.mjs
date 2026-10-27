import {overlappingBoxes} from './canvas_editing.mjs?v=20261027-simple4';
import {bindHelp} from './help.mjs?v=1.0.11';

export function mountBoxSelectionMenu(overlay,{boxes,point,select,color,language}) {
  let menu=null;
  const close=()=>{menu?.remove();menu=null;};
  const outside=event=>{if(menu&&!menu.contains(event.target))close();};
  const escape=event=>{if(menu&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close();overlay.focus({preventScroll:true});}};
  const open=event=>{
    close();const all=boxes(),hits=overlappingBoxes(all,point(event));
    if(!hits.length)return;
    event.preventDefault();event.stopPropagation();
    menu=document.createElement('div');menu.className='moss-box-selection-menu';menu.setAttribute('role','menu');
    menu.setAttribute('aria-label',language()==='ja'?'重なった枠を選択':'Select overlapping box');
    menu.style.cssText='position:fixed;z-index:10000;min-width:210px;max-width:calc(100vw - 8px);max-height:60vh;overflow:auto;background:#222;border:1px solid #888;border-radius:5px;padding:4px;box-shadow:0 3px 12px #0008;font:12px sans-serif';
    const items=hits.map(box=>{
      const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');
      button.style.cssText=`display:block;width:100%;text-align:left;padding:7px;background:#222;border:0;border-left:4px solid ${color(box.slot)};color:#eee;cursor:pointer;overflow-wrap:anywhere`;
      const label=box.promptData?.name||(/^box_\d+_\d+$/.test(box.id)?'':box.id);
      button.textContent=`#${all.indexOf(box)+1}${label?' · '+label:''} · ${box.slot.toUpperCase()}${box.locked?' 🔒':''}`;
      bindHelp(button,'select_overlap');
      button.onclick=()=>{select(box.id);close();overlay.focus({preventScroll:true});};menu.append(button);return button;
    });
    menu.addEventListener('keydown',event=>{
      if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
      event.preventDefault();event.stopPropagation();
      const index=items.indexOf(document.activeElement);items[(index+(event.key==='ArrowDown'?1:items.length-1))%items.length].focus();
    });
    document.body.append(menu);const rect=menu.getBoundingClientRect();
    menu.style.left=`${Math.max(4,Math.min(event.clientX,window.innerWidth-rect.width-4))}px`;
    menu.style.top=`${Math.max(4,Math.min(event.clientY,window.innerHeight-rect.height-4))}px`;items[0].focus();
  };
  overlay.addEventListener('contextmenu',open);document.addEventListener('pointerdown',outside,true);window.addEventListener('keydown',escape,true);
  window.addEventListener('blur',close);document.addEventListener('visibilitychange',close);
  return {dispose(){close();overlay.removeEventListener('contextmenu',open);document.removeEventListener('pointerdown',outside,true);window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',close);document.removeEventListener('visibilitychange',close);}};
}
