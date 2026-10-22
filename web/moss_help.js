import { app } from "../../scripts/app.js";
import { helpText, setHelpLocaleReader, widgetHelpKey } from "./help.mjs";

setHelpLocaleReader(() => app.ui?.settings?.getSettingValue("Comfy.Locale") || document.documentElement.lang || "en");
const nodeNames = new Set(["MOSSSharedCanvas", "MOSSSharedPrompter", "MOSSFromKrea2", "MOSSBBoxPreview",
  "MOSSBBoxCanvasPrompt", "MOSSBBoxCanvas", "MOSSBBoxPrompter"]);

app.registerExtension({
  name: "MOSS.LocalizedHelp",
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (!nodeNames.has(nodeData.name)) return;
    if (nodeData.name === "MOSSBBoxPreview") nodeData.description = helpText("preview_empty");
    for (const group of Object.values(nodeData.input || {})) {
      for (const [name, spec] of Object.entries(group)) {
        const key = name === "prompt_ui_data" && nodeData.name === "MOSSFromKrea2" ? "prompt_ui_data" : widgetHelpKey(name);
        if (!helpText(key) || !Array.isArray(spec)) continue;
        spec[1] ??= {};
        Object.defineProperty(spec[1], "tooltip", {configurable:true, enumerable:true, get:() => helpText(key)});
      }
    }
    nodeData.output_tooltips = (nodeData.output_name || nodeData.output || []).map(name => helpText(
      name === "images" ? "preview_output" : ["prompt", "width", "height"].includes(name) ? `${name}_output` : name));
    const created = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function (...args) {
      const result = created?.apply(this, args);
      for (const widget of this.widgets || []) {
        const key = widgetHelpKey(widget.name);
        if (!helpText(key)) continue;
        Object.defineProperty(widget, "tooltip", {configurable:true, get:() => helpText(key)});
        if (widget.element) {
          widget.element.title = helpText(key);
          widget.element.addEventListener("pointerenter", () => { widget.element.title = helpText(key); });
        }
      }
      return result;
    };
  },
});
