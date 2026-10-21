# Validation record — updated 2026-10-22

## Actual ComfyUI server-side Save As — 2026-10-22

All four corrupt layout strings from the Export/import check also passed the
real **Workflow actions → Save As** operation in ComfyUI_test. Each save returned
HTTP 200. Reading the stored server JSON confirmed the exact original in both
`widgets_values` and `k2cfCanvasState`.

After closing the saving page, a fresh browser session opened each saved entry
from the server's Workflows sidebar. The frontend fetched the stored workflow
from the server (GET 200), restored the exact original and retained its error
state. This closes the earlier server-side Save As verification gap.

There were zero page errors and zero prompt requests; the queue was empty before
and after. All four temporary server workflows created by this test were removed
and confirmed absent (GET 404). Owned browsers were closed. Existing workflows
and the user-managed service were preserved. No GPU generation, commit, push,
GitHub Release or Registry publication was performed.


## Actual ComfyUI frontend: corrupt layout retention — 2026-10-22

Confirmed against the running ComfyUI_test at `http://127.0.0.9:8188` after the
user-managed restart, in a separate Chromium session. A Standard workflow copy
was loaded via ComfyUI's file input for each of four corrupt layout strings:
`{"boxes": [`, `[]`, `null`, and `{"boxes":null}`.

All four passed: after actual color/visibility controls, **Workflow actions →
Export** saved a real JSON file retaining the exact original in both widget
values and `k2cfCanvasState`. Importing that exported file retained the original
and error state. Clicking **Reset Canvas** recovered to a valid empty layout;
loading the unmodified Standard workflow recovered its three original boxes.
This checks downloaded workflow-file export/import, not server-side Save As.

There were **zero page errors, zero prompt requests**, and the queue was empty
before/after. Generation requests were blocked in the test browser as a guard.
The original workflow file was unchanged, the owned browser was closed, and
the existing user service/tabs were left alone. No GPU generation, commit, push
or Registry publication was performed.

## Unreleased: preserve corrupt Canvas layouts — 2026-10-22

Baseline: v1.0.0 (`4dd357f0cdcce537cb32bd7c26bcea061ea4089f`).
Canvas restoration now distinguishes intentionally empty layouts from malformed
JSON and invalid object/boxes types. On failure it retains the exact original
and an editing error state. Ordinary sync, saved-state merging and serialization
preserve that original, so the existing Python validation can still reject it.
Reset or a valid workflow reload clears the error and resumes editing. Layout
edits/preset replacement are suspended while the input is corrupt. The existing
Canvas layout, node IDs, sockets, widget order and bundled workflows are unchanged.

Local validation completed:

- **38 Python tests passed, no skips**, including byte-for-byte export parity
  for both bundled workflows against the pre-change snapshot.
- **17 JavaScript unit tests passed, no skips**. Four new tests cover input
  classification, saved-state merging, actual restore/sync/serialization and
  stubbed prompt preparation, and recovery after loading valid data.
- **11 JavaScript files passed syntax checks.**
- **Canvas and Prompter browser fixtures passed, zero page errors.** The Canvas
  fixture preserves five corrupt inputs (the four reported cases plus surrounding
  whitespace) through real color/visibility/camera controls, attempted drawing,
  resize callbacks, serialization and a corrupt serialized-workflow reload.
  Reset recovery, valid-workflow recovery, four intentional-empty inputs and
  the existing Undo/Redo/overlap-selection scenarios pass. Footer height remains
  **93 CSS px at 830px node width**.

The browser checks use isolated fixtures with ComfyUI API stubs. Their save/load
and prompt-preparation checks are not real ComfyUI file-save/Queue operations.
No user service was restarted, no generation request was sent, and no new GPU
or actual ComfyUI frontend test is claimed. Owned fixture browsers/servers closed.
These local checks were completed before committing this fix. The package
version remains 1.0.0; no GitHub Release or Registry publication is part of it.

## Version 1.0.0 release — 2026-10-22

Version 1.0.0 standardizes the package metadata, README and release naming.
It contains the same runtime code and bundled workflow JSON files as 0.1.4
(`6e9a35de27f3c6e981bad2cba9d23b9dd217d629`). The changes from that commit are
limited to `pyproject.toml`, `README.md` and this validation record.
The 0.1.4 CPU, browser-fixture and actual ComfyUI frontend checks below remain
applicable. Publication runs the Python/JavaScript regression suites, Registry
warning checks and source ZIP verification again. No new GPU test is claimed
for this version-number and documentation update.

## Canvas Undo/Redo and overlap selection — v0.1.4, 2026-10-22

