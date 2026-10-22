import { app } from "../../scripts/app.js";
import { installControls } from "./moss_controls.mjs";
import { helpText } from "./help.mjs";

const sharedTypes = new Set(["MOSSSharedCanvas", "MOSSSharedPrompter"]);
const slots = ["red", "blue", "yellow", "green", "magenta"];
const typeNames = new Set(slots.map(slot => `${slot}_type`));
const mossTypes = [["character", "Character"], ["object", "Object"], ["text", "Text"]];
const canonicalType = value => value === "obj" ? "object" : value;

function normalizeTypeValues(node, values) {
  return Array.isArray(values) ? values.map((value, index) =>
    typeNames.has(node.widgets[index]?.name) ? canonicalType(value) : value) : values;
}

function normalizePromptConfig(node, info) {
  const properties = { ...info.properties };
  if (properties.k2cfPromptState) {
    properties.k2cfPromptState = { ...properties.k2cfPromptState,
      widgets_values: normalizeTypeValues(node, properties.k2cfPromptState.widgets_values) };
  } else if (Array.isArray(info.widgets_values)) {
    properties.k2cfPromptState = { version: "widgets_values", saved_at: Date.now(),
      widgets_values: normalizeTypeValues(node, info.widgets_values) };
  }
  return { ...info, properties, widgets_values: normalizeTypeValues(node, info.widgets_values) };
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
      const infoToRestore = nodeData.name === "MOSSSharedPrompter" ? normalizePromptConfig(this, info) : info;
      if (nodeData.name === "MOSSSharedPrompter" && infoToRestore.properties.k2cfPromptState) {
        // Creation installs a default snapshot; replace it before the shared hydrator reads it.
        this.properties = { ...this.properties, k2cfPromptState: infoToRestore.properties.k2cfPromptState };
      }
      return configured?.call(this, infoToRestore);
    };
  },
});
