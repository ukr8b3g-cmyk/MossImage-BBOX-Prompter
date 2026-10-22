import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { mountPreview } from "./preview_ui.mjs";

app.registerExtension({
  name: "MOSS.BBoxPreview",
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "MOSSBBoxPreview") return;
    const created = nodeType.prototype.onNodeCreated;
    const configured = nodeType.prototype.onConfigure;
    const executed = nodeType.prototype.onExecuted;
    const removed = nodeType.prototype.onRemoved;
    nodeType.prototype.onNodeCreated = function (...args) {
      const result = created?.apply(this, args);
      const view = mountPreview(this, image => api.apiURL(`/view?${new URLSearchParams(image)}`));
      this._mossBBoxPreview = view;
      this.addDOMWidget("bbox_preview", "moss_bbox_preview", view.element, {serialize: false});
      this.setSize([420, 520]);
      return result;
    };
    nodeType.prototype.onConfigure = function (...args) {
      const result = configured?.apply(this, args);
      this._mossBBoxPreview?.configure();
      return result;
    };
    nodeType.prototype.onExecuted = function (message, ...args) {
      const result = executed?.call(this, message, ...args);
      this._mossBBoxPreview?.executed(message);
      return result;
    };
    nodeType.prototype.onRemoved = function (...args) {
      this._mossBBoxPreview?.dispose();
      return removed?.apply(this, args);
    };
  },
});