Based on v0.1.3 (`ef14d28d4e54069e61fcbeef3b62f1b1fe6ea4a0`).
The Canvas has a bounded, per-instance editing history and Alt+click overlap
selection. History uses the existing Canvas preset/restore machinery and is
never serialized into a workflow. Selecting a covered box preserves item order;
the next normal drag moves that selected box. Node IDs, sockets, saved widget
order, Python generation code and both bundled workflow JSON files are unchanged.

Local regression results:

- **38 Python tests passed, no skips**, including byte-for-byte comparison of
  both saved workflows' export results against the pre-change source.
- **13 JavaScript unit tests passed, no skips**; browser modules pass syntax checks.
- All three isolated browser fixtures pass. Canvas scenarios cover draw/move/
  resize/delete/reset undo/redo, one history step per drag, no-op clicks, redo
  invalidation, resolution restoration, external dimension overrides, input and
  multiple-node isolation, pointer cancellation, reconfiguration during a drag,
  and listener cleanup. The footer remains **93 CSS px** at an 830px node width.
- An early capture-phase graph-history observer is included in the Canvas
  fixture. It reproduces ComfyUI's shortcut ordering: Canvas keyboard controls
  reserve local editing focus, block text insertion, and do not dispatch a
  second graph Undo. This regression was added after reproducing the conflict
  in the real frontend.

Actual ComfyUI_test frontend checks also passed for **MOSS_BBOX_Standard.json**
and **MOSS_BBOX_DMD.json**. Each unmodified file was loaded in a separate workflow
tab in an isolated Chromium session connected to the existing service. Real
pointer/keyboard events verified creation with button Undo/Redo, Alt selection
and movement of the covered box, Ctrl+Z/Ctrl+Y, deletion and restoration. Other
boxes retained their coordinates/order, and the original three-box layout was
restored at the end. There were **zero page errors and zero prompt requests**;
the queue was empty before and after. These are actual ComfyUI UI checks, distinct
from the fixture tests, and are **not GPU-generation or image-quality tests**.

The owned test browsers and fixture servers were closed. Existing user browser
tabs and the running ComfyUI service were not restarted. Validation was completed
before publication. Version 0.1.4 packages this change for the Registry.

## Standalone implementation — v0.1.2, 2026-10-21

The required Canvas/Prompter controls and text helpers are now bundled from
the MIT-licensed Krea2 v1.0.2 implementation. Runtime imports and rendering no
longer require Krea2. Effect galleries/APIs and global debug helpers are omitted.
CSS, browser hook guards and new storage writes are MOSS-owned. Existing preset
keys are read only as a migration fallback; original Krea2 storage is not changed.
Node IDs, sockets, widget order, saved properties and both workflow JSON files
are retained. Krea2-compatible input schemas remain accepted by MOSS Export.

Version 0.1.2 introduces standalone operation; v0.1.1 predates this change.
Release publication runs the Python and JavaScript checks in GitHub Actions
before the opt-in Registry upload. After publication, the service was restarted
and both bundled workflows passed GPU generation, as recorded below.
The package now contains 29 source files. Local CPU validation passes all
33 Python tests in each runtime and all nine JavaScript unit tests, plus ten
JavaScript syntax checks and Ruff S102/E702. A new isolated-process regression
copies only the MOSS Python package and its two example JSON files, then runs
both examples without ComfyUI/Krea2 node registrations or a Krea2 installation.

GPU-disabled browser fixtures pass with Krea2 absent and with the original
Krea2 renderer loaded alongside MOSS. They cover Type/literal text, clone and
restoration, presets, local preset migration without overwriting Krea2 storage,
external dimensions and equal-height compact panels. The footer remains 93px
at 830px node width. No browser page errors were observed in these fixtures.

An independent comparison against the published 0.1.1 implementation and its
original Krea2 helpers matches 1,282 result dictionaries/tuples exactly,
including the actual auto/literal outputs of both saved examples. JSON files
and protected Krea2 sources retain their original hashes. The running test
service serves the bundled module with HTTP 200 and JavaScript MIME type;
this is a delivery check, not a live ComfyUI interaction or GPU acceptance.

### Standalone GPU acceptance — 2026-10-21

