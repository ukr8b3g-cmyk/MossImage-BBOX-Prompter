# MOSS BBOX Prompter

**Current version: 1.0.5** — [GitHub Releases](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases)
· [Comfy Registry](https://registry.comfy.org/nodes/mossimage-bbox-prompter)

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
box coordinates keep their existing behavior. Refresh the frontend to load this
layout change; no backend restart is needed.

### Unreleased: multiple selection and group movement/duplication

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

**複数選択:** Draw BoxをOFFにし、Ctrl＋クリック（MacはCmd＋クリック）で枠を追加・解除します。
白線の選択枠の内側をドラッグすると一括移動、Alt＋ドラッグで一括複製できます。
色・説明・枠同士の間隔を保ち、Canvas端や吸着は全体に適用します。
矢印キーは全選択枠を1px、Shift併用で10px移動。数値欄と角のリサイズは1枠だけを編集します。
Escapeは選択解除（ドラッグ中は取消）、Deleteは選択枠を一括削除、右上の×はその1枠だけを削除します。
一括操作はUndo／Redoに対応し、選択だけの変更ではRedoを消しません。
配置は従来のWorkflow形式で保存し、選択状態と履歴は再読み込み時にクリアします。

### 1.0.5: Alt-drag duplication, Shift-resize and Draw Box toggle

- **Draw Box** toggles new-box drawing ON/OFF. When highlighted, dragging
  creates a box even over existing boxes. Click it again to select/move/resize
  existing boxes or use Alt-drag duplication. Completing a new box also returns
  to selection mode. Workflows saved with drawing ON can be switched OFF directly.
- **Alt + drag inside a BBOX** creates a copy after 4 screen pixels of movement.
  It copies the selected box when the pointer is inside it, otherwise the topmost
  box under the pointer. The original stays in place; the copy gets a new ID and
  remains selected. Both boxes keep the same color and share that color's prompt.
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

**1.0.5の変更:** Alt＋ドラッグで枠を複製します。動かさないAlt＋クリックは
従来どおり重なった枠の選択です。複製は同じ色の説明を共有します。
Draw Boxは新規作成モードのON／OFFです。点灯中は既存の枠を操作できません。
もう一度押して消灯すると、選択・移動・リサイズ・Alt複製に戻れます。
Shift＋角ドラッグでリサイズ開始時の縦横比を維持し、Shiftを離すと自由リサイズに戻ります。
右上の削除位置もShiftを押してからドラッグすればサイズ変更になります。
比率固定中は吸着より比率を優先します。数値入力・矢印キー・作成時の動作は維持し、
複製とリサイズはUndo／Redoに対応します。

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

#### プレビューの接続・表示場所（日本語）

**通常版・DMD版の両方で使用できます。従来UIでも使用でき、Nodes 2.0は不要です。
現在の同梱2本にはPreviewを接続済みです。実行するとPreviewノード内に画像と枠が表示されます。**

以下は旧版・独自WorkflowにPreviewを追加する場合の手順です。

1. 現在のWorkflowを保存します。キャンバスの空白をダブルクリックし、
   **MOSS BBOX Preview**を検索して追加します（`image/MOSS`）。
2. テンプレートの**New Subgraph右側の`IMAGE`出力**を、
   **Preview左側の`images`入力**につなぎます。`MODEL`や`LATENT`ではありません。
   生成処理を展開している場合はVAE Decodeの`IMAGE`を使います。
3. **MOSS BBOX Canvasの`framing_data`出力**を、
   **Previewの`framing_data`入力**にも分岐接続します。Exportへの接続は残します。
4. `IMAGE`からWebP保存ノードへの接続も残します。同じ出力から複数の入力へ分岐できます。
5. 実行すると、**MOSS BBOX Previewノード内**に画像と枠が出ます。
   Canvas内や保存ノード内に自動表示される機能ではありません。
   ノードを追加するだけでは、過去に生成した画像は自動で入りません。

**既存画像を再生成せず確認する場合**は、別の小さなWorkflowにLoad Image、
その画像に使った配置のMOSS BBOX Canvas、MOSS BBOX Previewを置きます。
Load Imageの`IMAGE`→Previewの`images`、Canvasの`framing_data`→Previewの
`framing_data`をつないで実行します。サンプラーやモデルを含まないので画像の再生成は不要です。
確認だけの場合は、生成用Workflow全体を実行しないでください。

Preview内の**Show Boxes**は枠の表示だけを切り替え、**Opacity**は枠の不透明度を
0〜100%で調整します。どちらも再実行不要で、その場で変わります。設定は保存・再読込後と
次の結果にも引き継ぎます。Canvas側のShow Boxesとは別の操作です。
Previewの出力`images`は任意接続で、元画像をそのまま渡します。保存画像に枠は描き込みません。

画像が出ない場合は、Previewがミュート／バイパスされていないこと、2本の入力の接続、
Previewまで正常に実行されたことを確認してください。画像だけが出て枠が見えない場合は、
Show Boxes、Opacityが0%でないこと、接続したCanvasに枠があることを確認します。
一時画像が消去された場合は、上記のLoad Imageを使う方法で表示し直せます。
枠は指定した配置の確認用であり、被写体の検出結果ではありません。切り抜きの補正もしません。

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

日本語のComfyUIではマウスオーバー説明も日本語になります。ノード内のUI Languageは
ラベル表示用で、説明の言語はComfyUI本体の設定に従います。標準ウィジェットの説明は
ComfyUIのツールチップ設定を有効にしてください。
`auto_position_hint`は「左上」などの位置を表す英文をcaption／hybridに補う機能で、
枠の自動配置ではありません。`layout_json`と、BBOXがある場合の`auto`には影響しません。
`literal`ではText欄に描く文字そのもの、`text_style`に共通の書体・色・縁取りを入力します。
Textには対応する色のBBOXも用意してください。枠がないTextは配置JSONから省略されます。

### 1.0.2: center/thirds snapping

The compact **Snap** checkbox next to Grid enables snapping during box movement
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
Save Animated WEBP node (quality 80), at 896×1184. Install **rgthree-comfy** to
load the templates. The Standard file disables the LoRA; the DMD file enables
`moss_image\\lora_latest.safetensors` at strength 0.7. Standard uses
25 steps / CFG 2.5; DMD uses 8 steps / CFG 1. Both use er_sde / simple.
These are sample settings, not universal quality recommendations. Select locally
installed model, CLIP, VAE and LoRA files before running. The subgraph routes
the LoRA loader's model output to KSampler.
The separate `moss_state_896x1184.json` is a state-import sample, not a generation
workflow. Older workflow versions remain available in Git history.

### Versioned workflow downloads and compatibility

Use the workflow associated with your installed node version. The existing
Standard and DMD workflows remain compatible with the current nodes; node IDs,
sockets and saved values are preserved. The current templates include Preview;
the archived v1.0.0 files below do not include Preview and remain usable.

| Release | Standard | DMD |
| --- | --- | --- |
| [v1.0.5](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/tag/v1.0.5) | [Download JSON](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/download/v1.0.5/MOSS_BBOX_Standard.json) | [Download JSON](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/download/v1.0.5/MOSS_BBOX_DMD.json) |
| [v1.0.4](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/tag/v1.0.4) | [Download JSON](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/download/v1.0.4/MOSS_BBOX_Standard.json) | [Download JSON](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/download/v1.0.4/MOSS_BBOX_DMD.json) |
| Current main (Preview; nodes 1.0.3+) | [Download JSON](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/raw/refs/heads/main/examples/MOSS_BBOX_Standard.json) | [Download JSON](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/raw/refs/heads/main/examples/MOSS_BBOX_DMD.json) |
| [v1.0.0](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/releases/tag/v1.0.0) | [Download JSON](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/raw/refs/tags/v1.0.0/examples/MOSS_BBOX_Standard.json) | [Download JSON](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/raw/refs/tags/v1.0.0/examples/MOSS_BBOX_DMD.json) |

For future GitHub Releases, attach the corresponding Standard and DMD JSON files
as release assets and add that release to this table. Keep existing tags and
assets intact so older workflows remain downloadable. Keep only the two current
generation templates in `examples/`; historical copies belong to their releases,
not additional files in the current template folder. Registry versions and
GitHub Releases are separate; a Registry publication alone does not create a
GitHub Release or attach workflow files.

The maintainer-supplied Standard and DMD replacements are now bundled.
Workflows using **MOSS BBOX Preview**
require node version **1.0.3 or newer**; older node versions do not register it.
The zoom/hover/layout fixes are included in version 1.0.4. Installed model
names and other custom-node dependencies must still be available; compatibility
does not promise identical pixels across model or ComfyUI updates.

旧Workflowは現在のノードでも使用できます。現在の同梱2本はPreview接続済みで、
v1.0.0の旧2本にはPreviewが含まれていません。今後は各GitHub Releaseに、その版に対応する通常版・DMD版のJSONを添付し、
旧版のタグとファイルも保持します。上の表から旧版を直接ダウンロードできます。
提供された通常版・DMD版で既存2本を差し替えました。表のCurrent mainから最新版をダウンロードできます。
Preview入りWorkflowにはv1.0.3以降が必要です。日本語説明・縮小表示・座標欄の修正はv1.0.4に含まれます。

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
$env:COMFYUI_ROOT = 'D:\StabilityMatrix\Data\Packages\ComfyUI-Q'
python -B -m unittest discover -s tests -p "test_*.py"
node --test tests/state.test.mjs tests/shared_ui.test.mjs tests/preview.test.mjs
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
Push runs and manual runs with `publish` disabled never run Registry version
checks or publication. It uses pinned ComfyUI and published MOSS source references, including the
optional byte-compatibility comparison. No Krea2 checkout is needed.
The official MOSS node is imported with test-only I/O types for a CPU comparison;
this does not test the real ComfyUI frontend or GPU generation. Test tools are
installed only on the CI runner, with no added package runtime dependency.

See `TEST_REPORT.md` for the tested scope and pending checks, and `NOTICE.md` /
`LICENSE` for Krea2 attribution. Core/Krea2 files and existing workflows are not
modified by this package.
