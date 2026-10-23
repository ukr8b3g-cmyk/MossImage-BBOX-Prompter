# v1.0.8 release validation (2026-10-23)

- Version and bilingual release/workflow links updated to 1.0.8. This release
  packages the tested arrangement, per-Text styles and both color pickers.
  Previous main 4e70361 passed public CI: Python 51, JavaScript 40, Ruff,
  syntax and exact source ZIP (44 files). The release commit is checked again
  by the same workflow before Registry publication.
- Standard/DMD JSONs and ComfyUI_00238_.webp are byte-identical to v1.0.7.
  Both workflows remain available as separate Release assets, plus a ZIP with
  the two JSONs and reference image. Prior Release tags/assets are preserved.
- Node IDs, input/socket contracts and saved widget order remain unchanged.
  This release preparation adds no GPU generation or live ComfyUI operation.
  Registry upload, API/CDN availability and moderation are checked separately;
  successful publication does not imply Active moderation or a Manager install.

# Main update verification: arrangement, Text styles and color pickers (2026-10-23)

- Scope: six alignment modes, horizontal/vertical equal gaps, per-color Text
  appearance and free/preset color pickers. Existing node IDs, sockets, widget
  order, workflow examples and version 1.0.7 remain unchanged. These additions
  are on main for the next release; Registry publication is a separate step.
- Final local Python CPU run: **51 passed, 0 skipped**, including saved-workflow
  output compatibility against the pre-style snapshot and official ComfyUI
  coordinate-reference checks. JavaScript: **40 passed, 0 skipped**.
- Final isolated Canvas fixture passed all eight arrangement actions, lock
  guards, Snap independence, one-edit Undo/Redo, no-op history, stable layout
  and save/reload, plus the previous Canvas regression checks. Prompter fixture
  passed per-Text settings, both color inputs, 256-cell preset selection,
  exact text and save/clone/reload checks. These fixtures use CPU Chromium,
  not a running ComfyUI service, and reported no page errors.
- The user separately reported successful operation of arrangement and the
  color-palette UI. No new live ComfyUI operation or GPU generation was done
  during publication preparation. No extra dependencies or workflow changes.
- CI on main checks Python, JavaScript, syntax, Ruff S102/E702 and source ZIP
  contents. Push does not publish to Registry: publishing requires an explicit
  workflow_dispatch with publish=true. The CI result is reported with its run
  link after this commit is pushed; it is not inferred from these local checks.
- The first push (4b7a2cc) stopped at Ruff before tests: two new Python test
  lines used semicolons (E702). Split the statements onto separate lines without
  changing assertions or runtime behavior, then reran Python's 51 tests and CI.

The detailed implementation-stage records below are historical local results.

# Local / unreleased: preset color grid (2026-10-23)

- Kept the free/native picker and added a separate compact grid button. Its
  top-layer popup contains 256 presets in 16 columns × 16 rows of 16px squares.
  No new persisted fields or dependencies. A choice uses the existing color
  string; opening/dismissing does not change it or resize the node. Escape,
  outside click, the close button and shared/non-Text mode close the popup.
- Isolated CPU Chromium: preset click/save and picker synchronization, selected
  swatch, unchanged color after dismiss, exact cell/grid dimensions, Japanese
  help, shared-mode close, and clipping/viewport bounds at 67% graph-like scale
  passed. All earlier Prompter save/clone/reload and legacy checks passed with
  zero page errors. This is an isolated renderer result, not live ComfyUI.
- JavaScript regression: 40 passed, 0 skipped; changed JS syntax passed.
  Python/backend and sample workflows unchanged; Python was not rerun.
- Snapshot/hash verification precedes local ComfyUI_test file deployment.
  Browser refresh needed. No GPU generation, restart, commit/push or publication.

Evidence: preset-palette-local.json, three-types-browser.json,
text-color-presets.jpg in the existing artifacts folder.

# Local / unreleased: Text color palette (2026-10-23)

- Added a compact native color picker beside the existing Text color input.
  Picking writes HEX into the existing color string; manual color names, HEX,
  descriptive wording and an empty value remain supported. No extra saved fields,
  node IDs, inputs, widget ordering or workflow edits. Shared mode stays default.
- Isolated CPU Chromium fixture passed palette-to-text/save, manual name and
  short-HEX swatch updates, unrecognized descriptions, clearing, clone/reload,
  shared-mode hiding, stable row height and Japanese hover. All prior Prompter
  fixture checks passed with no page errors. The native OS picker dialog itself
  was not operated; the browser color input's events and saved values were tested.
- JavaScript regression: **40 passed, 0 skipped**. Changed modules and fixture
  syntax passed. No Python code changed; the earlier 51-test Python result below
  was not rerun for this frontend-only change. Test service stopped afterward.
- Source/runtime targets were hash-matched and snapshotted before editing.
  Local ComfyUI_test files updated; browser refresh required. No live ComfyUI
  operation, GPU generation, restart, commit, push or Registry publication.

Evidence: text-color-palette-local.json, three-types-browser.json and
text-style-isolated.jpg in the existing local artifacts folder.