Tested source: standalone **v0.1.2**, commit
[`6c069ef`](https://github.com/ukr8b3g-cmyk/MossImage-BBOX-Prompter/commit/6c069efcaa7eb731cb9e4f6c5ef034b67e690d36).
ComfyUI_test was restarted after the standalone code was deployed. Its package
matched the published source before and after the runs. The device was an
NVIDIA GeForce RTX 5060 Ti (16 GB), using ComfyUI 0.42.1 / PyTorch 2.14.1+cu130.

| Bundled workflow | Steps / CFG | DMD LoRA | Elapsed | WebP size | Result |
| --- | --- | --- | --- | --- | --- |
| `MOSS_BBOX_Standard.json` | 25 / 2.5 | Off | 48.23 s | 100,040 bytes | PASS |
| `MOSS_BBOX_DMD.json` | 8 / 1 | On, strength 0.7 | 9.12 s | 75,028 bytes | PASS |

Both used seed 8961184, er_sde / simple, denoise 1, batch size 1 and 896×1184.
The saved MOSS-Image SFT, Qwen3.5 9B INT8 text encoder and VAE selections were
retained. The DMD file used its saved `moss_image\\lora_latest.safetensors`.
The templates' generation subgraph and reroutes were resolved into an API
graph with the same node inputs and connections, including rgthree Power Lora
Loader. The running MOSS Canvas, Prompter and Export supplied the conditioning
path; their output was not replaced with an offline precompiled prompt.
Only the output filename prefix changed in the submitted workflow copies.
Both original example JSON files retained their published hashes.

For both runs:

- Execution completed successfully, and KSampler was not a cache hit.
- Save Animated WEBP produced one 896×1184 WebP, quality 80, with the embedded
  workflow and API prompt exactly matching the submitted data.
- Visual inspection found readable `MOSS Café` across the top, a character
  holding a cup on the left, and a table with a flower vase on the right.
- No source edits were required, and both service queues were empty afterward.

Scope: one saved seed per variant. These API runs do not repeat the live
browser UI interaction test or establish a numerical BBOX-placement accuracy
score. Krea2 remained installed in this GPU environment; the separate isolated
CPU process and browser tests above verify operation without Krea2. Standard
includes initial model/CLIP loading; DMD reused upstream caches, but executed
its LoRA loader, sampler and decoder. The elapsed times are not a controlled
speed comparison.

The sections below describe earlier versions and their dependencies.

## Historical source status — audit corrections, 2026-10-21

The local ComfyUI-Q and ComfyUI_test packages contain the same 27 source files.
The two generation templates are `examples/MOSS_BBOX_Standard.json` and
`examples/MOSS_BBOX_DMD.json`; `moss_state_896x1184.json` is an import-state sample.
Both templates now consistently save Character for the person, Object for the
table and Text for the title in positional values, named values and Prompter
restoration snapshots. Actual CPU execution emits `character / object / text`
and preserves the exact visible title `MOSS Café` in the Text item's `text` field.
UI layout, model/size links, prompts and sampler settings are otherwise retained.

Current template settings remain 896x1184, 8 steps / CFG 1, er_sde/simple,
Save Animated WEBP quality 80. The DMD LoRA is off in Standard and on at strength
0.7 in DMD. These are supplied sample values, not new GPU-quality recommendations.

CPU tests automatically locate the installed Krea2 package using the source,
Suite or Registry folder name, or the explicit `KREA2_SOURCE_ROOT` folder.
No duplicate Krea2 installation is needed. On both ComfyUI-Q (source folder) and
ComfyUI_test (Suite folder), all **32 Python tests pass without skips** when
`COMFYUI_ROOT` and `MOSS_BEFORE_ROOT` are supplied. A new regression checks the
actual sample-node output and consistency of the saved Type representations.

These corrections update the source package. The already published Registry
v0.1.0 is unchanged; it was built from GitHub commit
`d0f24cae69e0cb66a21bc44875349ea61d96c60b` before these corrections.
No new real-frontend interaction, restart or GPU generation was performed.
The GPU results below apply to the earlier acceptance workflows, not to the
replacement Standard/DMD templates or their latest Type corrections.

## Registry warning and publishing-test corrections, 2026-10-21

The official-node comparison now imports the original module with test-only
Comfy I/O types instead of extracting and executing Python source. Its 500
coordinate comparisons are retained. The two metadata-test semicolon statements
are split into separate lines; no test is removed or suppressed.

The action runs Ruff S102/E702, Python regressions and JavaScript unit/syntax
tests before packing. Pushes to main run these checks automatically. Registry
version checks and publication require a manual run with `publish=true`;
`publish` defaults to false. Failed checks stop the job before publication.
Krea2 v1.0.2, the official MOSS source and the published MOSS compatibility
reference are pinned and checked out outside the package being packed.
Runtime code, workflow JSON, version and the packaged file list are unchanged.
Local checks pass: 32 Python tests in each installed package, nine JavaScript
unit tests, nine JavaScript syntax checks and zero Ruff S102/E702 findings.
A temporary copy with the exact pinned CI sources also passes all 32 Python
tests and the JavaScript checks; intentional Python/JS failures return nonzero.
Local validation used Python 3.12.12 and Node 25.2.1; the action selects Node 24.
These are local validation results; the GitHub Actions run for each commit
is the authoritative remote CI result. No Registry republish, restart or GPU
test is part of this source update; the published Registry version is unchanged.

## Historical GPU acceptance — before template replacement

The following acceptance record predates the replacement templates. Its file
names, sampling settings and saved-image nodes describe that earlier stage.

Distributed generation examples are limited to MOSS_BBOX_Standard_WebP.json and
MOSS_BBOX_DMD_WebP.json. One state-import sample is retained. The five superseded
workflow files are removed from the current package and remain in Git history;
legacy node IDs and runtime behavior are unchanged. Sample-link and metadata
tests now read the current workflows rather than a removed legacy example.

The current recommended nodes are MOSSSharedCanvas, MOSSSharedPrompter and
MOSSFromKrea2. The checks below cover the installed ComfyUI_test frontend 1.55.18
and standard MOSS model after a user-managed backend restart. ComfyUI-Q carries
the same package content; it was not independently GPU-tested in that run.

- Standard model, no LoRA: person/cafe and graphics-only workflows completed,
  plus a person/cafe run submitted using Chrome's Run button. All three executed
  KSampler without a sampler cache hit and saved WebP Meta at quality 70.
  Settings: seed 8961184, 25 steps, CFG 2.5, er_sde/simple.
- API runs: 896x1184 in 45.98 seconds including initial loading (102,318 bytes),
  and 1024x1024 in 24.09 seconds (50,838 bytes). The Chrome-submitted run took
  24.86 seconds in ComfyUI history (110,458 bytes). These are acceptance timings,
  not evidence that CPU prompt assembly made GPU sampling faster.
- All three generated positive prompts exactly match the existing expected
  strings. The API runs also retain their workflow/API inputs, apart from the
  Save node's generation snapshot. The Chrome run preserves all three types and
  the exact prompt in WebP metadata.
- Real UI verification found and fixed a Prompter restoration bug: a creation
  snapshot could overwrite widgets-only workflows with empty prompts and Object
  types. The MOSS adapter now installs the incoming snapshot before shared
  hydration. Scene, color text and Character/Object/Text survive restoration and
  page reload. Type switching and box show/hide roundtrips pass.
- The real Canvas footer has three panels of 93 CSS pixels, matching tops and
  no horizontal overflow. Existing user workflow tabs were retained.
- Final CPU checks: 31 Python tests and 9 JavaScript tests pass, without skips
  after supplying the previous snapshot for workflow compatibility checks.
  Python AST parsing and the changed JavaScript module's syntax check pass.
  The retained examples match their previous backend outputs; their JSON content
  is unchanged. Protected Core/Krea2 file hashes remain unchanged.

Known limits: boxes are guidance, not strict masks. Earlier seed comparisons
showed a central suitcase drifting toward the person at seed 42. DMD, additional
frontend versions, subgraphs and promoted widgets were not tested in this run.
Chrome logged vite preloadError and crystools.monitor messages; this is not a
claim of an entirely error-free browser log. Current shared-node rendering,
restoration and generation nevertheless completed successfully.

Local evidence: `restart_acceptance.json`, `restart_ui_run.result.json`,
`restart_ui_restored.json`, `restart_final_verification.json` and UI screenshots
under `<developer-local path>`.
These local evidence files are not runtime dependencies. Publication status is
recorded in the repository commit history.

## Historical records

The following sections preserve earlier validation stages. References to GPU
holds or pending checks describe those stages; the current status above takes
precedence for the current shared nodes. Legacy-node checks remain separate.

## Compact MOSS Canvas footer and refreshed skill review — 2026-10-19

The adapter moves the existing shared DOM controls into three equal-height
panels, using styles scoped to the MOSS Canvas root. Latent Size keeps its title,
labels, preset, numeric inputs and save/delete controls; preset and width/height
share a row. Camera Settings uses four fixed columns without the Focal field
wrapping. Camera and Canvas Preset help remains in hover titles. Whole panels
wrap at narrow widths. No renderer, events or persistence functions are copied.

The actual installed Krea2 renderer runs in a GPU-disabled browser fixture.
At 830px node width, the original footer is 202.25px and the compact footer is
93px (54% reduction). All three panel heights and tops match; preset and numeric
inputs share a row. No horizontal overflow at 940/830/640/430px. Size preset,
custom size save/delete, ISO/focal settings, Canvas Preset save/load, clone
restoration, Japanese UI and connected external width/status pass. Original
Krea2 retains its original DOM and styling. No browser page errors.
The saved before/after JPEGs are isolated fixture screenshots, not model output.

The existing Prompter browser fixture also passes all 7 checks. Adapter unit
tests pass 3/3. Export CPU tests pass 10/10, including all seven saved workflow
examples and saved MOSS state matched against the pre-change implementation.

Updated local moss-image-prompt-enhancer SKILL.md, references/prompting.md,
references/layout.md and compiler were reread. The added prompting guidance is
already supported by the current literal/layout path: global tags stay in the
summary, subject tags/LoRA triggers keep their order and text, actual Japanese
line breaks remain distinct from literal backslash-n, and vertical typography
stays an explicit style instruction. A CPU regression case covers these paths.
No automatic line wrapping, tag rewriting, checkpoint-dependent defaults or
sampler/LoRA changes were introduced; no backend code change was needed.

A fresh dedicated IAB tab loaded the real ComfyUI service without restarting
the backend. Its MOSS footer is 93 CSS pixels, has three equal-height panels and
no horizontal overflow. The user's Chrome tab was not operated. Evidence:
`<developer-local path>`.
Fixture processes 33508 / 43144 and ports 62235 / 64257 closed in finally.
The earlier measurement fixture 36420 / 60379 also closed in finally.
**No GPU generation or backend restart was performed.** Existing browser pages
need a frontend refresh to load the new JavaScript.

Pre-change snapshot:
`<developer-local path>`;
27 files copied and hashes matched. Core/Krea2/user-workflow protected hashes
remain unchanged; example workflows and model/sampler settings are untouched.

## Live verification after user-managed restart — 2026-10-18

The restarted service at `http://127.0.0.2:8188` registers all three MOSS nodes
from `custom_nodes.MOSS-BBOX-Prompter`, all three visible Type choices plus the
hidden legacy obj alias, and Export's output_mode/text_mode/text_style inputs.
The queue was initially empty. A user job started in another tab later;
no generation was submitted, stopped or interrupted by this verification.

A dedicated IAB tab loaded the real ComfyUI frontend and the unchanged Standard
example. The Type selects render Character/Object/Text, and Export displays the
legacy-compatible hybrid/legacy defaults plus its style field. A verification
copy containing only the three MOSS nodes loaded auto/literal settings. Text
card input containing outer spaces, quotes, pipes, text: prefix, Unicode and
blank lines survived workflow-tab return and full frontend reload exactly;
the character/object/text selections also survived. No MOSS-matching error logs.
The user's existing Chrome tab was not operated or reloaded.

Evidence: `<developer-local path>`.
`legacy-defaults-live.jpg` shows the real frontend, not an isolated mock fixture.
The verification workflow contains no model, sampler or image-generation nodes.
Warning execution and model output quality were not tested on the live service.
**GPU generation tests remain on explicit hold.**

Pre-record snapshot:
`<developer-local path>`;
README, TEST_REPORT and the unchanged source example copied with matching hashes.

## Current change: compatible export modes and literal Text

MOSS Export appends optional `output_mode`, `text_mode` and `text_style` widgets.
Defaults remain `hybrid` / `legacy`; existing node IDs, required input order,
four output sockets and saved workflows are unchanged. Literal mode reuses
the existing Text card, preserving its raw wording separately from legacy
cleaned data; its appearance comes from the shared `text_style` setting.
Caption output has no editor color/box labels. Auto emits JSON for boxes and
plain prose otherwise, retaining unboxed visible wording in prose. JSON-only
output warns when unboxed content cannot be represented.

Geometry diagnostics are nonfatal: range, area and export-precision warnings
keep all coordinates and items. Empty visible text is also flagged. MOSS Export
sends these diagnostics to the ComfyUI log without changing its tuple return.

CPU: new export tests **9/9**; legacy builder **13/13** (including installed Core
coordinate comparison); bridge integration **8/8**; UI adapter JavaScript **3/3**.
Snapshot regression compares all seven existing example workflows and the saved
MOSS state with their pre-change implementation, byte-for-byte for prompt/JSON
outputs. The nine protected Core/Krea2/user-workflow hashes remain unchanged.

Isolated Chromium, GPU disabled: **7 scenario groups pass**, including exact
spaces, quotes, pipes, Unicode and multiline Text surviving serialization and
clone hydration using the actual unchanged Krea2 renderer. Zero page errors.
Evidence: `<developer-local path>`.
Fixture PID 51028 / port 56202 closed in finally; listener false and process exited.
This fixture does not contact the running ComfyUI or submit generation.

Pre-change snapshot:
`<developer-local path>`;
26 files copied and hashes matched. The runtime package is canonical and ignored
by its enclosing ComfyUI Git repository; there is no separate tracked source copy.

Backend restart and live frontend verification completed on 2026-10-18, as
recorded above. **GPU generation tests remain on explicit user hold.**

## Previous change: three MOSS element types

Each MOSS color card reuses its existing Type select with Character / Object /
Text options. The adapter inserts options at the DOM-widget creation boundary,
before shared hydration. It retains the shared input/change handlers, collapsed
cards, text heights, presets and serialization. Legacy `obj` values in both
widget arrays and saved node properties normalize to `object` on configuration.
Original Krea2 selectors/source are unchanged.

The MOSS backend preserves all three labels. Type selection is authoritative;
quoted descriptions or `text:` prefixes do not turn Character/Object into Text.
Only explicit Text uses the existing visible-text/description notation and
emits a `text` field. Coordinates, Framing/Angle, camera and hybrid output paths
retain their previous behavior. The two MOSS example workflows select
Character / Object / Text for the woman / table / title.

CPU: **8/8 integration cases**, including explicit labels through prompt/export
roundtrips, same-color boxes, quoted Character/Object, multiline Text, old obj,
unknown type rejection and fractional coordinate equivalence. Legacy Python
**13/13** and JavaScript adapter **3/3** pass.

An isolated Chromium fixture executes the **actual installed Krea2 renderer**
and the MOSS adapter with GPU disabled. **6 scenario groups pass**: three choices,
latest types in serialization, clone restoration, clone isolation, legacy obj
restoration and unchanged original Krea2 options. No page errors. Fixture PID
11248 / port 53766 stopped in finally; HTTP listener false and process exited.
Evidence: `<developer-local path>`.
The JPEG is from this fixture, not live ComfyUI. The first fixture attempt
needed to open the collapsed Yellow card; a later artifact-write permission
failure was resolved by writing evidence in the developer workspace.

Live ComfyUI is running user catalog generation. It was not restarted or
interrupted. Applying the new Python input schema requires a normal launcher
restart and frontend refresh; real Chrome verification of the three-type
version is pending that safe restart. The user explicitly chose to defer this
restart; no restart or live frontend refresh was performed for this change.
Code and examples are saved for the next user-managed restart.
**GPU tests remain on explicit hold.**

Pre-change snapshot: `<developer-local path>`;
25 source/example/test files copied and hashes matched.

The sections below describe earlier versions, not live acceptance of this change.

## MOSS names and shared implementation

Current node labels: **MOSS BBOX Canvas**, **MOSS BBOX Prompter**,
**MOSS BBOX Export**. `MOSSSharedCanvas` and `MOSSSharedPrompter` use the
registered Krea2 backend and frontend prototypes. Export retains its existing
ID/socket contracts. Original Krea2 nodes and source remain unchanged.

Removed the helper's path-based `importlib` load and cached second module.
Helpers now resolve the module already registered with ComfyUI. The UI adapter
captures the original renderer classes through `beforeRegisterNodeDef` and
calls their final creation/configuration hooks, without evaluating another
renderer or reinstalling its global persistence hooks. MOSS Canvas defaults
to 896×1184 / Custom; the original Krea2 defaults remain 1024×1024.

CPU: **6/6 integration cases**, including module identity/no duplicate imports,
shared backend output equivalence, isolated defaults and MOSS display names.
JavaScript: **2/2 adapter cases** cover registration order, late prototype
updates, single creation, configuration, serialization and node isolation.
Legacy Python **13/13** pass. Updated workflows:
`examples/MOSS_BBOX_Standard_WebP.json` and `examples/MOSS_BBOX_DMD_WebP.json`.
After the user's normal launcher restart, live `object_info` confirms all three
MOSS names and the MOSS package identity. Actual Chrome renders the shared UI
under the MOSS node types. New Canvas creation defaults to 896×1184 / Custom.
Duplicate isolation, intentional blank after tab return, color-card opening,
Unicode input, Framing/Angle changes, JSON export and reload passed. The actual
exported workflow retains all three MOSS node IDs, three raw boxes and current
text; CPU execution of this export produces three official MOSS items.
Evidence: `moss_named_live_checks.json`, `moss_named_live_cpu_checks.json`,
`moss_named_live_state.json`, `moss_named_live_chrome.jpg` in
`<developer-local path>`.
GPU remains on explicit user hold; no generation was submitted for this version.

Snapshot: `<developer-local path>`;
21 source/example/test files copied and hashes matched (generated test artifacts excluded).

The prior Krea2-node integration record follows.

## Current interface: reuse the installed Krea2 nodes

The current recommended workflows use `Krea2ElementFramingV1Canvas` and
`Krea2ElementFramingV1Prompt` directly, followed by `MOSSFromKrea2`.
No new Canvas/Prompter renderer or persistence layer is introduced. Krea2
source and existing user workflows remain unchanged. The three earlier MOSS
UI nodes remain compatible but are deprecated for new workflows.

CPU: **4/4 new integration cases** exercise the actual installed Krea2 Python
nodes, raw fractional coordinates, shared colors, visible text notation,
Framing/Angle hints, camera settings, empty values, wrong upstream format and
derived position hints. Legacy Python **13/13**, JavaScript **5/5** pass.
The two new complete workflows use WebP quality 70; DMD uses the installed MOSS
adapter at strength 1, 8 steps and CFG 1. After the user's normal launcher
restart, live `object_info` confirms the new Export node is registered.

Actual Chrome: Krea2 UI renders; 896×1184, all color texts and the text type
restore. Duplicate isolation, intentional blank after tab return, card opening,
Unicode input, Framing/Angle changes and a fourth green box were exercised.
Exported JSON contains current input and raw fractional coordinates; CPU
execution of that actual export produces four official MOSS items. Reloading
the export restores text and controls after Krea2's RAF hydration completes.
Prepared workflows include `k2cfCanvasState` / `k2cfPromptState`, as emitted by
Krea2's serializer; omitting these initially caused default values on load and
was corrected before delivery.

**GPU generation is on hold at the user's explicit request.** No prompt was
submitted for the Krea2-UI version. The prepared GPU script must not be run
until the user asks to resume. Earlier custom-UI GPU results below do not
validate this new export path. Evidence: `krea_ui_live_checks.json`,
`krea_ui_live_cpu_checks.json` and `krea_ui_live_state.json` in the evidence folder.

Snapshot before this change: `<developer-local path>`;
19 files copied and SHA256 matched. Evidence and prepared workflows:
`<developer-local path>`.

The sections below are historical records of the earlier custom interface;
they do not describe validation of the new Krea2-to-MOSS export path.

## Continuation: live tests and separate interface

Two actual GPU generations completed through the local ComfyUI-Q API, using
the original combined node, seed 8961184 and the same 896×1184 cafe layout:

| Case | Settings | Execution | WebP bytes |
| --- | --- | --- | --- |
| Standard | 25 steps, CFG 2.5, er_sde/simple | 23.319 s | 99,352 |
| DMD | moss_image/lora.safetensors, strength 1, 8 steps, CFG 1, er_sde/simple | 5.823 s | 68,436 |

Both used Save WEBP Meta at quality 70. Saved WebP EXIF contains the exact
original Canvas state and workflow. Actual Chrome Open restored the standard
WebP's three boxes and full derived prompt. Save WEBP Meta reported
`unresolved_runtime_text` for normalized text extraction; pixels and raw graph
metadata were retained. These two images are a smoke test, not a quality or
performance benchmark. Their model, guidance and step counts are recorded in
`<developer-local path>`.

Actual Chrome testing exercised box drawing/movement, four resize corners,
shared-color captions, original Unicode/special text and dimension changes.
Deletion Undo failed on frontend 1.55.17. The editor now emits the current
LiteGraph canvas before/after change events in addition to the legacy graph
callbacks. Following a frontend refresh, real deletion Undo/Redo both passed.
The existing workflow tabs remained present after refresh.

The subsequent user-requested UI split adds MOSSBBoxCanvas and
MOSSBBoxPrompter while retaining the combined node ID. Python **13/13** and
JavaScript **5/5** pass. The isolated Chromium fixture passes **13 scenario
groups**, including separate ownership, connection preview, dimension changes
and Undo, collapsible cards, intentional blank restoration and grid/show
controls. The screenshot `split-editor.jpg` is from that isolated fixture,
not the live ComfyUI renderer.

Live registration, real Chrome rendering, frontend queue submission and GPU /
WebP restoration for the new split nodes require the normal ComfyUI-Q restart
and are pending. The old combined node's GPU results above are not evidence
that the new node registrations or split frontend have passed those checks.
Neither Core/Krea2 nor the user-managed ComfyUI process was modified/stopped.

The original implementation record below describes the earlier baseline.

Target: developer ComfyUI installation, `<developer-local path>`.
Initial node/sample dimensions: **896×1184**.

## Inspected baseline

- ComfyUI-Q: `e087d8f6cb7c6cdb11b59dc7c9bf17c79f8d877d`.
- Krea2-BBOX-Prompter: `98f3a29c28b95369cad6ba2a507a699f9a36a41b`, clean.
- Instructions: checkout `AGENTS.md`, global work rules, and referenced
  `<developer-local path>`. No `.agents/skills` applies to this new custom-node path.
- Official `nodes_moss_image.py`, `nodes_bounding_boxes.py`, and
  `EmptyFlux2LatentImage` were read. Installed frontend: **1.55.17**;
  its source maps confirm `addDOMWidget`, read/write string-widget accessors,
  hidden-widget behavior and the current Vue string-widget path.
- Core status already contains model-placeholder deletions / a model link;
  these pre-existing changes were left alone.

## Passed in the implementation workspace

Python **3.13.11**: **12/12 unittest cases**, no skips, including:

- Import and node registration mappings, defaults and CPU-only module boundary
  (no torch/server import).
- Exact official layout keys, three labels, separate rendered strings, shared
  captions for multiple same-color boxes.
- Whole-canvas portrait edges `[-592,-448,592,448]`, reversed/fractional edges,
  zero-area/empty elements, near-integer floating error handling, and proof that
  small fractional boxes avoid a 0–1000 integer roundtrip.
- **500 cases** against the installed official MOSS `execute` class, extracted
  with AST and run using an `io.NodeOutput` stub. The comparison gives the
  official function unquantized fractions; the production builder never does a
  grid conversion. This tests official arithmetic without importing a model.
- **187 inputs** comparing JS and Python output text, parsed JSON and warnings.
- Original whitespace, Japanese, emoji, quotes, slashes, tabs and wildcard braces.
- Blank replacement, independent copies, immutable serialization, removal of
  old derived position strings, and current-box position regeneration.
- Workflow link consistency and shared 896×1184 latent dimensions.
- Synthetic PNG workflow text / WebP workflow EXIF roundtrips with Pillow **12.2.0**.
  These are metadata codec checks, not ComfyUI drag/drop tests.

Node.js **25.2.1**: **5/5 node:test cases**, covering resolution scaling and
roundtrip, source immutability, all corner hit tests, movement bounds, overlap
order, fresh derived output, fractional edges, blank values and copy isolation.
JS module syntax and Python compilation checks passed.

Headless Chromium with installed Playwright: **11/11 scenario groups**, zero
page errors, in an isolated HTTP fixture:

- Input writes the source before blur; draw/move writes the current widget
  value while a pointer is held (the fixture calls `serializeValue`, never queues).
- Two same-color boxes; select/move; all four resize corners using real pointer
  events; text type and separate rendering string.
- Read-only save, configure/reload, duplicate isolation and simulated tab return.
- Resolution change and undo/redo through a mock graph transaction history.
- Blank reload, delete/undo, JSON file import and fresh final output.
- Rejection of a dimension that the native latent would truncate, keeping the
  saved state intact; reload during a drag cannot overwrite the restored state.
- Copy action, node cleanup and screenshot (`tests/artifacts/isolated-editor.png`).

The fixture's own browser and temporary HTTP server close in `finally`; they do
not connect to ComfyUI. The screenshot expands the fixture's scroll area for
inspection; it is not a screenshot of the real node renderer.

## Not exercised / next check

- ComfyUI restart and live registration; no server lifecycle action was taken.
- Actual legacy LiteGraph and Vue rendering, real workflow JSON load/clone,
  tab manager, graph Undo/Redo and latest prompt submission.
- Actual PNG/WebP drag/drop restoration in ComfyUI, including the user's chosen
  save node preserving workflow metadata.
- Subgraphs, promoted widgets, other frontend versions and mobile browsers.
- GPU generation or any claim of improved placement/quality.

After the user finishes current work, restart through the normal ComfyUI-Q
launcher, refresh the frontend, and open the new sample in a new workflow tab.
Confirm the pending UI/metadata/history checks there before deciding to queue.
No queue submission, process stop, model changes, existing-workflow overwrite,
publication, push, Release or Registry operation was performed for this task.


## 2026-10-21 — Internal export optimization

Reviewed the installed native MOSS layout converter. Direct delegation would add
normalized-1000 rounding, strip summary whitespace, and change retained output
semantics, so the raw-pixel path and current UI remain in place. The builder now
shares position-word analysis per scene/color card, computes each position hint
once, builds caption text in the existing traversal, and selects the output before
constructing hybrid text. No new runtime dependency is introduced.

CPU acceptance: 31 Python tests passed (including the installed official MOSS
converter comparison), 8 JavaScript tests passed, and 8 bridge tests passed in the
ComfyUI_test installation. 2,000 before/after result-dictionary comparisons matched
exactly, including prompt, moss_json, natural text, dimensions and warning order.
All 8 previously GPU-tested prompts are byte-identical. Existing sample workflows,
all web UI files, node definitions, core and Krea2 files remain unchanged.

On the saved 3-box person and 4-box graphic inputs, median CPU assembly times
changed from 105.50 to 67.39 us and 104.34 to 80.59 us respectively. These are local
microbenchmarks, not GPU-generation timing improvements. No GPU job or restart
was performed for this optimization; an already running ComfyUI instance will
load the new Python code on its next normal restart. No commit or push was made.
