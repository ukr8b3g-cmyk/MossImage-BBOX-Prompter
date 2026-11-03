# Analysis safety corrections — 2026-11-04 (main after v2.0.0)

- Baseline: public f61d148 and the installed product files matched the supplied evidence. The three reported safety expectations failed against both the excerpts and the complete pre-fix card implementation. Empty Type was accepted by JS and rejected by Python. Passing old CI did not cover these cases.
- Automatic saves now require the real API execution prompt_id and a matching queued input snapshot. Changes to the image, target, body, coordinates, Type, Switch or analysis instructions permanently invalidate that request; OFF→ON, edit→Undo and restoring values cannot revive it. Core's automatic next-run sampling-seed advance remains allowed. Saves still use the existing Canvas/Undo owner. Unrequested or superseded results, and results arriving after an execution failure, cannot overwrite text.
- Text analysis is stopped before the model call, using per-box overrides or the actual queued downstream Prompter defaults. Shared Type participates in the native cache fingerprint, so cached Character analysis cannot bypass the Text guard. The frontend rechecks Type before saving. No automatic retargeting or Type conversion is added.
- Editable JSON rejects a present empty Type while preserving omitted Type and legacy obj. Ordinary external STRING-to-Text behavior remains supported.
- JavaScript **150 passed** and Python **96 passed, 0 skipped**, with the same pinned compatibility references as CI. Product source, callback-only native widget behavior, early HTTP/websocket races, Undo, new requests, cached requests and existing UI/state preservation are covered.
- An isolated Windows ComfyUI 0.43.0 / frontend 1.57.4 executed **11 integration cases** through actual product nodes, native promoted Switch mouse clicks, manual editing, queued prompt_id events, saved cards and Export. Delayed backend delivery reproduced the race conditions; individual/shared/cached Text targets stopped before the test kernel. No unexpected page exceptions.
- This integration test used real CPU crop tensors and a deterministic stub for the TE generation kernel and CLIP loader. It establishes the event/state and guard behavior, **not actual TE quality or GPU image generation**. No new GPU run was performed for this correction. The user's ComfyUI service was not restarted.

The product node schema only adds a standard hidden PROMPT dependency. Saved positional widgets, workflow titles, model/sampler behavior and prompt ownership are unchanged. GitHub main fixes and the original v2.0.0 release artifacts are separate; this correction does not replace that release.

## Original 2.0.0 publication validation — 2026-11-04

- JavaScript **128 passed**; Python **86 passed, 0 skipped**, including the pinned official MOSS reference and version-appropriate published workflow compatibility.
- Native ComfyUI UI checks cover Auto/explicit targets, subgraph promotion, system-prompt editing, Core sampling controls, parameter serialization and workflow reload. Existing text, Type, styles, editor sizes and shared-section behavior retain their owners. No unexpected page errors.
- Existing standalone DOM and external-text CPU fixtures pass, including two Exports, blank input, unlink/reconnect, per-Canvas identity, editable JSON, nine cards, Undo/Redo and blank workflows.
- The V2 workflow JSON and reference image are copied byte-for-byte from the supplied template ZIP. Node titles, wiring, saved text and generation settings are retained. Older workflow files remain unchanged; only the V2 workflow is included in the new workflow bundle.
- Old target/kind widget positions and default analysis settings remain compatible. Successful analysis saves through the existing Canvas editor; OFF enables manual editing, and Undo restores the prior body within the session.
- The user confirmed GPU operation of the supplied V2 workflow. Developer CPU/UI/forwarding checks and earlier fixed-default ON/OFF generation checks are distinct evidence. No additional GPU generation or user-managed process restart is performed during this publication step. These checks do not establish universal image quality, literal glyph accuracy or Registry activation.
- GitHub push CI runs tests, Ruff and tracked-source packaging. Explicit `[github-release]` commits publish a GitHub Release only after those checks succeed. Registry publication remains separately opt-in.

## Standalone GPU acceptance — 2026-10-21

Historical V1 acceptance covered Standard and DMD generation after restart on an RTX 5060 Ti, with workflow/API metadata matching the submitted generation settings. This is retained as historical evidence, not a new V2 GPU run.