# Local / unreleased: per-color Text styles (2026-10-23)

- Text cards default to shared Export text_style. Individual mode exposes font
  family, weight, free-form color and extra appearance. Descriptions compile into
  each Text item's caption only in literal mode. Visible text remains separate
  and exact; legacy and non-Text output paths are unchanged. Blank individual
  settings intentionally omit appearance hints. No exact font rendering claimed.
- Preferences use slotValues.<color>.textStyle in the existing prompt_ui_data
  widget/UI snapshot. No required inputs, widget order, node IDs or sockets added.
  Previously validated alignment/distribution edits are retained, not published.
- Python: **51 passed, 0 skipped**, including original snapshot/workflow byte
  compatibility, exact Unicode/quotes/pipes/whitespace/newlines, shared fallback,
  unchanged legacy output across all output modes, per-color isolation, empty
  styles, all font/weight presets and malformed optional UI state.
- JavaScript regression: **40 passed, 0 skipped**. All web module syntax passed.
- Isolated Prompter browser fixture passed style defaults/visibility, each input,
  common/individual switching, Type toggling, save/clone/reload isolation, same-node
  old-workflow reset, exact wording and Japanese hover. Tests await the existing
  asynchronous Prompter hydration before checking restored controls. Raw Krea-like
  controls and unrelated nodes stayed unchanged. Canvas fixture also exercises
  prior locks, alignment/distribution, history and reference features.
- Browser-saved widgets were passed through actual Python Prompter -> Export:
  exact wording retained; caption was 'serif lettering, bold weight, lettering
  color: #FFD700, thin black outline'; shared style was excluded. CPU only.
- README files describe usage and literal/legacy behavior. Prior source and
  runtime files are snapshotted before local deployment. No GPU generation, live
  ComfyUI screen operation, restart, commit, push, version bump or publication.
  Backend plus frontend changed: user-managed restart and browser refresh needed.

Evidence in existing artifacts: text-style-local.json, text-style.diff,
text-style-browser-wire.json, text-style-wire-result.json, text-style-isolated.jpg
and three-types-browser.json. The previous alignment evidence is retained.

# Local / unreleased: alignment and equal-gap distribution (2026-10-23)

- Added a compact Align / Distribute menu beside X/Y/W/H and Lock. Six alignment
  actions use the selection's bounds; horizontal/vertical equal-gap distribution
  fixes endpoints and requires three boxes. Positions only; no new saved widgets,
  sockets, settings or workflow fields. Existing sample JSONs are byte-identical.
- Locked selections, hidden boxes, corrupt layouts and active pointer edits cannot
  be arranged. Snap does not modify the arrangement. Out-of-bounds results are not
  applied; overlaps may remain when space is insufficient. Each applied action is
  one Undo/Redo edit; repeat/no-op actions preserve history, including fractional
  coordinates. Selection and box order are retained.
- Python: **47 passed, 0 skipped**, with official ComfyUI and the pre-change
  snapshot supplied. Both workflows' export compatibility passed. No backend code
  was changed. JavaScript: **40 passed, 0 skipped** (four arrangement regressions).
  All web module syntax checks and the updated browser-test syntax passed.
- Full isolated CPU Chromium fixture passed previous Canvas/lock/reference tests
  and all eight arrangement actions. Verified selection-count gating, locks and
  unlock via Undo, exact placement with Snap ON, one-step Undo/Redo, no-op history,
  geometry/metadata preservation, save/reload and stable Canvas dimensions.
  Japanese/English hover coverage passed. A fixture lookup initially missed the
  menu because the entire precision row is intentionally hidden without selection;
  the test now locates the DOM control directly for that disabled-state assertion.
- After that browser run, sub-nanopixel corrections were treated as zero to avoid
  floating-point-only history entries; unit regressions for fractional repeat
  alignment/distribution passed. No live ComfyUI screen or GPU generation was run.
- README and README.ja explain the menu, selection basis, lock behavior and history.
  Source and ComfyUI_test package files are backed up before local deployment.
  No restart, commit, push, version bump, Release or Registry publication performed.
  Save the working workflow and refresh the browser to load the frontend changes.

Local evidence: `align-local.json`, `align-distribute.diff`,
`canvas-footer-checks.json`, `canvas-arrangement.jpg` in the existing artifacts folder.

# v1.0.7 release validation (2026-10-23)

The user confirmed operation of box locking and Canvas reference display in
ComfyUI, then supplied refreshed DMD and Standard workflows and a sample WebP.
This is user-confirmed live behavior; Codex did not repeat GPU generation.

- DMD input `MOSS_BBOX_DMD (2).json` is renamed `MOSS_BBOX_DMD.json`;
  LoRA ON, 8 steps, CFG 1. Standard input `MOSS_BBOX_DMD (3).json` is renamed
  `MOSS_BBOX_Standard.json`; LoRA OFF, 25 steps, CFG 2.5. Source bytes are preserved.
