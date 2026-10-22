// Isolated browser fixture; no live ComfyUI connection or model execution.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile, mkdir, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const artifacts = process.env.MOSS_TEST_ARTIFACTS || resolve(root, "tests/artifacts");
await mkdir(artifacts, {recursive:true});
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const fixture = `<!DOCTYPE html><meta charset="utf-8"><title>MOSS BBOX Preview fixture</title>
<style>body{background:#111;color:#ddd;font:14px sans-serif}main{display:flex;gap:20px}.host{width:420px;height:520px}</style>
<h2>MOSS BBOX Preview — synthetic CPU test image</h2><main></main>
<script type="module">
const extensions=[];window.app={registerExtension:e=>extensions.push(e),ui:{settings:{getSettingValue:()=>window.helpLocale||'en'}}};
await import('/web/moss_help.js');
class Node {
 constructor(){this.properties={};this.widgets=[];this.host=document.createElement('div');this.host.className='host';document.querySelector('main').append(this.host);this.onNodeCreated?.()}
 addDOMWidget(name,type,element,options){this.host.append(element);this.widgets.push({name,type,options});return this.widgets.at(-1)}
 setSize(size){this.size=size}setDirtyCanvas(){}
 save(){return JSON.parse(JSON.stringify({properties:this.properties,size:this.size}))}
 configure(data){this.properties=structuredClone(data.properties);this.size=data.size;this.onConfigure?.(data)}
 onExecuted(){this.previousHook=(this.previousHook||0)+1}
 onRemoved(){this.removed=true}
}
await import('/web/moss_preview.js');
for(const e of extensions)e.beforeRegisterNodeDef(Node,{name:'MOSSBBoxPreview'});
window.make=()=>new Node();window.node=make();
window.message=(filename='one.webp')=>({moss_bbox_preview:[{images:[{filename,subfolder:'',type:'temp'},{filename:'two.webp',subfolder:'',type:'temp'}],image_size:[320,480],layout:{width:640,height:960,boxes:[
 {slot:'red',x1:64,y1:96,x2:320,y2:480},
 {slot:'blue',x1:500.5,y1:800,x2:200.5,y2:400},
 {slot:'yellow',x1:80,y1:20,x2:560,y2:80}
]}}]});
window.node.onExecuted(message());window.ready=true;
</script>`;
const server = createServer(async (req,res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let body, mime = "text/javascript";
    if (url.pathname === "/") {body=fixture;mime="text/html";}
    else if (["/web/moss_preview.js","/web/preview_ui.mjs","/web/state.mjs","/web/help.mjs","/web/moss_help.js"].includes(url.pathname)) body=await readFile(resolve(root,url.pathname.slice(1)));
    else if(url.pathname==="/scripts/app.js") body="export const app=window.app;";
    else if(url.pathname==="/scripts/api.js") body="export const api={apiURL:path=>path};";
    else if(url.pathname==="/view") {
      const name=url.searchParams.get('filename');
      if(name==='missing.webp'){res.writeHead(404);res.end();return;}
      if(name==='slow.webp')await new Promise(resolve=>setTimeout(resolve,250));
      body=`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480"><rect width="320" height="480" fill="${name==='two.webp'?'#304050':'#303030'}"/><circle cx="96" cy="140" r="45" fill="#666"/><rect x="62" y="185" width="68" height="120" fill="#555"/><rect x="160" y="320" width="100" height="70" fill="#666"/></svg>`;
      mime="image/svg+xml";
    } else {res.writeHead(404);res.end();return;}
    res.setHeader("Content-Type",mime);res.end(body);
  }catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
console.log(JSON.stringify({fixture_pid:process.pid,port:server.address().port,launch:"node tests/preview_ui_browser.mjs",gpu:false}));
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:["--disable-gpu"]});
  const page=await browser.newPage({viewport:{width:920,height:760}});
  const errors=[], requests=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("request",request=>requests.push(request.url()));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>window.ready && document.querySelectorAll('svg rect').length===3);
  const host=page.locator('.host').first();
  const help = await page.evaluate(()=>{
    const elements=[...window.node.host.querySelectorAll('button,input')];
    window.helpLocale='ja';
    const japanese=elements.every(e=>{e.dispatchEvent(new Event('pointerenter'));return /[ぁ-んァ-ヶ一-龠]/.test(e.title)});
    const empty=window.make(); const guidance=empty.host.querySelector('[role=status]').textContent;
    empty.onRemoved();empty.host.remove();
    window.helpLocale='en';
    const english=elements.every(e=>{e.dispatchEvent(new Event('pointerenter'));return e.title && !/[ぁ-んァ-ヶ一-龠]/.test(e.title)});
    return {japanese,english,guidance};
  });
  assert(help.japanese && help.english);
  assert.match(help.guidance,/Load Image/);assert.match(help.guidance,/ここに画像/);
  console.log('Localized Preview help', JSON.stringify(help));
  const show=host.getByRole('checkbox',{name:'Show Boxes'});
  const opacity=host.getByRole('slider',{name:'Box opacity'});
  const overlay=host.locator('svg');
  assert.equal(await show.isChecked(),true);
  assert.equal(await overlay.getAttribute('viewBox'),'0 0 640 960');
  // Reversed/fractional coordinates normalize without touching the payload.
  assert.equal(await overlay.locator('rect').nth(1).getAttribute('x'),'200.5');
  assert.equal(await overlay.locator('rect').nth(1).getAttribute('width'),'300');
  const metrics=await overlay.locator('rect').first().boundingBox();
  const image=await host.locator('img').boundingBox();
  const hostBox=await host.boundingBox();
  assert(image.y+image.height <= hostBox.y+hostBox.height); // whole portrait fits
  // Playwright includes the non-scaling 2px stroke in SVG bounding boxes.
  assert(Math.abs((metrics.x+1-image.x)/image.width-0.1)<0.001);
  assert(Math.abs((metrics.width-2)/image.width-0.4)<0.001);
  assert(Math.abs((metrics.height-2)/image.height-0.4)<0.001);
  const before=requests.length;
  const src=await host.locator('img').getAttribute('src');
  await show.uncheck();
  assert.equal(await overlay.isVisible(),false);
  await opacity.fill('0.35');
  assert.equal(await overlay.evaluate(el=>el.style.opacity),'0.35');
  assert.equal(await host.locator('img').getAttribute('src'),src);
  assert.equal(requests.length,before); // no re-render/generation requests
  // OFF/opacity survive the next execution and JSON save/reload.
  await page.evaluate(()=>{window.saved=node.save();node.onExecuted(message('two.webp'))});
  await page.waitForFunction(()=>document.querySelector('img')?.src.includes('two.webp'));
  assert.equal(await show.isChecked(),false);
  assert.equal(await overlay.isVisible(),false);
  await page.evaluate(()=>{window.copy=make();copy.configure(saved);copy.onExecuted(message())});
  const copy=page.locator('.host').nth(1);
  await copy.locator('img').waitFor();
  assert.equal(await copy.getByRole('checkbox',{name:'Show Boxes'}).isChecked(),false);
  assert.equal(await copy.getByRole('slider',{name:'Box opacity'}).inputValue(),'0.35');
  assert.equal(await copy.locator('svg').isVisible(),false);
  assert.equal(await page.evaluate(()=>node.widgets[0].options.serialize),false);
  await show.check();await opacity.fill('1');
  assert.equal(await overlay.isVisible(),true);
  // Changing the original message afterwards cannot change the displayed snapshot.
  await page.evaluate(()=>{const m=message();node.onExecuted(m);m.moss_bbox_preview[0].layout.boxes[0].x1=999});
  await page.waitForFunction(()=>document.querySelector('svg rect')?.getAttribute('x')==='64');
  await host.getByRole('button',{name:'Next image'}).click();
  await page.waitForFunction(()=>document.querySelector('img')?.src.includes('two.webp'));
  assert(await host.getByRole('button',{name:'Next image'}).isDisabled());
  await host.getByRole('button',{name:'Previous image'}).click();
  await page.waitForFunction(()=>document.querySelector('img')?.src.includes('one.webp'));
  assert(await host.getByRole('button',{name:'Previous image'}).isDisabled());
  // Late loading results cannot replace a newer execution.
  await page.evaluate(()=>{node.onExecuted(message('slow.webp'));node.onExecuted(message('two.webp'))});
  await page.waitForFunction(()=>document.querySelector('img')?.src.includes('two.webp'));
  await page.waitForTimeout(350);
  assert((await host.locator('img').getAttribute('src')).includes('two.webp'));
  await page.evaluate(()=>{node.host.style.width='620px'});
  const resized=await host.locator('svg rect').first().boundingBox();
  const resizedImage=await host.locator('img').boundingBox();
  assert(Math.abs((resized.width-2)/resizedImage.width-0.4)<0.001);
  await page.evaluate(()=>{node.host.style.width='420px'});
  await host.screenshot({path:resolve(artifacts,'bbox-preview-on.jpg'),type:'jpeg',quality:85});
  await show.uncheck();
  await host.screenshot({path:resolve(artifacts,'bbox-preview-off.jpg'),type:'jpeg',quality:85});
  await page.evaluate(()=>node.onExecuted(message('missing.webp')));
  await host.getByRole('status').filter({hasText:'unavailable'}).waitFor();
  assert.equal(await host.locator('img').count(),0);
  await page.evaluate(()=>{const m=message();m.moss_bbox_preview[0].layout.boxes=[];node.onExecuted(m)});
  await host.getByRole('status').filter({hasText:'0 boxes'}).waitFor();
  assert.equal(await overlay.locator('rect').count(),0);
  await page.evaluate(()=>{copy.onExecuted(message('slow.webp'));copy.onRemoved()});
  await page.waitForTimeout(350);
  assert.equal(await copy.locator('.moss-bbox-preview').count(),0);
  assert.equal(await page.evaluate(()=>copy.removed),true);
  assert.equal(await page.evaluate(()=>node.previousHook>1),true);
  assert.deepEqual(errors,[]);
  const result={default_on:true,toggle_without_requests:true,opacity:true,next_execution_keeps_off:true,
    save_reload:true,batch_navigation:true,coordinate_scaling:true,reversed_fractional:true,resize:true,
    execution_snapshot:true,stale_image_guard:true,image_error:true,empty_layout:true,removed_cleanup:true,
    original_hooks:true,page_errors:errors,gpu:false};
  await writeFile(resolve(artifacts,'bbox-preview-checks.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({fixture_stopped:true,http_listening:server.listening}));
}
