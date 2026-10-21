// Canvas interaction adapted from Krea2-BBOX-Prompter, MIT (c) 2026 ukr8b3g-cmyk.
import { SLOTS, LABELS, parseState, buildPrompt, resizeState, normalizedBox, hitTest, dragBox, clone } from "./state.mjs";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const colors = Object.fromEntries(SLOTS);

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function installStyle() {
  if (document.getElementById("moss-bbox-style")) return;
  const style = element("style");
  style.id = "moss-bbox-style";
  style.textContent = `
    .moss-bbox { box-sizing:border-box; font:12px/1.4 system-ui,sans-serif; color:#e8e9ed; background:#20242d;
      padding:12px; border-radius:8px; overflow:auto; height:100%; min-height:500px; width:100%; }
    .moss-bbox * { box-sizing:border-box; }
    .moss-bbox .moss-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin:6px 0; }
    .moss-bbox .moss-columns { display:grid; grid-template-columns:minmax(180px,1fr) minmax(220px,1fr); gap:12px; }
    .moss-bbox textarea, .moss-bbox input, .moss-bbox select { background:#131720; color:#f5f5f5; border:1px solid #51596a;
      border-radius:4px; padding:5px; font:inherit; min-width:0; }
    .moss-bbox textarea { width:100%; display:block; resize:vertical; min-height:48px; margin:4px 0 9px; }
    .moss-bbox button { border:1px solid #687285; background:#363e4d; color:#fff; padding:5px 8px;
      border-radius:4px; cursor:pointer; font:inherit; }
    .moss-bbox button[aria-pressed=true] { outline:2px solid #fff; background:#475971; }
    .moss-bbox button:disabled { opacity:.4; cursor:default; }
    .moss-bbox .moss-slot { border-left:4px solid var(--slot-color); padding-left:7px; }
    .moss-bbox .moss-slot button { border-color:var(--slot-color); }
    .moss-bbox .moss-size input { width:80px; }
    .moss-bbox .moss-coordinates { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
    .moss-bbox .moss-coordinates input { width:100%; }
    .moss-bbox .moss-note { color:#b7c3d4; margin:6px 0; white-space:pre-wrap; }
    .moss-bbox .moss-warning { color:#ffce88; white-space:pre-wrap; }
    .moss-bbox .moss-error { color:#ff9999; white-space:pre-wrap; }
    .moss-bbox canvas { display:block; width:100%; height:auto; background:#12161f; touch-action:none; outline:none; }
    .moss-bbox canvas:focus { box-shadow:0 0 0 2px #9dcaff; }
    .moss-bbox .moss-output { min-height:150px; font:11px/1.4 ui-monospace,monospace; }
    .moss-bbox summary { cursor:pointer; margin:9px 0; }
    .moss-bbox label { display:block; }
    .moss-bbox .moss-selected { border:1px solid #4c5668; border-radius:5px; padding:8px; margin:8px 0; }
    .moss-bbox.moss-split { background:#252525; border:1px solid #454545; border-radius:0; padding:8px;
      font:12px/1.35 Arial,sans-serif; color:#eee; }
    .moss-split textarea,.moss-split input,.moss-split select { background:#171717; border-color:#484848; border-radius:2px; }
    .moss-split button { background:#3a3a3a; border-color:#555; border-radius:2px; padding:4px 7px; }
    .moss-split .moss-columns { display:block; }
    .moss-split .moss-note { color:#b4b4b4; font-size:11px; }
    .moss-split .moss-row { gap:5px; margin:4px 0; }
    .moss-split .moss-slot { border:1px solid #424242; border-radius:4px; background:#202020; padding:6px; margin:7px 0; }
    .moss-split .moss-slot summary { color:#fff; font-weight:bold; margin:0; padding:2px 0; }
    .moss-split .moss-slot textarea { min-height:100px; margin:6px 0 0; }
    .moss-split .moss-slot button { padding:0; border:0; background:none; font-weight:bold; }
    .moss-dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:6px; background:var(--slot-color); }
    .moss-canvas-toolbar { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:7px; }
    .moss-canvas-toolbar button.moss-swatch { width:19px; height:19px; padding:0; border:1px solid #aaa; }
    .moss-canvas-toolbar button.moss-swatch[aria-pressed=true] { outline:2px solid #fff; }
    .moss-split canvas { background:#191d1d; border:1px solid #454545; }
    .moss-split .moss-slot > label { font-size:10px; color:#aaa; margin-top:5px; }
    .moss-size-footer { border:1px solid #454545; background:#202020; padding:7px; margin-top:8px; }
    .moss-section-title { color:#74d6d0; font-size:10px; font-weight:bold; letter-spacing:.4px; margin-bottom:5px; }
    .moss-scene-label { display:block; font-weight:bold; margin:0 0 4px; }
    .moss-connection { font-size:11px; color:#96cfc8; margin:0 0 8px; }
  `;
  document.head.append(style);
}