- Both use Canvas 880x1184, direct Load Image -> reference_image, reference OFF
  at 50%, connected BBOX Preview and WebP saving. Sample filename remains
  `ComfyUI_00238_.webp`. Upload/select it through Load Image after importing.
- `MOSS_BBOX_Workflows_1.0.7.zip` contains exactly those two JSONs and that WebP.
  ZIP CRC and all three extracted byte comparisons passed. Root/inner workflow
  JSON and root link endpoints were checked. Original attachments are preserved.
- README includes the supplied connection screenshot and a caption explaining
  display, opacity, explicit size matching, locks, input-file setup and the
  difference between Canvas reference display and image conditioning.
- Python regression: 47 passed with official ComfyUI and pre-change output
  references supplied. Fixture expectations now use the user's 880x1184 sample
  size; the 896x1184 node default is unchanged. JavaScript regression: 36 passed.
  The implementation's isolated browser and actual CPU tensor results are
  recorded below. No additional GPU run is claimed.
- GitHub push CI is the final syntax/Ruff/archive/test gate before Release.
  Registry publishing is not dispatched as part of this GitHub Release request.

## 1.0.6 release preparation

Version 1.0.6 packages multiple selection and group movement/duplication from
commit 1f13ed2497a61d15feedecf94316eeb425c02cb5. GitHub Actions run 39807192022
passed 45 Python and 34 JavaScript tests, syntax, Ruff S102/E702 and verification
of all 39 packed files. Isolated browser tests and the user's ComfyUI confirmation
are recorded below. This version bump changes only version and documentation;
the Standard/DMD workflow JSON files remain byte-identical to v1.0.5 and will
also be attached to the v1.0.6 Release. Fresh CI checks gate Registry publication.
No additional GPU or live ComfyUI test is claimed for this version update.

## 2026-10-23: multiple-selection publication and user confirmation

After local deployment, the user confirmed that the editing behavior worked in
their ComfyUI session. This is user-reported real-environment confirmation;
the agent's browser evidence is the isolated CPU fixture recorded below.
The publication includes group selection/movement/duplication, regression tests,
and English/Japanese operation guidance. Both workflow JSON files and version
1.0.5 remain unchanged. The push Action runs Python/JavaScript, syntax, Ruff and
archive checks; Registry publication and a new Release are excluded.
The following entry describes the preceding local implementation and tests.

## 2026-10-23: local multiple selection, group movement and duplication

With Draw Box OFF, Ctrl/Cmd-click toggles membership without changing box order
or adding an Undo entry. Dragging inside a selected box moves the selection;
Alt-drag duplicates it after the existing screen-pixel threshold. A common
translation clamps/snaps the combined bounds so relative spacing is preserved.
Selection is per Canvas, restored by Undo/Redo, and excluded from workflow data.
Numeric/corner edits select one box; arrow keys and Delete apply to the selection.
Escape clears selection or cancels a live edit. Existing UI rows and dimensions,
node IDs, sockets, widget order, backend and both workflow JSON files are unchanged.

Validation against the local v1.0.5 baseline:

- Python: 45 passed, zero failures/skips. JavaScript: 34 passed, zero failures/skips.
- JavaScript syntax checks passed for all web and test JS/MJS files.
- The full isolated, headless CPU Canvas fixture passed with no page errors:
  Ctrl and Meta selection, corner selection without accidental deletion,
  add/remove without clearing Redo, group moves/duplicates, shared boundary and
  snap behavior, exact arrow moves, fresh IDs and retained slot/text/label data,
  one-step Undo/Redo, selection restoration, Escape/pointer cancellation,
  group deletion versus individual corner X, numeric/corner single-box edits,
  Draw Box and hidden-box rules, stable layout, and save/configure round trips.
- Existing gesture, numeric, snapping, corrupt-layout and UI regressions passed.
  Hover-help checks found Japanese/English help on all 34 visible controls.
- Fixture service PID 34176, port 49904, stopped after the successful run;
  `http_listening=false`. Earlier failed runs also closed their services.

Evidence: local `canvas-footer-checks.json` (`multi_*` flags) and
`canvas-multi-selection.jpg`. This is isolated browser evidence, not a new live
ComfyUI UI or GPU test. Source and ComfyUI_test receive the seven changed
frontend/test/documentation files only. No restart, generation, commit, push,
version bump, Release or Registry publication is part of this local change.

## 1.0.5 release preparation

Version 1.0.5 packages the Alt-drag duplication, Shift-corner aspect lock and
Draw Box ON/OFF fix already tested in commit 317d06f5f8d36dc3aef59835dbbb452e6be7186a.
That commit passed GitHub Actions run 39798590429: 45 Python and 31 JavaScript
tests, syntax, Ruff S102/E702 and byte-for-byte verification of 39 archive files.
This release preparation changes only version and documentation; both workflow
JSON files are unchanged from v1.0.4 and are intended as v1.0.5 Release assets.
A fresh CI run gates Registry publication. No new GPU or live ComfyUI test is
claimed for the version bump. Earlier local and user-confirmed results follow.

## 2026-10-22: gesture publication preparation and user confirmation

