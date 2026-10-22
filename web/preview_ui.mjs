import { SLOTS } from "./state.mjs";
import { bindHelp, helpText } from "./help.mjs";

const colors = new Map(SLOTS);
const svgNS = "http://www.w3.org/2000/svg";

export function previewPreferences(value = {}) {
  return {
    showBoxes: value?.showBoxes !== false,
    opacity: typeof value?.opacity === "number" && Number.isFinite(value.opacity)
      ? Math.max(0, Math.min(1, value.opacity)) : 0.8,
  };
}

// View-only controls: never write Canvas widgets, image pixels or graph inputs.
export function mountPreview(node, imageURL) {
  const root = document.createElement("div");
  root.className = "moss-bbox-preview";
  root.style.cssText = "display:flex;flex-direction:column;gap:6px;background:#171717;color:#ddd;padding:8px;box-sizing:border-box;width:100%;height:100%;overflow:auto;font:12px sans-serif";
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0";
  const label = document.createElement("label");
  const show = document.createElement("input");
  show.type = "checkbox";
  show.setAttribute("aria-label", "Show Boxes");
  label.append(show, " Show Boxes");
  const opacityLabel = document.createElement("label");
  opacityLabel.style.cssText = "display:flex;align-items:center;gap:4px";
  const opacity = document.createElement("input");
  opacity.type = "range";
  opacity.min = "0";
  opacity.max = "1";
  opacity.step = "0.05";
  opacity.style.width = "90px";
  opacity.setAttribute("aria-label", "Box opacity");
  const percent = document.createElement("span");
  percent.style.minWidth = "30px";
  opacityLabel.append("Opacity ", opacity, percent);
  const previous = document.createElement("button");
  previous.textContent = "‹";
  previous.setAttribute("aria-label", "Previous image");
  const next = document.createElement("button");
  next.textContent = "›";
  next.setAttribute("aria-label", "Next image");
  const count = document.createElement("span");
  for (const [el, key] of [[label,"preview_show"], [show,"preview_show"], [opacityLabel,"preview_opacity"], [opacity,"preview_opacity"], [previous,"previous"], [next,"next"]]) bindHelp(el, key);
  toolbar.append(label, opacityLabel, previous, count, next);
  const status = document.createElement("div");
  status.setAttribute("role", "status");
  status.style.cssText = "font-size:11px;color:#aaa;flex-shrink:0";
  const stage = document.createElement("div");
  stage.style.cssText = "position:relative;width:100%;flex:1;min-height:80px;line-height:0;overflow:hidden";
  const frame = document.createElement("div");
  frame.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)";
  const overlay = document.createElementNS(svgNS, "svg");
  overlay.setAttribute("preserveAspectRatio", "none");
  overlay.setAttribute("aria-label", "Canvas BBOX overlay");
  overlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  bindHelp(status, "preview_info");
  root.append(toolbar, status, stage);
  let payload = null, index = 0, revision = 0, disposed = false, activeImage = null;
  function fitImage() {
    if (!activeImage) return;
    const scale = Math.min(stage.clientWidth / activeImage.naturalWidth, stage.clientHeight / activeImage.naturalHeight);
    frame.style.width = `${activeImage.naturalWidth * scale}px`;
    frame.style.height = `${activeImage.naturalHeight * scale}px`;
  }
  const observer = new ResizeObserver(fitImage);
  observer.observe(stage);

  function preferences() {
    const prefs = previewPreferences(node.properties?.mossBBoxPreview);
    show.checked = prefs.showBoxes;
    opacity.value = String(prefs.opacity);
    percent.textContent = `${Math.round(prefs.opacity * 100)}%`;
    overlay.style.display = prefs.showBoxes ? "" : "none";
    overlay.style.opacity = String(prefs.opacity);
  }
  function savePreferences() {
    node.properties ??= {};
    node.properties.mossBBoxPreview = {showBoxes: show.checked, opacity: Number(opacity.value)};
    preferences();
    node.setDirtyCanvas?.(true, true);
  }
  show.addEventListener("change", savePreferences);
  opacity.addEventListener("input", savePreferences);
  // Let native form controls handle their keys without moving the graph.
  root.addEventListener("pointerdown", event => event.stopPropagation());
  root.addEventListener("keydown", event => event.stopPropagation());

  function displayImage() {
    const ticket = ++revision;
    const images = payload?.images || [];
    previous.disabled = index <= 0;
    next.disabled = index >= images.length - 1;
    count.textContent = images.length ? `${index + 1} / ${images.length}` : "0 / 0";
    stage.replaceChildren();
    activeImage = null;
    overlay.replaceChildren();
    preferences();
    if (!images.length) {
      status.textContent = helpText("preview_empty");
      return;
    }
    status.textContent = "Loading preview…";
    const img = document.createElement("img");
    img.alt = "Generated image (unmodified)";
    img.style.cssText = "display:block;width:100%;height:100%";
    img.onload = () => {
      if (disposed || ticket !== revision) return;
      const {width, height, boxes} = payload.layout;
      overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
      for (const [i, box] of boxes.entries()) {
        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("x", Math.min(box.x1, box.x2));
        rect.setAttribute("y", Math.min(box.y1, box.y2));
        rect.setAttribute("width", Math.abs(box.x2 - box.x1));
        rect.setAttribute("height", Math.abs(box.y2 - box.y1));
        rect.setAttribute("fill", "none");
        rect.setAttribute("stroke", colors.get(box.slot));
        rect.setAttribute("stroke-width", "2");
        rect.setAttribute("vector-effect", "non-scaling-stroke");
        const title = document.createElementNS(svgNS, "title");
        title.textContent = `${box.slot} ${i + 1}`;
        rect.append(title);
        overlay.append(rect);
      }
      frame.replaceChildren(img, overlay);
      stage.replaceChildren(frame);
      activeImage = img;
      fitImage();
      const [imageWidth, imageHeight] = payload.image_size;
      const scaled = width !== imageWidth || height !== imageHeight;
      status.textContent = `${boxes.length} boxes · Layout ${width} × ${height} · Image ${imageWidth} × ${imageHeight}${scaled ? " · scaled to image" : ""}`;
      status.title = helpText("preview_info");
    };
    img.onerror = () => {
      if (disposed || ticket !== revision) return;
      status.textContent = "Preview image unavailable. Temporary images may have been cleared; run again to refresh.";
    };
    img.src = imageURL(images[index]);
  }
  previous.onclick = () => { if (index > 0) { index--; displayImage(); } };
  next.onclick = () => { if (index < (payload?.images.length || 0) - 1) { index++; displayImage(); } };
  displayImage();
  return {
    element: root,
    configure: preferences,
    executed(message) {
      const result = message?.moss_bbox_preview?.[0];
      if (!result || disposed) return;
      // Pair this image with this execution's layout, not subsequent Canvas edits.
      payload = structuredClone(result);
      index = 0;
      displayImage();
    },
    dispose() { disposed = true; revision++; observer.disconnect(); root.remove(); },
  };
}
