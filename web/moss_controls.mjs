// Adapted from Krea2 BBOX Prompter Suite v1.0.2 (98f3a29c).
// Copyright (c) 2026 ukr8b3g-cmyk. MIT; see LICENSE and NOTICE.md.

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { mountCanvasReference } from "./canvas_reference.mjs";
import { bindHelp } from "./help.mjs";
import { mountTextStyle } from "./text_style.mjs";
import { createCanvasHistory, nextOverlappingBox, snapBoxToGuides, resizeBoxWithAspect, moveBoxSelection, arrangeBoxes } from "./canvas_editing.mjs";

const CANVAS_NODE = "MOSSSharedCanvas";

const PROMPT_NODE = "MOSSSharedPrompter";

let k2cfPyssssAutocompletePromise = null;

function k2cfLoadPyssssAutocomplete() {
  if (!k2cfPyssssAutocompletePromise) {
    const urls = [
      "/extensions/comfyui-custom-scripts/js/common/autocomplete.js",
      "/extensions/ComfyUI-Custom-Scripts/js/common/autocomplete.js"
  ];
    k2cfPyssssAutocompletePromise = urls.reduce(
      (promise, url) => promise.catch(() => import(url)),
      Promise.reject()
    ).catch((err) => {
      console.info("[MOSS BBOX] ComfyUI-Custom-Scripts autocomplete is not available.", err);
      return null;
    });
  }
  return k2cfPyssssAutocompletePromise;
}

function k2cfAttachPyssssAutocomplete(textarea) {
  if (!textarea || textarea.__k2cfPyssssAutocomplete) return;
  textarea.__k2cfPyssssAutocomplete = "pending";
  k2cfLoadPyssssAutocomplete().then((mod) => {
    if (!mod?.TextAreaAutoComplete) {
      textarea.__k2cfPyssssAutocomplete = false;
      return;
    }
    new mod.TextAreaAutoComplete(textarea);
    textarea.__k2cfPyssssAutocomplete = true;
  }).catch((err) => {
    textarea.__k2cfPyssssAutocomplete = false;
    console.warn("[MOSS BBOX] Failed to attach autocomplete.", err);
  });
}

const K2CF_CANVAS_DEFAULT_SIZE = [830, 980];

const K2CF_PROMPT_DEFAULT_SIZE = [540, 990];

const K2CF_PROMPT_LEGACY_BUG_SIZES = [[400, 572]];

const K2CF_PROMPT_HEIGHT_CAPTURE_MODE = "resize_grip_v31";

const SLOTS = [
  ["red", "RED", "#ff3b30", "red_prompt", "red_type", "red_framing", "red_angle"],
  ["blue", "BLUE", "#2f80ff", "blue_prompt", "blue_type", "blue_framing", "blue_angle"],
  ["yellow", "YELLOW", "#ffd91a", "yellow_prompt", "yellow_type", "yellow_framing", "yellow_angle"],
  ["green", "GREEN", "#35b84b", "green_prompt", "green_type", "green_framing", "green_angle"],
  ["magenta", "MAGENTA", "#d943c8", "magenta_prompt", "magenta_type", "magenta_framing", "magenta_angle"],
];

const FRAMING_OPTIONS = [
  "Auto",
  "Cowboy shot",
  "Full body",
  "Upper body",
  "Bust-up",
  "Headshot",
  "Close-up",
  "Lower body",
  "Full object",
  "Detail shot",
  "Macro detail"
];

const ANGLE_OPTIONS = [
  "Auto",
  "Front view",
  "3/4 right",
  "3/4 left",
  "Eye level",
  "POV",
  "Top POV",
  "Side view",
  "Profile right",
  "Profile left",
  "Slight low",
  "Low angle",
  "Slight high",
  "High angle",
  "Top-down view",
  "Three-quarter view",
  "Dutch angle",
  "Over-the-shoulder",
  "Rear view",
  "Wide angle",
  "Telephoto",
  "Worm view",
  "Bird view",
  "Foreground frame"
];

const PRESETS = {
  "1024 x 1024": [1024, 1024],
  "1536 x 1536": [1536, 1536],
  "2048 x 2048": [2048, 2048],
  "1024 x 1344": [1024, 1344],
  "1024 x 1536": [1024, 1536],
  "1152 x 1536": [1152, 1536],
  "1536 x 2048": [1536, 2048],
  "1344 x 1024": [1344, 1024],
  "1536 x 1024": [1536, 1024],
  "1536 x 1152": [1536, 1152],
  "2048 x 1536": [2048, 1536],
};

const USER_PRESET_COLOR = "#35D0C8";

const USER_PRESET_KEY = "moss_bbox_custom_latent_presets";

const CAMERA_SET_KEY = "moss_bbox_camera_sets";

const CANVAS_PRESET_KEY = "moss_bbox_canvas_presets";

const SCENE_PRESET_KEY = "moss_bbox_scene_presets";

const PROMPT_SLOT_PRESET_KEY = "moss_bbox_prompt_slot_presets";

const PROMPT_LANGUAGE_KEY = "moss_bbox_prompt_ui_language";

const CANVAS_LANGUAGE_KEY = "moss_bbox_canvas_ui_language";

const CANVAS_GRID_KEY = "moss_bbox_canvas_grid";

const DEFAULT_WIDTH = 1024;

const DEFAULT_HEIGHT = 1024;

const DEFAULT_PRESET = "1024 x 1024";

const I18N = {
  en: {
    showBoxes: "◉ Show Boxes",
    hideBoxes: "◎ Hide Boxes",
    drawBox: "▭ Draw Box",
    resetCanvas: "Reset Canvas",
    latentSize: "LATENT SIZE",
    compositionGuide: "COMPOSITION GUIDE",
    cameraSettings: "CAMERA SETTINGS",
    uiLanguage: "UI Language",
    preset: "Preset",
    width: "Width",
    height: "Height",
    saveCustom: "Save Custom",
    deleteCustom: "Delete Custom",
    userPresetHelp: "User presets use #35D0C8 and are stored locally.",
    grid: "Grid",
    guideHelp: "Guide only. It does not add prompt text by itself.",
    cameraHelp: "Blank = model decides. Select preset or type custom. Values are saved.",
    cameraCustomNote: "Custom values are temporary and are not saved as camera presets.",
    cameraSet: "Camera Set",
    canvasPreset: "Canvas Preset",
    canvasPresetNote: "Saves size, boxes, guide, UI language, and camera values together.",
    scenePreset: "Scene Preset",
    scenePresetHelp: "Save or load the main scene/background prompt as a local preset.",
    scenePresetSelectHelp: "Choose a saved scene/background preset.",
    sceneSaveHelp: "Save the current scene/background prompt as a preset.",
    sceneLoadHelp: "Load the selected scene/background preset into the text box.",
    sceneDeleteHelp: "Delete the selected scene/background preset.",
    promptPreset: "Preset",
    savePreset: "Save Preset",
    loadPreset: "Load",
    deletePreset: "Delete",
    none: "(None)",
    save: "Save",
    saveSet: "Save Set",
    deleteSet: "Delete Set",
    iso: "ISO",
    shutter: "Shutter",
    aperture: "Aperture",
    focal: "Focal",
    custom: "Custom",
    scene: "SCENE / BACKGROUND",
    background: "BACKGROUND",
    scenePlaceholder: "Describe the overall scene and background. Leave blank if not needed.",
    backgroundPlaceholder: "Describe the background/environment. Recommended for stable generation.",
    prompt: "Prompt",
    clearPrompt: "Clear this prompt",
    elementType: "Type",
    elementTypeHelp: "Choose what this colored box describes. Object is for subjects; Text is for letters, logos, signs, or speech bubbles.",
    framing: "Framing",
    framingHelp: "Choose how the subject should be framed inside this colored box.",
    angle: "Angle",
    angleHelp: "Choose the viewing direction or camera perspective for this colored box.",
    slotHeaderHelp: "{label} box prompt. Click to open or close this section.",
    slotPromptHelp: "Write what should appear in this colored box. Keep boxes simple and avoid overlapping instructions.",
    enterPrompt: "Enter prompt for {label} box..."
  },
  ja: {
    showBoxes: "◉ ボックス表示",
    hideBoxes: "◎ ボックス非表示",
    drawBox: "▭ ボックス作成",
    resetCanvas: "リセット",
    latentSize: "ラテントサイズ",
    compositionGuide: "構図ガイド",
    cameraSettings: "カメラ設定",
    uiLanguage: "UI言語",
    preset: "プリセット",
    width: "幅",
    height: "高さ",
    saveCustom: "カスタム保存",
    deleteCustom: "削除",
    userPresetHelp: "ユーザープリセットは #35D0C8 で表示され、ローカルに保存されます。",
    grid: "グリッド",
    guideHelp: "表示ガイドのみです。プロンプト文には追加されません。",
    cameraHelp: "空欄ならモデルに任せます。プリセット選択またはカスタム入力できます。",
    cameraCustomNote: "カスタム値は一時的な入力で、カメラプリセットとしては保存されません。",
    cameraSet: "カメラセット",
    canvasPreset: "キャンバスプリセット",
    canvasPresetNote: "サイズ、ボックス、ガイド、UI言語、カメラ値をまとめて保存します。",
    scenePreset: "シーンプリセット",
    scenePresetHelp: "シーン / 背景プロンプトをローカルプリセットとして保存・読込します。",
    scenePresetSelectHelp: "保存済みのシーン / 背景プリセットを選びます。",
    sceneSaveHelp: "現在のシーン / 背景プロンプトをプリセット保存します。",
    sceneLoadHelp: "選択したシーン / 背景プリセットを入力欄へ読み込みます。",
    sceneDeleteHelp: "選択したシーン / 背景プリセットを削除します。",
    promptPreset: "プリセット",
    savePreset: "プリセット保存",
    loadPreset: "読込",
    deletePreset: "削除",
    none: "(なし)",
    save: "保存",
    saveSet: "セット保存",
    deleteSet: "削除",
    iso: "ISO",
    shutter: "シャッター",
    aperture: "絞り",
    focal: "焦点距離",
    custom: "カスタム",
    scene: "シーン / 背景",
    background: "背景",
    scenePlaceholder: "全体のシーンと背景を入力。不要なら空欄。",
    backgroundPlaceholder: "背景・環境を入力。安定化に推奨。",
    prompt: "プロンプト",
    clearPrompt: "このプロンプトを消去",
    elementType: "タイプ",
    elementTypeHelp: "この色ボックスで指定する対象を選びます。Objectは被写体、Textは文字・ロゴ・看板・吹き出し向けです。",
    framing: "フレーミング",
    framingHelp: "この色ボックス内で、被写体をどの範囲で写すかを選びます。",
    angle: "アングル",
    angleHelp: "この色ボックスに対する視点・カメラ角度を選びます。",
    slotHeaderHelp: "{label} ボックスのプロンプト欄です。クリックで開閉します。",
    slotPromptHelp: "この色ボックス内に出したい内容を書きます。指示はシンプルにし、ボックス同士の矛盾や重なりを避けてください。",
    enterPrompt: "{label} ボックスのプロンプトを入力..."
  }
};

function resolveLang(value) {
  return value === "Japanese" ? "ja" : "en";
}

function tr(lang, key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}