The user reported that the Draw Box fix and editing behavior worked in their
ComfyUI session after local deployment. This is user-reported confirmation;
the agent's own browser evidence remains the isolated fixture described below.
This commit includes Alt-drag duplication, Shift-corner aspect preservation,
the Draw Box ON/OFF fix, their regression tests and English/Japanese guidance.
The two bundled workflows, backend code, version (1.0.4) and publication Action
are unchanged. Registry publication and a new Release are excluded from this
push; the existing push Action runs unit, syntax, warning and archive checks.
The earlier entries record checks performed before this publication step.

## 2026-10-22: Draw Box toggle regression fix (local, unreleased)

The Draw Box click handler unconditionally set `drawMode=true`; it could never
switch OFF. This was an implementation defect, not an incorrect user operation.
The isolated browser test reproduced the failure when loading a workflow with
`drawMode:true` (expected false after clicking, actual true). The handler now
toggles the existing flag and primary highlight, preserving the saved format.
English/Japanese help and README explain ON/OFF and returning to selection.

After the fix, all 31 JavaScript unit tests and modified-file syntax checks
passed. The full isolated Canvas browser fixture passed, including saved ON/OFF
restoration, visual highlight, existing-box move without drawing another box,
Shift resizing and Alt duplication after switching OFF. Mode-only toggles
preserve Undo/Redo. Existing gesture, snap, stable-layout and corrupt-data tests
also passed. Python/backend code was unchanged; the prior 45-test result in the following Alt/Shift entry
is not a fresh Python rerun for this one-line frontend fix.

Evidence: local `canvas-footer-checks.json` flags `draw_mode_toggle`,
`draw_mode_saved_on_off`, `draw_toggle_preserves_history` and
`draw_toggle_restores_existing_editing`. The fixture service stopped after the
successful run (PID 50440, port 56010, `http_listening=false`). No live ComfyUI UI
operation, GPU generation, restart, commit, push or publication was performed.

## 2026-10-22: local Alt-duplicate / Shift-aspect editing (unreleased)

Implemented Alt-drag duplication after a 4-screen-pixel movement threshold while
retaining Alt-click overlap cycling. A selected containing box takes priority
over a covered front box. Copies retain slot/content with collision-checked IDs;
the original geometry and order stay unchanged. Shift-corner resize preserves
the pointerdown ratio and opposite anchor, bounds both axes with one scale and
overrides guide snapping. Shift at the top-right corner enables resize instead
of delete. Numeric/arrow edits and new-box drawing retain their prior behavior.
No controls, saved options, node IDs or sockets were added.

- Python: **45 passed, zero skips**, including the saved-workflow output
  comparison against the pre-change 1.0.4 snapshot.
- JavaScript: **31 passed, zero skips**, including four new aspect geometry tests.
- Modified JavaScript and the browser fixture passed syntax checks.
- Isolated Chromium Canvas fixture passed real pointer-event tests for Alt-click,
  sub-threshold movement, selected covered-box duplication, independent IDs,
  original preservation, bounds, guide snap, hidden boxes, one-edit Undo/Redo,
  cancellation and save/reload. All four Shift resize corners passed ratio,
  fixed-anchor and boundary checks; releasing Shift restored free resize.
  Numeric inputs, Shift-arrow nudging and Shift drawing stayed unchanged.
- Existing fixture checks passed for fixed layout dimensions, history, corrupt
  original retention and Japanese/English hover coverage (34 controls).
- Both bundled generation workflows and pyproject version remain byte-identical
  to the pre-change snapshot. UI help and README explain the new gestures.

Browser evidence: `canvas-footer-checks.json`, `canvas-duplicate-ratio.jpg` in the
local artifacts folder. The isolated test service (PID 28808, port 63317) stopped
after testing (`http_listening=false`). This is fixture/CPU evidence, not a live
ComfyUI screen or GPU run. No commit, push, Release or Registry publication was
performed for these local changes.

## 2026-10-22: maintainer workflow replacement (CPU/static)

Replaced only the two generation templates with the supplied Standard and DMD files, preserving their bytes under normalized filenames. Both include MOSS BBOX Preview connected to generation IMAGE and Canvas framing_data, alongside Save Animated WEBP (quality 80). Standard: LoRA disabled, 25 steps / CFG 2.5; DMD: LoRA enabled at 0.7, 8 steps / CFG 1.

JSON parsing and root link/input/output consistency passed for both. The Civitai ZIP contains exactly these same two files. All 27 JavaScript tests also passed. All 45 Python regression tests passed, including saved-state Type consistency, Preview coordinates and pre-change output comparison. This replacement was not GPU-generated or tested in a live ComfyUI screen in this check. README now links current and archived workflows and explains the preconnected Preview. Registry publication is excluded.

# Validation record — updated 2026-10-22

## Publication preparation and user display confirmation — 2026-10-22

The user reported that the display was working after the localized help,
Preview zoom visibility and fixed coordinate-row changes. This is **user-reported
visual confirmation**, separate from the agent's isolated tests below. The agent
did not resume the cancelled live ComfyUI check or submit GPU generation.

