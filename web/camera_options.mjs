export const NEW_ANGLES=['Rear 3/4 right','Rear 3/4 left','Voyeur low angle'];
export const FOCUS_ITEMS=[['Auto','指定なし'],['Face','顔'],['Eyes','目元'],['Mouth','口元'],['Hands','手・指'],['Feet','足元'],
  ['Upper torso','肩・胸元'],['Back','背中'],['Clothing details','衣服の細部'],['Accessories','アクセサリー'],['Object detail','物体の細部'],
  ['Breasts','胸'],['Crotch','股間']];
export const FOCUS_OPTIONS=FOCUS_ITEMS.map(item=>item[0]);
export function normalizeFocus(value='Auto') {
  if(typeof value!=='string'||!FOCUS_OPTIONS.includes(value))throw new Error(`Invalid Focus: ${String(value)}`);
  return value;
}
export function localizeCameraSelect(select,language) {
  const labels=Object.fromEntries([...FOCUS_ITEMS,['Rear 3/4 right','右斜め後ろ'],['Rear 3/4 left','左斜め後ろ'],['Voyeur low angle','覗き見るローアングル']]);
  for(const option of select.options)option.textContent=language==='ja'?(labels[option.value]||option.value):option.value;
}
export function presetFocus(preset,current) {
  return Object.hasOwn(preset,'focus')?normalizeFocus(preset.focus):normalizeFocus(current);
}
