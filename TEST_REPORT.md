# Release 2.0.0 validation — 2026-11-04

- JavaScript **128 passed**; Python **86 passed, 0 skipped**, including the pinned official MOSS reference and version-appropriate published workflow compatibility.
- Native ComfyUI UI checks cover Auto/explicit targets, subgraph promotion, system-prompt editing, Core sampling controls, parameter serialization and workflow reload. Existing text, Type, styles, editor sizes and shared-section behavior retain their owners. No unexpected page errors.
- Existing standalone DOM and external-text CPU fixtures pass, including two Exports, blank input, unlink/reconnect, per-Canvas identity, editable JSON, nine cards, Undo/Redo and blank workflows.
- The V2 workflow JSON and reference image are copied byte-for-byte from the supplied template ZIP. Node titles, wiring, saved text and generation settings are retained. Older workflow files remain unchanged; only the V2 workflow is included in the new workflow bundle.
- Old target/kind widget positions and default analysis settings remain compatible. Successful analysis saves through the existing Canvas editor; OFF enables manual editing, and Undo restores the prior body within the session.
- The user confirmed GPU operation of the supplied V2 workflow. Developer CPU/UI/forwarding checks and earlier fixed-default ON/OFF generation checks are distinct evidence. No additional GPU generation or user-managed process restart is performed during this publication step. These checks do not establish universal image quality, literal glyph accuracy or Registry activation.
- GitHub push CI runs tests, Ruff and tracked-source packaging. Explicit `[github-release]` commits publish a GitHub Release only after those checks succeed. Registry publication remains separately opt-in.

## Standalone GPU acceptance — 2026-10-21

Historical V1 acceptance covered Standard and DMD generation after restart on an RTX 5060 Ti, with workflow/API metadata matching the submitted generation settings. This is retained as historical evidence, not a new V2 GPU run.