The current Standard/DMD workflow Git blob hashes match their v1.0.0 release-tag
versions (`218acac4e0b413add16ba2b0756dc69a5c402182` and
`0492df34285a1d109e3717f884bdf8f11f156177`). Replacement workflow files are pending
from the user. README now provides release-specific download links and records
the policy to attach both templates to future GitHub Releases while preserving
historical assets. No workflow, version number or Registry publication setting
was changed for this source commit.

## Unreleased: stable Canvas layout for coordinate controls — 2026-10-22

The X/Y/W/H row now reserves its layout space while no box is selected. Controls
use `visibility: hidden` rather than removing the row with `display: none`.
Selecting or drawing a box reveals the controls without changing the drawing
area or footer geometry. This also avoids shifting the canvas during a gesture.
No node size, saved widget order or workflow data was changed.

The isolated Chrome fixture measured the row, monitor, drawing overlay and
footer relative to the node. Their positions and dimensions were identical
before/after selection, Show Boxes toggles, deletion/Undo and drawing/Undo.
The existing precise input, arrow keys, Undo/Redo, snapping, corrupt-state
preservation, responsive footer and save/reload checks also passed with zero
page errors. JavaScript unit tests: **27 passed**. These were isolated tests,
not operations on the user's running ComfyUI or GPU generation.

## Unreleased: keep Preview visible when zooming out — 2026-10-22

The user's screenshot showed the ordinary saved-image preview remaining visible
while the MOSS Preview became blank on graph zoom-out. The installed ComfyUI
frontend defaults DOM widgets to `hideOnZoom: true` and hides them at low zoom.
MOSS Preview had inherited that default; it now explicitly uses `hideOnZoom: false`,
as the existing MOSS Canvas and ComfyUI's built-in image viewer do. Image pixels,
box settings, connections and workflow serialization are unchanged.

A regression check executes the actual extension registration and verifies the
override against ComfyUI's default. JavaScript tests: **27 passed**. No backend
or generation code was changed. The requested live check was cancelled by the
user, who will check the display. No live zoom success is claimed, no generation
was submitted, and no commit, push or Registry publication was performed.

## Unreleased: localized hover help and Preview setup instructions — 2026-10-22

Added ComfyUI-language-aware Japanese/English hover explanations for the current
Canvas, Prompter, Export and Preview controls. The ComfyUI `Comfy.Locale` setting
controls help independently of saved node label preferences. Export help explains
that `auto_position_hint` adds position prose, not automatic placement, and has no
effect on JSON-only output. Preview's empty state and README now explain exactly
which outputs connect to its two inputs, where the image appears, how to retain
the save connection, and how to inspect a saved image without regeneration.
Neither bundled workflow JSON was changed; Preview remains an optional addition.

Local validation (not GitHub CI or a new GPU test):

- Python: **45 passed, no failures or skips**, with the installed official MOSS
  reference and the pre-edit 1.0.3 source snapshot supplied. Bundled workflow
  prompt/JSON/dimensions match the pre-edit implementation byte for byte.
- JavaScript: **26 passed**, including bilingual help coverage, live locale changes
  on native widget tooltips, preserved callback return values, unchanged widget
  values and exclusion of unrelated node types.
- Isolated Chrome fixtures: Canvas **30** visible controls and Prompter **14**
  initially visible controls had Japanese pointer-hover and English focus help;
  no widget values changed. Preview controls also passed both languages and its
  Japanese empty-state connection guidance was checked.
- Existing Canvas history, overlap selection, precise numeric/arrow edits,
  snapping, malformed-layout preservation and save/reload tests passed. Prompter
  type/literal-text restoration and Preview ON/OFF, opacity, next-result state,
  batching, scaling and save/reload passed, with no browser page errors.

These are CPU and isolated browser checks. The user's open ComfyUI workflow was
not reloaded or modified, and no prompt was queued. No commit, push, version bump
or Registry publication is part of this change.

## Version 1.0.3 Registry package — 2026-10-22

Version 1.0.3 packages the optional BBOX image preview committed in
`0ef65e5c6fa3683b542df2cdb9298a7b51497248`. That commit passed GitHub Actions
run `39761785465`: 45 Python tests, 24 JavaScript tests, syntax and Ruff checks,
and exact verification of all 37 archive files. The version bump changes only
package metadata and documentation; implementation and examples are unchanged.

The live ComfyUI_test checks below cover existing-image preview controls,
Save As / reload and both unchanged templates. These checks did not generate
new GPU images. Publication uses the existing manual workflow, which repeats
all CI gates and refuses to overwrite an existing Registry version. API/CDN
availability and Pending/Active review state are verified separately after upload.

## Version 1.0.2 Registry package — 2026-10-22

Version 1.0.2 packages the precise BBOX inputs, arrow movement and optional
center/thirds snapping already committed and validated in
`1bfe0f578c1793d705c359c4d7287020f06f72a7`. This version update changes only
package metadata and release documentation; runtime code and the two bundled
workflows retain the tested behavior. Earlier sections below record the version
at the time of each test, before this packaging update.

