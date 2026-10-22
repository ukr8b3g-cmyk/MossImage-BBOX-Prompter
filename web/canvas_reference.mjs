import { bindHelp } from "./help.mjs";

export function containImage(width, height, imageWidth, imageHeight) {
  const scale = Math.min(width / imageWidth, height / imageHeight);
  return [(width - imageWidth * scale) / 2, (height - imageHeight * scale) / 2,
    imageWidth * scale, imageHeight * scale];
}

// Only the standard Load Image IMAGE output can be read without executing a graph.
export function connectedReference(node) {
  const input = node.inputs?.find(i => i.name === "reference_image");
  const graph = node.graph;
  const link = graph?.links?.get?.(input?.link) ?? graph?.links?.[input?.link];
  if (!link) return null;
  const source = graph.getNodeById?.(link.origin_id);
  const key = `${link.origin_id}:${link.origin_slot}`;
  if ((source?.comfyClass || source?.type) !== "LoadImage" || link.origin_slot !== 0)
    return {key};
  const value = source.widgets?.find(w => w.name === "image")?.value;
  if (typeof value !== "string" || !value.trim()) return {key};
  const match = value.match(/\s*\[(input|output|temp)\]\s*$/);
  const path = (match ? value.slice(0, match.index) : value).replaceAll("\\", "/");
  const slash = path.lastIndexOf("/");
  const image = {filename: path.slice(slash + 1), subfolder: path.slice(0, Math.max(0, slash)), type: match?.[1] || "input"};
  return {key: `${key}:${JSON.stringify(image)}`, image};
}

export function mountCanvasReference(node, {url, redraw, fitSize, canFit, language}) {
  const element = document.createElement("div");
  element.className = "moss-k2cf-rowline";
  element.style.cssText = "padding:3px 6px;min-height:24px;flex-wrap:wrap";
  const toggle = document.createElement("button"), fit = document.createElement("button");
  toggle.className = fit.className = "moss-k2cf-btn";
  toggle.style.width = "106px";
  for (const target of [toggle,fit]) {
    target.contentEditable = "true"; target.spellcheck = false;
    target.dataset.mossCanvasShortcut = "true";
    target.addEventListener("beforeinput", ev => ev.preventDefault());
    target.addEventListener("paste", ev => ev.preventDefault());
    target.addEventListener("pointerdown", ev => ev.stopPropagation());
  }
  toggle.setAttribute("aria-label", "Show reference image");
  fit.setAttribute("aria-label", "Match reference image size");
  const label = document.createElement("label"), opacity = document.createElement("input");
  label.style.cssText = "display:flex;align-items:center;gap:4px";
  const caption = document.createElement("span");
  caption.style.cssText = "display:inline-block;width:82px;white-space:nowrap";
  opacity.type = "range"; opacity.min = "0"; opacity.max = "100"; opacity.step = "1";
  opacity.style.width = "72px"; opacity.setAttribute("aria-label", "Reference opacity");
  const status = document.createElement("span");
  status.style.cssText = "font-size:10px;opacity:.8;width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
  status.setAttribute("role", "status");
  label.append(caption, opacity); element.append(toggle, fit, label, status);
  for (const [el,key] of [[toggle,"reference_show"],[fit,"reference_fit"],[opacity,"reference_opacity"],[status,"reference_image"]]) bindHelp(el,key);
  let shown = false, image = null, size = null, sourceKey = null, loading = false, failed = false;
  let request = 0, disposed = false, executed = null;
  const persist = () => {
    node.properties ||= {};
    node.properties.mossReference = {show: shown, opacity: Number(opacity.value)};
    node.setDirtyCanvas?.(true,true);
  };
  function labels() {
    const ja = language() === "ja";
    toggle.textContent = `${ja ? "参照画像" : "Reference"} ${shown ? "ON" : "OFF"}`;
    toggle.classList.toggle("primary",shown); toggle.setAttribute("aria-pressed",String(shown));
    fit.textContent = ja ? "画像サイズに合わせる" : "Match image size";
    fit.disabled = !image || !size || !canFit() || size.some(n => n < 1 || n > 16384);
    caption.textContent = `${ja ? "不透明度" : "Opacity"} ${opacity.value}%`;
    status.textContent = loading ? (ja ? "読込中" : "Loading") : failed ? (ja ? "画像を読み込めません" : "Image unavailable")
      : size ? `${size[0]} × ${size[1]}` : (ja ? "Load Imageを接続" : "Connect Load Image");
  }
  function load(payload, key) {
    const token = ++request;
    sourceKey = key; image = null; size = null; failed = false; loading = !!payload;
    labels(); redraw();
    if (!payload) return;
    const next = new Image();
    next.onload = () => {
      if (disposed || token !== request) return;
      image = next; size = payload.size || [next.naturalWidth,next.naturalHeight];
      loading = false; labels(); redraw();
    };
    next.onerror = () => {if (disposed || token !== request) return; loading = false; failed = true; labels(); redraw();};
    next.src = url(payload.image);
  }
  function refresh() {
    const source = connectedReference(node);
    if (!source) { executed = null; if (sourceKey !== null) load(null,null); }
    else if (source.image) {if (source.key !== sourceKey) load(source,source.key);}
    else if (executed?.key === source.key) {
      if (sourceKey !== executed.id) load(executed.payload,executed.id);
    } else if (sourceKey !== source.key) {executed = null; load(null,source.key);}
    labels();
  }
  toggle.addEventListener("click", () => {shown = !shown; persist(); refresh(); redraw();});
  opacity.addEventListener("input", () => {persist(); labels(); redraw();});
  fit.addEventListener("click", () => {
    refresh();
    if (fit.disabled) return;
    // Native MOSS dimensions are multiples of 16, including odd-size source images.
    fitSize(...size.map(n => Math.min(16384,Math.max(16,Math.round(n / 16) * 16))));
    labels();
  });
  const timer = setInterval(refresh,500);
  return {
    element, labels,
    configure() {
      const saved = node.properties?.mossReference;
      shown = saved?.show === true;
      opacity.value = String(Number.isFinite(saved?.opacity) ? Math.min(100,Math.max(0,saved.opacity)) : 50);
      executed = null; sourceKey = null; ++request; image = null; size = null;
      refresh(); labels(); redraw();
    },
    executed(message) {
      const payload = message?.moss_canvas_reference?.[0], source = connectedReference(node);
      if (!source || source.image || !payload?.image || !Array.isArray(payload.size)
        || payload.size.length !== 2 || !payload.size.every(n => Number.isFinite(n) && n > 0)) return;
      executed = {key:source.key,id:`${source.key}:${JSON.stringify(payload)}`,payload}; refresh();
    },
    draw(ctx,width,height) {
      if (!shown || !image || !size) return;
      ctx.save(); ctx.globalAlpha = Number(opacity.value) / 100;
      ctx.drawImage(image,...containImage(width,height,...size)); ctx.restore();
    },
    dispose() {disposed = true; ++request; clearInterval(timer); image = null;},
  };
}