function k2cfCreateWorkflowStorageId() {
  return `k2cf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function k2cfSetWorkflowStorageId(graph, value = null) {
  if (!graph) return "default_graph";
  graph.extra = graph.extra || {};
  const nextValue = value || graph.extra.moss_bbox_state_id || graph.extra.k2cf_state_id || k2cfCreateWorkflowStorageId();
  graph.extra.moss_bbox_state_id = String(nextValue);
  Object.defineProperty(graph, "__mossStateId", {
    value: String(nextValue),
    writable: true,
    configurable: true,
    enumerable: false,
  });
  return String(nextValue);
}

function k2cfWorkflowStorageId(node) {
  const graph = node?.graph || app?.graph;
  if (graph) {
    if (!graph.__mossStateId || graph.__mossStateId !== graph.extra?.moss_bbox_state_id) k2cfSetWorkflowStorageId(graph);
    return String(graph.__mossStateId);
  }
  return "default_graph";
}

function k2cfNodeStorageKey(node, kind) {
  const nodeId = node?.id ?? "unknown";
  return `moss_bbox_${kind}_${k2cfWorkflowStorageId(node)}_${nodeId}`;
}

function k2cfIsWorkflowLoading() {
  const appObj = window.comfyAPI?.app?.app || app;
  return Number(appObj?.__mossWorkflowLoadDepth || 0) > 0;
}

function k2cfReadStorageJson(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || "null");
    return value || null;
  } catch (_) {
    return null;
  }
}

function k2cfReadSessionJson(key) {
  try { return k2cfReadStorageJson(sessionStorage, key); } catch (_) { return null; }
}

function k2cfReadBrowserLocalJson(key) {
  try { return k2cfReadStorageJson(localStorage, key); } catch (_) { return null; }
}

function k2cfPickLatestState(states) {
  const valid = states.filter((state) => state && typeof state === "object");
  if (!valid.length) return null;
  valid.sort((a, b) => Number(b.saved_at || 0) - Number(a.saved_at || 0));
  return valid[0];
}

function k2cfLocalStateKeys(node, kind) {
  // Node IDs are reused across workflows; never read the old type + node ID fallback.
  return [k2cfNodeStorageKey(node, kind)];
}

function k2cfReadLocalState(node, kind) {
  // Prompt/canvas widget values must come only from workflow node/widget state.
  // Browser local/session fallback can resurrect stale prompt text or stale latent sizes
  // (for example 1024 x 1536) when ComfyUI rebuilds a tab.
  if (kind === "prompt" || kind === "canvas") return null;
  if (k2cfIsWorkflowLoading() || node?.__k2cfWorkflowConfigured || !node?.graph || node.id == null || node.id === -1) return null;
  const states = [];
  for (const key of k2cfLocalStateKeys(node, kind)) {
    states.push(k2cfReadSessionJson(key));
    states.push(k2cfReadBrowserLocalJson(key));
  }
  return k2cfPickLatestState(states);
}

function k2cfWriteLocalState(node, kind, data) {
  // Do not persist prompt/canvas widget values outside the workflow. This prevents stale
  // browser storage from overriding freshly typed prompts or current latent size after tab switches.
  if (kind === "prompt" || kind === "canvas") return;
  if (k2cfIsWorkflowLoading() || !node?.graph || node.id == null || node.id === -1) return;
  const value = JSON.stringify(data);
  for (const key of k2cfLocalStateKeys(node, kind)) {
    try { sessionStorage.setItem(key, value); } catch (_) {}
    if (kind === "prompt_ui" || kind.endsWith("_node_size")) {
      try { localStorage.setItem(key, value); } catch (_) {}
    }
  }
}

function k2cfBestSavedState(node, kind) {
  const propName = kind === "prompt" ? "k2cfPromptState" : ("k2cfCanvasState");
  const workflowCandidates = [
    node?.properties?.[propName],
    kind === "prompt" ? node?.__k2cfConfiguredPromptState : (node?.__k2cfConfiguredCanvasState)
  ].filter((state) => Array.isArray(state?.widgets_values) && (
    k2cfHasMeaningfulState(state.widgets_values)
  ));
  if (workflowCandidates.length) {
    workflowCandidates.sort((a, b) => Number(b.saved_at || 0) - Number(a.saved_at || 0));
    const picked = workflowCandidates[0];
    if (kind === "prompt") picked.widgets_values = k2cfSanitizePromptValues(picked.widgets_values);
    return picked;
  }

  if (kind === "prompt" && node?.__k2cfSkipLocalPromptState) return null;
  if (kind === "canvas" && node?.__k2cfSkipLocalCanvasState) return null;

  const localState = k2cfReadLocalState(node, kind);
  if (Array.isArray(localState?.widgets_values) && (
    k2cfHasMeaningfulState(localState.widgets_values)
  )) {
    if (kind === "prompt") localState.widgets_values = k2cfSanitizePromptValues(localState.widgets_values);
    return localState;
  }
  return null;
}

function k2cfWidgetValues(node, widgetNames) {
  return widgetNames.map((name) => {
    const w = widget(node, name);
    return w?.value === undefined || w?.value === null ? "" : w.value;
  });
}

function k2cfHasMeaningfulState(values) {
  if (!Array.isArray(values)) return false;
  return values.some((v) => {
    if (v === undefined || v === null) return false;
    const s = String(v).trim();
    if (!s) return false;
    if (k2cfLooksLikePromptUiState(s)) return k2cfPromptUiHasMeaningfulState(s);
    if (s === '{"boxes":[]}') return false;
    if (s === '{"iso":"","shutter":"","aperture":"","focal_length":""}') return false;
    if (s === '{"sets":[],"selected":""}') return false;
    if (s === "Auto") return false;
    if (s === "Thirds") return false;
    if (s === DEFAULT_PRESET) return false;
    if (s === "1536" || s === "1024") return false;
    return true;
  });
}

function k2cfParseCanvasLayout(value) {
  const raw = String(value ?? "");
  const layout = raw.trim() ? JSON.parse(raw) : {};
  if (!layout || typeof layout !== "object" || Array.isArray(layout) ||
      (layout.boxes !== undefined && !Array.isArray(layout.boxes))) {
    throw new Error("MOSS Canvas layout_data must be a JSON object; boxes must be an array.");
  }
  return layout;
}

function k2cfJsonHasValues(value) {
  try {
    const data = JSON.parse(String(value || ""));
    if (!data || typeof data !== "object") return false;
    return Object.values(data).some((v) => {
      if (Array.isArray(v)) return v.length > 0;
      if (v && typeof v === "object") return Object.keys(v).length > 0;
      return String(v ?? "").trim() !== "";
    });
  } catch (_) {
    return false;
  }
}

function k2cfReadJsonObject(value) {
  if (value && typeof value === "object") return value;
  try {
    const data = JSON.parse(String(value || ""));
    return data && typeof data === "object" ? data : null;
  } catch (_) {
    return null;
  }
}

function k2cfLooksLikePromptUiState(value) {
  const data = k2cfReadJsonObject(value);
  if (!data || typeof data !== "object") return false;
  return String(data.version || "").startsWith("prompt_ui_") ||
    data.textHeights !== undefined ||
    data.slotOpen !== undefined ||
    data.slotPreset !== undefined ||
    data.slotValues !== undefined ||
    data.scenePreset !== undefined ||
    data.nodeSize !== undefined ||
    data.wrapSize !== undefined;
}

function k2cfDefaultTextHeightForKey(key) {
  return 125;
}

function k2cfMaxPromptTextHeightForKey(key) {
  // Guard against ComfyUI tab/app restore reflow saving a huge textarea height.
  // Keep the prompt node usable and prevent SCENE from pushing color slots off-screen.
  return 360;
}

function k2cfPromptTextHeightInRange(key, h) {
  const value = Math.round(Number(h) || 0);
  return Number.isFinite(value) && value >= 45 && value <= k2cfMaxPromptTextHeightForKey(key);
}

function k2cfSanitizePromptTextHeights(heights = {}) {
  const out = {};
  if (!heights || typeof heights !== "object") return out;
  for (const [key, value] of Object.entries(heights)) {
    const next = Math.round(Number(value) || 0);
    if (k2cfPromptTextHeightInRange(key, next)) out[key] = next;
  }
  return out;
}

function k2cfIsLikelyDefaultTextHeight(key, h) {
  const value = Math.round(Number(h) || 0);
  if (!Number.isFinite(value) || value < 45) return false;
  return Math.abs(value - k2cfDefaultTextHeightForKey(key)) <= 18;
}

function k2cfPromptTextHeightMeaningful(key, h, manual = false) {
  const value = Math.round(Number(h) || 0);
  if (!k2cfPromptTextHeightInRange(key, value)) return false;
  return Boolean(manual) || !k2cfIsLikelyDefaultTextHeight(key, value);
}

function k2cfPromptUiHasMeaningfulState(value) {
  const data = k2cfReadJsonObject(value);
  if (!data || typeof data !== "object") return false;
  const heights = data.textHeights && typeof data.textHeights === "object" ? data.textHeights : {};
  const manual = data.textHeightManual && typeof data.textHeightManual === "object" ? data.textHeightManual : {};
  if (Object.entries(heights).some(([key, h]) => k2cfPromptTextHeightMeaningful(key, h, manual[key]))) return true;
  if (String(data.scenePreset || "").trim()) return true;
  const slotPreset = data.slotPreset && typeof data.slotPreset === "object" ? data.slotPreset : {};
  if (Object.values(slotPreset).some((v) => String(v || "").trim())) return true;
  const slotValues = data.slotValues && typeof data.slotValues === "object" ? data.slotValues : {};
  for (const value of Object.values(slotValues)) {
    if (!value || typeof value !== "object") continue;
    if (String(value.type || "obj") !== "obj") return true;
    if (String(value.framing || "Auto") !== "Auto") return true;
    if (String(value.angle || "Auto") !== "Auto") return true;
    if (value.textStyle?.mode === "individual") return true;
  }
  if (k2cfNormalizeNodeSize(data.nodeSize)) return true;
  if (data.wrapSize && (Number(data.wrapSize.h || 0) >= 45 || Number(data.wrapSize.w || 0) >= 80)) return true;
  const defaults = { red: true, blue: true, yellow: true, green: false, magenta: false };
  const slotOpen = data.slotOpen && typeof data.slotOpen === "object" ? data.slotOpen : {};
  return Object.keys(defaults).some((k) => slotOpen[k] !== undefined && Boolean(slotOpen[k]) !== defaults[k]);
}

function k2cfElementPixelHeight(el) {
  if (!el) return 0;
  // Native textarea resize can appear as inline style, offsetHeight, or computed height depending on browser/front-end timing.
  const candidates = [];
  const inlineHeight = Math.round(parseFloat(el.style?.height || "0") || 0);
  if (inlineHeight > 0) candidates.push(inlineHeight);
  const offset = Math.round(el.offsetHeight || 0);
  if (offset > 0) candidates.push(offset);
  try {
    const computed = Math.round(parseFloat(window.getComputedStyle(el).height || "0") || 0);
    if (computed > 0) candidates.push(computed);
  } catch (_) {}
  return candidates.length ? Math.max(...candidates) : 0;
}

function k2cfNormalizeNodeSize(size) {
  if (!Array.isArray(size) || size.length < 2) return null;
  const w = Math.round(Number(size[0]) || 0);
  const h = Math.round(Number(size[1]) || 0);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 80 || h < 60) return null;
  return [w, h];
}

function k2cfSameNodeSize(a, b, tolerance = 1) {
  const aa = k2cfNormalizeNodeSize(a);
  const bb = k2cfNormalizeNodeSize(b);
  return !!aa && !!bb && Math.abs(aa[0] - bb[0]) <= tolerance && Math.abs(aa[1] - bb[1]) <= tolerance;
}

function k2cfIsLegacyBugNodeSize(kind, size) {
  const current = k2cfNormalizeNodeSize(size);
  if (kind !== "prompt" || !current) return false;
  return K2CF_PROMPT_LEGACY_BUG_SIZES.some((legacy) => k2cfSameNodeSize(current, legacy));
}

function k2cfMaybeUpgradeLegacyBugNodeSize(node, kind, defaultSize = null) {
  if (k2cfIsWorkflowLoading() || node?.__k2cfWorkflowConfigured) return;
  const desired = k2cfNormalizeNodeSize(defaultSize);
  if (!node || !desired || !k2cfIsLegacyBugNodeSize(kind, node.__k2cfConfiguredSize || node.size)) return;
  const explicitSizeState = k2cfReadNodeSizeState(node, kind);
  if (explicitSizeState) return;
  node.__k2cfConfiguredSize = desired.slice();
  node.__k2cfPreferredNodeSize = desired.slice();
  node.__k2cfLastSavedNodeSize = desired.slice();
  k2cfApplyNodeSize(node, desired);
}

function k2cfNodeSizeProp(kind) {
  return kind === "prompt" ? "k2cfPromptNodeSize" : "k2cfCanvasNodeSize";
}

function k2cfReadNodeSizeState(node, kind) {
  const prop = node?.properties?.[k2cfNodeSizeProp(kind)];
  const configuredProp = kind === "prompt" ? node?.__k2cfConfiguredPromptNodeSize : node?.__k2cfConfiguredCanvasNodeSize;
  const states = [prop, configuredProp].filter((state) => k2cfNormalizeNodeSize(state?.size));
  if (states.length) return k2cfPickLatestState(states);
  const local = k2cfReadLocalState(node, `${kind}_node_size`);
  return k2cfNormalizeNodeSize(local?.size) ? local : null;
}

function k2cfSavedOrConfiguredNodeSize(node, kind) {
  return k2cfNormalizeNodeSize(k2cfReadNodeSizeState(node, kind)?.size) ||
    k2cfNormalizeNodeSize(node?.__k2cfConfiguredSize) ||
    null;
}

function k2cfPreferredNodeSize(node, kind, defaultSize = null) {
  // Do not use defaultSize as a restore target. Defaults are only for first creation; persisted/configured/manual size wins.
  return k2cfNormalizeNodeSize(node?.__k2cfPreferredNodeSize) ||
    k2cfSavedOrConfiguredNodeSize(node, kind) ||
    k2cfNormalizeNodeSize(node?.size);
}

function k2cfMaybeInitializeNodeSize(node, kind, defaultSize = null) {
  if (k2cfIsWorkflowLoading() || node?.__k2cfWorkflowConfigured) return;
  const desired = k2cfNormalizeNodeSize(defaultSize);
  if (!node || !desired || k2cfSavedOrConfiguredNodeSize(node, kind) || node.__k2cfInitialSizeApplied) return;
  const current = k2cfNormalizeNodeSize(node.size);
  const tooSmall = !current || current[0] < Math.round(desired[0] * 0.75) || current[1] < Math.round(desired[1] * 0.65);
  if (!tooSmall) return;
  node.__k2cfInitialSizeApplied = true;
  k2cfApplyNodeSize(node, desired);
  try { app.graph?.setDirtyCanvas?.(true, true); } catch (_) {}
}

function k2cfGuardNodeAutoSize(node, ms = 1800) {
  if (!node) return;
  const until = (typeof performance !== "undefined" ? performance.now() : Date.now()) + ms;
  node.__k2cfIgnoreAutoNodeSizeUntil = Math.max(Number(node.__k2cfIgnoreAutoNodeSizeUntil || 0), until);
}

function k2cfNodeAutoSizeGuarded(node) {
  if (!node) return false;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  return now < Number(node.__k2cfIgnoreAutoNodeSizeUntil || 0);
}

function k2cfLikelyManualNodeResize(node) {
  const appObj = window.comfyAPI?.app?.app || app;
  const canvas = appObj?.canvas || app?.canvas || appObj?.graphcanvas || null;
  if (!canvas || !node) return false;
  return canvas.resizing_node === node ||
    canvas.node_resizing === node ||
    canvas.node_being_resized === node ||
    canvas.selected_resizing_node === node ||
    canvas.current_node_resizing === node;
}

function k2cfCommitNodeSizeState(node, kind, size, savedAt = Date.now()) {
  const normalized = k2cfNormalizeNodeSize(size);
  if (!node || !normalized) return null;
  const state = { version: "node_size_v19", size: normalized, saved_at: savedAt };
  node.__k2cfPreferredNodeSize = normalized.slice();
  node.__k2cfLastSavedNodeSize = normalized.slice();
  node.properties = node.properties || {};
  node.properties[k2cfNodeSizeProp(kind)] = state;
  k2cfWriteLocalState(node, `${kind}_node_size`, state);
  return state;
}

function k2cfSaveNodeSize(node, kind, markDirty = false, force = false) {
  const size = k2cfNormalizeNodeSize(node?.size);
  if (!node || !size || node.__k2cfRestoringNodeSize || k2cfIsWorkflowLoading()) return;
  // ComfyUI 0.26 workflow-tab restore can auto-fit DOM widgets shortly after the node is rebuilt.
  // Do not let that transient auto-size overwrite the user's last manual size.
  if (!force && k2cfNodeAutoSizeGuarded(node) && !k2cfLikelyManualNodeResize(node)) return;
  if (k2cfSameNodeSize(size, node.__k2cfLastSavedNodeSize)) return;
  k2cfCommitNodeSizeState(node, kind, size);
  if (markDirty) {
    try { app.graph?.setDirtyCanvas?.(true, true); } catch (_) {}
  }
}

function k2cfApplyNodeSize(node, size) {
  const desired = k2cfNormalizeNodeSize(size);
  if (!node || !desired) return;
  const current = k2cfNormalizeNodeSize(node.size);
  if (current && k2cfSameNodeSize(current, desired)) return;
  node.__k2cfRestoringNodeSize = true;
  try {
    if (typeof node.setSize === "function") node.setSize(desired.slice());
    else node.size = desired.slice();
  } catch (_) {
    node.size = desired.slice();
  } finally {
    node.__k2cfRestoringNodeSize = false;
  }
}

function k2cfScheduleNodeSizeRestore(node, kind, defaultSize = null) {
  if (!node) return;
  const generation = node.__k2cfSizeRestoreGeneration = (node.__k2cfSizeRestoreGeneration || 0) + 1;
  if (k2cfIsWorkflowLoading()) return;
  const desired = k2cfNormalizeNodeSize(node.__k2cfPreferredNodeSize) || k2cfSavedOrConfiguredNodeSize(node, kind);
  if (!desired) return;
  node.__k2cfPreferredNodeSize = desired.slice();
  k2cfGuardNodeAutoSize(node, 2200);
  const restore = () => {
    if (generation !== node.__k2cfSizeRestoreGeneration || k2cfIsWorkflowLoading()) return;
    if (!node.graph && !app?.graph?._nodes?.includes?.(node)) return;
    const current = k2cfNormalizeNodeSize(node.size);
    const preferred = k2cfNormalizeNodeSize(node.__k2cfPreferredNodeSize) || k2cfSavedOrConfiguredNodeSize(node, kind) || desired;
    if (preferred && (!current || !k2cfSameNodeSize(current, preferred))) {
      k2cfGuardNodeAutoSize(node, 500);
      k2cfApplyNodeSize(node, preferred);
    }
  };
  try { requestAnimationFrame(() => restore()); } catch (_) { setTimeout(restore, 0); }
}

function k2cfInstallNodeSizePersistence(node, kind, defaultSize = null) {
  if (!node || node.__k2cfNodeSizePersistenceInstalled) return;
  node.__k2cfNodeSizePersistenceInstalled = true;
  node.__k2cfNodeSizeKind = kind;
  node.__k2cfNodeSizeDefault = defaultSize;
  const preferred = k2cfSavedOrConfiguredNodeSize(node, kind);
  if (preferred) {
    node.__k2cfPreferredNodeSize = preferred.slice();
    node.__k2cfLastSavedNodeSize = preferred.slice();
  }
  node.__k2cfNodeSizeSnapshot = (markDirty = false, force = false) => k2cfSaveNodeSize(node, kind, markDirty, force);

  const oldComputeSize = node.computeSize;
  if (typeof oldComputeSize === "function" && !node.__k2cfComputeSizePatched) {
    node.computeSize = function () {
      const computed = k2cfNormalizeNodeSize(oldComputeSize.apply(this, arguments)) || k2cfNormalizeNodeSize(this.size) || [80, 60];
      const preferredSize = k2cfPreferredNodeSize(this, kind, defaultSize);
      if (!preferredSize) return computed;
      // Auto-fit should never be allowed to shrink below the persisted user size.
      return [Math.max(computed[0], preferredSize[0]), Math.max(computed[1], preferredSize[1])];
    };
    node.__k2cfComputeSizePatched = true;
  }

  const oldSetSize = node.setSize;
  if (typeof oldSetSize === "function" && !node.__k2cfSetSizePatched) {
    node.setSize = function () {
      const result = oldSetSize.apply(this, arguments);
      if (this.__k2cfRestoringNodeSize) return result;
      const current = k2cfNormalizeNodeSize(this.size);
      const preferredSize = k2cfPreferredNodeSize(this, kind, defaultSize);
      if (k2cfNodeAutoSizeGuarded(this) && !k2cfLikelyManualNodeResize(this)) {
        if (preferredSize && current && !k2cfSameNodeSize(current, preferredSize)) {
          setTimeout(() => k2cfScheduleNodeSizeRestore(this, kind, defaultSize), 0);
        }
        return result;
      }
      k2cfSaveNodeSize(this, kind, true, k2cfLikelyManualNodeResize(this));
      return result;
    };
    node.__k2cfSetSizePatched = true;
  }

  const oldOnResize = node.onResize;
  node.onResize = function () {
    const result = oldOnResize?.apply(this, arguments);
    if (this.__k2cfRestoringNodeSize) return result;
    if (k2cfNodeAutoSizeGuarded(this) && !k2cfLikelyManualNodeResize(this)) {
      const preferredSize = k2cfPreferredNodeSize(this, kind, defaultSize);
      if (preferredSize && !k2cfSameNodeSize(this.size, preferredSize)) {
        setTimeout(() => k2cfScheduleNodeSizeRestore(this, kind, defaultSize), 0);
      }
      return result;
    }
    k2cfSaveNodeSize(this, kind, true, k2cfLikelyManualNodeResize(this));
    return result;
  };

  // Poll briefly after creation because some ComfyUI 0.26 tab switches mutate node.size directly.
  let lastSize = k2cfNormalizeNodeSize(node.size);
  let ticks = 0;
  const interval = setInterval(() => {
    if (!node.graph && !app?.graph?._nodes?.includes?.(node)) { clearInterval(interval); return; }
    const current = k2cfNormalizeNodeSize(node.size);
    if (current && lastSize && !k2cfSameNodeSize(current, lastSize)) {
      if (k2cfNodeAutoSizeGuarded(node)) k2cfScheduleNodeSizeRestore(node, kind, defaultSize);
      else k2cfSaveNodeSize(node, kind, true);
      lastSize = current;
    }
    if (++ticks > 120) clearInterval(interval);
  }, 250);
}

function k2cfIsDefaultValue(name, value) {
  const s = String(value ?? "").trim();
  if (!s) return true;
  if (name === "width") return s === String(DEFAULT_WIDTH);
  if (name === "height") return s === String(DEFAULT_HEIGHT);
  if (name === "preset") return s === DEFAULT_PRESET;
  if (name === "layout_data") {
    try { return !k2cfParseCanvasLayout(s).boxes?.length; }
    catch (_) { return false; }
  }
  if (name === "camera_data") return !k2cfJsonHasValues(s) || s === '{"iso":"","shutter":"","aperture":"","focal_length":""}';
  if (name === "camera_set_data" || name === "canvas_preset_data") return !k2cfJsonHasValues(s) || s === '{"sets":[],"selected":""}';
  if (name === "grid_mode") return s === "Thirds";
  if (name === "ui_language") return s === "Auto";
  if (name === "prompt_ui_data") return !k2cfPromptUiHasMeaningfulState(s);
  if (name.endsWith("_prompt") || name === "scene") return !s;
  if (name.endsWith("_type")) return !s || s === "obj";
  return !s;
}

function k2cfMergeWithPrevious(widgetNames, values, previousValues) {
  if (!Array.isArray(values) || !Array.isArray(previousValues)) return values;
  return values.map((value, i) => {
    const name = widgetNames[i];
    const previous = previousValues[i];
    if (previous === undefined || previous === null) return value;
    if (k2cfIsDefaultValue(name, value) && !k2cfIsDefaultValue(name, previous)) return previous;
    return value;
  });
}

function k2cfPersistWidgetSnapshot(node, kind, widgetNames, version = "v15") {
  const previous = k2cfBestSavedState(node, kind);
  const currentWidgetValues = k2cfWidgetValues(node, widgetNames);
  const values = kind === "prompt"
    ? k2cfSanitizePromptValues(currentWidgetValues)
    : k2cfMergeWithPrevious(widgetNames, currentWidgetValues, previous?.widgets_values);
  if (!k2cfHasMeaningfulState(values)) return;
  node.properties = node.properties || {};
  const state = { version, widgets_values: values.slice(), saved_at: Date.now() };
  ;
  if (kind === "prompt") node.properties.k2cfPromptState = state;
  ;
  if (kind === "canvas") node.properties.k2cfCanvasState = state;
  k2cfWriteLocalState(node, kind, state);
}

function applyConfiguredValuesToWidgets(node, widgetNames, values) {
  ;
  if (!Array.isArray(values)) return;
  widgetNames.forEach((name, i) => {
    const w = widget(node, name);
    if (w && values[i] !== undefined && values[i] !== null) {
      w.value = values[i];
      w.serialize = true;
      w.options = w.options || {};
      w.options.serialize = true;
    }
  });
}

function installNodePersistenceHooks(node, syncFn, widgetNames, tag) {
  if (!node || node[`__${tag}PersistenceInstalled`]) return;
  node[`__${tag}PersistenceInstalled`] = true;
  node[`__${tag}Sync`] = syncFn;

  const kind = tag.startsWith("k2cfPrompt") ? "prompt" : ("canvas");

  const snapshot = () => {
    try { node.__k2cfPromptUiSnapshot?.(); } catch (_) {}
    try { node.__k2cfNodeSizeSnapshot?.(); } catch (_) {}
    const previous = k2cfBestSavedState(node, kind);
    syncFn?.(false);
    const currentValues = k2cfWidgetValues(node, widgetNames);
    const values = kind === "prompt"
      ? (node.__k2cfAllowDefaultOverwrite
        ? k2cfSanitizePromptValues(currentValues)
        : k2cfSanitizePromptValues(k2cfMergeWithPrevious(widgetNames, currentValues, previous?.widgets_values)))
      : node.__k2cfAllowDefaultOverwrite
        ? currentValues
        : k2cfMergeWithPrevious(widgetNames, currentValues, previous?.widgets_values);
    if (kind !== "prompt" && !node.__k2cfAllowDefaultOverwrite && !k2cfHasMeaningfulState(values) && previous) {
      applyConfiguredValuesToWidgets(node, widgetNames, previous.widgets_values);
      node.properties = node.properties || {};
      if (kind === "prompt") node.properties.k2cfPromptState = previous;
      ;
      if (kind === "canvas") node.properties.k2cfCanvasState = previous;
      k2cfWriteLocalState(node, kind, previous);
      return previous.widgets_values.slice();
    }
    node.properties = node.properties || {};
    const state = { version: "v15", widgets_values: values.slice(), saved_at: Date.now() };
    ;
    if (kind === "prompt") node.properties.k2cfPromptState = state;
    ;
    if (kind === "canvas") node.properties.k2cfCanvasState = state;
    k2cfWriteLocalState(node, kind, state);
    return values;
  };

  // Serialization must be read-only. ComfyUI's ChangeTracker captures the live
  // graph before saving; mutating node.properties (especially saved_at) while
  // serialize() is running makes the live canvas immediately newer than the
  // captured snapshot and causes the workflow save guard to refuse the write.
  const serializedValues = () => {
    const propName = kind === "prompt"
      ? "k2cfPromptState"
      : ("k2cfCanvasState");
    const configuredState = kind === "prompt"
      ? node.__k2cfConfiguredPromptState
      : (node.__k2cfConfiguredCanvasState);
    const savedState = node?.properties?.[propName];
    const previousValues = Array.isArray(savedState?.widgets_values)
      ? savedState.widgets_values.slice()
      : (Array.isArray(configuredState?.widgets_values) ? configuredState.widgets_values.slice() : null);
    const currentValues = k2cfWidgetValues(node, widgetNames);

    if (kind === "prompt") {
      return node.__k2cfAllowDefaultOverwrite
        ? k2cfSanitizePromptValues(currentValues)
        : k2cfSanitizePromptValues(k2cfMergeWithPrevious(widgetNames, currentValues, previousValues));
    }
    ;
    return node.__k2cfAllowDefaultOverwrite
      ? currentValues
      : k2cfMergeWithPrevious(widgetNames, currentValues, previousValues);
  };

  const applyCurrentStateToSerializedData = (data) => {
    const values = serializedValues();
    if (data) {
      data.widgets_values = values;
      // Keep the properties already cloned by ComfyUI; live nested state may be reactive.
      const size = k2cfNormalizeNodeSize(node.size);
      if (size) data.size = size.slice();
    }
    return values;
  };

  const oldOnSerialize = node.onSerialize;
  node.onSerialize = function (data) {
    const result = oldOnSerialize?.apply(this, arguments);
    if (data) applyCurrentStateToSerializedData(data);
    return result;
  };

  const appObj = window.comfyAPI?.app?.app || app;
  const snapshotGraphNodes = () => {
    try {
      for (const n of appObj?.graph?._nodes || app?.graph?._nodes || []) {
        if (n.type !== CANVAS_NODE && n.type !== PROMPT_NODE && n.comfyClass !== CANVAS_NODE && n.comfyClass !== PROMPT_NODE) continue;
        n.__k2cfPromptUiSnapshot?.(false, false);
        n.__k2cfNodeSizeSnapshot?.(false);
        n.__k2cfCanvasSync?.(false);
        n.__k2cfPromptSync?.(false);
      }
    } catch (_) {}
  };
  if (appObj && !window.__mossQueuePersistenceInstalledV19) {
    const originalQueuePrompt = appObj.queuePrompt?.bind(appObj);
    if (originalQueuePrompt) {
      appObj.queuePrompt = function () {
        snapshotGraphNodes();
        return originalQueuePrompt(...arguments);
      };
      window.__mossQueuePersistenceInstalledV19 = true;
    }
  }
  if (appObj && !window.__mossGraphToPromptPersistenceInstalledV19) {
    const originalGraphToPrompt = appObj.graphToPrompt?.bind(appObj);
    if (originalGraphToPrompt) {
      appObj.graphToPrompt = function () {
        snapshotGraphNodes();
        return originalGraphToPrompt(...arguments);
      };
      window.__mossGraphToPromptPersistenceInstalledV19 = true;
    }
  }
}

function k2cfSnapshotAllPromptUi(markDirty = false, allowShrink = false) {
  const appObj = window.comfyAPI?.app?.app || app;
  const nodes = appObj?.graph?._nodes || app?.graph?._nodes || [];
  for (const n of nodes) {
    if (n.type !== CANVAS_NODE && n.type !== PROMPT_NODE && n.comfyClass !== CANVAS_NODE && n.comfyClass !== PROMPT_NODE) continue;
    try { n.__k2cfPromptUiSnapshot?.(markDirty, allowShrink); } catch (_) {}
    try { n.__k2cfNodeSizeSnapshot?.(markDirty); } catch (_) {}
    try { n.__k2cfCanvasSync?.(false); } catch (_) {}
    try { n.__k2cfPromptSync?.(false); } catch (_) {}
  }
}

function k2cfInstallPromptUiLifecycleHooks() {
  if (window.__mossPromptUiLifecycleInstalledV19) return;
  window.__mossPromptUiLifecycleInstalledV19 = true;
  const snapshot = () => k2cfSnapshotAllPromptUi(true);
  window.addEventListener("pagehide", snapshot, true);
  window.addEventListener("beforeunload", snapshot, true);
  window.addEventListener("blur", snapshot, true);
  document.addEventListener("visibilitychange", () => { if (document.hidden) snapshot(); }, true);
  // ComfyUI 0.26 workflow tabs can swap graphs without firing textarea blur/serialize first.
  // Capture before any tab click removes/recreates the DOM widget.
  document.addEventListener("pointerdown", snapshot, true);
  document.addEventListener("mouseup", snapshot, true);
  document.addEventListener("keyup", snapshot, true);
  document.addEventListener("focusout", snapshot, true);
  window.addEventListener("resize", snapshot, true);
}

function k2cfInstallWorkflowLoadHook() {
  const appObj = window.comfyAPI?.app?.app || app;
  if (!appObj || window.__mossWorkflowLoadHookInstalledV25) return;
  for (const name of ["loadGraphData", "loadGraph", "loadWorkflow"]) {
    const original = appObj[name];
    if (typeof original !== "function" || original.__mossPatched) continue;
    appObj[name] = function () {
      const outermost = !appObj.__mossWorkflowLoadDepth;
      appObj.__mossWorkflowLoadDepth = Number(appObj.__mossWorkflowLoadDepth || 0) + 1;
      if (outermost) {
        const graph = appObj.rootGraph || appObj.graph;
        if (graph) delete graph.__mossStateId;
        for (const node of graph?._nodes || []) {
          if (node.type !== CANVAS_NODE && node.type !== PROMPT_NODE && node.comfyClass !== CANVAS_NODE && node.comfyClass !== PROMPT_NODE) continue;
          if (node.__k2cfNodeSizeKind) node.__k2cfSizeRestoreGeneration = (node.__k2cfSizeRestoreGeneration || 0) + 1;
        }
      }
      const finish = () => {
        appObj.__mossWorkflowLoadDepth -= 1;
        if (appObj.__mossWorkflowLoadDepth) return;
        const graph = appObj.rootGraph || appObj.graph;
        try { k2cfSetWorkflowStorageId(graph); } catch (_) {}
        for (const node of graph?._nodes || []) {
          if (node.type !== CANVAS_NODE && node.type !== PROMPT_NODE && node.comfyClass !== CANVAS_NODE && node.comfyClass !== PROMPT_NODE) continue;
          if (node.__k2cfNodeSizeKind) {
            k2cfScheduleNodeSizeRestore(node, node.__k2cfNodeSizeKind, node.__k2cfNodeSizeDefault);
          }
        }
      };
      let result;
      try { result = original.apply(this, arguments); }
      catch (error) { finish(); throw error; }
      if (result && typeof result.then === "function") return Promise.resolve(result).finally(finish);
      finish();
      return result;
    };
    appObj[name].__mossPatched = true;
  }
  window.__mossWorkflowLoadHookInstalledV25 = true;
}

const CAMERA_OPTIONS = {
  iso: ["", "100", "200", "400", "800", "1600", "3200", "6400"],
  shutter: ["", "1/30", "1/60", "1/125", "1/250", "1/500", "1/1000"],
  aperture: ["", "f/1.4", "f/1.8", "f/2.0", "f/2.8", "f/4", "f/5.6", "f/8", "f/11"],
  focal_length: ["", "16mm", "20mm", "24mm", "28mm", "35mm", "50mm", "85mm", "105mm", "135mm", "200mm"],
};

const TYPE_OPTIONS = [["obj", "Object"],["text", "Text"]];

const CANVAS_WIDGETS = ["width", "height", "preset", "layout_data", "camera_data", "grid_mode", "ui_language", "camera_set_data", "canvas_preset_data"];

const PROMPT_WIDGETS = [
  "scene", "background",
  "red_prompt", "blue_prompt", "yellow_prompt", "green_prompt", "magenta_prompt",
  "red_type", "blue_type", "yellow_type", "green_type", "magenta_type",
  "prompt_ui_data",
  "red_framing", "blue_framing", "yellow_framing", "green_framing", "magenta_framing",
  "red_angle", "blue_angle", "yellow_angle", "green_angle", "magenta_angle",
];

function k2cfIsLegacyRedTestResidue(values) {
  if (!Array.isArray(values) || values.length < 2) return false;
  if (String(values[2] ?? "").trim() !== "1111") return false;
  for (const i of [0, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    if (String(values[i] ?? "").trim()) return false;
  }
  return true;
}

function k2cfSanitizePromptValues(values) {
  if (!Array.isArray(values)) return values;
  const next = values.slice();
  if (k2cfIsLegacyRedTestResidue(next)) next[2] = "";
  if (typeof next[11] === "string" && next[11].trim().startsWith("{")) {
    try {
      const ui = JSON.parse(next[11]);
      const pv = ui?.promptValues;
      if (pv && String(pv.red_prompt ?? "").trim() === "1111") {
        const others = ["scene", "blue_prompt", "yellow_prompt", "green_prompt", "magenta_prompt", "red_type", "blue_type", "yellow_type", "green_type", "magenta_type"];
        if (others.every((k) => !String(pv[k] ?? "").trim())) {
          pv.red_prompt = "";
          next[11] = JSON.stringify(ui);
        }
      }
    } catch (_) {}
  }
  return next;
}

function widget(node, name) {
  return node.widgets?.find((w) => w.name === name);
}

function hideWidget(w) {
  if (!w) return;
  w.serialize = true;
  w.options = w.options || {};
  w.options.serialize = true;
  w.options.hidden = true;
  w.hidden = true;
  w.type = "hidden";
  w.computeSize = () => [0, -4];
}

function hideWidgetsByName(node, names) {
  for (const name of names) hideWidget(widget(node, name));
}

function stop(ev) {
  ev.stopPropagation();
}

function k2cfIsWheelInteractiveTarget(target) {
  const el = target?.closest?.("input, textarea, select, button, option, [contenteditable='true'], .moss-k2cf-overlay, .moss-k2cf-screen");
  return !!el;
}

function k2cfIsPointerInteractiveTarget(target) {
  const el = target?.closest?.("input, textarea, select, button, option, [contenteditable='true'], .moss-k2cf-overlay, .moss-k2cf-screen, .moss-k2cf-slot-head");
  return !!el;
}

function k2cfGraphCanvas() {
  return app?.canvas?.canvas || window.comfyAPI?.app?.app?.canvas?.canvas;
}

function k2cfForwardWheelToGraph(ev) {
  if (k2cfIsWheelInteractiveTarget(ev.target)) return;
  const canvasEl = k2cfGraphCanvas();
  if (!canvasEl) return;
  ev.preventDefault();
  ev.stopPropagation();
  const forwarded = new WheelEvent("wheel", {
    bubbles: true,
    cancelable: true,
    view: window,
    deltaX: ev.deltaX,
    deltaY: ev.deltaY,
    deltaZ: ev.deltaZ,
    deltaMode: ev.deltaMode,
    clientX: ev.clientX,
    clientY: ev.clientY,
    screenX: ev.screenX,
    screenY: ev.screenY,
    ctrlKey: ev.ctrlKey,
    shiftKey: ev.shiftKey,
    altKey: ev.altKey,
    metaKey: ev.metaKey,
  });
  canvasEl.dispatchEvent(forwarded);
}

function k2cfAllowWheelZoomOnEmptySpace(wrap) {
  wrap?.addEventListener?.("wheel", k2cfForwardWheelToGraph, { passive: false, capture: true });
}

function k2cfForwardMouseEventToGraph(type, ev, canvasEl) {
  const forwarded = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    view: window,
    button: ev.button,
    buttons: ev.buttons,
    clientX: ev.clientX,
    clientY: ev.clientY,
    screenX: ev.screenX,
    screenY: ev.screenY,
    ctrlKey: ev.ctrlKey,
    shiftKey: ev.shiftKey,
    altKey: ev.altKey,
    metaKey: ev.metaKey,
  });
  canvasEl.dispatchEvent(forwarded);
}

function k2cfPanGraphBy(dx, dy) {
  const graphCanvas = app?.canvas || window.comfyAPI?.app?.app?.canvas;
  const ds = graphCanvas?.ds;
  if (!ds?.offset) return false;
  const scale = Number(ds.scale) || 1;
  ds.offset[0] += dx / scale;
  ds.offset[1] += dy / scale;
  graphCanvas.setDirty?.(true, true);
  graphCanvas.draw?.(true, true);
  return true;
}

function k2cfSetPanCursor(active) {
  document.body.style.cursor = active ? "grabbing" : "";
}

let k2cfMiddlePanStartedAt = 0;

function k2cfStartMiddlePan(ev, moveType, upType, cancelType) {
  if (ev.button !== 1) return false;
  if (k2cfIsPointerInteractiveTarget(ev.target)) return false;
  const canvasEl = k2cfGraphCanvas();
  if (!canvasEl) return false;
  const now = Date.now();
  if (now - k2cfMiddlePanStartedAt < 80) return true;
  k2cfMiddlePanStartedAt = now;
  ev.preventDefault();
  ev.stopPropagation();
  let lastX = ev.clientX;
  let lastY = ev.clientY;
  k2cfSetPanCursor(true);
  const directMove = (moveEv) => {
    moveEv.preventDefault();
    moveEv.stopPropagation();
    const dx = moveEv.clientX - lastX;
    const dy = moveEv.clientY - lastY;
    lastX = moveEv.clientX;
    lastY = moveEv.clientY;
    if (!k2cfPanGraphBy(dx, dy)) k2cfForwardMouseEventToGraph("mousemove", moveEv, canvasEl);
  };
  const directUp = (upEv) => {
    upEv.preventDefault();
    upEv.stopPropagation();
    k2cfSetPanCursor(false);
    window.removeEventListener(moveType, directMove, true);
    window.removeEventListener(upType, directUp, true);
    if (cancelType) window.removeEventListener(cancelType, directUp, true);
  };
  window.addEventListener(moveType, directMove, true);
  window.addEventListener(upType, directUp, true);
  if (cancelType) window.addEventListener(cancelType, directUp, true);
  return true;
}

function k2cfAllowGraphPanOnEmptySpace(wrap) {
  wrap?.addEventListener?.("pointerdown", (ev) => {
    k2cfStartMiddlePan(ev, "pointermove", "pointerup", "pointercancel");
  }, true);
  wrap?.addEventListener?.("auxclick", (ev) => {
    if (ev.button === 1 && !k2cfIsPointerInteractiveTarget(ev.target)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }, true);
  wrap?.addEventListener?.("mousedown", (ev) => {
    if (ev.button !== 0 && ev.button !== 1) return;
    if (k2cfIsPointerInteractiveTarget(ev.target)) return;
    const canvasEl = k2cfGraphCanvas();
    if (!canvasEl) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (k2cfStartMiddlePan(ev, "mousemove", "mouseup")) return;
    k2cfForwardMouseEventToGraph("mousedown", ev, canvasEl);

    const forwardMove = (moveEv) => {
      moveEv.preventDefault();
      moveEv.stopPropagation();
      k2cfForwardMouseEventToGraph("mousemove", moveEv, canvasEl);
    };
    const stopForwarding = (upEv) => {
      upEv.preventDefault();
      upEv.stopPropagation();
      k2cfForwardMouseEventToGraph("mouseup", upEv, canvasEl);
      window.removeEventListener("mousemove", forwardMove, true);
      window.removeEventListener("mouseup", stopForwarding, true);
    };
    window.addEventListener("mousemove", forwardMove, true);
    window.addEventListener("mouseup", stopForwarding, true);
  }, true);
}

function button(text, title) {
  const el = document.createElement("button");
  el.className = "moss-k2cf-btn";
  el.textContent = text;
  el.title = title || "";
  el.addEventListener("pointerdown", stop);
  return el;
}

function ensureStyle() {
  if (document.getElementById("moss-bbox-controls-style-v1")) return;
  const style = document.createElement("style");
  style.id = "moss-bbox-controls-style-v1";
  style.textContent = `
    .moss-k2cf-wrap{display:flex;flex-direction:column;gap:8px;color:#ddd;font:12px sans-serif;height:100%;min-height:0;overflow:hidden}
    .moss-k2cf-toolbar{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}
    .moss-k2cf-tools,.moss-k2cf-sizebar{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
    .moss-k2cf-monitor{background:#070707;border:1px solid #2d2d2d;border-radius:10px;padding:9px;min-height:590px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:1;min-width:0}
    .moss-k2cf-screen{position:relative;background:#111;border:2px solid #222;border-radius:9px;overflow:hidden;line-height:0;max-width:100%;max-height:100%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.03)}
    .moss-k2cf-bg,.moss-k2cf-overlay{display:block}.moss-k2cf-bg{background:#202424}.moss-k2cf-overlay{position:absolute;inset:0;touch-action:none;cursor:crosshair}
    .moss-k2cf-guide{position:absolute;inset:0;pointer-events:none}
    .moss-k2cf-guide.thirds{background-image:linear-gradient(90deg,transparent 32.9%,rgba(255,255,255,.22) 33%,rgba(255,255,255,.22) 33.2%,transparent 33.3%,transparent 66.4%,rgba(255,255,255,.22) 66.6%,rgba(255,255,255,.22) 66.8%,transparent 67%),linear-gradient(0deg,transparent 32.9%,rgba(255,255,255,.18) 33%,rgba(255,255,255,.18) 33.2%,transparent 33.3%,transparent 66.4%,rgba(255,255,255,.18) 66.6%,rgba(255,255,255,.18) 66.8%,transparent 67%)}
    .moss-k2cf-guide.cross{background-image:linear-gradient(90deg,transparent 49.8%,rgba(255,255,255,.25) 50%,rgba(255,255,255,.25) 50.2%,transparent 50.4%),linear-gradient(0deg,transparent 49.8%,rgba(255,255,255,.22) 50%,rgba(255,255,255,.22) 50.2%,transparent 50.4%)}
    .moss-k2cf-guide.diagonal{background-image:linear-gradient(34deg,transparent 49.7%,rgba(255,255,255,.16) 50%,transparent 50.3%),linear-gradient(146deg,transparent 49.7%,rgba(255,255,255,.16) 50%,transparent 50.3%)}
    .moss-k2cf-panels{display:grid;grid-template-columns:minmax(150px,.62fr) minmax(280px,1.38fr);gap:8px;flex:0 0 auto}
    .moss-k2cf-panel{background:#181818;border:1px solid #333;border-radius:7px;padding:5px;min-width:0}
    .moss-k2cf-panel h4{margin:0 0 4px;color:#35d0c8;font-size:11px}
    .moss-k2cf-camera-panel{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));align-items:flex-start;gap:10px}
    .moss-k2cf-compact-group{display:flex;flex-direction:column;gap:6px;min-width:0}
    .moss-k2cf-section-label{color:#35d0c8;font-size:11px;font-weight:700;line-height:1}
    .moss-k2cf-note{color:#8f9b9b;font-size:10.5px;line-height:1.25;max-width:100%;overflow-wrap:anywhere}
    .moss-k2cf-camera-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,82px));gap:5px;justify-content:start}
    .moss-k2cf-camera-head{display:flex;gap:8px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;margin-bottom:5px}
    .moss-k2cf-camera-setbar,.moss-k2cf-canvas-presetbar{display:flex;gap:5px;align-items:center;flex-wrap:wrap;min-width:0}
    .moss-k2cf-canvas-presetbar select{flex:1 1 82px;min-width:74px;max-width:120px}
    .moss-k2cf-canvas-presetbar .moss-k2cf-btn{flex:0 1 auto}
    .moss-k2cf-camera-setbar select{min-width:120px}
    .moss-k2cf-inline-label{font-size:11px;color:#bbb;white-space:nowrap}
    .moss-k2cf-camera-cell{min-width:0}.moss-k2cf-camera-cell>div:first-child{font-size:10px;color:#bbb;margin-bottom:2px}
    .moss-k2cf-rowline{display:flex;gap:5px;align-items:center;flex-wrap:wrap}
    .moss-k2cf-combo-stack{display:flex;flex-direction:column;gap:3px;align-items:stretch;min-width:0}
    .moss-k2cf-btn{background:#303030;color:#ddd;border:1px solid #555;border-radius:5px;padding:3px 8px;cursor:pointer;white-space:nowrap}.moss-k2cf-btn:hover{border-color:#aaa}.moss-k2cf-btn.primary{background:#167d86;border-color:#35d0c8;color:white}.moss-k2cf-btn:disabled{opacity:.35;cursor:not-allowed}
    .moss-k2cf-sw{width:24px;height:24px;border-radius:5px;border:2px solid #666;cursor:pointer}.moss-k2cf-sw.active{border-color:#fff;box-shadow:inset 0 0 0 2px #111}
    .moss-k2cf-num{width:68px;background:#202020;color:#eee;border:1px solid #555;border-radius:5px;padding:3px 5px;text-align:right;box-sizing:border-box}
    .moss-k2cf-select,.moss-k2cf-combo{background:#202020;color:#eee;border:1px solid #555;border-radius:5px;padding:3px 5px;box-sizing:border-box;max-width:100%}.moss-k2cf-combo{width:82px}.moss-k2cf-select.user-preset{color:;border-color:}
    .moss-k2cf-input{background:#202020;color:#eee;border:1px solid #555;border-radius:5px;padding:3px 5px;box-sizing:border-box;width:88px;min-width:72px;max-width:92px}
    .moss-k2cf-size-label{display:flex;align-items:center;gap:6px}.moss-k2cf-external-badge{padding:1px 5px;border:1px solid #35d0c8;border-radius:999px;color:#35d0c8;font-size:9px;font-weight:700;text-transform:uppercase}.moss-k2cf-external-badge[hidden],.moss-k2cf-override-status[hidden]{display:none}.moss-k2cf-num.external-size{border-color:#35d0c8;box-shadow:0 0 0 1px rgba(53,208,200,.25)}.moss-k2cf-override-status{margin-top:5px;color:#35d0c8;font-size:10.5px;line-height:1.35}.moss-k2cf-override-note{color:#aaa}
    .moss-k2cf-help{display:none;color:#aaa;font-size:10.5px;margin-top:3px}
    .moss-k2cf-panel select{max-width:100%}.moss-k2cf-help .user{color:}
    .moss-k2cf-prompt-wrap{display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto}
    .moss-k2cf-prompt-top{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:nowrap}
    .moss-k2cf-language-select{width:72px;min-width:72px}
    .moss-k2cf-presetbar{display:flex;gap:5px;align-items:center;justify-content:flex-end;flex-wrap:wrap;font-size:11px}
    .moss-k2cf-presetbar label{color:#35d0c8;font-weight:700;font-size:11px}
    .moss-k2cf-small-select{width:92px;background:#202020;color:#eee;border:1px solid #555;border-radius:5px;padding:3px 5px;box-sizing:border-box;font-size:11px}
    .moss-k2cf-small-btn{background:#303030;color:#ddd;border:1px solid #555;border-radius:5px;padding:3px 7px;cursor:pointer;font-size:11px;line-height:1.1}.moss-k2cf-small-btn:hover{border-color:#aaa}
    .moss-k2cf-scene,.moss-k2cf-slot-card{background:#181818;border:1px solid #333;border-radius:8px;padding:9px}
    .moss-k2cf-scene label,.moss-k2cf-slot-head{display:flex;align-items:center;justify-content:space-between;font-weight:700;margin-bottom:6px}
    .moss-k2cf-slot-head{cursor:pointer}.moss-k2cf-slot-head-left{display:flex;align-items:center;gap:0}.moss-k2cf-foldmark{font-size:11px;color:#aaa;margin-left:8px}
    .moss-k2cf-slot-card.collapsed .moss-k2cf-slot-body{display:none}
    .moss-k2cf-slot-card.collapsed{padding-bottom:6px}
    .moss-k2cf-scene,.moss-k2cf-slot-card,.moss-k2cf-slot-body,.moss-k2cf-slot-side,.moss-k2cf-panel,.moss-k2cf-panels{cursor:grab}
    .moss-k2cf-scene textarea,.moss-k2cf-slot-card textarea,.moss-k2cf-slot-card select,.moss-k2cf-slot-card button,.moss-k2cf-panel input,.moss-k2cf-panel select,.moss-k2cf-panel button,.moss-k2cf-slot-head{cursor:auto}
    .moss-k2cf-dot{display:inline-block;width:11px;height:11px;border-radius:99px;margin-right:7px}
    .moss-k2cf-text{width:100%;min-height:125px;resize:vertical;background:#151515;color:#eee;border:1px solid #3f3f3f;border-radius:5px;padding:8px;box-sizing:border-box;font:12px monospace}
    .moss-k2cf-scene .moss-k2cf-text{min-height:125px}
    .moss-k2cf-slot-body{display:grid;grid-template-columns:1fr 132px;gap:8px;align-items:start}
    .moss-k2cf-slot-side{display:flex;flex-direction:column;gap:7px;align-items:stretch}
    .moss-k2cf-type{width:92px;max-width:92px;height:28px;background:#202020;color:#ddd;border:1px solid #555;border-radius:5px;padding:3px 6px;font-size:12px;box-sizing:border-box}.moss-k2cf-framing{width:170px;max-width:170px;height:28px;background:#202020;color:#ddd;border:1px solid #555;border-radius:5px;padding:3px 6px;font-size:12px;box-sizing:border-box}
    .moss-k2cf-iconbtn{background:#242424;color:#ddd;border:1px solid #555;border-radius:5px;width:26px;height:24px;cursor:pointer}.moss-k2cf-iconbtn:hover{border-color:#aaa}
    
    
    
  
.moss-k2cf-scene,.moss-k2cf-slot-card,.moss-k2cf-slot-body,.moss-k2cf-slot-side,.moss-k2cf-panel,.moss-k2cf-panels{cursor:grab}.moss-k2cf-scene textarea,.moss-k2cf-slot-card textarea,.moss-k2cf-slot-card select,.moss-k2cf-slot-card button,.moss-k2cf-panel input,.moss-k2cf-panel select,.moss-k2cf-panel button,.moss-k2cf-slot-head{cursor:auto}
/* moss-k2cf-external-size-v1 */.moss-k2cf-size-label{display:flex;align-items:center;gap:6px}.moss-k2cf-external-badge{padding:1px 5px;border:1px solid #35d0c8;border-radius:999px;color:#35d0c8;font-size:9px;font-weight:700;text-transform:uppercase}.moss-k2cf-external-badge[hidden],.moss-k2cf-override-status[hidden]{display:none}.moss-k2cf-num.external-size{border-color:#35d0c8;box-shadow:0 0 0 1px rgba(53,208,200,.25)}.moss-k2cf-override-status{margin-top:5px;color:#35d0c8;font-size:10.5px;line-height:1.35}.moss-k2cf-override-note{color:#aaa}`;
  document.head.appendChild(style);
}

function getUserPresets() {
  try {
    const raw = readPresetStorage(USER_PRESET_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter((p) => p && p.label && p.width && p.height) : [];
  } catch (_) {
    return [];
  }
}

function setUserPresets(presets) {
  localStorage.setItem(USER_PRESET_KEY, JSON.stringify(presets));
}

function option(value, label, user = false) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  if (user) opt.dataset.userPreset = "1";
  return opt;
}

function selectWithCustom(options, value) {
  const wrap = document.createElement("div");
  wrap.className = "moss-k2cf-combo-stack";
  const select = document.createElement("select");
  select.className = "moss-k2cf-combo";
  for (const v of options) select.appendChild(option(v, v || "--"));
  const input = document.createElement("input");
  input.className = "moss-k2cf-input";
  input.placeholder = "Custom";
  input.value = value && !options.includes(value) ? value : "";
  select.value = options.includes(value) ? value : "";
  wrap.append(select, input);
  const get = () => input.value.trim() || select.value;
  const set = (v) => {
    if (options.includes(v)) {
      select.value = v;
      input.value = "";
    } else {
      select.value = "";
      input.value = v || "";
    }
  };
  return { wrap, select, input, get, set };
}

function setupCanvasNode(node) {
  node.resizable = true;
  node.serialize_widgets = true;
  const widgets = {};
  for (const name of CANVAS_WIDGETS) widgets[name] = widget(node, name);
  Object.values(widgets).forEach(hideWidget);
  const configuredWidgetValues = Array.isArray(node.__k2cfConfiguredWidgetValues)
    ? node.__k2cfConfiguredWidgetValues.slice()
    : null;
  const configuredStateValues = Array.isArray(node.__k2cfConfiguredCanvasState?.widgets_values)
    ? node.__k2cfConfiguredCanvasState.widgets_values.slice()
    : null;
  const configuredValues = k2cfHasMeaningfulState(configuredWidgetValues)
    ? configuredWidgetValues
    : configuredStateValues;
  if (!k2cfHasMeaningfulState(configuredValues)) {
    applyConfiguredValuesToWidgets(node, CANVAS_WIDGETS, [
      DEFAULT_WIDTH,
      DEFAULT_HEIGHT,
      DEFAULT_PRESET,
      '{"boxes":[],"activeSlot":"red","hideBoxes":false,"drawMode":false}',
      '{"iso":"","shutter":"","aperture":"","focal_length":""}',
      'Thirds',
      'Auto',
      '{"sets":[],"selected":""}',
      '{"sets":[],"selected":""}'
    ]);
  }
  let isHydrating = false;
  node.__k2cfApplyConfiguredValues = (values) => applyConfiguredValuesToWidgets(node, CANVAS_WIDGETS, values);
  applyConfiguredValuesToWidgets(node, CANVAS_WIDGETS, configuredValues);
  const savedCanvasState = k2cfBestSavedState(node, "canvas");
  if (savedCanvasState) applyConfiguredValuesToWidgets(node, CANVAS_WIDGETS, savedCanvasState.widgets_values);

  const state = { activeSlot: "red", boxes: [], selectedId: null, selectedIds: [], drawing: null, moving: null, resizing: null, hideBoxes: false, drawMode: false, layoutError: null };
  const externalPreviewSize = { width: null, height: null };
  const controls = {};
  const history = createCanvasHistory();
  let historyState = null;
  let historySuspended = 0;
  let applyingHistory = false;
  let pointerStart = null;
  let altDrag = null;
  let boxSequence = 0;
  let reference = null;
  function selectBoxes(ids, primary = ids.at(-1)) {
    state.selectedIds = [...new Set(ids)].filter(id => state.boxes.some(b => b.id === id));
    state.selectedId = state.selectedIds.includes(primary) ? primary : state.selectedIds.at(-1) ?? null;
  }
  function selectedBoxes() {
    return state.boxes.filter(b => state.selectedIds.includes(b.id));
  }
  try { controls.cameraSetData = JSON.parse(widgets.camera_set_data?.value || readPresetStorage(CAMERA_SET_KEY) || '{"sets":[],"selected":""}'); } catch (_) { controls.cameraSetData = {sets:[], selected:""}; }
  if (!Array.isArray(controls.cameraSetData.sets)) controls.cameraSetData.sets = [];
  try { controls.canvasPresetData = JSON.parse(widgets.canvas_preset_data?.value || readPresetStorage(CANVAS_PRESET_KEY) || '{"sets":[],"selected":""}'); } catch (_) { controls.canvasPresetData = {sets:[], selected:""}; }
  if (!Array.isArray(controls.canvasPresetData.sets)) controls.canvasPresetData.sets = [];
  function getCameraSets() {
    return controls.cameraSetData.sets || [];
  }
  function saveCameraSets() {
    localStorage.setItem(CAMERA_SET_KEY, JSON.stringify(controls.cameraSetData));
  }
  function getCanvasPresets() {
    return controls.canvasPresetData.sets || [];
  }
  function saveCanvasPresets() {
    localStorage.setItem(CANVAS_PRESET_KEY, JSON.stringify(controls.canvasPresetData));
  }

  function row(children){ const r=document.createElement("div"); r.className="moss-k2cf-rowline"; for(const c of children) r.appendChild(c); return r; }
  function help(html){ const d=document.createElement("div"); d.className="moss-k2cf-help"; d.innerHTML=html; return d; }
  function setWidget(name, value) {
    const w = widgets[name];
    if (!w) return;
    w.value = value;
    w.serialize = true;
    w.options = w.options || {};
    w.options.serialize = true;
  }
  function sync(allowDefaultOverwrite = true) {
    if (isHydrating) return;
    const previous = k2cfBestSavedState(node, "canvas");
    node.__k2cfSkipLocalCanvasState = false;
    node.__k2cfAllowDefaultOverwrite = !!state.layoutError || allowDefaultOverwrite;
    if (controls.width && externalPreviewSize.width == null) setWidget("width", Math.max(1, Number(controls.width.value) || 1));
    if (controls.height && externalPreviewSize.height == null) setWidget("height", Math.max(1, Number(controls.height.value) || 1));
    if (controls.preset) setWidget("preset", controls.preset.value || "Custom");
    if (controls.grid) setWidget("grid_mode", controls.grid.value || "Thirds");
    if (controls.ui_language) setWidget("ui_language", controls.ui_language.value || "Auto");
    try {
      localStorage.setItem(CANVAS_GRID_KEY, controls.grid?.value || "Thirds");
      localStorage.setItem(CANVAS_LANGUAGE_KEY, controls.ui_language?.value || "Auto");
    } catch (_) {}
    if (controls.cameraSetData) setWidget("camera_set_data", JSON.stringify(controls.cameraSetData));
    if (controls.canvasPresetData) setWidget("canvas_preset_data", JSON.stringify(controls.canvasPresetData));
    const camera = {
      iso: controls.iso?.get() || "",
      shutter: controls.shutter?.get() || "",
      aperture: controls.aperture?.get() || "",
      focal_length: controls.focal_length?.get() || "",
    };
    setWidget("camera_data", JSON.stringify(camera));
    setWidget("layout_data", state.layoutError ? state.layoutError.raw : JSON.stringify({
      boxes: state.boxes,
      activeSlot: state.activeSlot,
      hideBoxes: state.hideBoxes,
      drawMode: state.drawMode
    }));
    const rawValues = CANVAS_WIDGETS.map((n) => widgets[n]?.value ?? "");
    const values = state.layoutError || allowDefaultOverwrite ? rawValues : k2cfMergeWithPrevious(CANVAS_WIDGETS, rawValues, previous?.widgets_values);
    node.widgets_values = values.slice();
    applyConfiguredValuesToWidgets(node, CANVAS_WIDGETS, node.widgets_values);
    if (!state.layoutError && !allowDefaultOverwrite) {
      try {
        const layout = JSON.parse(widgets.layout_data?.value || "{}");
        if (Array.isArray(layout.boxes) && layout.boxes.length > 0 && state.boxes.length === 0) {
          state.boxes = layout.boxes;
          if (layout.activeSlot) state.activeSlot = layout.activeSlot;
          if (typeof layout.hideBoxes === "boolean") state.hideBoxes = layout.hideBoxes;
          if (typeof layout.drawMode === "boolean") state.drawMode = layout.drawMode;
        }
      } catch (_) {}
    }
    node.properties = node.properties || {};
    node.properties.k2cfCanvasState = {
      version: "v27",
      widgets_values: node.widgets_values.slice(),
      saved_at: Date.now()
    };
    k2cfWriteLocalState(node, "canvas", node.properties.k2cfCanvasState);
    node.__k2cfConfiguredWidgetValues = null;
    if (!state.layoutError && historyState && !historySuspended && !applyingHistory && !state.drawing && !state.moving && !state.resizing) {
      const next = snapshotCanvasEdit();
      history.record(historyState, next);
      historyState = next;
      updateHistoryButtons();
    }
    try { app.graph?.setDirtyCanvas?.(true, true); } catch (_) {}
  }

  function restoreCanvasLayout() {
    const raw = widgets.layout_data?.value ?? "";
    try {
      const layout = k2cfParseCanvasLayout(raw);
      state.boxes = layout.boxes || [];
      if (layout.activeSlot) state.activeSlot = layout.activeSlot;
      if (typeof layout.hideBoxes === "boolean") state.hideBoxes = layout.hideBoxes;
      if (typeof layout.drawMode === "boolean") state.drawMode = layout.drawMode;
      state.layoutError = null;
    } catch (error) {
      state.boxes = [];
      state.layoutError = { raw, message: error.message };
    }
  }
  restoreCanvasLayout();
  requestAnimationFrame(() => { ensureNormalizedBoxes(); remapBoxesForCurrentCanvas(); resizeCanvases(); drawOverlay(); });

  const wrap = document.createElement("div");
  wrap.className = "moss-k2cf-wrap";
  k2cfAllowWheelZoomOnEmptySpace(wrap);
  k2cfAllowGraphPanOnEmptySpace(wrap);
  const toolbar = document.createElement("div");
  toolbar.className = "moss-k2cf-toolbar";
  const tools = document.createElement("div");
  tools.className = "moss-k2cf-tools";
  const showBtn = button("◉ Show Boxes", "Show or hide all D-boxes");
  const drawBtn = button("▭ Draw Box", "Draw D-box");
  const undoBtn = button("↶", "Undo Canvas edit (Ctrl/Cmd+Z)");
  const redoBtn = button("↷", "Redo Canvas edit (Ctrl/Cmd+Shift+Z or Ctrl+Y)");
  undoBtn.setAttribute("aria-label", "Undo Canvas edit");
  redoBtn.setAttribute("aria-label", "Redo Canvas edit");
  undoBtn.addEventListener("click", () => restoreHistory("undo"));
  redoBtn.addEventListener("click", () => restoreHistory("redo"));
  drawBtn.addEventListener("click", () => { state.drawMode = !state.drawMode; drawBtn.classList.toggle("primary", state.drawMode); sync(); });
  const resetCanvasBtn = button("Reset Canvas", "Reset D-boxes, latent size, guide, and camera settings. Prompts are not changed.");
  function applyCanvasLabels() {
    const lang = resolveLang(controls.ui_language?.value || "Auto");
    showBtn.textContent = state.hideBoxes ? tr(lang, "hideBoxes") : tr(lang, "showBoxes");
    drawBtn.textContent = tr(lang, "drawBox");
    resetCanvasBtn.textContent = tr(lang, "resetCanvas");
    const headers = wrap.querySelectorAll("h4");
    if (headers[0]) headers[0].textContent = tr(lang, "latentSize");
    if (headers[1]) headers[1].textContent = tr(lang, "cameraSettings");
    if (gridLabelTop) gridLabelTop.textContent = "Grid";
    snapLabel.textContent = lang === "ja" ? "吸着" : "Snap";
    if (languageLabel) languageLabel.textContent = tr(lang, "uiLanguage");
    reference?.labels();
    refreshPrecision();
  }
  for (const [key, label, color] of SLOTS) {
    const sw = document.createElement("button");
    sw.className = `moss-k2cf-sw${key === state.activeSlot ? " active" : ""}`;
    sw.dataset.slot = key;
    sw.style.background = color;
    bindHelp(sw, "color");
    sw.addEventListener("click", () => {
      state.activeSlot = key;
      tools.querySelectorAll(".moss-k2cf-sw").forEach((x) => x.classList.toggle("active", x.dataset.slot === key));
      sync();
    });
    tools.appendChild(sw);
  }
  showBtn.addEventListener("click", () => {
    state.hideBoxes = !state.hideBoxes;
    showBtn.textContent = state.hideBoxes ? tr(resolveLang(controls.ui_language?.value || "Auto"), "hideBoxes") : tr(resolveLang(controls.ui_language?.value || "Auto"), "showBoxes");
    drawOverlay();
    sync();
  });
  resetCanvasBtn.addEventListener("click", () => {
    historySuspended++;
    state.layoutError = null;
    overlay.title = canvasHelp;
    overlay.setAttribute("aria-invalid", "false");
    state.boxes = [];
    selectBoxes([]);
    setSize(DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_PRESET);
    if (controls.grid) controls.grid.value = "Thirds";
    if (controls.iso) controls.iso.set("");
    if (controls.shutter) controls.shutter.set("");
    if (controls.aperture) controls.aperture.set("");
    if (controls.focal_length) controls.focal_length.set("");
    if (controls.cameraSetSelect) controls.cameraSetSelect.value = "";
    controls.cameraSetData.selected = "";
    if (controls.canvasPresetSelect) controls.canvasPresetSelect.value = "";
    controls.canvasPresetData.selected = "";
    if (controls.ui_language) controls.ui_language.value = "Auto";
    state.activeSlot = "red";
    state.hideBoxes = false;
    state.drawMode = false;
    snapToggle.checked = false;
    drawBtn.classList.remove("primary");
    saveCameraSets();
    saveCanvasPresets();
    applyCanvasLabels();
    updateGuide();
    writeBoxes();
    historySuspended--;
    sync();
    if (!historyState) historyState = snapshotCanvasEdit();
  });
  for (const [el, key] of [[showBtn,"show"], [drawBtn,"draw"], [resetCanvasBtn,"reset"], [undoBtn,"undo"], [redoBtn,"redo"]]) bindHelp(el, key);
  tools.prepend(showBtn, drawBtn, resetCanvasBtn, undoBtn, redoBtn);
  const langSelect = document.createElement("select");
  langSelect.className = "moss-k2cf-select";
  langSelect.title = "Choose Canvas UI language. Auto keeps English until a language is selected.";
  for (const v of ["Auto", "English", "Japanese"]) langSelect.appendChild(option(v, v));
  langSelect.value = widgets.ui_language?.value || "Auto";
  controls.ui_language = langSelect;
  const gridTop = document.createElement("select");
  gridTop.className = "moss-k2cf-select";
  gridTop.title = "Choose the canvas guide overlay.";
  for (const g of ["Off", "Thirds", "Center Cross"]) gridTop.appendChild(option(g, g));
  gridTop.value = widgets.grid_mode?.value || "Thirds";
  controls.grid = gridTop;
  const gridBox = document.createElement("div");
  gridBox.className = "moss-k2cf-rowline";
  const gridLabelTop = document.createElement("span");
  gridLabelTop.textContent = "Grid";
  gridBox.append(gridLabelTop, gridTop);

  // Editing aid only: every node/workflow starts OFF, with no saved widget added.
  const snapBox = document.createElement("label");
  snapBox.className = "moss-k2cf-rowline";
  const snapToggle = document.createElement("input");
  snapToggle.type = "checkbox";
  snapToggle.checked = false;
  snapToggle.setAttribute("aria-label", "Snap to guides");
  snapToggle.title = "Snap dragged box edges/centers and resize edges to center/thirds within 6 screen pixels. Numeric inputs and arrow keys stay exact. Resets OFF on workflow load.";
  const snapLabel = document.createElement("span");
  snapLabel.textContent = "Snap";
  snapBox.append(snapToggle, snapLabel);

  const languageBox = document.createElement("div");
  languageBox.className = "moss-k2cf-rowline";
  const languageLabel = document.createElement("span");
  languageLabel.textContent = tr(resolveLang(langSelect.value), "uiLanguage");
  languageBox.append(languageLabel, langSelect);
  bindHelp(langSelect, "ui_language");
  bindHelp(gridTop, "grid_mode");
  bindHelp(snapBox, "snap"); bindHelp(snapToggle, "snap");
  toolbar.append(tools, gridBox, snapBox, languageBox);
  gridTop.addEventListener("change", () => { updateGuide(); sync(); });
  langSelect.addEventListener("change", () => { applyCanvasLabels(); sync(); });
  wrap.appendChild(toolbar);
  // DOM-only controls: keep the saved widget order and layout schema unchanged.
  const precisionBar = document.createElement("div");
  precisionBar.className = "moss-k2cf-rowline";
  precisionBar.style.cssText = "display:flex;visibility:hidden;flex-wrap:wrap;gap:6px;padding:3px 6px";
  precisionBar.setAttribute("aria-label", "Selected BBOX geometry");
  const precisionInputs = {};
  for (const [key, label] of [["x", "X"], ["y", "Y"], ["width", "W"], ["height", "H"]]) {
    const field = document.createElement("label");
    field.style.cssText = "display:flex;align-items:center;gap:3px";
    field.textContent = label;
    const input = document.createElement("input");
    input.type = "number"; input.step = "any";
    input.className = "moss-k2cf-num";
    input.style.width = "66px";
    input.setAttribute("aria-label", `BBOX ${key}`);
    bindHelp(input, "geometry");
    precisionInputs[key] = input;
    input.addEventListener("change", () => {
      const box = state.boxes.find(b => b.id === state.selectedId);
      const value = input.value.trim() === "" ? NaN : Number(input.value);
      if (!box || box.locked === true || state.layoutError || pointerStart || !Number.isFinite(value)
        || ((key === "width" || key === "height") && value <= 0)) {
        refreshPrecision(true); return;
      }
      selectBoxes([box.id]);
      const [x1,y1,x2,y2] = normBox(box), f = frameBounds();
      if (key === "x" || key === "y") {
        moveWithin(box, {x1:key === "x" ? value : x1, y1:key === "y" ? value : y1,
          x2:(key === "x" ? value : x1)+x2-x1, y2:(key === "y" ? value : y1)+y2-y1});
      } else {
        Object.assign(box, {x1,y1,x2,y2});
        if (key === "width") box.x2 = x1 + Math.min(value, f.maxX-x1);
        else box.y2 = y1 + Math.min(value, f.maxY-y1);
      }
      writeBoxes(); refreshPrecision(true);
    });
    input.addEventListener("keydown", ev => {
      if (ev.key === "Enter") { input.blur(); overlay.focus({preventScroll:true}); ev.preventDefault(); }
      if (ev.key === "Escape") { refreshPrecision(true); input.blur(); overlay.focus({preventScroll:true}); ev.preventDefault(); }
    });
    field.append(input); precisionBar.append(field);
  }
  const lockBtn = button("Lock", "Lock selected boxes");
  lockBtn.style.cssText = "width:86px;height:23px;line-height:17px;box-sizing:border-box;overflow:hidden;padding:2px 5px";
  lockBtn.setAttribute("aria-label", "Lock selected boxes");
  bindHelp(lockBtn, "lock_boxes");
  lockBtn.addEventListener("click", () => {
    if (state.layoutError || pointerStart || state.hideBoxes) return;
    const boxes = selectedBoxes();
    const locked = !boxes.every(b => b.locked === true);
    for (const b of boxes) b.locked = locked;
    writeBoxes();
  });
  precisionBar.append(lockBtn);
  const arrangeSelect = document.createElement("select");
  arrangeSelect.className = "moss-k2cf-select";
  arrangeSelect.style.cssText = "width:142px;height:23px;box-sizing:border-box";
  arrangeSelect.setAttribute("aria-label", "Align and distribute boxes");
  bindHelp(arrangeSelect, "arrange_boxes");
  const arrangeLabels = [
    ["","Align / Distribute","整列・分布"],["left","Align left","左揃え"],
    ["center","Align horizontal centers","左右中央揃え"],["right","Align right","右揃え"],
    ["top","Align top","上揃え"],["middle","Align vertical centers","上下中央揃え"],
    ["bottom","Align bottom","下揃え"],["horizontal","Distribute horizontally","横に等間隔"],
    ["vertical","Distribute vertically","縦に等間隔"],
  ];
  for (const [key,label] of arrangeLabels) arrangeSelect.append(option(key,label));
  arrangeSelect.addEventListener("change", () => {
    const action = arrangeSelect.value; arrangeSelect.value = "";
    if (state.layoutError || pointerStart || state.hideBoxes) return;
    const arranged = arrangeBoxes(selectedBoxes(),action,frameBounds());
    if (!arranged) return;
    for (const b of arranged) Object.assign(state.boxes.find(target => target.id === b.id),b);
    writeBoxes();
  });
  precisionBar.append(arrangeSelect);
  wrap.appendChild(precisionBar);
  function refreshPrecision(force = false) {
    const selected = selectedBoxes();
    const ja = resolveLang(controls.ui_language?.value || "Auto") === "ja";
    arrangeSelect.disabled = selected.length < 2 || selected.some(b => b.locked === true)
      || !!state.layoutError || !!pointerStart || state.hideBoxes;
    for (const [i,[key,en,jp]] of arrangeLabels.entries()) {
      arrangeSelect.options[i].textContent = ja ? jp : en;
      arrangeSelect.options[i].disabled = (key === "horizontal" || key === "vertical") && selected.length < 3;
    }
    const box = state.boxes.find(b => b.id === state.selectedId);
    const visible = box && !state.layoutError && !state.hideBoxes;
    // Keep the row's space so selection never changes the Canvas geometry.
    precisionBar.style.visibility = visible ? "visible" : "hidden";
    if (!visible) return;
    const allLocked = selectedBoxes().every(b => b.locked === true);
    lockBtn.textContent = resolveLang(controls.ui_language?.value || "Auto") === "ja"
      ? (allLocked ? "🔓 解除" : "🔒 ロック") : (allLocked ? "🔓 Unlock" : "🔒 Lock");
    lockBtn.setAttribute("aria-pressed", String(allLocked));
    const [x,y,x2,y2] = normBox(box);
    for (const [key,value] of Object.entries({x,y,width:x2-x,height:y2-y})) {
      precisionInputs[key].disabled = box.locked === true;
      if (!force && document.activeElement === precisionInputs[key]) continue;
      precisionInputs[key].value = String(Number(value.toFixed(9)));
    }
  }


  const monitor = document.createElement("div");
  monitor.className = "moss-k2cf-monitor";
  const screen = document.createElement("div");
  screen.className = "moss-k2cf-screen";
  const bg = document.createElement("canvas");
  bg.className = "moss-k2cf-bg";
  const guide = document.createElement("div");
  guide.className = "moss-k2cf-guide thirds";
  const overlay = document.createElement("canvas");
  overlay.className = "moss-k2cf-overlay";
  overlay.tabIndex = 0;
  const canvasHelp = "Alt+drag: duplicate. Alt+click: cycle overlapping boxes. Shift+corner drag: keep aspect ratio. Ctrl/Cmd+Z: undo.";
  bindHelp(overlay, "canvas");
  overlay.title = canvasHelp;
  // ComfyUI's early capture listener reserves editable targets for local history.
  // These drawing controls own keyboard input, but never accept text insertion.
  for (const target of [overlay, undoBtn, redoBtn, lockBtn]) {
    target.contentEditable = "true";
    target.dataset.mossCanvasShortcut = "true";
    target.spellcheck = false;
    target.addEventListener("beforeinput", ev => ev.preventDefault());
    target.addEventListener("paste", ev => ev.preventDefault());
  }
  screen.append(bg, guide, overlay);
  monitor.append(screen);
  wrap.append(monitor);

  const panels = document.createElement("div");
  panels.className = "moss-k2cf-panels";

  const sizePanel = document.createElement("div");
  sizePanel.className = "moss-k2cf-panel";
  sizePanel.innerHTML = `<h4>${tr(resolveLang(controls.ui_language?.value || "Auto"), "latentSize")}</h4>`;
  const preset = document.createElement("select");
  preset.className = "moss-k2cf-select";
  preset.title = "Choose the latent canvas size preset.";
  const width = document.createElement("input");
  width.className = "moss-k2cf-num";
  width.type = "number";
  width.title = "Custom latent canvas width.";
  const height = document.createElement("input");
  height.className = "moss-k2cf-num";
  height.type = "number";
  height.title = "Custom latent canvas height.";
  bindHelp(preset, "preset"); bindHelp(width, "width"); bindHelp(height, "height");
  controls.preset = preset; controls.width = width; controls.height = height;
  function fillPresetSelect(selected) {
    preset.innerHTML = "";
    const presetGroups = [
      ["1024 x 1024", "1536 x 1536", "2048 x 2048"],
      ["1024 x 1344", "1024 x 1536", "1152 x 1536", "1536 x 2048"],
      ["1344 x 1024", "1536 x 1024", "1536 x 1152", "2048 x 1536"]
  ];
    let sepIndex = 0;
    for (const group of presetGroups) {
      if (sepIndex++ > 0) {
        const sep = option(`__sep_${sepIndex}`, "────────");
        sep.disabled = true;
        preset.appendChild(sep);
      }
      for (const p of group) preset.appendChild(option(p, p));
    }
    const sep = option("__sep_custom", "────────");
    sep.disabled = true;
    preset.appendChild(sep);
    preset.appendChild(option("Custom", "Custom"));
    for (const p of getUserPresets()) preset.appendChild(option(`User:${p.width}x${p.height}`, `User: ${p.width} x ${p.height}`, true));
    selected = selected || widgets.preset?.value || DEFAULT_PRESET;
    if (selected && !Array.from(preset.options).some((opt) => opt.value === selected)) {
      const m = String(selected).match(/^User:(\d+)x(\d+)$/);
      if (m) preset.appendChild(option(selected, `User: ${m[1]} x ${m[2]}`, true));
    }
    preset.value = selected;
    if (preset.value !== selected) preset.value = "Custom";
    updatePresetStyle();
  }
  function updatePresetStyle() {
    preset.classList.toggle("user-preset", preset.value.startsWith("User:"));
  }
  fillPresetSelect();
  width.value = String(widgets.width?.value || DEFAULT_WIDTH);
  height.value = String(widgets.height?.value || DEFAULT_HEIGHT);
  function setSize(w, h, presetValue = "Custom") {
    const [oldW, oldH] = currentSize();
    w = Math.max(1, Number(w) || 1);
    h = Math.max(1, Number(h) || 1);
    const effectiveW = externalPreviewSize.width ?? w;
    const effectiveH = externalPreviewSize.height ?? h;
    if (oldW && oldH && (oldW !== effectiveW || oldH !== effectiveH)) {
      ensureNormalizedBoxes();
    }
    setWidget("width", w);
    setWidget("height", h);
    width.value = String(effectiveW); height.value = String(effectiveH); preset.value = presetValue; updatePresetStyle();
    remapBoxesForCurrentCanvas();
    resizeCanvases(); writeBoxes();
  }
  preset.addEventListener("change", () => {
    const v = preset.value;
    updatePresetStyle();
    if (PRESETS[v]) setSize(PRESETS[v][0], PRESETS[v][1], v);
    else if (v.startsWith("User:")) {
      const m = v.match(/User:(\d+)x(\d+)/);
      if (m) setSize(Number(m[1]), Number(m[2]), v);
    } else sync();
  });
  function commitCustomSize() {
    setSize(width.value, height.value, "Custom");
  }
  for (const el of [width, height]) {
    el.addEventListener("input", () => {
      preset.value = "Custom";
      updatePresetStyle();
    });
    el.addEventListener("change", commitCustomSize);
    el.addEventListener("blur", commitCustomSize);
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        commitCustomSize();
        el.blur();
      }
    });
    el.addEventListener("pointerdown", stop);
  }
  const saveCustom = button("Save Custom", "Save current custom latent size");
  saveCustom.classList.add("primary");
  const deleteCustom = button("Delete Custom", "Delete selected user preset");
  bindHelp(saveCustom, "save_size"); bindHelp(deleteCustom, "delete_size");
  saveCustom.addEventListener("click", () => {
    commitCustomSize();
    const w = Math.max(1, Number(width.value) || 1), h = Math.max(1, Number(height.value) || 1);
    const users = getUserPresets().filter((p) => !(Number(p.width) === w && Number(p.height) === h));
    users.push({ label: `${w} x ${h}`, width: w, height: h });
    setUserPresets(users);
    fillPresetSelect(`User:${w}x${h}`);
    sync();
  });
  deleteCustom.addEventListener("click", () => {
    if (!preset.value.startsWith("User:")) return;
    const m = preset.value.match(/User:(\d+)x(\d+)/);
    if (!m) return;
    const users = getUserPresets().filter((p) => !(Number(p.width) === Number(m[1]) && Number(p.height) === Number(m[2])));
    setUserPresets(users);
    fillPresetSelect("Custom");
    sync();
  });
  const presetLabel = document.createElement("div");
  presetLabel.textContent = tr(resolveLang(controls.ui_language?.value || "Auto"), "preset");
  const customLabel = document.createElement("div");
  customLabel.className = "moss-k2cf-size-label";
  customLabel.textContent = "Custom Size";
  const externalBadge = document.createElement("span");
  externalBadge.className = "moss-k2cf-external-badge";
  externalBadge.textContent = "External";
  externalBadge.hidden = true;
  customLabel.appendChild(externalBadge);
  const widthLabel = document.createElement("span");
  widthLabel.textContent = "W";
  const heightLabel = document.createElement("span");
  heightLabel.textContent = "H";
  const customSizeRow = row([widthLabel, width, document.createTextNode("×"), heightLabel, height]);
  const overrideStatus = document.createElement("div");
  overrideStatus.className = "moss-k2cf-override-status";
  overrideStatus.hidden = true;
  const overrideStatusLine = document.createElement("div");
  const overrideNote = document.createElement("div");
  overrideNote.className = "moss-k2cf-override-note";
  overrideNote.textContent = "Connected preview values are shown above. Local values return when disconnected.";
  overrideStatus.append(overrideStatusLine, overrideNote);
  function linkedInputInfo(name) {
    const input = node.inputs?.find((item) => item?.name === name);
    if (input?.link === null || input?.link === undefined) return null;
    const graph = node.graph || app.graph;
    const links = graph?.links;
    const link = links?.get?.(input.link) || links?.[input.link];
    if (!link) return { input, source: null, originSlot: null };
    const originId = link.origin_id ?? link[1];
    const originSlot = link.origin_slot ?? link[2];
    const source = graph?.getNodeById?.(originId) || graph?._nodes_by_id?.get?.(originId) || graph?._nodes_by_id?.[originId] || null;
    return { input, source, originSlot: Number(originSlot) };
  }
  function pythonStyleRound(value) {
    const lower = Math.floor(value);
    const fraction = value - lower;
    if (Math.abs(fraction - 0.5) < 1e-10) return lower % 2 === 0 ? lower : lower + 1;
    return Math.round(value);
  }
  function resolutionSelectorSize(source) {
    const type = source?.comfyClass || source?.type || "";
    if (type !== "ResolutionSelector") return null;
    const sourceWidget = (name) => source.widgets?.find((item) => item?.name === name)?.value;
    const ratioMatch = String(sourceWidget("aspect_ratio") || "").match(/^\s*(\d+)\s*:\s*(\d+)/);
    const megapixels = Number(sourceWidget("megapixels"));
    const multiple = Math.max(1, Number(sourceWidget("multiple")) || 8);
    if (!ratioMatch || !Number.isFinite(megapixels) || megapixels <= 0) return null;
    const widthRatio = Number(ratioMatch[1]);
    const heightRatio = Number(ratioMatch[2]);
    const scale = Math.sqrt((megapixels * 1024 * 1024) / (widthRatio * heightRatio));
    return {
      width: Math.max(1, pythonStyleRound((widthRatio * scale) / multiple) * multiple),
      height: Math.max(1, pythonStyleRound((heightRatio * scale) / multiple) * multiple),
    };
  }
  function connectedPreviewValue(info) {
    if (!info?.source || !Number.isInteger(info.originSlot)) return null;
    const selectorSize = resolutionSelectorSize(info.source);
    if (selectorSize) {
      if (info.originSlot === 0) return selectorSize.width;
      if (info.originSlot === 1) return selectorSize.height;
    }
    const outputName = String(info.source.outputs?.[info.originSlot]?.name || "").toLowerCase();
    const matchingWidget = info.source.widgets?.find((item) => String(item?.name || "").toLowerCase() === outputName);
    const value = Number(matchingWidget?.value);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  function updateExternalSizeStatus() {
    const widthInfo = linkedInputInfo("width_override");
    const heightInfo = linkedInputInfo("height_override");
    const widthConnected = !!widthInfo;
    const heightConnected = !!heightInfo;
    const hasOverride = widthConnected || heightConnected;
    const nextWidth = connectedPreviewValue(widthInfo);
    const nextHeight = connectedPreviewValue(heightInfo);
    const previewChanged = externalPreviewSize.width !== nextWidth || externalPreviewSize.height !== nextHeight;
    if (previewChanged) ensureNormalizedBoxes();
    externalPreviewSize.width = nextWidth;
    externalPreviewSize.height = nextHeight;
    if (nextWidth != null) width.value = String(nextWidth);
    else if (widthConnected) width.value = String(widgets.width?.value || DEFAULT_WIDTH);
    else if (previewChanged) width.value = String(widgets.width?.value || DEFAULT_WIDTH);
    if (nextHeight != null) height.value = String(nextHeight);
    else if (heightConnected) height.value = String(widgets.height?.value || DEFAULT_HEIGHT);
    else if (previewChanged) height.value = String(widgets.height?.value || DEFAULT_HEIGHT);
    width.classList.toggle("external-size", widthConnected);
    height.classList.toggle("external-size", heightConnected);
    externalBadge.hidden = !hasOverride;
    overrideStatus.hidden = !hasOverride;
    const [previewWidth, previewHeight] = currentSize();
    overrideStatusLine.textContent = `External size override: W ${widthConnected ? "connected" : "not connected"} / H ${heightConnected ? "connected" : "not connected"} · Preview ${previewWidth} × ${previewHeight}`;
    const followsPreview = nextWidth != null || nextHeight != null;
    overrideNote.textContent = followsPreview
      ? "Connected preview values are shown above. Local values return when disconnected."
      : "Connected values are applied at execution. Preview keeps the current local size.";
    if (previewChanged) {
      remapBoxesForCurrentCanvas();
      resizeCanvases();
      historySuspended++;
      writeBoxes();
      historySuspended--;
      if (historyState) historyState = snapshotCanvasEdit();
    }
  }
  sizePanel.append(
    presetLabel,
    row([preset]),
    customLabel,
    customSizeRow,
    overrideStatus,
    row([saveCustom, deleteCustom]),
    help(`User presets use <span class="user">${USER_PRESET_COLOR}</span> and are stored locally.`)
  );
  requestAnimationFrame(updateExternalSizeStatus);
  const externalPreviewTimer = setInterval(updateExternalSizeStatus, 250);
  const oldConnectionsChange = node.onConnectionsChange;
  node.onConnectionsChange = function() {
    const result = oldConnectionsChange?.apply(this, arguments);
    requestAnimationFrame(updateExternalSizeStatus);
    return result;
  };
  const canvasPresetLabel = document.createElement("div");
  canvasPresetLabel.textContent = tr(resolveLang(controls.ui_language?.value || "Auto"), "canvasPreset");
  const canvasPresetSelect = document.createElement("select");
  canvasPresetSelect.className = "moss-k2cf-select";
  controls.canvasPresetSelect = canvasPresetSelect;
  function refreshCanvasPresetSelect() {
    canvasPresetSelect.innerHTML = "";
    canvasPresetSelect.appendChild(option("", "(None)"));
    for (const set of getCanvasPresets()) canvasPresetSelect.appendChild(option(set.name, set.name));
    canvasPresetSelect.value = controls.canvasPresetData.selected || "";
  }
  function snapshotCanvasPreset(name) {
    return {
      name,
      width: Math.max(1, Number(width.value) || DEFAULT_WIDTH),
      height: Math.max(1, Number(height.value) || DEFAULT_HEIGHT),
      preset: preset.value || DEFAULT_PRESET,
      boxes: JSON.parse(JSON.stringify(state.boxes || [])),
      activeSlot: state.activeSlot || "red",
      hideBoxes: !!state.hideBoxes,
      drawMode: !!state.drawMode,
      grid: controls.grid?.value || "Thirds",
      ui_language: controls.ui_language?.value || "Auto",
      camera: {
        iso: controls.iso?.get() || "",
        shutter: controls.shutter?.get() || "",
        aperture: controls.aperture?.get() || "",
        focal_length: controls.focal_length?.get() || "",
      },
      cameraSetSelected: controls.cameraSetData.selected || "",
    };
  }
  function applyCanvasPreset(set) {
    if (!set || state.layoutError) return;
    historySuspended++;
    state.boxes = Array.isArray(set.boxes) ? JSON.parse(JSON.stringify(set.boxes)) : [];
    selectBoxes([]);
    state.activeSlot = set.activeSlot || "red";
    state.hideBoxes = !!set.hideBoxes;
    state.drawMode = set.drawMode !== false;
    drawBtn.classList.toggle("primary", state.drawMode);
    if (controls.grid) controls.grid.value = set.grid || "Thirds";
    if (controls.ui_language) controls.ui_language.value = set.ui_language || "Auto";
    if (controls.iso) controls.iso.set(set.camera?.iso || "");
    if (controls.shutter) controls.shutter.set(set.camera?.shutter || "");
    if (controls.aperture) controls.aperture.set(set.camera?.aperture || "");
    if (controls.focal_length) controls.focal_length.set(set.camera?.focal_length || "");
    controls.cameraSetData.selected = set.cameraSetSelected || "";
    if (controls.cameraSetSelect) controls.cameraSetSelect.value = controls.cameraSetData.selected;
    setSize(set.width || DEFAULT_WIDTH, set.height || DEFAULT_HEIGHT, set.preset || DEFAULT_PRESET);
    updateGuide();
    applyCanvasLabels();
    writeBoxes();
    historySuspended--;
    sync();
  }
  function snapshotCanvasEdit() {
    return { ...snapshotCanvasPreset(""), width: Number(widgets.width.value), height: Number(widgets.height.value), canvasSize: currentSize(), selectedId: state.selectedId, selectedIds: state.selectedIds.slice(),
      canvasPresetSelected: controls.canvasPresetData.selected || "" };
  }
  function updateHistoryButtons() {
    undoBtn.disabled = !history.canUndo;
    redoBtn.disabled = !history.canRedo;
  }
  function restoreCanvasEdit(saved) {
    applyingHistory = true;
    try {
      state.drawing = state.moving = state.resizing = null;
      pointerStart = null;
      altDrag = null;
      applyCanvasPreset(saved);
      const [w, h] = currentSize();
      if (saved.canvasSize[0] === w && saved.canvasSize[1] === h) state.boxes = structuredClone(saved.boxes);
      selectBoxes(saved.selectedIds || (saved.selectedId ? [saved.selectedId] : []), saved.selectedId);
      controls.canvasPresetData.selected = saved.canvasPresetSelected;
      refreshCanvasPresetSelect();
      tools.querySelectorAll(".moss-k2cf-sw").forEach(sw => sw.classList.toggle("active", sw.dataset.slot === state.activeSlot));
      writeBoxes();
      historyState = snapshotCanvasEdit();
    } finally {
      applyingHistory = false;
      updateHistoryButtons();
    }
  }
  function restoreHistory(direction) {
    if (pointerStart) return;
    const saved = history[direction](snapshotCanvasEdit());
    if (saved) restoreCanvasEdit(saved);
  }
  canvasPresetSelect.addEventListener("change", () => {
    controls.canvasPresetData.selected = canvasPresetSelect.value || "";
    const found = getCanvasPresets().find((s) => s.name === canvasPresetSelect.value);
    if (found) applyCanvasPreset(found);
    saveCanvasPresets();
    sync();
  });
  const saveCanvasPreset = button("Save Preset", "Save all Canvas inputs as a preset");
  const loadCanvasPreset = button("Load", "Load selected Canvas preset");
  const deleteCanvasPreset = button(tr(resolveLang(controls.ui_language?.value || "Auto"), "deletePreset"), "Delete selected Canvas preset");
  saveCanvasPreset.addEventListener("click", () => {
    if (state.layoutError) return;
    const name = prompt("Canvas preset name", canvasPresetSelect.value || "My Canvas Preset");
    if (!name) return;
    controls.canvasPresetData.sets = getCanvasPresets().filter((s) => s.name !== name);
    controls.canvasPresetData.sets.push(snapshotCanvasPreset(name));
    controls.canvasPresetData.selected = name;
    saveCanvasPresets();
    refreshCanvasPresetSelect();
    sync();
  });
  loadCanvasPreset.addEventListener("click", () => {
    const found = getCanvasPresets().find((s) => s.name === canvasPresetSelect.value);
    if (found) applyCanvasPreset(found);
  });
  deleteCanvasPreset.addEventListener("click", () => {
    const name = canvasPresetSelect.value;
    if (!name) return;
    controls.canvasPresetData.sets = getCanvasPresets().filter((s) => s.name !== name);
    controls.canvasPresetData.selected = "";
    saveCanvasPresets();
    refreshCanvasPresetSelect();
    sync();
  });
  refreshCanvasPresetSelect();
  canvasPresetLabel.className = "moss-k2cf-section-label";


  const cameraPanel = document.createElement("div");
  cameraPanel.className = "moss-k2cf-panel moss-k2cf-camera-panel";
  const cameraGroup = document.createElement("div");
  cameraGroup.className = "moss-k2cf-compact-group";
  const cameraLabel = document.createElement("div");
  cameraLabel.className = "moss-k2cf-section-label";
  cameraLabel.textContent = tr(resolveLang(controls.ui_language?.value || "Auto"), "cameraSettings");
  const cameraNote = document.createElement("div");
  cameraNote.className = "moss-k2cf-note";
  cameraNote.textContent = tr(resolveLang(controls.ui_language?.value || "Auto"), "cameraCustomNote");
  let cameraData = {};
  try { cameraData = JSON.parse(widgets.camera_data?.value || "{}"); } catch (_) {}
  const cameraSetBar = document.createElement("div");
  cameraSetBar.className = "moss-k2cf-camera-setbar";
  const cameraSetSelect = document.createElement("select");
  cameraSetSelect.className = "moss-k2cf-select";
  controls.cameraSetSelect = cameraSetSelect;
  function refreshCameraSetSelect() {
    cameraSetSelect.innerHTML = "";
    cameraSetSelect.appendChild(option("", "(None)"));
    for (const set of getCameraSets()) cameraSetSelect.appendChild(option(set.name, set.name));
    cameraSetSelect.value = controls.cameraSetData.selected || "";
  }
  const saveSetBtn = button("Save Set", "Save current camera settings as a named set");
  const deleteSetBtn = button("Delete Set", "Delete selected camera set");
  cameraSetBar.append(cameraSetSelect, saveSetBtn, deleteSetBtn);
  bindHelp(canvasPresetSelect, "canvas_preset");
  bindHelp(saveCanvasPreset, "save_canvas"); bindHelp(loadCanvasPreset, "load_canvas"); bindHelp(deleteCanvasPreset, "delete_canvas");
  const canvasPresetBar = document.createElement("div");
  canvasPresetBar.className = "moss-k2cf-canvas-presetbar";
  canvasPresetBar.append(canvasPresetSelect, saveCanvasPreset, loadCanvasPreset, deleteCanvasPreset);

  const cameraRows = document.createElement("div");
  cameraRows.className = "moss-k2cf-camera-grid";
  for (const [label, name] of [["ISO", "iso"], ["Shutter", "shutter"], ["Aperture", "aperture"], ["Focal", "focal_length"]]) {
    const combo = selectWithCustom(CAMERA_OPTIONS[name], cameraData[name] || "");
    combo.select.addEventListener("change", () => { controls.cameraSetData.selected = ""; refreshCameraSetSelect(); sync(); });
    combo.input.addEventListener("input", () => { controls.cameraSetData.selected = ""; refreshCameraSetSelect(); sync(); });
    bindHelp(combo.select, name); bindHelp(combo.input, name);
    controls[name] = combo;
    const cell = document.createElement("div");
    cell.className = "moss-k2cf-camera-cell";
    cell.innerHTML = `<div>${label}</div>`;
    cell.appendChild(combo.wrap);
    cameraRows.appendChild(cell);
  }
  function currentCameraValues() {
    return {
      iso: controls.iso?.get() || "",
      shutter: controls.shutter?.get() || "",
      aperture: controls.aperture?.get() || "",
      focal_length: controls.focal_length?.get() || "",
    };
  }
  cameraSetSelect.addEventListener("change", () => {
    const found = getCameraSets().find((s) => s.name === cameraSetSelect.value);
    controls.cameraSetData.selected = cameraSetSelect.value || "";
    if (found) {
      controls.iso.set(found.iso || "");
      controls.shutter.set(found.shutter || "");
      controls.aperture.set(found.aperture || "");
      controls.focal_length.set(found.focal_length || "");
    }
    saveCameraSets();
    sync();
  });
  saveSetBtn.addEventListener("click", () => {
    const name = prompt("Camera set name", cameraSetSelect.value || "My Camera Set");
    if (!name) return;
    const values = currentCameraValues();
    controls.cameraSetData.sets = getCameraSets().filter((s) => s.name !== name);
    controls.cameraSetData.sets.push({ name, ...values });
    controls.cameraSetData.selected = name;
    saveCameraSets();
    refreshCameraSetSelect();
    sync();
  });
  deleteSetBtn.addEventListener("click", () => {
    const name = cameraSetSelect.value;
    if (!name) return;
    controls.cameraSetData.sets = getCameraSets().filter((s) => s.name !== name);
    controls.cameraSetData.selected = "";
    saveCameraSets();
    refreshCameraSetSelect();
    sync();
  });
  refreshCameraSetSelect();
  const canvasPresetGroup = document.createElement("div");
  canvasPresetGroup.className = "moss-k2cf-compact-group";
  const canvasPresetNote = document.createElement("div");
  canvasPresetNote.className = "moss-k2cf-note";
  canvasPresetNote.textContent = tr(resolveLang(controls.ui_language?.value || "Auto"), "canvasPresetNote");
  canvasPresetGroup.append(canvasPresetLabel, canvasPresetBar, canvasPresetNote);
  bindHelp(cameraGroup, "camera"); bindHelp(canvasPresetGroup, "canvas_preset");
  cameraGroup.append(cameraLabel, cameraRows, cameraNote);
  cameraPanel.append(cameraGroup, canvasPresetGroup);
  panels.append(sizePanel, cameraPanel);
  wrap.append(panels);

  const bgCtx = bg.getContext("2d"), overlayCtx = overlay.getContext("2d");
  reference = mountCanvasReference(node, {
    url: image => api.apiURL(`/view?${new URLSearchParams(image)}`),
    redraw: () => makeBg(),
    fitSize: (w,h) => { if (!state.layoutError && !pointerStart) setSize(w,h,"Custom"); },
    canFit: () => !state.layoutError && !pointerStart && !linkedInputInfo("width_override") && !linkedInputInfo("height_override"),
    language: () => resolveLang(controls.ui_language?.value || "Auto"),
  });
  wrap.insertBefore(reference.element, precisionBar);
  const oldExecuted = node.onExecuted;
  node.onExecuted = function(message) {
    const result = oldExecuted?.apply(this,arguments);
    reference.executed(message);
    return result;
  };
  function currentSize() {
    return [
      Math.max(1, Number(externalPreviewSize.width ?? width.value) || DEFAULT_WIDTH),
      Math.max(1, Number(externalPreviewSize.height ?? height.value) || DEFAULT_HEIGHT),
    ];
  }
  function makeBg() {
    const [w, h] = currentSize();
    bgCtx.fillStyle = "#242828"; bgCtx.fillRect(0, 0, w, h);
    const grd = bgCtx.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, "rgba(255,255,255,.08)"); grd.addColorStop(1, "rgba(0,0,0,.22)");
    bgCtx.fillStyle = grd; bgCtx.fillRect(0, 0, w, h);
    reference?.draw(bgCtx,w,h);
  }
  function resizeCanvases() {
    const [w, h] = currentSize();
    bg.width = overlay.width = w; bg.height = overlay.height = h; makeBg(); fit(); drawOverlay();
  }
  function fit() {
    const [w, h] = currentSize();
    const maxW = Math.max(1, monitor.clientWidth - 30);
    const maxH = Math.max(1, monitor.clientHeight - 30);
    const scale = Math.min(maxW / w, maxH / h, 1);
    screen.style.width = `${Math.round(w * scale)}px`;
    screen.style.height = `${Math.round(h * scale)}px`;
    for (const canvas of [bg, overlay]) { canvas.style.width = screen.style.width; canvas.style.height = screen.style.height; }
  }
  let canvasRefreshFrame = 0;
  const canvasRefreshTimers = new Set();
  function refreshCanvasDisplay() {
    if (!wrap.isConnected || monitor.clientWidth < 4 || monitor.clientHeight < 4) return false;
    const [w, h] = currentSize();
    if (bg.width !== w || bg.height !== h || overlay.width !== w || overlay.height !== h) {
      resizeCanvases();
    } else {
      makeBg();
      fit();
      drawOverlay();
    }
    updateGuide();
    return true;
  }
  function scheduleCanvasRefresh(withRetries = false) {
    if (canvasRefreshFrame) cancelAnimationFrame(canvasRefreshFrame);
    canvasRefreshFrame = requestAnimationFrame(() => {
      canvasRefreshFrame = 0;
      refreshCanvasDisplay();
    });
    if (!withRetries) return;
    for (const delay of [80, 250, 700]) {
      const timer = setTimeout(() => {
        canvasRefreshTimers.delete(timer);
        refreshCanvasDisplay();
      }, delay);
      canvasRefreshTimers.add(timer);
    }
  }
  function updateGuide() {
    guide.className = "moss-k2cf-guide";
    const v = controls.grid?.value || "Thirds";
    if (v === "Thirds") guide.classList.add("thirds");
    if (v === "Center Cross") guide.classList.add("cross");
  }
  function colorFor(slot) { return SLOTS.find((s) => s[0] === slot)?.[2] || "#fff"; }
  function normBox(b) { return [Math.min(b.x1,b.x2), Math.min(b.y1,b.y2), Math.max(b.x1,b.x2), Math.max(b.y1,b.y2)]; }
  function drawOverlay() {
    refreshPrecision();
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    if (state.hideBoxes) return;
    for (const b of state.boxes) drawBox(b, state.selectedIds.includes(b.id));
    if (state.drawing) drawBox(state.drawing, true);
  }
  function drawBox(b, selected=false) {
    const [x1,y1,x2,y2] = normBox(b), color = colorFor(b.slot);
    overlayCtx.save();
    overlayCtx.globalAlpha = selected ? 0.23 : 0.14; overlayCtx.fillStyle = color; overlayCtx.fillRect(x1,y1,x2-x1,y2-y1);
    overlayCtx.globalAlpha = 1; overlayCtx.lineWidth = selected ? 4 : 3; overlayCtx.strokeStyle = selected ? "#fff" : color; overlayCtx.strokeRect(x1,y1,x2-x1,y2-y1);
    overlayCtx.fillStyle = color; overlayCtx.fillRect(x1, Math.max(0,y1-28), 76, 28);
    overlayCtx.fillStyle = "#fff"; overlayCtx.font = "bold 18px sans-serif"; overlayCtx.fillText(String(b.slot||"").toUpperCase(), x1+8, Math.max(18,y1-8));
    overlayCtx.fillStyle = color; overlayCtx.beginPath(); overlayCtx.arc(x2, y1, 18, 0, Math.PI*2); overlayCtx.fill();
    overlayCtx.fillStyle = "#fff"; overlayCtx.font = "bold 24px sans-serif"; overlayCtx.fillText(b.locked === true ? "🔒" : "×", x2-7, y1+8);
    overlayCtx.restore();
  }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function point(ev) {
    const r = overlay.getBoundingClientRect();
    const f = frameBounds();
    return { x: clamp((ev.clientX-r.left)*overlay.width/Math.max(r.width,1), f.minX, f.maxX),
             y: clamp((ev.clientY-r.top)*overlay.height/Math.max(r.height,1), f.minY, f.maxY) };
  }
  function frameBounds() {
    const [w, h] = currentSize();
    const m = Math.max(28, Math.round(Math.min(w, h) * 0.018));
    return { minX: m, minY: m, maxX: Math.max(m, w - m), maxY: Math.max(m, h - m) };
  }
  function clampBox(b) {
    const f = frameBounds();
    b.x1 = clamp(b.x1, f.minX, f.maxX); b.x2 = clamp(b.x2, f.minX, f.maxX);
    b.y1 = clamp(b.y1, f.minY, f.maxY); b.y2 = clamp(b.y2, f.minY, f.maxY);
  }
  function addNormalizedBoxData(b) {
    const [w, h] = currentSize();
    const [x1, y1, x2, y2] = normBox(b);
    b.nx1 = w ? x1 / w : 0;
    b.ny1 = h ? y1 / h : 0;
    b.nx2 = w ? x2 / w : 0;
    b.ny2 = h ? y2 / h : 0;
  }
  function restoreBoxFromNormalized(b) {
    const [w, h] = currentSize();
    if ([b.nx1, b.ny1, b.nx2, b.ny2].every((v) => Number.isFinite(Number(v)))) {
      b.x1 = Number(b.nx1) * w;
      b.y1 = Number(b.ny1) * h;
      b.x2 = Number(b.nx2) * w;
      b.y2 = Number(b.ny2) * h;
      clampBox(b);
    }
  }
  function ensureNormalizedBoxes() {
    for (const b of state.boxes) {
      if (![b.nx1, b.ny1, b.nx2, b.ny2].every((v) => Number.isFinite(Number(v)))) {
        addNormalizedBoxData(b);
      }
    }
  }
  function remapBoxesForCurrentCanvas() {
    ensureNormalizedBoxes();
    for (const b of state.boxes) restoreBoxFromNormalized(b);
  }
  function moveWithin(b, d) {
    const f = frameBounds(), bw=d.x2-d.x1, bh=d.y2-d.y1;
    const maxX = Math.max(f.minX, f.maxX - bw), maxY = Math.max(f.minY, f.maxY - bh);
    const x1 = clamp(d.x1, f.minX, maxX), y1 = clamp(d.y1, f.minY, maxY);
    b.x1=x1; b.y1=y1; b.x2=x1+bw; b.y2=y1+bh; clampBox(b);
  }
  function positionHint(b) {
    const [w,h] = currentSize(), [x1,y1,x2,y2] = normBox(b);
    const cx = ((x1+x2)/2)/w, cy = ((y1+y2)/2)/h;
    const x = cx < .34 ? "left" : cx > .66 ? "right" : "center";
    const y = cy < .34 ? "upper" : cy > .66 ? "lower" : "middle";
    return `${y}-${x} area, centered around ${Math.round(cx*100)}% from the left and ${Math.round(cy*100)}% from the top`;
  }
  function snapPointerBox(box, handle) {
    if (!snapToggle.checked) return;
    const rect = overlay.getBoundingClientRect(), [width, height] = currentSize();
    Object.assign(box, snapBoxToGuides(box, { width, height, bounds: frameBounds(), handle,
      toleranceX: 6 * width / Math.max(rect.width, 1),
      toleranceY: 6 * height / Math.max(rect.height, 1) }));
  }
  function moveSelection(boxes, dx, dy, snapping = false) {
    if (boxes.some(b => b.locked === true)) return;
    const rect = overlay.getBoundingClientRect(), [width, height] = currentSize();
    const snap = snapping && snapToggle.checked ? { width, height,
      toleranceX: 6 * width / Math.max(rect.width, 1),
      toleranceY: 6 * height / Math.max(rect.height, 1) } : null;
    for (const moved of moveBoxSelection(boxes, dx, dy, frameBounds(), snap)) {
      const target = state.boxes.find(b => b.id === moved.id);
      if (target) Object.assign(target, moved);
    }
  }
  function writeBoxes() {
    state.boxes.forEach((b,i)=>{ const [x1,y1,x2,y2]=normBox(b); b.x1=x1;b.y1=y1;b.x2=x2;b.y2=y2;addNormalizedBoxData(b);b.bbox=[Math.round(x1),Math.round(y1),Math.round(x2),Math.round(y2)];b.position_hint=positionHint(b);b.z=i; });
    sync(); drawOverlay();
  }
  function newBoxId() {
    let id;
    do { id = `box_${Date.now()}_${++boxSequence}`; }
    while (state.boxes.some(box => box.id === id));
    return id;
  }
  function hitTest(p, preferResize = false, prioritizeSelection = true) {
    const ordered = state.boxes.slice().reverse();
    if (prioritizeSelection) ordered.sort((a,b) => Number(b.id === state.selectedId) - Number(a.id === state.selectedId)
      || Number(state.selectedIds.includes(b.id)) - Number(state.selectedIds.includes(a.id)));
    for (const b of ordered) {
      const [x1,y1,x2,y2]=normBox(b);
      const near=14, handles={nw:[x1,y1],ne:[x2,y1],sw:[x1,y2],se:[x2,y2]};
      if (preferResize) {
        for (const [handle,[hx,hy]] of Object.entries(handles)) if (Math.abs(p.x-hx)<=near && Math.abs(p.y-hy)<=near) return {box:b,handle};
      }
      if (Math.abs(p.x-x2)<=24 && Math.abs(p.y-y1)<=24) return { box:b, handle:"delete" };
      for (const [handle,[hx,hy]] of Object.entries(handles)) if (Math.abs(p.x-hx)<=near && Math.abs(p.y-hy)<=near) return {box:b,handle};
      if (p.x>=x1&&p.x<=x2&&p.y>=y1&&p.y<=y2) return {box:b,handle:"move"};
    }
    return null;
  }
  overlay.addEventListener("pointerdown", (ev)=>{
    if(ev.button!==0 || pointerStart || state.layoutError)return;
    ev.preventDefault(); ev.stopPropagation(); overlay.focus({preventScroll:true});
    const p=point(ev);
    if((ev.altKey || ev.ctrlKey || ev.metaKey) && state.hideBoxes)return;
    overlay.setPointerCapture(ev.pointerId);
    pointerStart=snapshotCanvasEdit();
    historyState=pointerStart;
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && !state.drawMode) {
      const hit = hitTest(p, false, false)?.box;
      if (hit) selectBoxes(state.selectedIds.includes(hit.id)
        ? state.selectedIds.filter(id => id !== hit.id) : [...state.selectedIds, hit.id]);
      pointerStart = null;
      sync(); drawOverlay(); return;
    }
    if(ev.altKey && !state.drawMode){
      const selected = selectedBoxes().find(b =>
        p.x >= Math.min(b.x1,b.x2) && p.x <= Math.max(b.x1,b.x2) &&
        p.y >= Math.min(b.y1,b.y2) && p.y <= Math.max(b.y1,b.y2));
      const source = selected || nextOverlappingBox(state.boxes, p, null);
      const sources = source ? (selected ? selectedBoxes() : [source]) : [];
      altDrag = { sources: sources.some(b => b.locked === true) ? [] : structuredClone(sources), point: p,
        clientX: ev.clientX, clientY: ev.clientY, created: false };
      return;
    }
    const hit=state.hideBoxes ? null : hitTest(p, ev.shiftKey);
    if(!state.drawMode && hit){
      if (hit.box.locked === true) {
        selectBoxes(state.selectedIds.includes(hit.box.id) ? state.selectedIds : [hit.box.id], hit.box.id);
        pointerStart = null; sync(); drawOverlay(); return;
      }
      if(hit.handle==="delete"){ state.boxes=state.boxes.filter((b)=>b.id!==hit.box.id); selectBoxes(state.selectedIds); writeBoxes(); pointerStart=null; return; }
      if(hit.handle==="move") {
        selectBoxes(state.selectedIds.includes(hit.box.id) ? state.selectedIds : [hit.box.id], hit.box.id);
        state.moving={x:p.x,y:p.y,boxes:structuredClone(selectedBoxes())};
      } else {
        selectBoxes([hit.box.id]);
        state.resizing={id:hit.box.id,handle:hit.handle,box:{...hit.box}};
      }
      drawOverlay(); return;
    }
    if (!state.drawMode) selectBoxes([]);
    state.drawing={id:newBoxId(),slot:state.activeSlot,x1:p.x,y1:p.y,x2:p.x,y2:p.y};
  });
  overlay.addEventListener("pointermove", (ev)=>{
    const p=point(ev);
    if(altDrag && !altDrag.created){
      if(!altDrag.sources.length || Math.hypot(ev.clientX-altDrag.clientX,ev.clientY-altDrag.clientY)<4)return;
      const copies=altDrag.sources.map(source => {
        const copy={...structuredClone(source),id:newBoxId()};
        state.boxes.push(copy); return copy;
      });
      selectBoxes(copies.map(b=>b.id));altDrag.created=true;
      state.moving={x:altDrag.point.x,y:altDrag.point.y,boxes:structuredClone(copies)};
    }
    if(state.drawing){ state.drawing.x2=p.x; state.drawing.y2=p.y; clampBox(state.drawing); drawOverlay(); return; }
    if(state.moving){ moveSelection(state.moving.boxes,p.x-state.moving.x,p.y-state.moving.y,true); drawOverlay(); return; }
    if(state.resizing){
      const {id,handle,box}=state.resizing, b=state.boxes.find(x=>x.id===id);if(!b)return;
      if(ev.shiftKey) Object.assign(b,resizeBoxWithAspect(box,p,handle,frameBounds()));
      else {
        Object.assign(b,{x1:box.x1,y1:box.y1,x2:box.x2,y2:box.y2});
        if(handle.includes("n"))b.y1=p.y;if(handle.includes("s"))b.y2=p.y;
        if(handle.includes("w"))b.x1=p.x;if(handle.includes("e"))b.x2=p.x;
        clampBox(b);snapPointerBox(b,handle);
      }
      drawOverlay();
    }
  });
  overlay.addEventListener("pointerup", ()=>{
    if(altDrag && !altDrag.created){
      const selected=nextOverlappingBox(state.boxes,altDrag.point,state.selectedId);
      if(selected)selectBoxes([selected.id]);
      drawOverlay();
    }
    if(state.drawing){ const [x1,y1,x2,y2]=normBox(state.drawing); if(Math.abs(x2-x1)>8&&Math.abs(y2-y1)>8){ state.drawing.x1=x1;state.drawing.y1=y1;state.drawing.x2=x2;state.drawing.y2=y2;state.boxes.push(state.drawing);selectBoxes([state.drawing.id]); state.drawMode=false; drawBtn.classList.remove("primary"); } state.drawing=null; writeBoxes(); }
    if(state.moving||state.resizing){ state.moving=null;state.resizing=null;writeBoxes(); }
    pointerStart=null;
    altDrag=null;
    sync();
    refreshPrecision();
  });
  function cancelPointerEdit() {
    if (pointerStart) restoreCanvasEdit(pointerStart);
  }
  overlay.addEventListener("pointercancel", cancelPointerEdit);
  overlay.addEventListener("lostpointercapture", cancelPointerEdit);
  function onCanvasKeyDown(ev) {
    if (!wrap.isConnected || !wrap.contains(ev.target)) return;
    const tag=ev.target?.tagName?.toLowerCase();
    if(tag==="input"||tag==="textarea"||tag==="select")return;
    if(ev.target?.isContentEditable && ev.target.dataset.mossCanvasShortcut !== "true")return;
    const key=ev.key.toLowerCase();
    if (ev.key === "Escape" && ev.target === overlay) {
      if (pointerStart) cancelPointerEdit();
      else { selectBoxes([]); sync(); drawOverlay(); }
      ev.preventDefault(); ev.stopImmediatePropagation(); return;
    }
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (key==="z" || key==="y")) {
      restoreHistory(key==="y" || ev.shiftKey ? "redo" : "undo");
      ev.preventDefault(); ev.stopImmediatePropagation(); return;
    }
    const direction = {ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1]}[ev.key];
    if (direction && ev.target === overlay && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !pointerStart && !state.layoutError && !state.hideBoxes) {
      const boxes = selectedBoxes();
      if (!boxes.length) return;
      const step = ev.shiftKey ? 10 : 1;
      const dx = direction[0]*step, dy = direction[1]*step;
      moveSelection(boxes, dx, dy);
      writeBoxes();
      ev.preventDefault(); ev.stopImmediatePropagation(); return;
    }
    if (pointerStart || state.layoutError || state.hideBoxes || (ev.key!=="Delete" && ev.key!=="Backspace")) return;
    if(state.selectedIds.length){ state.boxes=state.boxes.filter((b)=>b.locked === true || !state.selectedIds.includes(b.id)); selectBoxes(state.selectedIds); writeBoxes(); ev.preventDefault(); ev.stopImmediatePropagation(); }
  }
  window.addEventListener("keydown", onCanvasKeyDown, true);

  function hydrateCanvasFromWidgets() {
    isHydrating = true;
    snapToggle.checked = false;
    pointerStart = null;
    altDrag = null;
    state.drawing = state.moving = state.resizing = null;
    selectBoxes([]);
    const savedState = k2cfBestSavedState(node, "canvas");
    if (savedState) applyConfiguredValuesToWidgets(node, CANVAS_WIDGETS, savedState.widgets_values);
    try {
      width.value = String(widgets.width?.value || DEFAULT_WIDTH);
      height.value = String(widgets.height?.value || DEFAULT_HEIGHT);
      fillPresetSelect(widgets.preset?.value || DEFAULT_PRESET);

      let storedGrid = "Thirds";
      let storedLanguage = "Auto";
      try {
        storedGrid = readPresetStorage(CANVAS_GRID_KEY) || "Thirds";
        storedLanguage = readPresetStorage(CANVAS_LANGUAGE_KEY) || "Auto";
      } catch (_) {}
      if (controls.grid) controls.grid.value = widgets.grid_mode?.value || storedGrid;
      if (controls.ui_language) controls.ui_language.value = widgets.ui_language?.value || storedLanguage;

      try {
        const camera = JSON.parse(widgets.camera_data?.value || "{}");
        controls.iso?.set(camera.iso || "");
        controls.shutter?.set(camera.shutter || "");
        controls.aperture?.set(camera.aperture || "");
        controls.focal_length?.set(camera.focal_length || "");
      } catch (_) {}

      try {
        controls.cameraSetData = JSON.parse(widgets.camera_set_data?.value || readPresetStorage(CAMERA_SET_KEY) || '{"sets":[],"selected":""}');
        if (!Array.isArray(controls.cameraSetData.sets)) controls.cameraSetData.sets = [];
        refreshCameraSetSelect?.();
      } catch (_) {}

      try {
        controls.canvasPresetData = JSON.parse(widgets.canvas_preset_data?.value || readPresetStorage(CANVAS_PRESET_KEY) || '{"sets":[],"selected":""}');
        if (!Array.isArray(controls.canvasPresetData.sets)) controls.canvasPresetData.sets = [];
        refreshCanvasPresetSelect?.();
      } catch (_) {}

      restoreCanvasLayout();
      overlay.title = state.layoutError
        ? "Invalid saved layout. Original data is preserved; use Reset Canvas or reload a valid workflow."
        : canvasHelp;
      overlay.setAttribute("aria-invalid", String(!!state.layoutError));

      tools.querySelectorAll(".moss-k2cf-sw").forEach((x) => x.classList.toggle("active", x.dataset.slot === state.activeSlot));
      drawBtn.classList.toggle("primary", state.drawMode);
      updateGuide();
      resizeCanvases();
      applyCanvasLabels();
      drawOverlay();
      reference.configure();
    } finally {
      isHydrating = false;
      history.clear();
      historyState = state.layoutError ? null : snapshotCanvasEdit();
      updateHistoryButtons();
      requestAnimationFrame(updateExternalSizeStatus);
    }
  }

  node.__k2cfHydrateFromWidgets = hydrateCanvasFromWidgets;
  hydrateCanvasFromWidgets();
  if (k2cfHasMeaningfulState(configuredValues)) {
    applyConfiguredValuesToWidgets(node, CANVAS_WIDGETS, configuredValues);
    node.properties = node.properties || {};
    node.properties.k2cfCanvasState = {
      version: "widgets_values",
      widgets_values: configuredValues.slice(),
      saved_at: Date.now()
    };
    hydrateCanvasFromWidgets();
  }
  k2cfPersistWidgetSnapshot(node, "canvas", CANVAS_WIDGETS, "v15");
  installNodePersistenceHooks(node, sync, CANVAS_WIDGETS, "k2cfCanvas");
  node.addDOMWidget("krea2_canvas_ui", "Krea2CanvasUI", wrap, { serialize:false, hideOnZoom:false, hideInPanel:true, getMinHeight:()=>260 });
  k2cfInstallNodeSizePersistence(node, "canvas", K2CF_CANVAS_DEFAULT_SIZE);
  k2cfMaybeInitializeNodeSize(node, "canvas", K2CF_CANVAS_DEFAULT_SIZE);
  k2cfScheduleNodeSizeRestore(node, "canvas", K2CF_CANVAS_DEFAULT_SIZE);
  const canvasResizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => scheduleCanvasRefresh(false))
    : null;
  canvasResizeObserver?.observe(monitor);
  const refreshAfterVisibility = () => {
    if (!document.hidden) scheduleCanvasRefresh(true);
  };
  const refreshAfterFocus = () => scheduleCanvasRefresh(true);
  document.addEventListener("visibilitychange", refreshAfterVisibility);
  window.addEventListener("focus", refreshAfterFocus);
  window.addEventListener("pageshow", refreshAfterFocus);
  bg.addEventListener("contextrestored", refreshAfterFocus);
  overlay.addEventListener("contextrestored", refreshAfterFocus);
  scheduleCanvasRefresh(true);

  const oldResize=node.onResize; node.onResize=function(){ const r = oldResize?.apply(this,arguments); scheduleCanvasRefresh(false); return r; };
  const oldRemoved=node.onRemoved; node.onRemoved=function(){
    reference.dispose();
    window.removeEventListener("keydown", onCanvasKeyDown, true);
    history.clear();
    clearInterval(externalPreviewTimer);
    canvasResizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", refreshAfterVisibility);
    window.removeEventListener("focus", refreshAfterFocus);
    window.removeEventListener("pageshow", refreshAfterFocus);
    bg.removeEventListener("contextrestored", refreshAfterFocus);
    overlay.removeEventListener("contextrestored", refreshAfterFocus);
    if (canvasRefreshFrame) cancelAnimationFrame(canvasRefreshFrame);
    for (const timer of canvasRefreshTimers) clearTimeout(timer);
    canvasRefreshTimers.clear();
    return oldRemoved?.apply(this,arguments);
  };
}

function setupPromptNode(node) {
  node.resizable = true;
  node.serialize_widgets = true;
  const widgets = {};
  for (const name of PROMPT_WIDGETS) widgets[name] = widget(node, name);
  Object.values(widgets).forEach(hideWidget);
  requestAnimationFrame(() => hideWidgetsByName(node, PROMPT_WIDGETS));
  setTimeout(() => hideWidgetsByName(node, PROMPT_WIDGETS), 0);
  setTimeout(() => hideWidgetsByName(node, PROMPT_WIDGETS), 200);
  const configuredWidgetValues = Array.isArray(node.__k2cfConfiguredWidgetValues)
    ? k2cfSanitizePromptValues(node.__k2cfConfiguredWidgetValues.slice())
    : null;
  const configuredStateValues = Array.isArray(node.__k2cfConfiguredPromptState?.widgets_values)
    ? k2cfSanitizePromptValues(node.__k2cfConfiguredPromptState.widgets_values.slice())
    : null;
  const configuredValues = k2cfHasMeaningfulState(configuredWidgetValues)
    ? configuredWidgetValues
    : configuredStateValues;
  let isHydrating = false;
  node.__k2cfApplyConfiguredValues = (values) => applyConfiguredValuesToWidgets(node, PROMPT_WIDGETS, values);
  applyConfiguredValuesToWidgets(node, PROMPT_WIDGETS, configuredValues);
  const savedPromptState = k2cfBestSavedState(node, "prompt");
  if (savedPromptState) applyConfiguredValuesToWidgets(node, PROMPT_WIDGETS, savedPromptState.widgets_values);

  const controls = {};
  function setWidget(name, value) {
    const w = widgets[name];
    if (!w) return;
    w.value = value;
    w.serialize = true;
    w.options = w.options || {};
    w.options.serialize = true;
  }
  function sync(allowDefaultOverwrite = true) {
    if (isHydrating) return;
    try { captureCurrentTextHeights(false); } catch (_) {}
    const previous = k2cfBestSavedState(node, "prompt");
    node.__k2cfSkipLocalPromptState = false;
    node.__k2cfAllowDefaultOverwrite = allowDefaultOverwrite;
    for (const name of PROMPT_WIDGETS) if (controls[name]) setWidget(name, controls[name].value ?? "");
    const rawValues = k2cfSanitizePromptValues(PROMPT_WIDGETS.map((n) => widgets[n]?.value ?? ""));
    const values = allowDefaultOverwrite ? rawValues : k2cfSanitizePromptValues(k2cfMergeWithPrevious(PROMPT_WIDGETS, rawValues, previous?.widgets_values));
    node.widgets_values = values.slice();
    applyConfiguredValuesToWidgets(node, PROMPT_WIDGETS, node.widgets_values);
    node.properties = node.properties || {};
    node.properties.k2cfPromptState = {
      version: "v27",
      widgets_values: node.widgets_values.slice(),
      saved_at: Date.now()
    };
    k2cfWriteLocalState(node, "prompt", node.properties.k2cfPromptState);
    node.__k2cfConfiguredWidgetValues = null;
    try { app.graph?.setDirtyCanvas?.(true, true); } catch (_) {}
  }

  const defaultPromptUiState = () => ({
    version: "prompt_ui_element_v1",
    heightCaptureMode: K2CF_PROMPT_HEIGHT_CAPTURE_MODE,
    textHeights: { red_prompt: 125, blue_prompt: 125, yellow_prompt: 125, green_prompt: 125, magenta_prompt: 125 },
    textHeightManual: { red_prompt: true, blue_prompt: true, yellow_prompt: true, green_prompt: true, magenta_prompt: true },
    slotOpen: { red: true, blue: true, yellow: false, green: false, magenta: false },
    scenePreset: "",
    slotPreset: {},
    slotValues: {},
    saved_at: Date.now(),
  });
  const promptUiWidgetState = k2cfReadJsonObject(widgets.prompt_ui_data?.value);
  const workflowPromptUiCandidates = [
    node.properties?.k2cfPromptUiState,
    node.__k2cfConfiguredPromptUiState,
    promptUiWidgetState
  ].filter((state) => k2cfPromptUiHasMeaningfulState(state));
  const localPromptUiState = k2cfReadLocalState(node, "prompt_ui");
  const promptUiCandidates = workflowPromptUiCandidates.length ? workflowPromptUiCandidates
    : [localPromptUiState].filter((state) => k2cfPromptUiHasMeaningfulState(state));
  const storedPromptUiState = k2cfPickLatestState(promptUiCandidates) || {};
  const promptUiState = defaultPromptUiState();
  Object.assign(promptUiState, storedPromptUiState);
  const storedHeightCaptureMode = storedPromptUiState.heightCaptureMode || "";
  const canRestoreStoredTextHeights = storedHeightCaptureMode === K2CF_PROMPT_HEIGHT_CAPTURE_MODE;
  promptUiState.textHeights = Object.assign({}, defaultPromptUiState().textHeights, canRestoreStoredTextHeights ? k2cfSanitizePromptTextHeights(storedPromptUiState.textHeights || {}) : {});
  promptUiState.textHeightManual = Object.assign({}, canRestoreStoredTextHeights ? (storedPromptUiState.textHeightManual || {}) : {});
  promptUiState.slotOpen = Object.assign({}, defaultPromptUiState().slotOpen, storedPromptUiState.slotOpen || {});
  promptUiState.slotPreset = Object.assign({}, storedPromptUiState.slotPreset || {});
  promptUiState.slotValues = Object.assign({}, storedPromptUiState.slotValues || {});
  const textStyles = {};
  function capturePromptSlotValues() {
    promptUiState.slotValues = promptUiState.slotValues || {};
    for (const [slot, label, color, promptName, typeName, framingName, angleName] of SLOTS) {
      promptUiState.slotValues[slot] = {
        type: controls[typeName]?.value || widgets[typeName]?.value || "obj",
        framing: controls[framingName]?.value || widgets[framingName]?.value || "Auto",
        angle: controls[angleName]?.value || widgets[angleName]?.value || "Auto",
        textStyle: textStyles[slot]?.get() || promptUiState.slotValues[slot]?.textStyle || {mode:"common"},
      };
    }
  }
  function selectValueWithStored(widgetValue, storedValue, fallback) {
    const w = String(widgetValue || fallback);
    const s = String(storedValue || fallback);
    return w !== fallback ? w : s;
  }
  function savePromptUiState(markDirty = true) {
    capturePromptSlotValues();
    promptUiState.saved_at = Date.now();
    node.properties = node.properties || {};
    node.properties.k2cfPromptUiState = {
      version: "prompt_ui_element_v1",
      heightCaptureMode: K2CF_PROMPT_HEIGHT_CAPTURE_MODE,
      textHeights: Object.assign({}, promptUiState.textHeights),
      textHeightManual: Object.assign({}, promptUiState.textHeightManual || {}),
      slotOpen: Object.assign({}, promptUiState.slotOpen),
      scenePreset: promptUiState.scenePreset || "",
      slotPreset: Object.assign({}, promptUiState.slotPreset),
      slotValues: Object.assign({}, promptUiState.slotValues || {}),
      saved_at: promptUiState.saved_at,
    };
    const serializedPromptUiState = JSON.stringify(node.properties.k2cfPromptUiState);
    setWidget("prompt_ui_data", serializedPromptUiState);
    node.widgets_values = k2cfSanitizePromptValues(PROMPT_WIDGETS.map((n) => widgets[n]?.value ?? ""));
    k2cfWriteLocalState(node, "prompt_ui", node.properties.k2cfPromptUiState);
    if (markDirty) {
      try { app.graph?.setDirtyCanvas?.(true, true); } catch (_) {}
    }
  }
  function mergePromptUiState(state) {
    if (!state || typeof state !== "object") return;
    const defaults = defaultPromptUiState();
    const previousSlotOpen = promptUiState.slotOpen || {};
    const previousSlotPreset = promptUiState.slotPreset || {};
    const previousSlotValues = promptUiState.slotValues || {};
    const previousHeights = promptUiState.textHeights || {};
    const previousManual = promptUiState.textHeightManual || {};
    Object.assign(promptUiState, state);
    const canRestoreStateHeights = state.heightCaptureMode === K2CF_PROMPT_HEIGHT_CAPTURE_MODE;
    const sanitized = canRestoreStateHeights ? k2cfSanitizePromptTextHeights(state.textHeights || {}) : {};
    const manual = canRestoreStateHeights && state.textHeightManual && typeof state.textHeightManual === "object" ? state.textHeightManual : {};
    const restoredHeights = Object.assign({}, previousHeights);
    const restoredManual = Object.assign({}, previousManual);
    for (const [key, value] of Object.entries(sanitized)) {
      // v29: Restore only heights captured by bottom-right resize-grip dragging.
      // Older manual flags may have been created by ComfyUI tab/app reflow, so ignore them.
      if (manual[key]) {
        restoredHeights[key] = value;
        restoredManual[key] = true;
      }
    }
    promptUiState.textHeights = restoredHeights;
    promptUiState.textHeightManual = restoredManual;
    promptUiState.slotOpen = Object.assign({}, defaults.slotOpen, previousSlotOpen, state.slotOpen || {});
    promptUiState.slotPreset = Object.assign({}, previousSlotPreset, state.slotPreset || {});
    promptUiState.slotValues = Object.assign({}, previousSlotValues, state.slotValues || {});
  }
  function refreshPromptUiState() {
    const states = [
      node.properties?.k2cfPromptUiState,
      node.__k2cfConfiguredPromptUiState,
      k2cfReadJsonObject(widgets.prompt_ui_data?.value)
    ].filter((state) => k2cfPromptUiHasMeaningfulState(state));
    if (!states.length) {
      const local = k2cfReadLocalState(node, "prompt_ui");
      if (k2cfPromptUiHasMeaningfulState(local)) states.push(local);
    }
    if (!states.length) return;
    states.sort((a, b) => Number(a.saved_at || 0) - Number(b.saved_at || 0));
    for (const state of states) mergePromptUiState(state);
  }
  function readPresetList(key) {
    try {
      const arr = JSON.parse(readPresetStorage(key) || "[]");
      return Array.isArray(arr) ? arr.filter((p) => p && p.name) : [];
    } catch (_) {
      return [];
    }
  }
  function writePresetList(key, values) {
    try { localStorage.setItem(key, JSON.stringify(values)); } catch (_) {}
  }
  function recordTextHeight(key, h, allowShrink = false, manual = false) {
    const next = Math.round(Number(h) || 0);
    if (!manual) return false;
    if (!k2cfPromptTextHeightInRange(key, next)) return false;
    const current = Math.round(Number(promptUiState.textHeights?.[key] || 0) || 0);
    if (current && !allowShrink && next < current - 3) return false;
    if (current && Math.abs(current - next) <= 3 && promptUiState.textHeightManual?.[key]) return false;
    promptUiState.textHeights[key] = next;
    promptUiState.textHeightManual = promptUiState.textHeightManual || {};
    promptUiState.textHeightManual[key] = true;
    return true;
  }

  function saveObservedTextHeight(key, el, allowShrink = false, manual = false, markDirty = true) {
    const observed = k2cfElementPixelHeight(el);
    const applied = Math.round(parseFloat(String(el.dataset.k2cfAppliedHeight || "0").replace("px", "")) || 0);
    // v28: text area size is persisted only after an actual manual size change.
    // A plain click/focus in the textarea should not save the current/default height.
    const changedByUser = Math.abs(Math.round(observed || 0) - Math.round(applied || 0)) > 4;
    const changed = recordTextHeight(key, observed, allowShrink, Boolean((manual || changedByUser) && changedByUser));
    if (changed) {
      const px = `${Math.round(observed)}px`;
      el.dataset.k2cfAppliedHeight = px;
      savePromptUiState(markDirty);
    }
    return changed;
  }

  function applySavedTextHeight(key, el) {
    const stored = Math.round(Number(promptUiState.textHeights?.[key] || 0) || 0);
    const manual = Boolean(promptUiState.textHeightManual?.[key]);
    const h = manual && k2cfPromptTextHeightInRange(key, stored) ? stored : k2cfDefaultTextHeightForKey(key);
    const px = `${Math.round(h)}px`;
    el.style.height = px;
    el.dataset.k2cfAppliedHeight = px;
    el.__k2cfHeightHydrated = true;
  }

  function applyAllSavedTextHeights() {
    applySavedTextHeight("scene", sceneText);
    applySavedTextHeight("background", backgroundText);
    for (const [, , , promptName] of SLOTS) {
      if (controls[promptName]) applySavedTextHeight(promptName, controls[promptName]);
    }
  }

  function scheduleApplyAllSavedTextHeights() {
    applyAllSavedTextHeights();
    try { requestAnimationFrame(() => applyAllSavedTextHeights()); } catch (_) {}
    try { requestAnimationFrame(() => requestAnimationFrame(() => applyAllSavedTextHeights())); } catch (_) {}
    setTimeout(() => applyAllSavedTextHeights(), 80);
    setTimeout(() => applyAllSavedTextHeights(), 240);
  }

  function bindTextHeight(key, el) {
    applySavedTextHeight(key, el);
    let heightTimer = null;
    let isResizeGripDrag = false;
    let lastPointerAt = 0;

    const eventPoint = (ev) => {
      const t = ev?.touches?.[0] || ev?.changedTouches?.[0] || ev;
      return {
        x: Number(t?.clientX || 0),
        y: Number(t?.clientY || 0),
      };
    };

    const isResizeGripEvent = (ev) => {
      try {
        const rect = el.getBoundingClientRect();
        const p = eventPoint(ev);
        if (!rect || !p.x || !p.y) return false;
        // Native textarea resize handle is bottom-right in ComfyUI/Chromium.
        // Only this area is allowed to create persistent manual height.
        return p.x >= rect.right - 28 && p.x <= rect.right + 8 &&
               p.y >= rect.bottom - 28 && p.y <= rect.bottom + 8;
      } catch (_) {
        return false;
      }
    };

    const canShrinkNow = () => Boolean(isResizeGripDrag) && (Date.now() - lastPointerAt < 3500);

    const saveHeight = (force = false, allowShrink = false, manual = false) => {
      if (!force && !isResizeGripDrag) return;
      saveObservedTextHeight(key, el, allowShrink || canShrinkNow(), Boolean(manual && isResizeGripDrag));
    };

    const startWatchingHeight = (ev) => {
      if (!isResizeGripEvent(ev)) return;
      isResizeGripDrag = true;
      lastPointerAt = Date.now();
      saveHeight(true, canShrinkNow(), true);
      if (heightTimer) window.clearInterval(heightTimer);
      heightTimer = window.setInterval(() => saveHeight(true, canShrinkNow(), true), 120);
    };

    const stopWatchingHeight = () => {
      if (!isResizeGripDrag) return;
      if (heightTimer) {
        window.clearInterval(heightTimer);
        heightTimer = null;
      }
      setTimeout(() => saveHeight(true, canShrinkNow(), true), 0);
      setTimeout(() => {
        saveHeight(true, canShrinkNow(), true);
        isResizeGripDrag = false;
      }, 160);
    };

    if (window.MutationObserver) {
      const mo = new MutationObserver(() => {
        if (isResizeGripDrag) saveHeight(false, false, true);
      });
      mo.observe(el, { attributes: true, attributeFilter: ["style"] });
    }

    el.addEventListener("pointerdown", startWatchingHeight);
    el.addEventListener("mousedown", startWatchingHeight);
    el.addEventListener("touchstart", startWatchingHeight, { passive: true });

    // Text edits must not persist visual height. Text value sync is handled separately.
    el.addEventListener("input", () => {});
    el.addEventListener("change", () => {});
    el.addEventListener("keyup", () => {});
    el.addEventListener("blur", () => {});

    window.addEventListener("pointerup", stopWatchingHeight);
    window.addEventListener("mouseup", stopWatchingHeight);
    window.addEventListener("touchend", stopWatchingHeight);
  }

  const wrap = document.createElement("div");
  wrap.className = "moss-k2cf-prompt-wrap";
  k2cfAllowWheelZoomOnEmptySpace(wrap);
  k2cfAllowGraphPanOnEmptySpace(wrap);
  const promptLangBar = document.createElement("div");
  promptLangBar.className = "moss-k2cf-prompt-top";
  const promptLangGroup = document.createElement("div");
  promptLangGroup.className = "moss-k2cf-rowline";
  const promptLangLabel = document.createElement("span");
  const promptLangSelect = document.createElement("select");
  promptLangSelect.className = "moss-k2cf-select moss-k2cf-language-select";
  for (const v of ["Auto", "English", "Japanese"]) promptLangSelect.appendChild(option(v, v));
  try {
    promptLangSelect.value = readPresetStorage(PROMPT_LANGUAGE_KEY) || "Auto";
  } catch (_) {
    promptLangSelect.value = "Auto";
  }
  bindHelp(promptLangSelect, "ui_language");
  promptLangGroup.append(promptLangLabel, promptLangSelect);

  const scene = document.createElement("div");
  scene.className = "moss-k2cf-scene";
  const sceneLabel = document.createElement("label");
  sceneLabel.textContent = tr(resolveLang(promptLangSelect.value), "scene");
  const sceneText = document.createElement("textarea");
  sceneText.className = "moss-k2cf-text";
  sceneText.placeholder = tr(resolveLang(promptLangSelect.value), "scenePlaceholder");
  sceneText.value = widgets.scene?.value || "";
  bindHelp(sceneText, "scene");
  controls.scene = sceneText;
  k2cfAttachPyssssAutocomplete(sceneText);

  const backgroundText = document.createElement("textarea");
  backgroundText.className = "moss-k2cf-text";
  backgroundText.placeholder = tr(resolveLang(promptLangSelect.value), "backgroundPlaceholder");
  backgroundText.value = widgets.background?.value || "";
  bindHelp(backgroundText, "background");
  controls.background = backgroundText;
  k2cfAttachPyssssAutocomplete(backgroundText);
  sceneText.addEventListener("input", sync);
  backgroundText.addEventListener("input", sync);
  sceneText.addEventListener("change", sync);
  sceneText.addEventListener("blur", sync);
  sceneText.addEventListener("compositionend", sync);
  sceneText.addEventListener("change", sync);
  sceneText.addEventListener("blur", sync);
  sceneText.addEventListener("compositionend", sync);
  bindTextHeight("scene", sceneText);
  const scenePresetBar = document.createElement("div");
  scenePresetBar.className = "moss-k2cf-presetbar";
  const scenePresetLabel = document.createElement("label");
  const scenePresetSelect = document.createElement("select");
  scenePresetSelect.className = "moss-k2cf-small-select";
  const sceneSave = document.createElement("button");
  sceneSave.className = "moss-k2cf-small-btn";
  const sceneLoad = document.createElement("button");
  sceneLoad.className = "moss-k2cf-small-btn";
  const sceneDelete = document.createElement("button");
  sceneDelete.className = "moss-k2cf-small-btn";
  for (const [el, key] of [[scenePresetSelect,"scene_preset"], [sceneSave,"save_scene"], [sceneLoad,"load_scene"], [sceneDelete,"delete_scene"]]) bindHelp(el, key);
  scenePresetBar.append(scenePresetLabel, scenePresetSelect, sceneSave, sceneLoad, sceneDelete);
  promptLangBar.append(promptLangGroup, scenePresetBar);
  wrap.appendChild(promptLangBar);
  scene.append(sceneLabel, sceneText);
  wrap.appendChild(scene);
  const promptCards = [];
  const promptPresetSelects = [];
  function selectedPresetValue(select, fallback = "") {
    return select?.value || fallback || "";
  }
  function applyPromptLabels() {
    const lang = resolveLang(promptLangSelect.value);
    promptLangLabel.textContent = "UI";
    sceneLabel.textContent = tr(lang, "scene");
    if (typeof backgroundLabel !== "undefined" && backgroundLabel) backgroundLabel.textContent = tr(lang, "background");
    sceneText.placeholder = tr(lang, "scenePlaceholder");
    if (typeof backgroundText !== "undefined" && backgroundText) backgroundText.placeholder = tr(lang, "backgroundPlaceholder");
    scenePresetLabel.textContent = tr(lang, "scenePreset");
    scenePresetLabel.title = tr(lang, "scenePresetHelp");
    scenePresetSelect.title = tr(lang, "scenePresetSelectHelp");
    sceneSave.textContent = tr(lang, "save");
    sceneSave.title = tr(lang, "sceneSaveHelp");
    sceneLoad.textContent = tr(lang, "loadPreset");
    sceneLoad.title = tr(lang, "sceneLoadHelp");
    sceneDelete.textContent = tr(lang, "deletePreset");
    sceneDelete.title = tr(lang, "sceneDeleteHelp");
    for (const item of promptCards) {
      item.promptLabel.textContent = tr(lang, "prompt");
      if (item.head) item.head.title = tr(lang, "slotHeaderHelp").replace("{label}", item.label);
      if (item.ta) item.ta.title = tr(lang, "slotPromptHelp");
      if (item.typeSelect) item.typeSelect.title = tr(lang, "elementTypeHelp");
      if (item.typeLabel) item.typeLabel.textContent = tr(lang, "elementType");
      if (item.typeLabel) item.typeLabel.title = tr(lang, "elementTypeHelp");
      if (item.framingSelect) item.framingSelect.title = tr(lang, "framingHelp");
      if (item.framingLabel) item.framingLabel.textContent = tr(lang, "framing");
      if (item.framingLabel) item.framingLabel.title = tr(lang, "framingHelp");
      if (item.angleSelect) item.angleSelect.title = tr(lang, "angleHelp");
      if (item.angleLabel) item.angleLabel.textContent = tr(lang, "angle");
      if (item.angleLabel) item.angleLabel.title = tr(lang, "angleHelp");
      item.ta.placeholder = tr(lang, "enterPrompt").replace("{label}", item.label);
      if (item.del) item.del.title = tr(lang, "clearPrompt");
      if (item.presetLabel) item.presetLabel.textContent = tr(lang, "promptPreset");
      if (item.save) item.save.textContent = tr(lang, "save");
      if (item.load) item.load.textContent = tr(lang, "loadPreset");
      if (item.deletePreset) item.deletePreset.textContent = tr(lang, "deletePreset");
      if (item.applyOpen) item.applyOpen();
      item.textStyle?.refresh();
    }
  }
  promptLangSelect.addEventListener("change", () => {
    try { localStorage.setItem(PROMPT_LANGUAGE_KEY, promptLangSelect.value || "Auto"); } catch (_) {}
    applyPromptLabels();
    refreshScenePresets();
    refreshPromptSlotPresets();
    sync();
  });

  function refreshScenePresets() {
    const presets = readPresetList(SCENE_PRESET_KEY);
    const selected = promptUiState.scenePreset || "";
    scenePresetSelect.innerHTML = "";
    scenePresetSelect.appendChild(option("", tr(resolveLang(promptLangSelect.value), "none")));
    for (const p of presets) scenePresetSelect.appendChild(option(p.name, p.name));
    scenePresetSelect.value = presets.some((p) => p.name === selected) ? selected : "";
    promptUiState.scenePreset = scenePresetSelect.value;
  }
  scenePresetSelect.addEventListener("change", () => {
    promptUiState.scenePreset = scenePresetSelect.value || "";
    savePromptUiState();
  });
  sceneSave.addEventListener("click", () => {
    const name = prompt("Scene preset name", scenePresetSelect.value || "Scene Preset");
    if (!name) return;
    const presets = readPresetList(SCENE_PRESET_KEY).filter((p) => p.name !== name);
    presets.push({ name, text: sceneText.value || "", height: promptUiState.textHeights.scene || k2cfElementPixelHeight(sceneText) });
    writePresetList(SCENE_PRESET_KEY, presets);
    promptUiState.scenePreset = name;
    promptUiState.textHeights.scene = presets[presets.length - 1].height;
    promptUiState.textHeightManual.scene = true;
    refreshScenePresets();
    savePromptUiState();
  });
  sceneLoad.addEventListener("click", () => {
    const selected = scenePresetSelect.value;
    const preset = readPresetList(SCENE_PRESET_KEY).find((p) => p.name === selected);
    if (!preset) return;
    sceneText.value = preset.text || "";
    if (Number(preset.height) >= 45) {
      promptUiState.textHeights.scene = Number(preset.height);
      promptUiState.textHeightManual.scene = true;
      applySavedTextHeight("scene", sceneText);
      applySavedTextHeight("background", backgroundText);
    }
    sync();
    savePromptUiState();
  });
  sceneDelete.addEventListener("click", () => {
    const selected = scenePresetSelect.value;
    if (!selected) return;
    writePresetList(SCENE_PRESET_KEY, readPresetList(SCENE_PRESET_KEY).filter((p) => p.name !== selected));
    promptUiState.scenePreset = "";
    refreshScenePresets();
    savePromptUiState();
  });
  refreshScenePresets();

  function refreshPromptSlotPresets() {
    const presets = readPresetList(PROMPT_SLOT_PRESET_KEY);
    for (const select of promptPresetSelects) {
      const slot = select.dataset.slot || "";
      const selected = promptUiState.slotPreset?.[slot] || "";
      select.innerHTML = "";
      select.appendChild(option("", tr(resolveLang(promptLangSelect.value), "none")));
      for (const p of presets) select.appendChild(option(p.name, p.name));
      select.value = presets.some((p) => p.name === selected) ? selected : "";
      promptUiState.slotPreset[slot] = select.value;
    }
  }

  for (const [slot, label, color, promptName, typeName, framingName, angleName] of SLOTS) {
    const card = document.createElement("div");
    card.className = "moss-k2cf-slot-card";
    const head = document.createElement("div");
    head.className = "moss-k2cf-slot-head";
    head.title = tr(resolveLang(promptLangSelect.value), "slotHeaderHelp").replace("{label}", label);
    const left = document.createElement("div");
    left.className = "moss-k2cf-slot-head-left";
    left.innerHTML = `<span class="moss-k2cf-dot" style="background:${color}"></span>${label}`;
    const foldMark = document.createElement("span");
    foldMark.className = "moss-k2cf-foldmark";
    left.appendChild(foldMark);
    head.append(left);

    const body = document.createElement("div");
    body.className = "moss-k2cf-slot-body";
    const ta = document.createElement("textarea");
    ta.className = "moss-k2cf-text";
    ta.placeholder = tr(resolveLang(promptLangSelect.value), "enterPrompt").replace("{label}", label);
    ta.title = tr(resolveLang(promptLangSelect.value), "slotPromptHelp");
    ta.value = widgets[promptName]?.value || "";
    controls[promptName] = ta;
    k2cfAttachPyssssAutocomplete(ta);
    const typeSelect = document.createElement("select");
    typeSelect.className = "moss-k2cf-type";
    typeSelect.title = tr(resolveLang(promptLangSelect.value), "elementTypeHelp");
    for (const [value, text] of TYPE_OPTIONS) typeSelect.appendChild(option(value, text));
    typeSelect.value = widgets[typeName]?.value || "obj";
    controls[typeName] = typeSelect;
    const framingSelect = document.createElement("select");
    framingSelect.className = "moss-k2cf-framing";
    framingSelect.title = tr(resolveLang(promptLangSelect.value), "framingHelp");
    for (const value of FRAMING_OPTIONS) framingSelect.appendChild(option(value, value));
    framingSelect.value = widgets[framingName]?.value || "Auto";
    controls[framingName] = framingSelect;
    const angleSelect = document.createElement("select");
    angleSelect.className = "moss-k2cf-framing";
    angleSelect.title = tr(resolveLang(promptLangSelect.value), "angleHelp");
    for (const value of ANGLE_OPTIONS) angleSelect.appendChild(option(value, value));
    angleSelect.value = widgets[angleName]?.value || "Auto";
    controls[angleName] = angleSelect;
    ta.addEventListener("input", sync);
    ta.addEventListener("change", sync);
    ta.addEventListener("blur", sync);
    ta.addEventListener("compositionend", sync);
    bindTextHeight(promptName, ta);
    typeSelect.addEventListener("change", () => { textStyles[slot]?.refresh(); sync(); savePromptUiState(); });
    framingSelect.addEventListener("change", () => { sync(); savePromptUiState(); });
    angleSelect.addEventListener("change", () => { sync(); savePromptUiState(); });
    const presetRow = document.createElement("div");
    presetRow.className = "moss-k2cf-presetbar";
    const promptPresetSelect = document.createElement("select");
    promptPresetSelect.className = "moss-k2cf-small-select";
    promptPresetSelect.dataset.slot = slot;
    const promptPresetLabel = document.createElement("label");
    presetRow.append(promptPresetSelect, promptPresetLabel);
    const presetButtons = document.createElement("div");
    presetButtons.className = "moss-k2cf-presetbar";
    const promptSave = document.createElement("button");
    promptSave.className = "moss-k2cf-small-btn";
    const promptLoad = document.createElement("button");
    promptLoad.className = "moss-k2cf-small-btn";
    const promptDelete = document.createElement("button");
    promptDelete.className = "moss-k2cf-small-btn";
    presetButtons.append(promptSave, promptLoad, promptDelete);
    const side = document.createElement("div");
    side.className = "moss-k2cf-slot-side";
    const typeRow = document.createElement("div");
    typeRow.className = "moss-k2cf-presetbar";
    const typeLabel = document.createElement("label");
    typeLabel.textContent = "Type";
    typeLabel.title = tr(resolveLang(promptLangSelect.value), "elementTypeHelp");
    typeLabel.style.minWidth = "34px";
    typeLabel.style.color = "#ddd";
    const framingRow = document.createElement("div");
    framingRow.className = "moss-k2cf-presetbar";
    const framingLabel = document.createElement("label");
    framingLabel.textContent = "Framing";
    framingLabel.title = tr(resolveLang(promptLangSelect.value), "framingHelp");
    framingLabel.style.minWidth = "56px";
    framingLabel.style.color = "#ddd";
    const angleRow = document.createElement("div");
    angleRow.className = "moss-k2cf-presetbar";
    const angleLabel = document.createElement("label");
    angleLabel.textContent = "Angle";
    angleLabel.title = tr(resolveLang(promptLangSelect.value), "angleHelp");
    angleLabel.style.minWidth = "56px";
    angleLabel.style.color = "#ddd";
    typeRow.append(typeLabel, typeSelect);
    framingRow.append(framingLabel, framingSelect);
    angleRow.append(angleLabel, angleSelect);
    side.append(typeRow, framingRow, angleRow);
    body.append(ta, side);
    const textStyle = mountTextStyle(slot, {
      type: () => typeSelect.value,
      language: () => resolveLang(promptLangSelect.value),
      changed: () => { savePromptUiState(); sync(); },
    });
    textStyles[slot] = textStyle;
    textStyle.set(promptUiState.slotValues[slot]?.textStyle);
    body.append(textStyle.element);

    function applyOpen() {
      const open = promptUiState.slotOpen[slot] !== false;
      card.classList.toggle("collapsed", !open);
      foldMark.textContent = open ? "▼" : "▶";
    }
    head.addEventListener("click", (ev) => {
      promptUiState.slotOpen[slot] = !(promptUiState.slotOpen[slot] !== false);
      applyOpen();
      savePromptUiState();
    });
    promptPresetSelect.addEventListener("change", () => {
      promptUiState.slotPreset[slot] = selectedPresetValue(promptPresetSelect);
      savePromptUiState();
    });
    promptSave.addEventListener("click", () => {
      const current = selectedPresetValue(promptPresetSelect, `${label} Preset`);
      const name = prompt("Prompt preset name", current);
      if (!name) return;
      const presets = readPresetList(PROMPT_SLOT_PRESET_KEY).filter((p) => p.name !== name);
      const height = promptUiState.textHeights[promptName] || k2cfElementPixelHeight(ta);
      presets.push({ name, text: ta.value || "", height });
      writePresetList(PROMPT_SLOT_PRESET_KEY, presets);
      promptUiState.slotPreset[slot] = name;
      promptUiState.textHeights[promptName] = height;
      promptUiState.textHeightManual[promptName] = true;
      refreshPromptSlotPresets();
      savePromptUiState();
    });
    promptLoad.addEventListener("click", () => {
      const selected = selectedPresetValue(promptPresetSelect);
      const preset = readPresetList(PROMPT_SLOT_PRESET_KEY).find((p) => p.name === selected);
      if (!preset) return;
      ta.value = preset.text || "";
      if (Number(preset.height) >= 45) {
        promptUiState.textHeights[promptName] = Number(preset.height);
        promptUiState.textHeightManual[promptName] = true;
        applySavedTextHeight(promptName, ta);
      }
      sync();
      savePromptUiState();
    });
    promptDelete.addEventListener("click", () => {
      const selected = selectedPresetValue(promptPresetSelect);
      if (!selected) return;
      writePresetList(PROMPT_SLOT_PRESET_KEY, readPresetList(PROMPT_SLOT_PRESET_KEY).filter((p) => p.name !== selected));
      for (const item of SLOTS) promptUiState.slotPreset[item[0]] = "";
      refreshPromptSlotPresets();
      savePromptUiState();
    });
    applyOpen();
    const promptLabelHidden = document.createElement("span");
    promptLabelHidden.textContent = tr(resolveLang(promptLangSelect.value), "prompt");
    promptLabelHidden.style.display = "none";
    for (const [el, key] of [[head,"fold"], [ta,"slot_prompt"], [typeSelect,"type"], [typeLabel,"type"], [framingSelect,"framing"], [framingLabel,"framing"], [angleSelect,"angle"], [angleLabel,"angle"]]) bindHelp(el, key);
    promptCards.push({
      label,
      head,
      ta,
      typeSelect,
      framingSelect,
      angleSelect,
      typeLabel,
      framingLabel,
      angleLabel,
      promptLabel: promptLabelHidden,
      textStyle,
      applyOpen,
    });
    card.append(head, body);
    wrap.appendChild(card);
  }
  refreshPromptSlotPresets();

  function captureCurrentTextHeights(markDirty = false, allowShrink = false) {
    let changed = false;
    const capture = (key, el) => {
      if (!el) return;
      if (recordTextHeight(key, k2cfElementPixelHeight(el), allowShrink, allowShrink)) changed = true;
    };
    capture("scene", sceneText);
    for (const [, , , promptName] of SLOTS) capture(promptName, controls[promptName]);
    if (changed) savePromptUiState(markDirty);
  }

  function hydratePromptFromWidgets() {
    isHydrating = true;
    refreshPromptUiState();
    const savedState = k2cfBestSavedState(node, "prompt");
    if (savedState) applyConfiguredValuesToWidgets(node, PROMPT_WIDGETS, savedState.widgets_values);
    try {
      sceneText.value = widgets.scene?.value || "";
      for (const [slot, label, color, promptName, typeName, framingName, angleName] of SLOTS) {
        const stored = promptUiState.slotValues?.[slot] || {};
        if (controls[promptName]) controls[promptName].value = widgets[promptName]?.value || "";
        const nextType = selectValueWithStored(widgets[typeName]?.value, stored.type, "obj");
        const nextFraming = selectValueWithStored(widgets[framingName]?.value, stored.framing, "Auto");
        const nextAngle = selectValueWithStored(widgets[angleName]?.value, stored.angle, "Auto");
        if (controls[typeName]) controls[typeName].value = nextType;
        if (controls[framingName]) controls[framingName].value = nextFraming;
        if (controls[angleName]) controls[angleName].value = nextAngle;
        const savedStyle = k2cfReadJsonObject(widgets.prompt_ui_data?.value)?.slotValues?.[slot]?.textStyle;
        textStyles[slot]?.set(savedStyle);
        setWidget(typeName, nextType);
        setWidget(framingName, nextFraming);
        setWidget(angleName, nextAngle);
      }
      applyPromptLabels();
      scheduleApplyAllSavedTextHeights();
    } finally {
      isHydrating = false;
    }
  }

  node.__k2cfPromptUiSnapshot = (markDirty = false, allowShrink = false) => captureCurrentTextHeights(markDirty, allowShrink);
  node.__k2cfHydrateFromWidgets = hydratePromptFromWidgets;

  node.addDOMWidget("krea2_prompt_ui", "Krea2PromptUI", wrap, {
    serialize:false,
    hideOnZoom:false,
    hideInPanel:true,
    getMinHeight:()=>160,
    afterResize:()=>{ captureCurrentTextHeights(false, false); scheduleApplyAllSavedTextHeights(); },
  });
  k2cfMaybeUpgradeLegacyBugNodeSize(node, "prompt", K2CF_PROMPT_DEFAULT_SIZE);
  k2cfInstallNodeSizePersistence(node, "prompt", K2CF_PROMPT_DEFAULT_SIZE);
  k2cfMaybeInitializeNodeSize(node, "prompt", K2CF_PROMPT_DEFAULT_SIZE);
  k2cfScheduleNodeSizeRestore(node, "prompt", K2CF_PROMPT_DEFAULT_SIZE);
  hydratePromptFromWidgets();
  if (k2cfHasMeaningfulState(configuredValues)) {
    applyConfiguredValuesToWidgets(node, PROMPT_WIDGETS, configuredValues);
    node.properties = node.properties || {};
    node.properties.k2cfPromptState = {
      version: "widgets_values",
      widgets_values: configuredValues.slice(),
      saved_at: Date.now()
    };
    hydratePromptFromWidgets();
  }
  k2cfPersistWidgetSnapshot(node, "prompt", PROMPT_WIDGETS, "v15");
  installNodePersistenceHooks(node, sync, PROMPT_WIDGETS, "k2cfPrompt");
}

function installControls(nodeType, nodeData) {

    if (nodeData.name !== CANVAS_NODE && nodeData.name !== PROMPT_NODE) return;
    k2cfInstallWorkflowLoadHook();
    k2cfInstallPromptUiLifecycleHooks();

    const oldConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function (info) {
      this.__k2cfWorkflowConfigured = true;
      this.__k2cfSizeRestoreGeneration = (this.__k2cfSizeRestoreGeneration || 0) + 1;
      this.__k2cfConfiguredWidgetValues = Array.isArray(info?.widgets_values) ? info.widgets_values.slice() : null;
      this.__k2cfConfiguredSize = k2cfNormalizeNodeSize(info?.size);
      this.__k2cfPreferredNodeSize = this.__k2cfConfiguredSize?.slice() || null;
      this.__k2cfLastSavedNodeSize = this.__k2cfConfiguredSize?.slice() || null;
      this.__k2cfConfiguredCanvasState = info?.properties?.k2cfCanvasState || null;
      this.__k2cfConfiguredPromptState = info?.properties?.k2cfPromptState || null;
      this.__k2cfConfiguredPromptUiState = info?.properties?.k2cfPromptUiState || null;
      this.__k2cfConfiguredCanvasNodeSize = info?.properties?.k2cfCanvasNodeSize || null;
      this.__k2cfConfiguredPromptNodeSize = info?.properties?.k2cfPromptNodeSize || null;
      if (!this.__k2cfConfiguredWidgetValues) {
        const state = nodeData.name === CANVAS_NODE ? this.__k2cfConfiguredCanvasState
          : this.__k2cfConfiguredPromptState;
        this.__k2cfConfiguredWidgetValues = Array.isArray(state?.widgets_values) ? state.widgets_values.slice() : null;
      }
      this.__k2cfSkipLocalCanvasState =
        !k2cfHasMeaningfulState(this.__k2cfConfiguredWidgetValues) &&
        !k2cfHasMeaningfulState(this.__k2cfConfiguredCanvasState?.widgets_values);
      this.__k2cfSkipLocalPromptState =
        !k2cfHasMeaningfulState(this.__k2cfConfiguredWidgetValues) &&
        !k2cfHasMeaningfulState(this.__k2cfConfiguredPromptState?.widgets_values);
      const result = oldConfigure?.apply(this, arguments);
      if (this.__k2cfApplyConfiguredValues) this.__k2cfApplyConfiguredValues(this.__k2cfConfiguredWidgetValues);
      if (this.__k2cfHydrateFromWidgets) {
        // Restore boxes before linked-size preview callbacks can write the empty initial state.
        if (nodeData.name === CANVAS_NODE) this.__k2cfHydrateFromWidgets();
        else requestAnimationFrame(() => this.__k2cfHydrateFromWidgets?.());
      }
      if (this.__k2cfNodeSizeKind) {
        const kind = this.__k2cfNodeSizeKind;
        const defaultSize = this.__k2cfNodeSizeDefault || (kind === "canvas" ? K2CF_CANVAS_DEFAULT_SIZE : K2CF_PROMPT_DEFAULT_SIZE);
        k2cfScheduleNodeSizeRestore(this, kind, defaultSize);
      }
      return result;
    };

    const oldCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      oldCreated?.apply(this, arguments);
      ensureStyle();
      if (nodeData.name === CANVAS_NODE) setupCanvasNode(this);
      if (nodeData.name === PROMPT_NODE) setupPromptNode(this);
    };
  
}

function readPresetStorage(key) {
  return localStorage.getItem(key) ?? localStorage.getItem(key.replace(/^moss_bbox_/, "krea2_element_framing_v1_"));
}

export { installControls };