The source CI passed Python 38, JavaScript 22, syntax/Ruff and 30-file archive
checks. Both Standard and DMD workflows also passed the recorded real-ComfyUI
editing, Undo/Redo, Export/import and server Save As/fresh-session reload checks.
The publishing workflow reruns source checks before upload. No new GPU inference
is part of this version update.

## Actual ComfyUI guide snapping — 2026-10-22

Both bundled Standard and DMD workflows passed real ComfyUI_test frontend checks
at `http://127.0.0.9:8188` in isolated Chrome sessions. The title BBOX was selected
and prepared through the visible numeric inputs; actual pointer events then
verified OFF without attraction, ON with center and thirds alignment during both
movement and corner resizing. Movement preserved size. Toggling Snap changed
neither geometry nor Redo availability. Undo/Redo restored each complete drag.

With Snap ON, X=447.5 and width=170.5 remained exact, arrow-right moved 1px,
and Shift+arrow-down moved 10px. Ctrl+Z/Ctrl+Y restored those edits. Other boxes
and the two original workflow files were unchanged.

Workflow actions > Export retained edited geometry in both widgets_values and
saved state. Importing the exported JSON restored the geometry and numeric
controls, returned Snap to OFF, cleared session history and allowed a new
edit/Undo cycle. Workflow actions > Save As also passed for each workflow
(POST 200), with exact stored layouts in server JSON. Fresh browser sessions
reopened both entries through the Workflows sidebar (GET 200), preserving
geometry and returning Snap to OFF.

Prompt requests: 0. Page errors: 0. Queues remained empty. The two uniquely named
temporary server workflows were removed (DELETE 204 / GET 404); owned browsers
were closed. These validation runs made no generation requests or service
changes; commit/push and publication are tracked separately. Results and
screenshots are retained in the existing local validation artifacts directory.

## Unreleased guide snapping — 2026-10-22

Implemented optional center/thirds snapping for pointer movement and resizing.
The new checkbox is OFF on creation, workflow restore and Reset; no widget or
layout schema field is added. The existing nine Canvas widgets, node IDs,
sockets, example workflow files and version 1.0.1 remain unchanged.

- Python: 38 passed, no skips (installed ComfyUI reference and pre-change snapshot).
- JavaScript: 22 passed, no failures/skips; five new helper tests cover nearest
  edge/center selection, fractional thirds, separate axis tolerances, all four
  resize corners, bounds, distant targets, zero-size rejection and immutability.
- All 11 JavaScript source/test files passed syntax checking.
- Isolated Chrome Canvas fixture: passed real pointer/input/keyboard operations
  for default-OFF movement, center snapping, thirds resizing, single-drag
  Undo/Redo, toggle preserving geometry/Redo, reload preserving snapped geometry
  while returning OFF, and exact numeric/fractional and arrow edits while ON.
- Narrow zoom and 4px/9px proximity cases confirm the 6 displayed-pixel threshold,
  including Grid Off. Pointer cancellation restores pre-drag geometry. Japanese
  label and Reset behavior also pass. Existing precision, overlap, history,
  corrupt-layout recovery and responsive footer checks pass; page errors: 0.

The first-drag check exposed the numeric row shifting the Canvas when selection
started. Revealing that row after pointer completion now keeps the guide/pointer
coordinates stable during the drag. This is covered by starting the snap test
with no box selected.

These initial checks used CPU and isolated browsers. Subsequent real-ComfyUI
verification is recorded above; GPU inference remains untested for this change.
Test-owned browser and HTTP server were closed (listener false). Registry
publication is separate from this change.

## Actual ComfyUI precision editing — 2026-10-22

Both bundled Standard and DMD workflows passed real ComfyUI_test frontend checks
at `http://127.0.0.9:8188` in isolated Chrome sessions. The existing title BBOX was
selected with the pointer, then X/Y/W/H were changed through the visible inputs.
Four numeric changes could be undone and redone. All four arrow directions,
1px and Shift+10px movement, Ctrl+Z/Ctrl+Y and fractional X=130.5 were verified
against the actual node state. Other boxes and the source workflow files stayed
unchanged. Screenshots confirmed the compact dark numeric row in the real UI.

Workflow actions > Export produced JSON with the edited geometry in both
widgets_values and saved state. Importing that JSON restored all coordinates
and numeric controls, reset session history, and allowed a new edit/Undo cycle.
Both workflows also passed Workflow actions > Save As (HTTP 200), server JSON
inspection, and reopening from the Workflows sidebar in fresh browser sessions
(GET 200). The exact serialized layouts survived both server round trips.

Prompt requests: 0. Page errors: 0. Queues were empty before/after. The two
uniquely named temporary server workflows were deleted and confirmed absent
(DELETE 204, GET 404); test-owned browsers were closed. These validation runs made no generation
requests or service changes; commit/push and publication are tracked separately.

## Unreleased precision editing — 2026-10-22

