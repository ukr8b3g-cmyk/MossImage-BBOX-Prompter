import { normalizeFocus } from "./camera_options.mjs?v=20261027-simple4";
import { app } from "../../scripts/app.js";
import { installControls } from "./moss_controls.mjs?v=1.0.11";
import { helpText } from "./help.mjs?v=1.0.11";

const sharedTypes = new Set(["MOSSSharedCanvas", "MOSSSharedPrompter"]);
const slots = ["red", "blue", "yellow", "green", "magenta", "cyan", "orange"];
const extraDefaults = Object.fromEntries(slots.slice(5).flatMap(slot => [
  [`${slot}_prompt`, ""], [`${slot}_type`, "object"],
  [`${slot}_framing`, "Auto"], [`${slot}_angle`, "Auto"],
]));
const typeNames = new Set(slots.map(slot => `${slot}_type`));
const mossTypes = [["character", "Character"], ["object", "Object"], ["text", "Text"]];
const canonicalType = value => value === "obj" ? "object" : value;

function compactDimensionInputs(node) {
  for (let index = (node.inputs?.length || 0) - 1; index >= 0; index--) {
    const input = node.inputs[index];
    if (!["width_override", "height_override"].includes(input.name)) continue;
    // Keep connected legacy overrides; remove unused rows through LiteGraph so
    // reference_image links move with their input instead of changing targets.
    if (input.link == null) node.removeInput(index);
    else input.label = input.localized_name = input.name === "width_override" ? "width" : "height";
  }
}

function normalizeTypeValues(node, values) {
  if (!Array.isArray(values)) return values;
  const normalized = values.map((value, index) =>
    typeNames.has(node.widgets[index]?.name) ? canonicalType(value) : value);
  node.widgets.forEach((widget, index) => {
    if (Object.hasOwn(extraDefaults, widget.name) && normalized[index] === undefined)
      normalized[index] = extraDefaults[widget.name];
  });
  const focuses = node.widgets.filter(w => w.name.endsWith("_focus"));
  for (const widget of focuses) {
    const index = node.widgets.indexOf(widget);
    normalized[index] = normalizeFocus(Object.hasOwn(values, index) ? values[index] : undefined);
  }
  const uiIndex = node.widgets.findIndex(w => w.name === "prompt_ui_data");
  if (typeof normalized[uiIndex] === "string") {
    let ui;
    try { ui = JSON.parse(normalized[uiIndex]); } catch (_) {}
    if (ui?.slotValues && typeof ui.slotValues === "object") {
      for (const widget of focuses) {
        const slot = widget.name.replace("_focus", "");
        ui.slotValues[slot] = {...ui.slotValues[slot], focus: normalized[node.widgets.indexOf(widget)]};
      }
      normalized[uiIndex] = JSON.stringify(ui);
    }
  }
  return normalized;
}

function normalizeWidgetConfig(node, info, isPrompt) {
  const properties = { ...info.properties };
  const key = isPrompt ? "k2cfPromptState" : "k2cfCanvasState";
  const values = isPrompt ? normalizeTypeValues(node, info.widgets_values) : info.widgets_values?.slice();
  if (!isPrompt) {
    const saved = values || properties[key]?.widgets_values;
    const raw = saved?.[node.widgets.findIndex(w => w.name === "layout_data")];
    let layout;
    try { layout = JSON.parse(raw); } catch (_) {}
    for (const box of Array.isArray(layout?.boxes) ? layout.boxes : []) if (box?.promptData && Object.hasOwn(box.promptData, "focus")) normalizeFocus(box.promptData.focus);
  }
  if (Array.isArray(values)) {
    // Serialized widgets are the owning values; properties are a saved mirror.
    properties[key] = { version: "widgets_values", saved_at: Date.now(), ...properties[key], widgets_values: values.slice() };
  } else if (isPrompt && properties[key]) {
    properties[key] = { ...properties[key], widgets_values: normalizeTypeValues(node, properties[key].widgets_values) };
  }
  if (isPrompt && properties.k2cfPromptUiState && Array.isArray(values || properties[key]?.widgets_values)) {
    const saved = values || properties[key].widgets_values;
    const ui = structuredClone(properties.k2cfPromptUiState);
    ui.slotValues = {...ui.slotValues};
    node.widgets.forEach((w,i) => { if(w.name.endsWith("_focus")) ui.slotValues[w.name.replace("_focus", "")] = {...ui.slotValues[w.name.replace("_focus", "")], focus: saved[i]}; });
    properties.k2cfPromptUiState = ui;
  }
  return { ...info, properties, widgets_values: values };
}