export function createEditor(node, widget, options = {}) {
  installStyle();
  const mode = options.mode ?? "combined", split = mode !== "combined";
  const root = element("div", "moss-bbox");
  if (split) root.classList.add("moss-split", `moss-${mode}`);
  root.setAttribute("aria-label", mode === "canvas" ? "MOSS BBOX Canvas" : mode === "prompt" ? "MOSS BBOX Prompter" : "MOSS BBOX editor");
  const error = element("div", "moss-error");
  let gesture = null, disposed = false;
  const readLocal = () => parseState(widget.value);
  const read = () => {
    const local = readLocal();
    if (mode !== "prompt") return local;
    const canvas = options.getCanvas?.();
    const layout = canvas ? parseState(canvas) : parseState({ ...local, boxes: [] });
    layout.prompt = local.prompt; layout.slots = local.slots;
    layout.settings.auto_position = local.settings.auto_position;
    return layout;
  };
  const selected = state => state.boxes.find(box => box.id === state.settings.selected_id);
  const graph = () => node.graph;
  function beginChange() {
    const target = graph();
    target?.canvasAction?.(canvas => canvas.emitBeforeChange?.());
    target?.beforeChange?.();
    return target;
  }
  function endChange(target) {
    target?.afterChange?.();
    target?.canvasAction?.(canvas => canvas.emitAfterChange?.());
  }
  function commit(next, transaction = true) {
    const serialized = JSON.stringify(parseState(next));
    if (serialized === widget.value) return;
    const target = transaction ? beginChange() : null;
    widget.value = serialized;
    if (transaction) endChange(target);
    node.setDirtyCanvas?.(true, true);
    render();
    options.onChange?.();
  }
  function change(callback) {
    try { const next = readLocal(); callback(next); commit(next); error.textContent = ""; }
    catch (err) { error.textContent = err.message; }
  }
  function button(text, action, parent) {
    const result = element("button", "", text);
    result.type = "button";
    result.addEventListener("click", action);
    parent?.append(result);
    return result;
  }
  function field(text, control, parent) {
    const label = element("label", "", text);
    control.id = `moss-${globalThis.crypto.randomUUID()}`;
    label.htmlFor = control.id;
    parent.append(label, control);
    return control;
  }
  function textInput(text, parent, action, rows = 2) {
    const input = element("textarea"); input.rows = rows;
    field(text, input, parent);
    input.addEventListener("input", () => action(input.value));
    return input;
  }

  const sizeRow = element("div", "moss-row moss-size");
  const width = element("input"), height = element("input");
  for (const input of [width, height]) { input.type = "number"; input.min = "16"; input.max = "16384"; input.step = "16"; }
  field("Width", width, sizeRow); field("Height", height, sizeRow);
  const applySize = button("Apply resolution", () => {
    try { commit(resizeState(read(), Number(width.value), Number(height.value))); error.textContent = ""; }
    catch (err) { error.textContent = err.message; }
  }, sizeRow);
  applySize.title = "Scale raw boxes proportionally; output width/height use these same dimensions.";
  const columns = element("div", "moss-columns"), left = element("div"), right = element("div");
  if (mode !== "prompt") columns.append(left);
  if (mode !== "canvas") columns.append(right);
  const toolbar = element("div", "moss-row"); left.append(toolbar);
  const drawButton = button("Draw new box", () => change(state => { state.settings.draw_mode = !state.settings.draw_mode; }), toolbar);
  const deleteButton = button("Delete selected", () => change(state => {
    state.boxes = state.boxes.filter(box => box.id !== state.settings.selected_id);
    state.settings.selected_id = null;
  }), toolbar);
  const canvas = element("canvas"); canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Draw, select, move and resize boxes"); left.append(canvas);
  const hint = element("div", "moss-note", "Draw: drag on empty canvas, or enable Draw new box. Select/move: drag a box. Resize: drag any corner. Delete: focus canvas and press Delete. Same color shares its description.");
  left.append(hint);
  const boxSelect = element("select"); field("Box (drawing order)", boxSelect, left);
  boxSelect.addEventListener("change", () => change(state => { state.settings.selected_id = boxSelect.value || null; }));
  const selectedPanel = element("div", "moss-selected"); left.append(selectedPanel);
  const kind = element("select");
  for (const label of LABELS) { const option = element("option", "", label); option.value = label; kind.append(option); }
  field("Selected box type", kind, selectedPanel);
  kind.addEventListener("change", () => change(state => { selected(state).label = kind.value; }));
  const boxSlot = element("select");
  for (const [id] of SLOTS) { const option = element("option", "", id); option.value = id; boxSlot.append(option); }
  field("Selected box color", boxSlot, selectedPanel);
  boxSlot.addEventListener("change", () => change(state => { selected(state).slot = boxSlot.value; }));
  const renderedText = textInput("Text to render (separate from description)", selectedPanel,
    value => change(state => { selected(state).text = value; }));
  const coords = element("div", "moss-row moss-coordinates"), coordinateInputs = {};
  for (const key of ["x1", "y1", "x2", "y2"]) {
    const input = element("input"); input.type = "number"; input.step = "any";
    const group = element("div"); field(key, input, group); coords.append(group); coordinateInputs[key] = input;
    input.addEventListener("change", () => change(state => {
      const value = Number(input.value);
      if (!input.value || !Number.isFinite(value)) throw new Error("Coordinate must be finite");
      selected(state)[key] = value;
    }));
  }
  selectedPanel.append(coords);
  const prompt = textInput("Whole image prompt (original text)", right, value => change(state => { state.prompt = value; }), 3);
  if (split) {
    const sceneLabel = element("strong", "moss-scene-label", "SCENE / WHOLE IMAGE");
    right.prepend(sceneLabel);
    prompt.rows = 5;
    prompt.placeholder = "Describe the whole scene. Original wording is kept.";
  }
  const slotControls = {};
  for (const [id, color] of SLOTS) {
    const group = element(split ? "details" : "div", "moss-slot"); group.style.setProperty("--slot-color", color);
    const header = split ? element("summary") : group;
    if (split) {
      group.open = node.properties?.mossBBoxView?.slotOpen?.[id] ?? ["red", "blue"].includes(id);
      header.append(element("span", "moss-dot")); group.append(header);
      header.addEventListener("click", event => {
        event.preventDefault();
        if (disposed) return;
        const target = beginChange();
        node.properties ??= {}; node.properties.mossBBoxView ??= {}; node.properties.mossBBoxView.slotOpen ??= {};
        node.properties.mossBBoxView.slotOpen[id] = !group.open;
        group.open = node.properties.mossBBoxView.slotOpen[id];
        endChange(target);
      });
    }
    const selectButton = split ? element("span", "", id.toUpperCase())
      : button(id.toUpperCase(), () => change(state => { state.settings.active_slot = id; }), header);
    if (split) header.append(selectButton);
    selectButton.title = "Color for new boxes";
    const caption = textInput(`${id} description (shared)`, group, value => change(state => { state.slots[id] = value; }));
    right.append(group); slotControls[id] = { selectButton, caption, group };
  }
  const autoPosition = element("input"); autoPosition.type = "checkbox";
  const positionControl = element("div");
  field("Add position prose from current boxes (optional)", autoPosition, positionControl);
  if (mode !== "canvas") (mode === "prompt" ? right : left).append(positionControl);
  autoPosition.addEventListener("change", () => change(state => { state.settings.auto_position = autoPosition.checked; }));
  const warnings = element("div", "moss-warning");
  const limitations = element("div", "moss-note", "Boxes guide MOSS; placement is not guaranteed. Position-word checks cover a few English/Japanese keywords only; they can miss conflicts or flag negation/relations incorrectly. Manual wording is never rewritten.");
  const outputDetails = element("details"); outputDetails.open = true;
  outputDetails.append(element("summary", "", "Final output — C hybrid (prose + MOSS JSON)"));
  const output = element("textarea", "moss-output"); output.readOnly = true;
  output.setAttribute("aria-label", "Final output"); outputDetails.append(output);
  const copyStatus = element("span", "moss-note"), outputTools = element("div", "moss-row");
  button("Copy full output", async () => {
    output.value = buildPrompt(read()).prompt;
    try { await navigator.clipboard.writeText(output.value); copyStatus.textContent = "Copied"; }
    catch { output.focus(); output.select(); copyStatus.textContent = "Selected: press Ctrl/Cmd+C"; }
  }, outputTools);
  outputTools.append(copyStatus); outputDetails.append(outputTools);
  const stateTools = element("div", "moss-row"), fileInput = element("input");
  fileInput.type = "file"; fileInput.accept = ".json,application/json"; fileInput.style.display = "none";
  button("Export MOSS state", () => {
    const blob = new Blob([JSON.stringify(read(), null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = element("a");
    link.href = url; link.download = "moss-bbox-state.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, stateTools);
  button("Import MOSS state", () => fileInput.click(), stateTools);
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0]; if (!file) return;
    try { commit(parseState(await file.text())); error.textContent = ""; }
    catch (err) { error.textContent = err.message; }
    fileInput.value = "";
  });
  stateTools.append(fileInput);
  const view = () => node.properties?.mossBBoxView ?? {};
  function changeView(callback) {
    const target = beginChange(); node.properties ??= {}; node.properties.mossBBoxView ??= {};
    callback(node.properties.mossBBoxView); endChange(target); render();
  }
  const swatches = {};
  if (mode === "canvas") {
    const canvasToolbar = element("div", "moss-canvas-toolbar");
    const show = button("Show Boxes", () => changeView(view => { view.showBoxes = view.showBoxes === false; }), canvasToolbar);
    show.setAttribute("aria-label", "Show Boxes");
    canvasToolbar.append(drawButton);
    button("Reset Canvas", () => change(state => { state.boxes = []; state.settings.selected_id = null; }), canvasToolbar);
    for (const [id, color] of SLOTS) {
      const swatch = button("", () => change(state => { state.settings.active_slot = id; }), canvasToolbar);
      swatch.className = "moss-swatch"; swatch.style.background = color;
      swatch.setAttribute("aria-label", `${id} box color`); swatches[id] = swatch;
    }
    const grid = element("select"); grid.setAttribute("aria-label", "Grid");
    for (const text of ["None", "Thirds", "Quarters"]) { const item = element("option", "", text); item.value = text; grid.append(item); }
    grid.value = view().grid ?? "Thirds";
    grid.addEventListener("change", () => changeView(view => { view.grid = grid.value; }));
    canvasToolbar.append(element("span", "", "Grid"), grid);
    left.prepend(canvasToolbar);
    const footer = element("div", "moss-size-footer");
    footer.append(element("div", "moss-section-title", "LATENT SIZE"), sizeRow);
    left.append(footer);
    const selection = element("details"); selection.open = true;
    selection.append(element("summary", "", "Selected box"), boxSelect.previousSibling, boxSelect, selectedPanel, deleteButton);
    left.append(selection);
    root.append(error, columns, stateTools);
  } else if (mode === "prompt") {
    const connection = element("div", "moss-connection");
    connection.setAttribute("aria-label", "Canvas connection");
    root.append(connection, error, columns, warnings, limitations, outputDetails, stateTools);
  } else root.append(sizeRow, error, columns, warnings, limitations, outputDetails, stateTools);

  function draw(state) {
    const longEdge = 640, ratio = longEdge / Math.max(state.width, state.height);
    const cw = Math.max(1, Math.round(state.width * ratio)), ch = Math.max(1, Math.round(state.height * ratio));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const ctx = canvas.getContext("2d"), sx = cw / state.width, sy = ch / state.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.save(); ctx.scale(sx, sy);
    ctx.strokeStyle = "#3a4253"; ctx.lineWidth = 1 / sx;
    const grid = view().grid ?? "Thirds";
    for (const fraction of grid === "None" ? [] : grid === "Quarters" ? [1 / 4, 1 / 2, 3 / 4] : [1 / 3, 2 / 3]) {
      ctx.beginPath(); ctx.moveTo(state.width * fraction, 0); ctx.lineTo(state.width * fraction, state.height);
      ctx.moveTo(0, state.height * fraction); ctx.lineTo(state.width, state.height * fraction); ctx.stroke();
    }
    const boxes = gesture?.draft && !state.boxes.some(box => box.id === gesture.draft.id) ? [...state.boxes, gesture.draft] : state.boxes;
    (view().showBoxes === false ? [] : boxes).forEach((box, index) => {
      const [x1, y1, x2, y2] = normalizedBox(box), color = colors[box.slot];
      const isSelected = box.id === state.settings.selected_id || box === gesture?.draft;
      ctx.fillStyle = color + "25"; ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      ctx.strokeStyle = isSelected ? "#fff" : color; ctx.lineWidth = (isSelected ? 3 : 2) / sx;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillStyle = color; ctx.font = `bold ${13 / sx}px sans-serif`;
      ctx.fillText(`${index + 1} ${box.slot} / ${box.label}`, x1 + 3 / sx, Math.max(14 / sy, y1 + 15 / sy));
      if (isSelected) {
        const r = 4 / sx;
        for (const [x, y] of [[x1, y1], [x2, y1], [x1, y2], [x2, y2]]) { ctx.fillStyle = "#fff"; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      }
    });
    ctx.restore();
  }

  function setValue(control, value) { const text = String(value); if (control.value !== text) control.value = text; }
  function render() {
    if (disposed) return;
    try {
      const state = read(), result = buildPrompt(state), box = selected(state);
      if (mode === "prompt") root.querySelector('[aria-label="Canvas connection"]').textContent = options.getCanvas?.()
        ? `Canvas connected · ${state.width} × ${state.height} · ${state.boxes.length} boxes`
        : "Connect MOSS BBOX Canvas to canvas_data.";
      for (const [id, swatch] of Object.entries(swatches)) swatch.setAttribute("aria-pressed", String(state.settings.active_slot === id));
      if (mode === "canvas") root.querySelector('[aria-label="Show Boxes"]').setAttribute("aria-pressed", String(view().showBoxes !== false));
      setValue(width, state.width); setValue(height, state.height); setValue(prompt, state.prompt);
      for (const [id] of SLOTS) {
        setValue(slotControls[id].caption, state.slots[id]);
        if (split) slotControls[id].group.open = node.properties?.mossBBoxView?.slotOpen?.[id] ?? ["red", "blue"].includes(id);
        if (!split) slotControls[id].selectButton.setAttribute("aria-pressed", String(state.settings.active_slot === id));
      }
      autoPosition.checked = state.settings.auto_position;
      drawButton.setAttribute("aria-pressed", String(state.settings.draw_mode));
      deleteButton.disabled = !box; selectedPanel.hidden = !box;
      const boxOptions = state.boxes.map((b, i) => [`${i + 1}: ${b.slot} / ${b.label}`, b.id]);
      boxSelect.replaceChildren();
      const none = element("option", "", "(no selection)"); none.value = ""; boxSelect.append(none);
      for (const [text, id] of boxOptions) { const option = element("option", "", text); option.value = id; boxSelect.append(option); }
      boxSelect.value = state.settings.selected_id ?? "";
      if (box) {
        setValue(kind, box.label); setValue(boxSlot, box.slot); setValue(renderedText, box.text);
        renderedText.disabled = box.label !== "text";
        for (const key of Object.keys(coordinateInputs)) setValue(coordinateInputs[key], box[key]);
      }
      setValue(output, result.prompt); warnings.textContent = result.warnings.join("\n");
      draw(state);
      error.textContent = "";
    } catch (err) { error.textContent = `MOSS state could not be loaded: ${err.message}. Import a valid MOSS state; the saved value has been kept.`; }
  }

  function point(event, state) {
    const rect = canvas.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) * state.width / Math.max(rect.width, 1), 0, state.width),
      y: clamp((event.clientY - rect.top) * state.height / Math.max(rect.height, 1), 0, state.height) };
  }
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0 || gesture) return;
    event.preventDefault(); event.stopPropagation(); canvas.focus();
    const state = read(), p = point(event, state);
    const hit = state.settings.draw_mode ? null : hitTest(state.boxes, p, 8 * state.width / Math.max(canvas.getBoundingClientRect().width, 1));
    const target = beginChange();
    gesture = { before: widget.value, start: p, pointerId: event.pointerId, graph: target };
    if (hit) {
      gesture.box = clone(hit.box); gesture.handle = hit.handle;
      state.settings.selected_id = hit.box.id;
    } else {
      const id = globalThis.crypto.randomUUID();
      gesture.draft = { id, slot: state.settings.active_slot, label: "object", text: "", x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    }
    commit(state, false); canvas.setPointerCapture(event.pointerId); draw(state);
  });
  canvas.addEventListener("pointermove", event => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const state = read(), p = point(event, state);
    if (gesture.draft) {
      gesture.draft.x2 = p.x; gesture.draft.y2 = p.y;
      const [x1, y1, x2, y2] = normalizedBox(gesture.draft);
      if (x2 > x1 && y2 > y1) {
        const box = { ...gesture.draft, x1, y1, x2, y2 }, index = state.boxes.findIndex(box => box.id === gesture.draft.id);
        if (index < 0) state.boxes.push(box); else state.boxes[index] = box;
        state.settings.selected_id = box.id;
        commit(state, false);
      }
      draw(state);
    }
    else {
      const index = state.boxes.findIndex(box => box.id === gesture.box.id);
      if (index >= 0) state.boxes[index] = dragBox(gesture.box, gesture.handle, gesture.start, p, state.width, state.height);
      commit(state, false);
    }
  });
  function endGesture(event, cancel = false) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const state = read(), before = gesture.before, target = gesture.graph;
    if (gesture.draft) {
      const draft = gesture.draft, [x1, y1, x2, y2] = normalizedBox(draft);
      if (x2 > x1 && y2 > y1) {
        const box = { ...draft, x1, y1, x2, y2 }, index = state.boxes.findIndex(box => box.id === draft.id);
        if (index < 0) state.boxes.push(box); else state.boxes[index] = box;
        state.settings.selected_id = draft.id; state.settings.draw_mode = false;
      }
    }
    gesture = null;
    if (cancel) widget.value = before;
    else commit(state, false);
    endChange(target); render();
  }
  canvas.addEventListener("pointerup", event => endGesture(event));
  canvas.addEventListener("pointercancel", event => endGesture(event, true));
  canvas.addEventListener("lostpointercapture", event => endGesture(event));
  canvas.addEventListener("keydown", event => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault(); event.stopPropagation(); deleteButton.click();
    }
    if (event.key === "Escape" && gesture) endGesture({ pointerId: gesture.pointerId }, true);
  });
  // Restrict event interception to this editor; there are no document/global listeners.
  root.addEventListener("pointerdown", event => { if (event.button === 0) event.stopPropagation(); });
  root.addEventListener("keydown", event => { if (event.target.matches("input,textarea,select,button")) event.stopPropagation(); });
  const observer = new ResizeObserver(() => { try { draw(read()); } catch { /* Render already reports invalid state. */ } });
  observer.observe(root);
  render();
  return { root, render, reload() { gesture = null; render(); },
    dispose() { disposed = true; observer.disconnect(); gesture = null; root.remove(); } };
}