Added selected-box X/Y/W/H inputs and 1px / Shift+10px keyboard movement.
Python: 38 passed, no skips (installed ComfyUI reference and pre-change snapshot).
JavaScript unit tests: 17 passed. The isolated Chrome Canvas fixture exercises
real input/pointer/keyboard events, numeric edits, Undo/Redo, all four arrow keys,
modifier/input isolation, invalid/empty sizes, boundary clamping and boundary
no-op history, serialized geometry and reload with the original nine widgets.
Existing overlap selection, pointer cancellation, external dimensions, responsive
footer and corrupt-layout preservation/recovery checks also pass.

These are CPU/isolated-browser checks, not a new real-ComfyUI or GPU run.
The fixture closes its own browser and HTTP server. Package version remains
1.0.1; Registry publication is separate from this change.

## Version 1.0.1 Registry package — 2026-10-22

Version 1.0.1 packages the damaged-layout recovery fix and verification records
from commit `c3e44b92427fcd96548638cb718c1f82a2ff13f2`. Only the package version
and release documentation change in this update; runtime code, UI, node IDs,
sockets and the two bundled workflows remain unchanged. The checks below were
completed before packaging. GitHub Actions reruns the Python, JavaScript,
syntax, Ruff and archive checks before Registry publication.

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
# Unreleased BBOX preview — 2026-10-22 local validation

Added the separate `MOSSBBoxPreview` output node. It accepts IMAGE and the
existing Canvas framing socket, returns the identical IMAGE object, and sends
temporary WebP thumbnails plus an execution-specific layout to a browser-only
SVG overlay. No model or generation code was changed. Version remains 1.0.2;
these changes have not been committed, pushed or published to Registry.

- Python unittest: **45 passed**, 0 failures/skips (38 existing + 7 preview).
  Includes both existing workflow Canvas outputs, registration/socket contract,
  empty/reversed/fractional boxes, invalid layout rejection, actual WebP batch
  files, unique execution filenames and thumbnail sizing without output resizing.
- JavaScript unit tests: **24 passed**, 0 failures/skips (22 existing + 2 preview).
- `tests/preview_tensor_cpu.py`: actual CPU torch tensors, batches of 2 with
  1/3/4 channels, including values outside 0–1. Output object identity and every
  input pixel are preserved. Preview conversion matches expected clipping;
  WebP files decode correctly. CUDA was not initialized; temporary files removed.
- `tests/preview_ui_browser.mjs`: isolated headless Chrome, synthetic image.
  Real checkbox/slider clicks confirm immediate ON/OFF and opacity with zero
  additional requests. OFF survives the next execution and JSON save/reload.
  Checks cover batch navigation, coordinate scaling, reversed/fractional boxes,
  complete portrait fit, node resizing, execution snapshot isolation, late-image
  race protection, missing temporary image feedback, empty boxes, removal cleanup
  and preservation of pre-existing node hooks. Zero page errors.
- Existing `tests/canvas_ui_browser.mjs` passed, including Undo/Redo, overlapping
  box selection, numeric/arrow editing, Snap, save/reload and corrupt-layout
  preservation. Both fixture servers and owned browsers stopped after completion.
- JavaScript syntax checks passed. Local Ruff is unavailable in the test venv;
  its existing CI gate remains configured. CI now also runs `preview.test.mjs`.

Evidence is under `D:\Codex\temp\moss-canvas-editing\artifacts`:
`bbox-preview-checks.json`, `bbox-preview-on.jpg`, `bbox-preview-off.jpg`, and
the existing Canvas fixture report. Browser fixture images are synthetic CPU
test material, not new MOSS generations.

No live ComfyUI UI test, GPU generation, restart, GitHub CI run or publication
was performed for this change. Existing examples and Canvas/Prompter source are
byte-identical to the published 1.0.2 baseline.

## BBOX preview: actual ComfyUI_test UI — 2026-10-22

After the user restarted ComfyUI_test, the live endpoint at
`http://127.0.0.9:8188` registered `MOSSBBoxPreview`. An isolated Chrome session
loaded a dedicated three-node workflow: a copy of the Standard example's Canvas,
Load Image, and MOSS BBOX Preview. The existing input WebP was
`comfy_krea2-Lcu_fp8_20260930003331_00001_.webp` (840×1256). This is a display and
persistence test using an existing image, not a MOSS placement-quality test.

- The actual backend completed two CPU-only preview requests successfully.
  Submitted node types were restricted to `LoadImage`, `MOSSSharedCanvas` and
  `MOSSBBoxPreview`; no model, encoder, VAE or sampler nodes were present.
- The live preview displayed all three Canvas boxes, with the 896×1184 layout
  scaled over the full existing image. ON/OFF worked immediately; opacity values
  0%, 35% and 100% were checked. These controls made no additional prompt requests
  and kept the same image URL.
- Actual UI Export saved `showBoxes: false` and `opacity: 0.35`. Importing that
  JSON restored both controls.
- Actual **Save As** returned HTTP 200. Reading the server-side JSON confirmed
  the same properties. A fresh Chrome browser context loaded it through the
  Workflows sidebar (HTTP 200) and restored OFF / 35% before execution.