function updateTypeHelp(root) {
  for (const select of root.querySelectorAll(".moss-k2cf-type")) {
    select.title = helpText("type");
    if (select.previousElementSibling) select.previousElementSibling.title = select.title;
  }
}

function installTypeOptions(node, root) {
  root.querySelectorAll(".moss-k2cf-type").forEach((select, index) => {
    const widget = node.widgets.find(widget => widget.name === `${slots[index]}_type`);
    select.replaceChildren(...mossTypes.map(([value, label]) => {
      const option = root.ownerDocument.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    }));
    select.value = canonicalType(widget.value);
  });
  updateTypeHelp(root);
  root.addEventListener("change", () => updateTypeHelp(root));
}

function compactCanvasFooter(root) {
  const panels = root.querySelector(".moss-k2cf-panels");
  const size = panels.querySelector(".moss-k2cf-panel");
  const cameraPanel = panels.querySelector(".moss-k2cf-camera-panel");
  const [camera, presets] = cameraPanel.querySelectorAll(".moss-k2cf-compact-group");
  const presetRow = size.querySelector("select").closest(".moss-k2cf-rowline");
  const dimensions = size.querySelector('input[type="number"]').closest(".moss-k2cf-rowline");
  const actions = [...size.querySelectorAll(".moss-k2cf-rowline")].find(row => row.querySelector("button"));
  root.classList.add("moss-canvas-compact");
  root.dataset.mossUiState = "20261027";
  size.classList.add("moss-size-panel");
  presetRow.previousElementSibling.classList.add("moss-size-preset-label");
  presetRow.classList.add("moss-size-preset");
  dimensions.classList.add("moss-size-dimensions");
  actions.classList.add("moss-size-actions");
  camera.classList.add("moss-k2cf-panel", "moss-camera-group");
  presets.classList.add("moss-k2cf-panel", "moss-preset-group");
  for (const group of [camera, presets]) group.title = group.querySelector(".moss-k2cf-note").textContent;
  // Move the existing controls with their handlers and persistence intact.
  panels.replaceChildren(size, camera, presets);
  const style = root.ownerDocument.createElement("style");
  style.textContent = `
    .moss-canvas-compact .moss-k2cf-panels{grid-template-columns:repeat(auto-fit,minmax(min(100%,244px),1fr));grid-auto-rows:1fr;gap:6px;align-items:stretch}
    .moss-canvas-compact .moss-k2cf-panels>.moss-k2cf-panel{box-sizing:border-box;padding:6px;align-self:stretch}
    .moss-canvas-compact .moss-k2cf-panel h4,.moss-canvas-compact .moss-k2cf-section-label{margin:0;line-height:13px;min-height:13px;font-size:11px}
    .moss-canvas-compact .moss-k2cf-panel input,.moss-canvas-compact .moss-k2cf-panel select,.moss-canvas-compact .moss-k2cf-panel button{box-sizing:border-box;height:22px;font-size:11px;padding:2px 4px}
    .moss-canvas-compact .moss-size-panel{display:grid;grid-template-columns:minmax(76px,.8fr) minmax(140px,1.2fr);grid-template-rows:13px 12px 22px 22px;gap:3px 5px;align-content:start;align-items:center}
    .moss-canvas-compact .moss-size-panel h4{grid-column:1/-1;grid-row:1}
    .moss-canvas-compact .moss-size-preset-label{grid-column:1;grid-row:2;font-size:10px;line-height:12px;color:#bbb}
    .moss-canvas-compact .moss-k2cf-size-label{grid-column:2;grid-row:2;font-size:10px;line-height:12px;gap:4px;white-space:nowrap}
    .moss-canvas-compact .moss-size-preset{grid-column:1;grid-row:3;min-width:0}
    .moss-canvas-compact .moss-size-preset select{width:100%;min-width:0}
    .moss-canvas-compact .moss-size-dimensions{grid-column:2;grid-row:3;flex-wrap:nowrap;gap:3px;font-size:10px}
    .moss-canvas-compact .moss-size-dimensions input{width:52px;min-width:0;flex:1 1 52px}
    .moss-canvas-compact .moss-size-actions{grid-column:1/-1;grid-row:4;flex-wrap:nowrap;gap:4px}
    .moss-canvas-compact .moss-k2cf-override-status{grid-column:1/-1;margin-top:0}
    .moss-canvas-compact .moss-k2cf-compact-group{gap:4px}
    .moss-canvas-compact .moss-k2cf-camera-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
    .moss-canvas-compact .moss-k2cf-camera-cell>div:first-child{font-size:10px;line-height:12px;margin-bottom:3px}
    .moss-canvas-compact .moss-k2cf-camera-cell input,.moss-canvas-compact .moss-k2cf-camera-cell select{width:100%;min-width:0;max-width:none}
    .moss-canvas-compact .moss-k2cf-canvas-presetbar{display:grid;grid-template-columns:minmax(64px,1fr) repeat(3,max-content);gap:4px;margin-top:15px}
    .moss-canvas-compact .moss-k2cf-canvas-presetbar select{min-width:0;max-width:none;width:100%}
    .moss-canvas-compact .moss-k2cf-note{display:none}
  `;
  root.appendChild(style);
}

