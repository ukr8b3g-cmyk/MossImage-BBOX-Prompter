import { app } from "../../scripts/app.js";
import { createEditor } from "./editor.mjs";

function sourceCanvas(node) {
  const input = node.inputs?.find(input => input.name === "canvas_data");
  const link = node.graph?.links?.get?.(input?.link) ?? node.graph?.links?.[input?.link];
  const source = node.graph?.getNodeById(link?.origin_id);
  return source?.widgets?.find(widget => widget.name === "moss_state")?.value ?? null;
}

function refreshPrompters(node) {
  for (const output of node.outputs ?? []) {
    if (output.type !== "MOSS_BBOX_LAYOUT") continue;
    for (const id of output.links ?? []) {
      const link = node.graph?.links?.get?.(id) ?? node.graph?.links?.[id];
      node.graph?.getNodeById(link?.target_id)?.mossBBoxEditor?.render();
    }
  }
}

export function installMossNode(nodeType, mode = "combined") {
  const created = nodeType.prototype.onNodeCreated;
  nodeType.prototype.onNodeCreated = function () {
    const result = created?.apply(this, arguments);
    const widget = this.widgets.find(widget => widget.name === "moss_state");
    widget.hidden = true; widget.type = "hidden";
    widget.options = { ...widget.options, hidden: true, serialize: true };
    widget.computeSize = () => [0, -4];
    if (widget.inputEl) widget.inputEl.style.display = "none";
    // Every edit writes the source widget immediately; serialization never writes state back.
    widget.serializeValue = () => widget.value;
    this.serialize_widgets = true;
    this.mossBBoxEditor = createEditor(this, widget, {
      mode, getCanvas: () => sourceCanvas(this), onChange: () => refreshPrompters(this),
    });
    this.addDOMWidget("moss_bbox_editor", "MOSSBBoxEditor", this.mossBBoxEditor.root, {
      serialize: false, hideOnZoom: false, getMinHeight: () => 550,
    });
    this.setSize(mode === "canvas" ? [640, 940] : mode === "prompt" ? [470, 940] : [800, 940]);
    return result;
  };
  const configured = nodeType.prototype.onConfigure;
  nodeType.prototype.onConfigure = function (info) {
    const result = configured?.apply(this, arguments);
    // Empty text and empty boxes are deliberate values; never merge with an older snapshot.
    if (Array.isArray(info.widgets_values) && typeof info.widgets_values[0] === "string") {
      this.widgets.find(widget => widget.name === "moss_state").value = info.widgets_values[0];
    }
    this.mossBBoxEditor?.reload();
    refreshPrompters(this);
    return result;
  };
  const connectionsChanged = nodeType.prototype.onConnectionsChange;
  nodeType.prototype.onConnectionsChange = function () {
    const result = connectionsChanged?.apply(this, arguments);
    this.mossBBoxEditor?.render();
    refreshPrompters(this);
    return result;
  };
  const serialized = nodeType.prototype.onSerialize;
  nodeType.prototype.onSerialize = function (data) {
    const result = serialized?.apply(this, arguments);
    data.widgets_values = [this.widgets.find(widget => widget.name === "moss_state").value];
    return result;
  };
  const removed = nodeType.prototype.onRemoved;
  nodeType.prototype.onRemoved = function () {
    this.mossBBoxEditor?.dispose();
    return removed?.apply(this, arguments);
  };
}

app.registerExtension({
  name: "moss.bbox.canvas.hybrid.v1",
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === "MOSSBBoxCanvasPrompt") installMossNode(nodeType);
    if (nodeData.name === "MOSSBBoxCanvas") installMossNode(nodeType, "canvas");
    if (nodeData.name === "MOSSBBoxPrompter") installMossNode(nodeType, "prompt");
  },
});