- A second CPU preview execution retained OFF / 35%; turning ON afterward worked.
  The returned layout matched the first execution. There were zero page errors.
- Original input-image SHA-256 and the bundled Standard workflow SHA-256 were
  unchanged. Queues were empty before and after. The one uniquely named temporary
  server workflow was removed (DELETE 204, subsequent GET 404); the owned Chrome
  sessions were closed. No user-managed service was stopped or restarted.

Local evidence: `artifacts/live-preview-checks.json`,
`live-preview-{on,opacity,off,reloaded}.jpg`, `live-preview-exported.json` and
`live-preview-server-saved.json`, under the existing moss-canvas-editing work
directory. The test driver is `live_preview_check.mjs` in that directory.

No implementation changes were needed. No GPU generation, commit, push,
GitHub CI run or Registry publication was performed in this validation phase.

## Preview addition: unchanged template compatibility — 2026-10-22

Both `examples/MOSS_BBOX_Standard.json` and `examples/MOSS_BBOX_DMD.json` were
opened unchanged in fresh Chrome contexts against the restarted ComfyUI_test.
Both retained a valid Canvas, identical box coordinates and Character / Object /
Text settings. The live frontend converted each to a 13-node execution graph
with no page errors or missing registered classes. Saved scalar combo choices,
including model selections, were available in the live node definitions.
Both kept `SaveAnimatedWEBP` as the output and require no new preview node.

The additional preview is optional: users can keep either template unchanged,
or add MOSS BBOX Preview and branch the decoded IMAGE and Canvas framing_data to
it. Existing prompt construction and WebP save connections need no replacement.

The check blocked all prompt submissions; there were zero submissions and empty
queues before/after. Both original files stayed byte-identical. This confirms
live loading, configuration and execution-graph conversion, not a new GPU run.
Evidence: `artifacts/preview-template-checks.json` and
`preview-template-{Standard,DMD}.jpg` in the existing local work directory.

# Local validation: box locks and Canvas reference image (2026-10-23)

Baseline: published v1.0.6 / `a421de1ab41288c427eddf23d481b2d5c32d4d76`.
Local changes only; version remains 1.0.6. No commit, push, Release or Registry
publication was performed for this implementation.

- Python regression: **47 passed, 0 failed, 0 skipped**, with `COMFYUI_ROOT`
  and the pre-change snapshot supplied. Existing Standard/DMD output comparison
  is byte-for-byte equal; required widget order, output socket, and old optional
  width/height socket order are unchanged. `reference_image` is appended as an
  optional IMAGE input. Existing workflow JSON files are unchanged.
- JavaScript unit regression: **36 passed, 0 failed, 0 skipped**. History now
  records box locking; absent/false locks remain equivalent. Reference geometry
  contains rather than crops/stretches, and direct file lookup uses Load Image's
  IMAGE output only. Python (11 files) and web JavaScript (11 files) syntax passed.
  Ruff was not rerun locally because this Python environment has no Ruff module;
  no new dependency was installed.
- Isolated Chromium fixture: all previous Canvas checks and new lock/reference
  checks passed. Locked boxes reject drag, resize, numeric edits and deletion;
  mixed groups reject translation/Alt-duplication; Delete preserves locked members.
  Unlock, keyboard/toolbar Undo/Redo, workflow reload and stable selection-row
  dimensions passed. Locked state is saved, selection remains session-only.
- Reference display starts OFF at 50% opacity. Direct Load Image loading made
  **zero queue calls**. Pixel checks verified opacity and letterboxing; ON/OFF
  and loading did not change Canvas dimensions or boxes. Explicit fit scaled
  boxes; Undo/Redo restored size/geometry. Odd 641x479 input fitted to 640x480.
  Display preferences reloaded; missing/disconnected files cleared the underlay.
  External dimensions and corrupt layout disabled fit. Corrupt original text
  survived reference toggles/save. Non-Load Image execution payload was tested.
- Actual CPU torch/Pillow check: grayscale/RGB/RGBA two-image batches preserved
  input tensors and produced a first-image WebP reference; CUDA was not initialized.
- New help controls passed Japanese/English hover coverage. README includes
  direct wiring, no-generation usage, first-image behavior, missing-file limits,
  native size rounding, lock exceptions and the backend restart requirement.
- The fixture's first pass detected a two-pixel row shift from the lock icon.
  Fixed the button's height/width; full fixture passed afterward. Every fixture
  service was stopped; process and listening-port checks found none remaining.

Implementation files are copied to the ComfyUI_test custom-node folder after
snapshotting its prior files. This is a file deployment, **not** a live UI result:
ComfyUI_test was not restarted or operated, and no GPU generation was run. A normal
server restart plus browser refresh is needed to register the new optional input.
The ComfyUI-Q installation and existing user workflows were not changed.

Evidence: `lock-reference.diff`, `lock-reference-local.json`,
`canvas-footer-checks.json`, `canvas-lock-reference.jpg` in the existing local
`moss-canvas-editing/artifacts` folder.

