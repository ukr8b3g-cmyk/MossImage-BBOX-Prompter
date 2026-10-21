# MOSS BBOX Prompter

<img width="1154" height="839" alt="image" src="https://github.com/user-attachments/assets/739cff51-f11a-4c25-88d5-7b0c5eb1a76c" />


Repository: [MossImage-BBOX-Prompter](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter).

Based on [Krea2 BBOX Prompter Suite](https://github.com/ukr8b3g-cmyk/Krea2-BBOX-Prompter)
by ukr8b3g-cmyk. This package is released under the **MIT License**; see
[LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) for attribution and implementation
details. The current Canvas and Prompter reuse the installed Krea2 renderer;
the earlier retained interface adapts portions of its interaction code.

Use **MOSS BBOX Canvas**, **MOSS BBOX Prompter** and **MOSS BBOX Export**.
The Canvas and Prompter use the already registered Krea2 UI. The Canvas delegates
to its shared backend; the Prompter shares its text/framing helpers with MOSS types.
Rendering, collapsed cards, textarea sizing, autocomplete, presets and workflow
persistence are shared. No second renderer, global hook installation or Python
module copy is loaded. Krea2 source files are not modified or copied.

MOSS Canvas reuses the same controls in a compact footer: Latent Size puts its
preset and width/height on one line, and Latent Size / Camera Settings / Canvas
Preset have matching panel heights. Narrow nodes wrap whole panels without
horizontal overflow. Camera/preset explanations remain available on hover.
Only the MOSS Canvas DOM is rearranged; Krea2 nodes, saved widgets, presets and
box coordinates keep their existing behavior. Refresh the frontend to load this
layout change; no backend restart is needed.

### UI compatibility

The standard MOSS BBOX template requires **Nodes 2.0**.
This package's **MOSS BBOX Canvas / Prompter / Export** also work with the
**traditional ComfyUI UI (LiteGraph)**; enabling Nodes 2.0 is not required.

### Installation

Install **Krea2 BBOX Prompter Suite** first; it supplies the shared renderer and
helpers. Do not install a second copy if it is already present.

- **ComfyUI-Manager:** install Krea2 BBOX Prompter Suite, then use **Install via
  Git URL** with `https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter`.
  Manager listing registration is being prepared; this is not a claim that the
  package is already searchable in the default list.
- **Manual:** open your ComfyUI installation's `custom_nodes` folder and run:

  ```shell
  git clone https://github.com/ukr8b3g-cmyk/Krea2-BBOX-Prompter.git
  git clone https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter.git
  ```

  Skip the first command if Krea2 is already installed. Restart ComfyUI when
  running work is finished, then refresh the browser with Ctrl+F5. Use a ComfyUI
  version with MOSS-Image support and select your installed model files.

`pyproject.toml` supplies MIT/package metadata. `node_list.json` lists the three
current node IDs and three retained legacy IDs. `manager-entry.json` records the entry submitted in
[ComfyUI-Manager PR #3399](https://github.com/Comfy-Org/ComfyUI-Manager/pull/3399).
Registry publication uses the manual **Publish to Comfy Registry** GitHub Action
and the repository secret `REGISTRY_ACCESS_TOKEN`. This package adds no pip dependency.

Connect:

1. **MOSS BBOX Canvas** `framing_data` → **MOSS BBOX Export**.
2. **MOSS BBOX Prompter** `prompt_ui_data` → the same Export node.
3. Export `prompt` → positive CLIP Text Encode; Export `width` / `height` → Empty Flux 2 Latent.
4. For Save WEBP Meta, also connect Export `prompt` → `positive_text` to retain the exact generated prompt in metadata.

Open the [Standard workflow](examples/MOSS_BBOX_Standard.json) or
[DMD workflow](examples/MOSS_BBOX_DMD.json).
These are the only two bundled generation workflows. Both use the MOSS pair,
Export, a generation subgraph, rgthree Power Lora Loader and the standard
Save Animated WEBP node (quality 80), at 896×1184. Install **rgthree-comfy** to
load the templates. The Standard file disables the LoRA; the DMD file enables
`moss_image\\lora_latest.safetensors` at strength 0.7. Both preserve the supplied
8 steps / CFG 1 / er_sde / simple settings; these are sample values, not a
recommendation that 8 steps is optimal for the standard model. Select locally
installed model, CLIP, VAE and LoRA files before running. The subgraph routes
the LoRA loader's model output to KSampler.
The separate `moss_state_896x1184.json` is a state-import sample, not a generation
workflow. Older workflow versions remain available in Git history.

This path requires the already installed **Krea2-BBOX-Prompter** package.
The node IDs are `MOSSSharedCanvas`, `MOSSSharedPrompter` and `MOSSFromKrea2`.
The Export's existing ID and socket types are retained for workflow compatibility.
Restart ComfyUI after adding the two MOSS UI nodes, then refresh the frontend.
Nothing is downloaded or installed automatically.

The exporter reads raw `x1/y1/x2/y2` from Canvas output, not Krea2's rounded
`bbox` or normalized-1000 JSON export. It emits the official MOSS centralized
pixel `yxyx` schema and hybrid prose. Connect its dimensions to the latent and
choose multiples of 16. Each color's **Type** selects **Character**, **Object** or
**Text**, exported as `character`, `object` or `text`. All boxes of that color
share its type and content. New nodes default to Object. Select Character for
people, Object for objects and Text for lettering in your composition.
Old `obj` values remain accepted and are restored as Object. The shared Krea2
nodes retain their original two choices and behavior.

The selected Type is authoritative: quotes or a `text:` prefix in Character or
Object descriptions do not change the label. Only Text items emit a `text` field.
Text notation and framing/angle descriptions use the installed Krea2 helpers:
for example, choose Text and enter `MOSS Café | Elegant white lettering.`.
Scene/background are combined; nonempty camera settings are included as prose.
The shared text helpers trim outer whitespace before emitting data. The original
strings remain in the saved workflow. Export does not translate or summarize.
Optional position hints default OFF and are derived from current coordinates.
Boxes guide generation; they do not guarantee placement.

### Native-template compatibility and validation

With boxes present, `auto` / `layout_json` uses the same MOSS Layout JSON schema
as ComfyUI's standard `MOSS-Image Layout Prompt`: `summary`, `items`, centralized
pixel `yxyx`, and Character/Object/Text labels. The native path converts through
an integer 0–1000 grid; this exporter uses raw canvas pixels. Matched local
cases differed only in box coordinates, by at most one pixel per edge.

Standard-model tests across three seeds confirmed the main person/text and
geometric layouts follow their boxes. A centrally boxed suitcase drifted toward
the person with seed 42, so boxes remain guidance rather than strict constraints.
A native-template comparison must keep its prompt enhancer OFF to preserve the
Layout JSON. These checks do not establish stronger control than the native node.

The internal builder analyzes position words once per scene/color card and
assembles caption output during the same box traversal. It avoids constructing
unused hybrid output. Prompt bytes, coordinates, warning order, node IDs and UI
state are preserved; no dependency on the native node is added.

### Export options

The existing Canvas and color cards are unchanged. MOSS BBOX Export appends three
optional settings; existing workflow inputs, output sockets and saved examples
keep their previous defaults (`hybrid` / `legacy`).

- `output_mode`: `hybrid` retains the existing prose + JSON; `caption` emits
  prose without editor color/box labels; `layout_json` emits compact Layout JSON;
  `auto` chooses Layout JSON when boxes exist and plain prose otherwise.
  The separate `moss_json` socket always retains its original Layout output.
- `text_mode`: `legacy` retains `visible wording | appearance` notation and
  quote/prefix handling. With `literal`, put only the intended visible wording
  in each existing Text card. Quotes, `|`, `text:`, outer whitespace and line
  breaks are preserved as actual characters. Character/Object cards are unaffected.
- `text_style`: appearance shared by all Text cards in `literal` mode, separate
  from visible wording. It defaults to `readable text with black outline` and
  can be replaced or cleared. Different per-color styles remain available with
  the existing `legacy` notation.

The MOSS Prompter carries raw Text card values alongside its legacy cleaned data.
Older saved workflows acquire this data when executed after restart. Original
Krea2 Prompter outputs remain accepted; whitespace already removed by those
nodes cannot be recovered. Caption/auto prose keeps unboxed wording; Layout
JSON warns when unboxed descriptions cannot be represented.

Export logs nonfatal warnings for out-of-canvas, zero-area or precision-collapsed
boxes, empty visible text and unboxed descriptions. It keeps the coordinates
and items; it does not clip, resize or delete them. Existing finite-number and
latent-size checks remain. Warnings appear in the ComfyUI log.

Restart the backend and refresh the frontend after updating these settings.
Live registration and the real ComfyUI frontend were verified on 2026-10-18.
After restart on 2026-10-21, standard-model GPU validation passed for a person
layout, a graphics-only layout, and a run submitted from Chrome. All three saved
WebP Meta with the exact generated prompt. Workflow restoration and page reload
retain the scene, color prompts and Character/Object/Text selections, including
workflows without a saved Prompter snapshot. The compact footer's three panels
remain aligned at 93 CSS pixels. DMD was not GPU-tested in this run. See
`TEST_REPORT.md` for the tested scope and remaining limits.

The earlier custom MOSS interfaces remain loadable for existing workflows and
are marked deprecated in node search. New workflows use the MOSS pair above.
Their unchanged legacy behavior and earlier validation record follow.

## Legacy separate Canvas and Prompter

These earlier nodes are retained for existing workflows. For new workflows,
use `MOSSSharedCanvas`, `MOSSSharedPrompter` and `MOSSFromKrea2` described above.
The earlier separate interface has two nodes:

- **MOSS BBOX Canvas** (`MOSSBBoxCanvas`): large canvas, color swatches, grid,
  Show Boxes / Draw / Reset controls, latent dimensions and per-box type/text.
- **MOSS BBOX Prompter (Hybrid)** (`MOSSBBoxPrompter`): whole-image prompt and
  five collapsible color cards, with the full derived output below them.

Connect Canvas **canvas_data** to Prompter **canvas_data**. Connect Canvas width
and height to Empty Flux 2 Latent; connect Prompter prompt to CLIP Text Encode.
The Prompter preview follows connected Canvas edits without copying geometry
into the text node's saved state. Empty prompt fields deliberately clear text.

Older example workflows are available in Git history. Existing workflows using
these nodes remain supported; the two current examples above use the shared UI.

The original **MOSS BBOX Canvas + Prompt (Hybrid)** (`MOSSBBoxCanvasPrompt`)
and its existing workflows remain supported. Its original instructions follow.

### Legacy combined-node setup

1. Install this folder as `custom_nodes/MOSS-BBOX-Prompter`, then restart ComfyUI
   when your running work is finished. Refresh the frontend afterwards.
2. Open your existing combined-node workflow or add the legacy combined node.
   For a new workflow, use the current Standard or DMD example above instead.
3. Enter the whole-image prompt and color descriptions. Select a color and drag
   to create a box. Select/move by dragging inside a box, resize at any corner,
   and delete using the button or Delete with the canvas focused. “Draw new box”
   permits drawing over existing boxes. The box selector reaches overlapping boxes.
4. Set each selected box to `character`, `object`, or `text`. A text box has its
   own **Text to render**, separate from its color's description. All boxes of a
   color share the description; their types and rendered strings are independent.
5. Connect `prompt` to the `text` input of **CLIP Text Encode**. Connect `width`
   and `height` to **Empty Flux 2 Latent** (convert its widgets to inputs if
   needed).
6. Inspect/copy the complete final output in the node before generating.

The default resolution is **896×1184**, editable with Apply resolution. Existing
raw boxes scale proportionally. Positive multiples of 16 are required because
Empty Flux 2 Latent truncates its pixel dimensions with integer division by 16.
Keep both dimension outputs connected; independent downstream sizes can still
create a mismatch. The backend and canvas read the same resolution from state.

### Legacy combined-node output and limitations

The default `prompt` is C hybrid: natural prose **outside** the JSON, followed by
the official MOSS object:

```json
{"summary":{"caption":"original whole-image prompt"},"items":[{"label":"object","caption":"original color description","bbox":[-592,-448,592,448]}],"bbox_coord_space":"abs_centralized","bbox_format":"yxyx"}
```

Only `text` items add the official `text` field. Colors organize the editor;
they are not an output palette. `moss_json` is an optional JSON-only output.
The node preserves the original strings, whitespace, language, punctuation and
dynamic-prompt braces. It does not summarize, translate, expand wildcard prompts,
or add an LLM/API. Unboxed descriptions remain in prose (with a warning) and in
saved state. Empty box descriptions and text are retained and flagged.
With no boxes, this node emits an empty `items` envelope; the official Core node
instead returns the plain prompt in its no-item branch.

Optional position prose is calculated from **current** boxes every time, never
saved as text or appended to the original caption. Manual position wording is
kept. The warning detects a few opposing English/Japanese direction keywords;
it does not understand negation, which subject a word describes, relative
relations, or arbitrary languages. False positives and missed conflicts remain.

Boxes are **guidance, not guaranteed placement**. This node assembles inputs and
formats; it adds no model capability. Earlier GPU tests did not establish a
clear C-hybrid advantage over JSON alone, and manual position wording can still
conflict with coordinates. No image references, independent Background setting,
Prompt Effect, LoRA handling or model processing are included.

Raw canvas `xyxy` pixels are converted at output time to centralized pixel
`yxyx`: floor(round(start, 9)) / ceil(round(end, 9)), then subtract width//2 or
height//2, as in the installed official MOSS implementation. No integer 0–1000
roundtrip occurs. Reversed edges are ordered on output; finite external
coordinates, including zero-area/out-of-canvas values, are preserved.

### Legacy combined-node state and compatibility

The single `moss_state` STRING widget owns `schema_version: "moss_bbox_v1"`,
original prompt strings, color mapping, raw boxes, per-box type/text, dimensions
and settings. Export/Import MOSS state works with `examples/moss_state_896x1184.json`.
Workflow serialization is read-only; empty values replace older values. There
is no localStorage, global node-state cache, file write endpoint or Krea state.
Derived output is rebuilt after restoration. Invalid state is shown as an
error and kept intact instead of being replaced by defaults.

The extension uses node-local LiteGraph hooks and `addDOMWidget`, rather than
global graph/tab/queue patches. Installed frontend **1.55.17** source was checked
for DOM widget and Vue string-widget behavior. The renderer is intended for the
legacy LiteGraph and current Vue DOM-widget paths, but actual ComfyUI renderer
compatibility of this deprecated combined interface is **not yet verified**.
Subgraphs/promoted widgets are untested. This earlier record does not replace
the current shared-node validation above.

Earlier CPU tests cover PNG text and WebP EXIF workflow metadata roundtrips. Actual image
drag/drop restoration depends on the saving node retaining ComfyUI workflow
metadata and has not been tested in ComfyUI. JSON reload, duplication, tab return,
Undo/Redo and latest queue values passed isolated fixture tests; the real ComfyUI
workflow manager, history and prompt submission for this deprecated combined
interface still need an in-app check.

## Verification

No extra runtime dependency is required. For CPU tests, use Python, Node.js, and
Pillow (already in ComfyUI). Optional isolated browser tests need Playwright and
Chromium; they never contact the running ComfyUI or submit a queue.

```powershell
$env:COMFYUI_ROOT = 'D:\StabilityMatrix\Data\Packages\ComfyUI-Q'
python -B tests/test_prompt_builder.py
node --test tests/state.test.mjs
node --check web/moss_bbox.js
node --check web/editor.mjs
# Optional: point PLAYWRIGHT_MODULE and CHROMIUM_PATH at installed copies.
node tests/browser_smoke.mjs
```

See `TEST_REPORT.md` for the tested scope and pending checks, and `NOTICE.md` /
`LICENSE` for Krea2 attribution. Core/Krea2 files and existing workflows are not
modified by this package.
