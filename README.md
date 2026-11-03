# MOSS BBOX Prompter

**English** | [Japanese](README.ja.md)

**Latest GitHub release: 2.0.0 (V2)** — [Release and workflows](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/tag/v2.0.0) · [Comfy Registry](https://registry.comfy.org/nodes/mossimage-bbox-prompter)

**New in V2:** reference-image analysis, automatic box-text saving, editing after OFF, Auto targets and visible analysis settings. V1 compatibility is retained.

## Features retained from V1 (1.0.11)

- One compact card layout before and after connection: the same four rows, typography, widths and 170px initial editor height for all seven colors. Saved manual sizes remain authoritative.
- Header **⋯** holds Name/Shared for individual boxes or presets for shared color settings. Short labels and hover help replace inline explanations.
- Prompt/Type ownership and saved card expansion/heights are fixed. Selecting a box does not fold its card or restore stale words/settings.
- Three distinct Angle additions and independent Focus controls; see Angle / Focus below.
- Text usage (7), bubble shapes (22), structure, direction, colors and an offline emoji picker. Literal wording stays separate from appearance hints.
- A [V1 template](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/download/v1.0.11/MOSS_BBOX_Template.json), preserving example words and generation settings while normalizing editor dimensions. **New nodes start blank**; they never inherit sample prompts.
- Unconnected legacy width_override/height_override sockets are removed. Connected legacy overrides and the LATENT SIZE W/H controls remain supported.

**Updating:** save a separate workflow copy and finish running work first. Upgrading from 1.0.10 or earlier changes Python inputs for Focus, so restart ComfyUI normally and then press Ctrl+F5. Registry publication is separate from GitHub Releases.

<img width="1154" height="839" alt="image" src="https://github.com/user-attachments/assets/739cff51-f11a-4c25-88d5-7b0c5eb1a76c" />


Repository: [MossImage-BBOX-Prompter](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter).

Based on [Krea2 BBOX Prompter Suite](https://github.com/ukr8b3g-cmyk/Krea2-BBOX-Prompter)
by ukr8b3g-cmyk. This package is released under the **MIT License**; see
[LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) for attribution and implementation
details. The required Canvas/Prompter controls and text helpers are bundled
in this package. **No separate Krea2 installation is required.**

Use **MOSS BBOX Canvas**, **MOSS BBOX Prompter** and **MOSS BBOX Export**.
The familiar Canvas/Prompter UI, collapsed cards, textarea sizing, optional
autocomplete, presets and workflow persistence are retained. Existing node IDs,
socket types, widget order and saved workflow state remain compatible.

MOSS Canvas reuses the same controls in a compact footer: Latent Size puts its
preset and width/height on one line, and Latent Size / Camera Settings / Canvas
Preset have matching panel heights. Narrow nodes wrap whole panels without
horizontal overflow. Camera/preset explanations remain available on hover.
Only the MOSS Canvas DOM is rearranged; Krea2 nodes, saved widgets, presets and
box coordinates keep their existing behavior. The footer rearrangement alone
needs a frontend refresh; the complete 1.0.11 update needs the restart described above.

## Angle, Focus and dialogue

### Angle / Focus

The original 24 Angle choices keep their names, order and descriptions. **Rear 3/4 right, Rear 3/4 left and Voyeur low angle** append three distinct viewpoints. No Looking back choice is added; describe that action in the prompt when needed. Rear left/right uses the subject's side, not image placement.

Color and ID cards add **Focus** below Angle: Auto, Face, Eyes, Mouth, Hands, Feet, Upper torso, Back, Clothing details, Accessories, Object detail, **Breasts and Crotch**. Upper torso covers shoulders/upper torso while Breasts targets that specific part. These hints do not add clothing or exposure, zoom, crop, focal-distance changes, or change the BBOX. Text disables Focus in place while retaining it for a later Type change.

Auto adds nothing. An individual card's Auto is independent of color defaults; Confirming Shared restores shared values. Workflow restore, per-ID duplication and Undo/Redo preserve Focus. New text presets store Focus, including Auto. Old text presets without Focus leave the current Focus unchanged; Type/Framing/Angle remain outside text presets.

Editable JSON uses **v2** only when saved per-ID settings contain non-Auto Focus or a new Angle, including settings disabled for Text. Placement-only and other editable files remain v1. Updated readers accept v1/v2; old readers reject v2. Save the full workflow to transfer color defaults.

**Restart ComfyUI, then press Ctrl+F5 to use this update:** it appends seven optional Focus inputs after the existing 31 widgets. Old 23/31-widget workflows restore Focus as Auto. Before restarting, the frontend disables the new choices and displays a restart message for the old backend schema. The implementation did not restart the user's process. CPU and isolated real-ComfyUI frontend checks were performed; no new GPU generation was run for this release. Optional external STRING inputs are available in V2; see External text.

### Dialogue, bubbles and lettering

1. Use a **Character** box for the speaker and a separate **Text** box for visible dialogue. Add speaking/mouth descriptions to the character if needed.
2. Enter only the exact visible words in the Text prompt. The **😀** button inserts emoji. Appearance controls never rewrite the words.
3. Choose **Usage** and **Shape** directly. Changes save immediately; the old Apply button is no longer needed.
4. Open **Lettering / Bubbles** for structure, size, direction, border weight, tail/speaker, colors, typeface, lettering weight and notes. Closing details retains the settings.
5. Set Export **text_mode=literal**, normally **output_mode=auto**. Place the character and text independently on Canvas. A separate Object box for the bubble is optional.

| Control | Choices / behavior |
| --- | --- |
| Usage (7) | Legacy default, Speech, Thought, Narration, Title, Plain text, Sound effect. Legacy default adds no usage hint. |
| Shape (22) | Follow usage, No enclosure, Oval, Round, Rectangle, Rounded rectangle, Cloud, Spiky/shout, Radiating lines, Dotted/whisper, Wavy, Notched, Sweating, Heart, Animal, Character, Pixelated, Dripping, Melting, Conjoined, Distorted, Polygon. |
| Structure | Normal, shared, overlapping, nested or numbered. Does not create extra Canvas boxes. |
| Direction | Auto, Horizontal (left to right), Vertical (top to bottom, columns right to left). Literal text and line breaks remain unchanged. |
| Letter size / border weight | Relative generated lettering size and bubble-outline thickness; neither resizes the editor. |
| Tail / speaker | Describe a target, such as toward the left woman’s mouth. No automatic speaker-ID binding. |
| Text / bubble fill / lettering outline / bubble border / shadow color | Text color and bubble fill come first in Lettering / Bubbles. Each color has a free picker, a **▦** 256-color palette, and color-name/HEX input. Empty shows **Unset** and adds no hint. Preset buttons are created on first opening, then reused by all five fields on that card. Opening or closing never changes a value. |
| Typeface, weight, notes | Existing values are retained. Notes describe appearance, separately from visible words. |
| Text style | Shared style uses Export.text_style; Custom style overrides appearance for this Text. Editing usage/shape enables the latter. This is an appearance choice, not a prompt-view switch. |

**Emoji picker:** the same offline category/search list as Comic. Insert at the caret or replace the selection. Outside click, × or Escape closes it without modifying text. Internal search/category clicks keep it open. It inserts Unicode emoji; generated rendering depends on the model.

These are generation descriptions, not vector bubbles drawn on Canvas. Appearance uses ordinary prose in the existing `textStyle.extra`; literal words stay separate. Old speech/thought/shout settings, fonts, colors, notes, workflows, editable JSON, duplication and Undo/Redo remain supported. No language detection, translation or generation is added. These lettering controls are frontend-only; upgrading from 1.0.10 or earlier still needs a normal restart for Angle/Focus inputs.

**TagComplete (Danbooru Tag JP Assist) Format:** when JP Assist supports custom DOM prompt fields, scene/background and Character/Object color and ID prompts participate in All / Selected nodes formatting. **Literal Text wording is excluded from batch formatting.** To explicitly format lettering or style notes, choose **Current input / selection**, focus that field and press Format. Selected text is supported. Formatting runs only on explicit action, never on tab or focus changes. JP Assist is a separate extension and is not bundled or updated here. Existing formatting options and dictionaries stay unchanged. Save the workflow and press Ctrl+F5 to load the frontend update.

## External text (optional STRING connections)

**MOSS BBOX Text Link** assigns an upstream STRING to one Canvas box. It replaces only the body; Type, Framing, Angle, Focus and lettering settings stay on the card. No extra dependency is added. Text Link requires ComfyUI's V3 node API. Existing workflow formats are preserved.

1. Connect **Text (Multiline)**, a text-processing node or an LLM's STRING output to Text Link **text**.
2. Connect Canvas **framing_data** to Text Link **framing_data**, then choose **Box**. Colors and optional names identify boxes; renaming or recoloring keeps the selected box ID.
3. Connect Text Link **external_text** to Prompter **external_text**. Keep Canvas and Prompter connected to the same Export as usual.
4. For another box, add another Text Link. Connect the first one's **external_text** to the next one's **previous**, and the last one to Prompter.

The existing card editor becomes read-only: **External · Not run** before execution, **External · Last run** after Prompter receives the text. The display is a preview of the last execution, not a live preview of upstream edits. Copying remains possible. Card position, saved height and expansion do not change. Type and appearance remain editable. External body formatting and emoji insertion are disabled.

| Situation | Body used at execution |
| --- | --- |
| External input connected | Only that STRING; no concatenation with manual text |
| Upstream STRING is empty | Empty; saved manual text is not used |
| Text Link → Prompter disconnected | Original saved manual text returns |
| Upstream STRING missing, target deleted or target assigned twice | Error; no fallback to manual or a previous execution |
| Same Canvas + Prompter connected to multiple Exports | Same box body in that execution, regardless of Export order or selection |

External **Text** is literal, including spaces, line breaks, quotes and `|`, even when Export uses legacy text mode. Different Export modes may still produce different final prompt formats or appearance hints. Connect each Export's **prompt** to **Preview as Text** to inspect the actual final output. Separate Text Link + Prompter branches allow different external wording; changing a shared Canvas's manual text still affects every branch using it.

A normal Text Link preserves saved manual text in Canvas and never overwrites it with external results. Workflow files store the links and chosen box, not the card's last-run preview. After loading, execute again to populate that preview. Image Analysis instead saves successful results to the target box body, ready to edit when switched OFF. Canvas identity prevents an assignment from leaking into another Canvas with the same box ID or color. Keep both Canvas and Prompter in saved workflows.


## V2 template and usage

Downloads are presented in two versions. The V2 ZIP contains the new workflow only; V1 workflows are not mixed into it. Older release history is retained.

| Version | Download | Use |
| --- | --- | --- |
| **V2 · 2.0.0** | [V2 ZIP](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/download/v2.0.0/MOSS_BBOX_Canvas_V2.zip) / [Workflow JSON](examples/MOSS_BBOX_Canvas_V2.json) | Current template with reference-image analysis. |
| V1 · 1.0.11 | [Previous release](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/tag/v1.0.11) / [Previous Template JSON](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/download/v1.0.11/MOSS_BBOX_Template.json) | Previous generation setup. |

Extract the V2 ZIP and load `examples/MOSS_BBOX_Canvas_V2.json` in ComfyUI. Upload/select the included `ed6c61ad22695e639fb4b5b75fd2b931.webp` in Load Image. Select your installed model, TE, VAE and LoRA files. The template's Power Lora Loader requires [rgthree-comfy](https://github.com/rgthree/rgthree-comfy). Use a MOSS-capable ComfyUI with Core Generate Text, If/Else Switch and Seed nodes.

### 1. Reference image and analysis controls

Load the reference image and set **Image analysis enable** on the generation subgraph to true. This describes the reference as text and generates from that text; it does not directly condition image generation with the reference pixels.

### 2. target and kind

Auto uses the first created box and displays the resolved target, such as Auto · RED. Colors have no priority. Select RED, BLUE or another box explicitly when the destination must stay fixed.

kind selects character or object for the analysis request. It does not change the prompt card's Type.

This version analyzes **one reference image and one target box**. Missing box is not an output destination: running with analysis ON raises an error. Create a box or select an existing target first.

### 3. Analyze and generate with ON

With Image analysis enable set to true, press the ordinary Run button. The analysis is saved automatically to the selected Prompter card and flows through Export into generation. No copying, pasting or separate Apply operation is required.

### 4. Edit and generate normally with OFF

To edit the analysis, first switch Image analysis enable to **false**. The text stays in the card, which becomes Manual and editable. You can replace it with entirely different wording. OFF does not reanalyze the reference; it uses the saved prompt for normal generation as before.

**Switching back to true and running overwrites manual edits with the new analysis.** Merely switching to true does not start analysis. Keep it false while using edited wording. Save/reload retains the body; Canvas Undo restores the pre-analysis body within the same session.

Existing V1 node IDs, workflows and saved settings remain compatible. There is no need to replace them with separate V1/V2-named nodes. New nodes start with blank prompts and never copy template wording automatically.

GPU operation of the V2 template was confirmed by the user. This is distinguished from developer CPU, UI and save/reload checks.

### 1.0.9: seven colors, JSON import/export and ID cards

Version 1.0.9 adds the features below. See the illustrated
[JSON import instructions](#layout-json-import-109) and
[per-box ID card instructions](#per-box-id-cards-109).
See [JSON export and editable re-import](#json-export-and-editable-re-import-109)
to transfer layouts with per-ID prompts and styles. Import now defaults to
**Replace boxes**, and deleting a Canvas preset asks for confirmation.

Cyan and Orange extend the five existing color groups to seven. Each new
Prompter card starts closed and supports Character/Object/Text, framing, angle,
shared/individual Text styles and both color pickers. Use their Canvas swatches
to draw boxes; move, duplicate, lock, arrange and Undo/Redo work as before.
Preview uses the same Cyan/Orange borders.

The original 23 Prompter widgets keep their order; eight optional widgets are
appended. Existing five-color workflows load with the two new cards blank and
keep the same generated prompt. Multiple boxes can still share any color.
This adds independent descriptions, not a seven-box limit. Restart ComfyUI and
refresh the browser after installing this main-branch update. Workflows using the
new colors or per-ID prompts require 1.0.9 or newer; 1.0.8 does not fully interpret them.


### 1.0.8: alignment, Text styles and two color pickers

Align multiple boxes or distribute their gaps evenly, with lock guards and
Undo/Redo. Text cards now support individual typeface, weight, color and extra
appearance hints, defaulting to shared settings. Choose colors freely or from
256 presets in a compact grid. Existing node IDs and workflows stay compatible.

The JSON templates are unchanged from v1.0.7; per-Text styles default to shared.
Restart ComfyUI and refresh the browser after updating the node package.

### 1.0.8: per-color Text styles

Each **Text** card supports **Shared style** (default) or
**Custom style**. The latter overrides Export's shared `text_style` for this
Text in **literal** mode. Typeface, Weight, Text color and Additional description
are under **Lettering / Bubbles**; opening/closing it retains values.
Character/Object hide Text controls without changing words or Type; returning
to Text retains appearance. Legacy text mode keeps its existing behavior.

Typeface presets are Auto, Serif/Mincho, Sans-serif/Gothic, Rounded,
Cursive/Script, Handwritten, Brush, Blackletter and Monospace. Weight supports
Auto, Light, Regular and Bold. Click the swatch beside Text color to choose a
color freely, or click **▦** to open 256 preset swatches in a **16 × 16** grid
(16px squares). Both pickers share the same field. The preset popup closes after
selection, on Escape or an outside click; opening it does not resize the node.
You can also enter a color name/HEX value directly. The chosen
color is stored as a HEX value; clearing the text removes the color hint.
An empty field stays unspecified until you choose a color. Add optional
appearance details (e.g. a thin black outline). Auto/blank adds no hint; an
entirely empty individual style deliberately supplies no style caption.
These are descriptive prompts, not font files or guaranteed font/color output.

Visible wording, whitespace, quotes and line breaks stay in the existing text
field and are never combined with the appearance description. Same-color boxes
share one style. Style preferences are stored inside the existing
`prompt_ui_data` widget and UI snapshot; no input/socket/widget order changes.
Old workflows default to shared style. Save/reload and duplication preserve the
new values. Restart ComfyUI and refresh the browser to load both backend and UI.

### 1.0.8: alignment and equal-gap distribution

Select two or more unlocked boxes, then use **Align / Distribute** beside
X/Y/W/H and Lock. Left/center/right and top/middle/bottom use the selected
boxes' combined bounds. Horizontal/vertical distribution requires three boxes;
the two end boxes stay fixed and the gaps between boxes become equal. Sizes,
colors, prompts, IDs and saved box order are preserved. Snap does not change
the requested alignment. One menu action is one Undo/Redo edit; applying an
already-satisfied arrangement adds no history. Selection is retained.

The menu is disabled for a selection containing a locked box, hidden boxes,
invalid layouts or an active pointer edit. Unlock first to arrange the whole
selection. Equal gaps may be negative when boxes overlap; a result outside the
editable Canvas bounds is not applied. The menu reserves its space even when
no boxes are selected, so selecting boxes does not resize the Canvas. Existing
workflow/widget formats and the two sample workflow files are unchanged.

### 1.0.7: box locking and Canvas reference image

![Load Image connected to the Canvas reference_image input](docs/canvas-reference.png)

**Canvas reference image:** Connect **Load Image → IMAGE** to the Canvas's
**reference_image** input. Turn **Reference ON** to display the image underneath
BBOXes; use **Opacity** to keep the boxes readable. Display defaults OFF at 50%.
Loading/showing an image preserves the Canvas width, height and box coordinates.
**Match image size**, beside the display button, explicitly changes the Canvas
size (rounded to a multiple of 16), with proportional box scaling and Undo/Redo.
**Lock** beside X/Y/W/H protects selected boxes from accidental edits. This image
is a layout reference; connecting it here does not add image conditioning.

Use the [V2 / V1 download guide](#v2-template-and-usage) above. Older Standard
and DMD examples remain in their original releases and work with the new nodes.

- Turn **Draw Box OFF**, select a box (Ctrl/Cmd-click for several), then use
  **Lock / Unlock** beside X/Y/W/H. Locked boxes remain selectable and show a
  lock instead of the delete badge. They reject movement, resizing, numeric
  edits and deletion. A selection containing a locked box cannot move or
  Alt-duplicate; Delete removes only its unlocked members. Lock changes support
  Undo/Redo and are saved with the workflow. Reset, preset replacement and
  Canvas-wide size changes still apply to locked boxes.
- Connect **Load Image → IMAGE** directly to **MOSS BBOX Canvas → reference_image**.
  The file is read without queueing generation. Enable **Reference ON** to show
  it underneath the boxes. Default: **OFF**, **50% opacity**. Display and opacity
  are saved per Canvas. Showing/hiding or loading an image never changes Canvas
  dimensions or box coordinates. The full image fits proportionally with margins;
  it is not cropped or stretched. This is a drawing aid, not img2img conditioning.
- **Match image size**, immediately beside the display toggle, is an explicit
  action. It rounds dimensions to MOSS's nearest multiple of 16 and scales every
  box proportionally. Undo restores the prior dimensions and boxes. The button
  is disabled without an image, with a corrupt layout, or while external width/
  height inputs control the Canvas. Reference images above 16384px per side
  must be resized before matching.
- Other upstream IMAGE nodes supply their first image after Canvas execution.
  Do not connect the Canvas's downstream generation output back into its input
  (that would create a cycle). For an existing generated image, load the saved
  file with **Load Image**. No automatic queue/run is performed. Source images
  are not embedded in workflow JSON; keep the files available on the ComfyUI
  server. Reconnect/reload a missing file; other IMAGE sources need execution
  again after reload. Older Standard/DMD workflows also work without this optional
  connection. The refreshed 1.0.7 examples include Load Image wiring.

### 1.0.6: multiple selection and group movement/duplication

- With **Draw Box OFF**, **Ctrl + click** (macOS: **Cmd + click**) adds/removes
  a box from the selection. White borders identify selected boxes. A plain
  click on an unselected box selects only that box; Escape or a click on empty
  space clears selection. Dragging empty space still draws a box as before.
- Drag **inside any selected box** to move the selection together. **Alt + drag**
  duplicates all selected boxes when starting inside one of them; starting over
  an unselected box duplicates that box only. Copies retain their individual
  colors/prompts and metadata, receive new IDs, and become the new selection.
- Canvas bounds and optional Snap apply to the selection's combined outer
  rectangle, preserving every box's size and relative position. Arrow keys move
  all selected boxes by exactly 1 pixel (Shift: 10), subject to Canvas bounds.
- Each completed group drag/duplicate is one Undo/Redo edit. Selection changes
  alone preserve Redo. Escape during a drag cancels it; Delete/Backspace removes
  the selection. A corner's X removes only its own box.
- Corner resizing and numeric edits select/edit **one box only**. Numeric fields
  show the last selected box. Shift-corner aspect locking and Alt-click overlap
  cycling remain available; Alt-click selects one box. Turn Draw Box OFF before
  using selection gestures. Hidden boxes cannot be selected or duplicated.
- Selection is local to each Canvas and is not saved to workflows. Edited and
  duplicated boxes use the existing saved format; reload clears selection/history.
  The UI keeps its existing controls and dimensions.

### 1.0.5: Alt-drag duplication, Shift-resize and Draw Box toggle

- **Draw Box** toggles new-box drawing ON/OFF. When highlighted, dragging
  creates a box even over existing boxes. Click it again to select/move/resize
  existing boxes or use Alt-drag duplication. Completing a new box also returns
  to selection mode. Workflows saved with drawing ON can be switched OFF directly.
- **Alt + drag inside a BBOX** creates a copy after 4 screen pixels of movement.
  It copies the selected box when the pointer is inside it, otherwise the topmost
  box under the pointer. The original stays in place; the copy gets a new ID and
  remains selected. Both boxes keep the same color. Color defaults are shared; individual ID settings are copied and remain independently editable.
  To describe a different subject, draw a box using another color card.
- **Alt + click** without dragging still cycles through overlapping boxes.
  Drawing mode draws a new box instead of duplicating; hidden boxes cannot be
  duplicated. A duplicate uses ordinary movement bounds and the optional Snap.
- **Shift + drag an existing corner** keeps the width/height ratio from the
  start of that resize, with the opposite corner fixed. Canvas bounds limit both
  dimensions together. Release Shift during the drag for free resizing; press
  it again to use the original ratio. Shift takes priority over Snap. At the
  top-right delete corner, hold Shift before pressing to resize rather than delete.
- Numeric inputs and arrow movement keep their exact existing behavior
  (Shift + arrow moves 10 pixels). New-box drawing remains freehand.
  Each duplicate drag or resize is one Undo/Redo edit. Cancellation restores
  the starting layout. Copies save and reload in the existing workflow format;
  modifier keys add no saved settings or UI rows.

### 1.0.4: help, stable layout and connected workflows

- Japanese/English hover help follows the ComfyUI language setting, with connection and Export setting explanations.
- Preview remains visible when zooming out; selecting or drawing a box no longer changes the Canvas layout height.
- Updated Standard and DMD workflows include a connected BBOX Preview and WebP saving. Download the two JSON assets from the v1.0.4 release below.
- Existing node IDs, sockets and workflow formats remain compatible. Older workflows remain usable; Preview requires 1.0.3 or newer.

### 1.0.3: generated-image BBOX preview

**Works with both Standard and DMD, and with the classic ComfyUI interface.
Nodes 2.0 is not required. Both current templates include a connected Preview
node: run the workflow to display the generated image and BBOX overlay inside it.**

For older or custom workflows, add **MOSS BBOX Preview** (`image/MOSS`) to compare a generated image with the
requested Canvas boxes. Connect VAE Decode's `IMAGE` to `images`, and branch
the same **MOSS BBOX Canvas** `framing_data` output to its `framing_data` input.
Existing Export and WebP Meta save connections can stay in place. The optional
`images` output passes the original IMAGE through unchanged.

**Show Boxes** toggles the frames immediately; **Opacity** adjusts only their
visibility (0–100%). Neither action queues generation or edits the image.
Turning boxes OFF stays OFF for the next result. Both settings are saved in the
preview node's workflow properties. Batch results have previous/next buttons.
Each result uses the layout from its own execution, not later Canvas edits.

The full image fits within the preview node. Display copies are temporary WebP
thumbnails (up to 2048px on the longest side); they contain no drawn boxes.
The saved/generated image and downstream IMAGE remain at their original quality
and resolution. Boxes scale with the image and indicate requested positions,
not detected objects or a measured placement score. Cropping is not corrected.
Temporary previews may disappear after ComfyUI clears its temporary directory.

Restart ComfyUI and refresh the frontend to register this new node. Existing
Canvas/Prompter controls and node IDs remain compatible.

#### Add and connect the preview in older or custom workflows

1. Save your current workflow. Double-click empty graph space, search for
   **MOSS BBOX Preview**, and add it (`image/MOSS`).
2. In either bundled template, find **New Subgraph**, the generation node with
   model/steps/CFG settings. Branch its **right-side `IMAGE` output** to the
   Preview node's **left-side `images` input**. Use `IMAGE`, not `MODEL`, `LATENT`,
   or a filename. If your graph is expanded, use VAE Decode's `IMAGE` instead.
3. Branch **MOSS BBOX Canvas → `framing_data`** to
   **MOSS BBOX Preview → `framing_data`**. Keep its existing Export connection.
4. Keep the generation `IMAGE` connection to **Save Animated WEBP** (or your
   existing WebP Meta save node). One output can feed both Save and Preview.
5. Run the workflow. The image and colored boxes appear **inside MOSS BBOX
   Preview**, not inside the drawing Canvas or the save node. Adding the node
   alone does not display an earlier generation automatically.

```text
New Subgraph (or VAE Decode) IMAGE ─┬─→ Save Animated WEBP images
                                  └─→ MOSS BBOX Preview images
MOSS BBOX Canvas framing_data ─────┬─→ MOSS BBOX Export framing_data
                                  └─→ MOSS BBOX Preview framing_data
```

The Preview `images` output is optional. It passes the original pixels through
unchanged, so you may also place Preview between generation and Save. The frames
are a display overlay only; they are never burned into that output or saved images.

**To inspect an already saved image without regenerating it:** use a separate
small workflow containing **Load Image**, **MOSS BBOX Canvas** with the layout used
for that image, and **MOSS BBOX Preview**. Connect Load Image's `IMAGE` → Preview
`images`, and Canvas `framing_data` → Preview `framing_data`, then Run. This path
has no sampler or model generation. Do not run a larger generation workflow if
you only want to inspect an existing image. A different layout merely overlays
different requested boxes; this node does not detect subjects or recover boxes
from arbitrary images.

**Show Boxes** hides/shows only the overlay. **Opacity** changes border opacity;
0% is invisible and 100% is opaque. Both work immediately without Run. Their state
is saved with the workflow and applies to the next result too. Canvas **Show
Boxes** affects the drawing editor, independently of this Preview switch.

If nothing appears, check that Preview is enabled (not muted/bypassed), both
inputs are connected, and that execution reached Preview successfully. If only
the image appears, enable Show Boxes, increase Opacity above 0%, and check that
the connected Canvas has boxes. After reloading, temporary preview images may
be unavailable; use the existing-image method above to recreate the preview.
If the node cannot be found after installation/update, finish running work,
restart ComfyUI, and refresh the browser after saving your workflow.

#### Hover help and Export settings

Hover over MOSS controls for explanations. Help follows **ComfyUI Settings →
Language** (`Comfy.Locale`): Japanese for `ja`, English otherwise. The node's own
UI Language selector controls its labels independently; an older workflow saved
with English labels still gets Japanese help in Japanese ComfyUI. Standard
ComfyUI widget tooltips must be enabled in ComfyUI's tooltip settings.

| Export setting | What it does |
| --- | --- |
| `auto_position_hint` | Adds a box-derived position phrase to **caption/hybrid prose**. It does **not** move boxes or automatically arrange subjects. No effect on `layout_json`, or `auto` when boxes exist. |
| `output_mode` | `auto`: layout JSON with boxes, prose without boxes. `layout_json`: JSON only; unboxed content is omitted. `caption`: prose only. `hybrid`: prose plus JSON. |
| `text_mode` | `literal`: each Text card is exact visible wording, including whitespace, newlines, quotes and `\|`. `legacy`: `visible words \| appearance`. |
| `text_style` | Shared font/color/outline description for all Text cards in `literal` mode. Put visible wording in the Text card, not here. Ignored in `legacy` mode. |

### 1.0.2: center/thirds snapping

The compact **Snap** checkbox next to the reference-image status (Connect Load Image) enables snapping during box movement
and corner resizing. Moving boxes align their nearest edge or center to the
Canvas center or one-third/two-thirds lines; resizing aligns only the dragged
edges. The grab distance is 6 displayed pixels, including at different zooms.
The visible Grid selection is independent of snapping. Existing Canvas bounds
still apply and movement preserves the box size.

Snap starts **OFF** for each node and returns OFF on workflow load or Reset.
It is a session editing aid, adds no saved widgets and does not alter existing
workflow data when toggled. Numeric X/Y/W/H edits and 1px / Shift+10px arrow
movement always keep their exact requested values subject to Canvas bounds.
Each completed pointer drag is one Undo/Redo operation. New-box drawing remains
freehand. Refresh the frontend to load the new checkbox.

### 1.0.2: precise BBOX editing

Select a box to show compact X / Y / W / H fields in pixels. Enter or leaving a
field applies its value; Escape cancels uncommitted typing. Position changes
preserve box size and clamp to the existing editable Canvas bounds. Positive
width/height values are limited to the available space; blank or invalid values
are discarded. The fields use the same dark styling as the size controls.

With the Canvas focused, arrow keys move the selected box by 1 pixel;
Shift+arrow moves it by 10 pixels. Text and number inputs retain native keyboard
behavior. Each committed field change or arrow-key event uses Canvas Undo/Redo;
a movement blocked at the boundary adds no history. Coordinates keep the existing
workflow format and numeric fields add no serialized widgets.

### What's new in 1.0.0

Version **1.0.0** brings the Canvas editing improvements introduced in **0.1.4**
under one release number. The version update does not change generation behavior
or require workflow conversion.

- **↶ / ↷** undo and redo Canvas edits, including drawing, moving, resizing,
  deleting boxes and resetting the Canvas. A drag counts as one edit; each
  Canvas keeps up to 60 edits for the current editing session.
- With the Canvas or its history buttons focused, use **Ctrl/Cmd+Z** to undo,
  and **Ctrl+Y** or **Ctrl/Cmd+Shift+Z** to redo. Canvas shortcuts avoid triggering
  ComfyUI's graph-level Undo. Text/number inputs retain their normal editing behavior.
- **Alt+click** inside overlapping boxes to cycle through them. The selected
  box has a white outline; drag normally to move it. Selection does not change
  box order or the generated prompt.

History is cleared when a workflow is loaded/restored and is not added to saved
workflows. Existing node IDs, sockets, widget order and example workflows are
unchanged. Refresh the frontend to load these controls; no backend restart is needed.

The 0.1.4 implementation passed **38 Python tests**, **13 JavaScript unit tests**
and all three isolated browser fixtures. Actual ComfyUI frontend checks passed
with both bundled Standard and DMD workflows, covering history buttons, keyboard
shortcuts, selection and movement of covered boxes, and deletion/restoration.
Those frontend checks submitted no generation jobs. See [TEST_REPORT.md](TEST_REPORT.md)
for the tested scope and the earlier GPU validation record.

### 1.0.1: damaged layout recovery

If a saved Canvas layout contains malformed JSON or an invalid layout structure,
its exact original is retained in the widgets and saved workflow state. Color,
visibility and camera changes, serialization and prompt preparation cannot turn
it silently into an empty layout. The Canvas tooltip identifies this error;
drawing and Canvas preset replacement are suspended until **Reset Canvas** or
loading a valid workflow. Intentional empty layouts remain supported.

### UI compatibility

The standard MOSS BBOX template requires **Nodes 2.0**.
This package's **MOSS BBOX Canvas / Prompter / Export** also work with the
**traditional ComfyUI UI (LiteGraph)**; enabling Nodes 2.0 is not required.

### Installation

This package contains its required Canvas/Prompter UI and backend helpers.
Krea2 BBOX Prompter Suite is the MIT-licensed source of the adapted UI, not a
required installation. An existing Krea2 installation can remain in place.

- **ComfyUI-Manager:** use **Install via Git URL** with
  `https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter`.
- **Manual:** open your ComfyUI installation's `custom_nodes` folder and run:

  ```shell
  git clone https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter.git
  ```

  To update a clone, open its folder and run `git pull`. Restart ComfyUI when
  running work is finished, then refresh the browser with Ctrl+F5. Use a ComfyUI
  version with MOSS-Image support and select your installed model files.

`pyproject.toml` supplies MIT/package metadata. `node_list.json` lists the four
current node IDs and three retained legacy IDs. `manager-entry.json` records the entry submitted in
[ComfyUI-Manager PR #3399](https://github.com/Comfy-Org/ComfyUI-Manager/pull/3399).
Registry publication uses the **Test and publish to Comfy Registry** GitHub Action
and the repository secret `REGISTRY_ACCESS_TOKEN`. Pushes to `main` run tests
and package validation only. To publish a new version, run the action manually
with `publish` enabled; it defaults to false. This package adds no pip dependency.

Connect:

1. **MOSS BBOX Canvas** `framing_data` → **MOSS BBOX Export**.
2. **MOSS BBOX Prompter** `prompt_ui_data` → the same Export node.
3. Export `prompt` → positive CLIP Text Encode; Export `width` / `height` → Empty Flux 2 Latent.
4. For Save WEBP Meta, also connect Export `prompt` → `positive_text` to retain the exact generated prompt in metadata.

Open the [Standard workflow](examples/MOSS_BBOX_Standard.json) or
[DMD workflow](examples/MOSS_BBOX_DMD.json).
These are the only two bundled generation workflows. Both use the MOSS pair,
Export, a connected MOSS BBOX Preview, a generation subgraph, rgthree Power Lora Loader and the standard
Save Animated WEBP node (quality 80), at 880×1184. Install **rgthree-comfy** to
load the templates. The Standard file disables the LoRA; the DMD file enables
`moss_image\\lora_latest.safetensors` at strength 0.7. Standard uses
25 steps / CFG 2.5; DMD uses 8 steps / CFG 1. Both use er_sde / simple.
These are sample settings, not universal quality recommendations. Select locally
installed model, CLIP, VAE and LoRA files before running. The subgraph routes
the LoRA loader's model output to KSampler.
The separate `moss_state_896x1184.json` is a state-import sample, not a generation
workflow. Older workflow versions remain available in Git history.

### Workflow compatibility

Use the [V2 / V1 download guide](#v2-template-and-usage) above. Existing Standard
and DMD workflows remain compatible: node IDs, sockets and saved values are
preserved. Older tags and release assets remain available in GitHub release
history. The new V2 workflow bundle contains only the V2 template.

MOSS BBOX Preview requires node version 1.0.3 or newer. Installed models and
other custom-node dependencies must still be available; compatibility does not
promise identical pixels across model or ComfyUI updates.

This path runs entirely from the bundled MOSS package.
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
Old `obj` values remain accepted and are restored as Object. Separately installed Krea2
nodes retain their original choices and behavior.

The selected Type is authoritative: quotes or a `text:` prefix in Character or
Object descriptions do not change the label. Only Text items emit a `text` field.
Text notation and framing/angle descriptions use the bundled text helpers:
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
optional settings; older workflow inputs and output sockets retain their defaults
(`hybrid` / `legacy`). The distributed Standard and DMD templates explicitly use
`auto` / `literal`, with Character for the person, Object for the table and Text
for the title.

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
remain aligned at 93 CSS pixels. That earlier run predates standalone v0.1.2;
the subsequent Standard and DMD GPU acceptance is recorded under Verification
below and in `TEST_REPORT.md`.

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
  seven collapsible color cards on main, with the full derived output below them.

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

**Standalone v0.1.2: both bundled Standard and DMD workflows passed GPU
generation after restart on 2026-10-21**, using an NVIDIA GeForce RTX 5060 Ti.
Both produced 896×1184 WebP images with embedded workflow and API prompt
metadata matching the submitted data. The sampler executed in both runs;
the source workflow JSON files were unchanged. Visual review confirmed the
title at the top, the character on the left, and the table/vase on the right.
See [the GPU validation record](TEST_REPORT.md#standalone-gpu-acceptance--2026-10-21)
for settings, execution scope and limitations. Independence from a separate
Krea2 installation is also covered by isolated CPU and browser tests.

No extra runtime dependency is required. For CPU tests, use Python, Node.js, and
Pillow (already in ComfyUI). Optional isolated browser tests need Playwright and
Chromium; they never contact the running ComfyUI or submit a queue.

```powershell
$env:COMFYUI_ROOT = 'C:\ComfyUI'
python -B -m unittest discover -s tests -p "test_*.py"
node --test tests/*.test.mjs
node --check web/moss_bbox.js
node --check web/editor.mjs
# Optional: point PLAYWRIGHT_MODULE and CHROMIUM_PATH at installed copies.
node tests/browser_smoke.mjs
```

CPU and isolated browser tests use the bundled controls and do not need Krea2.
Set `MOSS_BEFORE_ROOT` to a pre-change package snapshot to include the optional
byte-compatibility test; otherwise that one comparison is skipped.

The action runs Registry warning checks, the Python suite and JavaScript
unit/syntax tests before packing or publishing; any failure stops publication.
Push runs and manual runs with `publish` disabled never publish to Registry. A push commit explicitly marked `[github-release]` creates a GitHub Release after tests and packaging pass; ordinary push commits do not create releases. It uses pinned ComfyUI and published MOSS source references, including the
optional byte-compatibility comparison. No Krea2 checkout is needed.
The official MOSS node is imported with test-only I/O types for a CPU comparison;
this does not test the real ComfyUI frontend or GPU generation. Test tools are
installed only on the CI runner, with no added package runtime dependency.

See `TEST_REPORT.md` for the tested scope and pending checks, and `NOTICE.md` /
`LICENSE` for Krea2 attribution. Core/Krea2 files and existing workflows are not
modified by this package.

### Layout JSON import (1.0.9)

![JSON import button in the Canvas Preset panel](docs/layout-json-button.png)

The **JSON…** button is at the upper right of **Canvas Preset**, below the Canvas drawing area.

![Layout JSON import dialog in English](docs/layout-json-import.png)

The import dialog lets you select a file or paste JSON, review placement, and choose how to apply it.

1. Click **JSON…** to open the import dialog.
2. Click **Choose JSON file** to select a `.json` file, or paste JSON into the text area.
3. Enter **Source width / Source height** if the JSON does not contain the original image dimensions.
4. Review the preview and color assignments. The defaults are **Replace boxes** and **Keep current Canvas size**.
5. Click **Apply** to import, or **Cancel** to leave the layout unchanged.

The dialog, file-selection button and empty-file message follow **ComfyUI's display language**, independently of the Canvas's saved UI Language. Close and reopen the dialog after changing the language.

External MOSS/Canvas JSON import is **placement only**. New boxes use the current Prompter's color defaults for text, Type and styles. Edit the visible box cards after importing for independent prompts, including the eighth box and beyond; otherwise same-color boxes share their prompt. Native editable exports can also restore individual settings, as described below.

Supports MOSS Layout JSON (`items`, `bbox_format: yxyx`, `bbox_coord_space: abs_centralized`) and Canvas `boxes` with pixel `x1/y1/x2/y2`. Enter the original width and height if absent; dimensions are never inferred from box extents. Changing aspect ratio scales X and Y independently. Source-size mode requires positive multiples of 16 and no external size connection. Locked boxes prevent replacement and size changes, but permit additions.

Import is one Undo/Redo step. Edge/outside coordinates are preserved through saving and reloading; they are not silently cropped. Unsupported or malformed JSON is rejected without changing the layout. External placement imports do not import prompts; neither format includes reference images or camera settings. This is not a general Workflow JSON loader.

### JSON export and editable re-import (1.0.9)

Open **JSON… → Export**, choose **Export contents**, then **Download JSON** or **Copy JSON**. Export is read-only: it does not modify the layout, selection, locks or Undo/Redo history. Locked boxes can be exported.

| Format | Contents | Filename |
| --- | --- | --- |
| Placement only (default) | Canvas dimensions, box coordinates and colors | `MOSS_BBOX_Layout.json` |
| Editable: ID prompts + styles | The above plus box IDs, locks, individual names, prompts, Type, framing, angle and Text style | `MOSS_BBOX_Editable.json` |

To restore a file, open **JSON… → Import** and choose it or paste its JSON. Editable files automatically select editable contents; you may switch to placement only to discard their ID/prompt/style/lock metadata. Existing external MOSS/Canvas layouts remain placement-only. **Replace boxes + Keep current Canvas size** are the defaults. Select Add to existing boxes only when you want to combine layouts. For the original composition, choose **Replace boxes + Use source size**, then Apply. Unlock existing boxes before replacing or changing Canvas dimensions. Source dimensions must be multiples of 16, at most 16384; externally connected dimensions cannot be overwritten.

Editable import retains IDs, including the eighth card and beyond. Adding a file whose IDs already exist generates new IDs only for those collisions. Imported locks are restored. One Apply is one Undo/Redo step, including coordinates, dimensions and per-ID settings; saving/reloading the workflow retains them. Empty native exports are valid (replacing with one clears unlocked boxes). Unknown versions or malformed editable data are rejected before applying anything.

**Scope:** Editable files store individual overrides, not the Prompter's color defaults. A box using color settings continues to use the destination Prompter; a Text style using shared settings continues to use the destination Export's shared style. Scene/background, shared color settings, shared Export style, camera, reference image, models and Canvas preset library are not included. Save the complete ComfyUI workflow to transfer those too. Save Preset / Load / Delete still manage the existing preset library; JSON export writes the current Canvas layout, not that library.

Both native formats use `format: "moss_bbox_layout"`, `version: 1`, `contents: "placement"` or `"editable"`, dimensions and a `boxes` array with absolute pixel coordinates. Prompt text, whitespace, newlines, quotes and Unicode are preserved as JSON string values.

**Deleting a Canvas preset:** Delete asks for confirmation and shows the selected preset's name in ComfyUI's display language. Cancel keeps the preset and selection. Confirm removes that saved preset only; the current Canvas layout remains. No preset selected means no deletion.

### Box prompts and advanced shared values

Connect Canvas and Prompter to the same Export. **Box prompts (2)** shows the number of Canvas boxes, not an ID number or limit. Edit each box directly, including multiple boxes of the same color; no view switching is required.

| UI | Meaning |
| --- | --- |
| Box card | The actual text, Type and settings used for that box; formerly ID cards. Headings keep the color name for every Type. The colored dot identifies the corresponding Canvas box; automatic IDs remain internal. |
| ⋯ | Fixed card options: Name/Shared for individual boxes, presets for colors. Opening options never resizes the editor. |
| Name (optional) | Open header ⋯. Formerly Optional: an editable text input, not a button. Click and type a display name, such as Dialogue 1. Empty is allowed. The name never enters generated prompt text. Saved with Undo/Redo support; it is not intentionally disabled. |
| Heading / arrow | The heading selects the Canvas box; only the arrow folds the card. Selection/focus does not reset text, Type or field height. |
| Shared defaults | Normally only actual box cards are visible. This section closes on workflow load or Canvas connection; click its heading when needed. Opening/closing changes no text or settings. Old saved open states are ignored; shared values and individual card text, heights and folding are preserved. With no Canvas connection, it opens as the standalone color editor. |
| Shared (under ⋯) | Replaces this box’s individual words, name, Type, framing, angle and style. A confirmation previews the replacement text. Cancel preserves everything; Canvas Undo restores an accepted replacement. Mere view changes never perform this action. |
| Shared (disabled) | This box has not been edited independently, so the replacement action is disabled. This is separate from the editable Name input. |

Shared and individual text are not concatenated. An independently edited box uses its own words even if an older shared prompt remains. Clearing the individual prompt is an explicit empty value, never a fallback to old shared words. Opening/closing Advanced neither copies nor replaces text. The former Color defaults / ID cards view-switch buttons have been removed; existing words and IDs are retained.

Individual settings live with the Canvas box ID. Save a workflow containing both Canvas and Prompter. Browser/workflow tabs and focus do not change words. Card expansion and manually resized prompt heights are saved. Canvas Undo/Redo restores edits; Alt-duplicate creates an independently editable copy, and Undo restores deleted boxes with their settings. Geometry locks still allow prompt editing.

If multiple Canvases feed Exports using this Prompter, choose the target Canvas. Connect Canvas.framing_data and Prompter.prompt_ui_data to the same Export; direct and Reroute connections work. Right-click the Canvas to select overlapping/locked boxes without changing order.

Unconnected legacy width_override/height_override sockets are removed; connected ones remain supported. Edit dimensions in LATENT SIZE. UI Language is at the right of the coordinate row; Snap is next to the reference-image status.

### Connecting Krea2 background and prompt effects

Optionally install [Krea2 BBOX Prompter Suite](https://github.com/ukr8b3g-cmyk/Krea2-BBOX-Prompter), which supplies both nodes below. MOSS itself does not require that suite.

| Node | Purpose | Inputs / outputs |
| --- | --- | --- |
| Krea2 Background Effect | Append a preset/custom background description | prompt_in → prompt_out; background_text contains only the background fragment. |
| Krea2 BBOX Prompt Effect | Append style, lighting, weather, color or finish descriptions | prompt_in → prompt_out; effect_text contains only the effect fragment. |

Example:

```text
MOSS BBOX Canvas.framing_data → MOSS BBOX Export.framing_data
MOSS BBOX Prompter.prompt_ui_data → MOSS BBOX Export.prompt_ui_data
MOSS BBOX Export.prompt_text → Krea2 Background Effect.prompt_in
Krea2 Background Effect.prompt_out → Krea2 BBOX Prompt Effect.prompt_in
Krea2 BBOX Prompt Effect.prompt_out → CLIP Text Encode.text
```

Either effect node can be omitted. Send the last **prompt_out** to the text encoder. If prompt_in is displayed as a widget, convert it to an input using ComfyUI’s widget-to-input operation. Using only background_text/effect_text as the final prompt discards the original layout, characters and dialogue; use prompt_out for the normal chain.

These nodes append descriptions to the exported string; they do not composite images. Disconnected nodes have no generation effect. V2 also supports optional external STRING connections; see External text.

# Automatic reference-image box text (V2)

The supported configuration for this version is **one reference image, one Image Analysis node and one analysis target box**. Batch analysis of multiple images/boxes and automatic distribution are outside this version's scope. Normal Canvas workflows can still contain multiple boxes.

1. Choose a reference in Load Image.
2. Check Box/target in MOSS BBOX Image Analysis. Its default Auto uses the first created box (the first stored box on reload) and displays the resolved target, such as Auto · RED. Select RED or another box explicitly to fix the destination, and choose character or object in kind. Same-color boxes remain independent targets.
3. Set If/Else Switch to ON (true), then press the ordinary Run button.
4. The target card saves the analysis automatically. Export, CLIP Text Encode and Sampler use that text to generate the image. No copying, pasting or Apply action is needed.
5. Switch OFF: the analysis stays as ordinary editable text. You can also replace it with a completely different prompt and generate normally.

**Before editing, switch OFF. Switching ON again and pressing Run overwrites the body, including manual edits, with the new analysis.** Switching ON alone does not start analysis or overwrite text. Keep it OFF while generating from your edited wording.

Wire Image Analysis.external_text → Switch.on_true → Switch.output → Prompter.external_text. Leave on_false unconnected. While ON, the card is read-only and shows Analysis · Last run; each valid received result is saved through the existing Canvas box editor. OFF makes that saved analysis editable. Canvas Undo restores the prior body. Name, Type, framing, angle, Focus and text style remain unchanged. Running, saving and reloading while OFF preserve manual edits. Failed, empty or late results received after OFF do not change saved text.

Connect Canvas framing_data, the same Load Image IMAGE, and the existing MOSS CLIPLoader CLIP to Image Analysis. Supported encoder: qwen3.5_9b_int8_convrot.safetensors, type moss_image. Expose and share CLIP if the loader lives in a generation subgraph. No extra loader, cloud API or model download is needed.


The target uses a native ComfyUI dropdown. It resolves Canvas boxes across subgraph boundaries; expose target on the subgraph to select Auto, RED, BLUE and other boxes from outside. Explicit selections retain their stable box IDs through save/reload. A deleted explicit target remains Missing box and is never redirected. Auto moves to the next first remaining box if its previous target is deleted, so **explicit selection is recommended when the destination must stay fixed**.

### target and behavior while OFF

`target` selects **where to save analysis text**. It does not restrict image generation to one box. Selecting RED and switching analysis OFF still sends the other Canvas boxes to Export normally.

Example: analyze RED, switch OFF, then change target to BLUE. RED keeps its text; nothing moves or copies to BLUE. The next run with ON saves its new analysis to BLUE.

| Target display | Analysis Switch | Behavior |
| --- | --- | --- |
| Auto · RED/BLUE/etc. | ON + Run | Use the first stored box. Colors have no priority: if BLUE was first, Auto uses BLUE. |
| Auto · Missing box | ON + Run | There are no Canvas boxes, so execution raises an error. Create a box first. |
| An existing box, such as RED | ON + Run | Analyze that reference-image region, save the result to its card and use it for generation. |
| An existing box, such as RED | OFF | No analysis or overwrite. RED uses its last saved body: analysis text, your subsequent edits, or its original text if never analyzed. An empty body remains empty. |
| Missing box | ON + Run | The target does not exist, so execution raises an error. There is no destination; text is never redirected or saved to another box. Select an existing box such as RED. |
| Missing box | OFF | The analysis target is unused. Normal generation uses each box's saved body; nothing writes text to the invalid target. |

**Missing box is not a new box or an output destination.** It means the explicit box ID is missing, or Auto has no available box. An empty target value on Image Analysis means Auto. Auto · Connect Canvas asks for the missing Canvas connection. Running analysis ON while Missing box is displayed raises an error.

The OFF rows assume the standard wiring with on_false unconnected and valid model, image and generation inputs. ComfyUI still validates connected inputs while OFF; it does not ignore a missing Load Image or other required connection.

### Analysis settings and system prompt

The System prompt field contains the actual analysis instructions. Its default describes visible appearance, clothing and colors while excluding background, other subjects and hidden details. You can inspect, edit and save it with the workflow. There is no extra Describe… user-prompt field; a short kind-specific request is constructed internally.

| Setting | Default | Purpose |
| --- | --- | --- |
| system_prompt | Appearance-analysis instructions | Edit the analysis instructions. Core ignores this when use_default_template is OFF. |
| max_length | 384 | Maximum generated analysis tokens, not a character count. |
| Sampling Mode | off | on exposes Core's temperature, top_k, top_p, min_p, repetition_penalty, seed and presence_penalty controls. |
| thinking | false | Thinking mode when supported by the model. |
| use_default_template | true | Use the model's standard chat template. Keep ON to use system_prompt. |
| mtp | off | Core's MTP setting; has no effect without the required model weights. |

New settings follow the existing target/kind widgets; old workflows load with the prior defaults. Because these are new Python inputs, save your work, restart ComfyUI normally and refresh the browser to activate them.

This describes visible appearance. OCR, identity, hidden details and exact reference reproduction are not guaranteed. It does not condition the generator directly with the reference image. Core validates wired lazy branches before execution; select a valid Load Image even when OFF.

The earlier Reference Crop / Generate Text / disconnected Switch and menu-driven review-and-Apply flow remain for old workflows. The new connected workflow does not use that special button or dialog.

Validated on an RTX 5060 Ti: ordinary Run → analysis → RED card → Export → generated image. OFF uses the last saved body. Exhaustive orientation coverage, arbitrary encoders and universal VRAM guarantees remain unverified. ComfyUI retains model-memory ownership.