app.registerExtension({
  name: "moss.bbox.shared-ui.v1",
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === "MOSSFromKrea2") {
      const created = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        const result = created?.apply(this, arguments);
        const style = this.widgets?.find(widget => widget.name === "text_style");
        if (style) style.value = "";
        return result;
      };
      return;
    }
    if (!sharedTypes.has(nodeData.name)) return;
    installControls(nodeType, nodeData);
    const created = nodeType.prototype.onNodeCreated;
    const configured = nodeType.prototype.onConfigure;
    nodeType.prototype.onNodeCreated = function () {
      const isPrompt = nodeData.name === "MOSSSharedPrompter";
      if (isPrompt) {
        for (const widget of this.widgets) if (typeNames.has(widget.name)) widget.value = canonicalType(widget.value);
      }
      this.__k2cfConfiguredWidgetValues = this.widgets.map(widget => widget.value);
      // Adapt only the MOSS node's DOM at the shared renderer's creation boundary.
      const addDOMWidget = this.addDOMWidget;
      let root;
      this.addDOMWidget = function (name, type, element) {
        if (name === "krea2_prompt_ui") {
          root = element;
          installTypeOptions(this, root);
        }
        if (name === "krea2_canvas_ui") compactCanvasFooter(element);
        return addDOMWidget.apply(this, arguments);
      };
      let result;
      try { result = created?.apply(this, arguments); }
      finally { this.addDOMWidget = addDOMWidget; }
      if (!isPrompt) compactDimensionInputs(this);
      if (root) {
        const hydrate = this.__k2cfHydrateFromWidgets;
        this.__k2cfHydrateFromWidgets = function () {
          const result = hydrate.apply(this, arguments);
          updateTypeHelp(root);
          return result;
        };
        updateTypeHelp(root);
      }
      return result;
    };
    nodeType.prototype.onConfigure = function (info) {
      const isPrompt = nodeData.name === "MOSSSharedPrompter";
      const infoToRestore = normalizeWidgetConfig(this, info, isPrompt);
      const stateKey = isPrompt ? "k2cfPromptState" : "k2cfCanvasState";
      if (infoToRestore.properties[stateKey]) {
        // Creation installs a default snapshot; replace it before the shared hydrator reads it.
        this.properties = { ...this.properties, [stateKey]: infoToRestore.properties[stateKey] };
      }
      const result = configured?.call(this, infoToRestore);
      if (nodeData.name === "MOSSSharedCanvas") compactDimensionInputs(this);
      return result;
    };
  },
});
