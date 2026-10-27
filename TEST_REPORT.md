# Release 1.0.11 validation — 2026-10-28

- Original MOSS BBOX only. Comic files and the separate JP Assist extension are not part of this release.
- JavaScript **117 passed**; Python **71 passed, 0 skipped**, including the pinned official MOSS reference and published workflow compatibility.
- Isolated real-ComfyUI frontend checks cover seven colors, connected/standalone geometry and typography, three Types, English/Japanese, fixed menus, literal wording, manual-size persistence and workflow reload. No unexpected page errors.
- Existing standalone DOM fixture passes for color palettes, editable JSON, nine ID cards, Undo/Redo, duplication, deletion restore and node-size persistence.
- Current Template / Standard / DMD CPU outputs are identical before and after the uniform UI dimension update. Templates retain their example words and generation settings. Newly created UI nodes have empty prompt fields and Export lettering descriptions.
- Public 1.0.10 inputs remain the compatibility baseline. New Focus widgets append after the existing 31 positional inputs; old 23/31-widget workflows restore Auto.
- No new GPU generation or user-managed process restart is performed during publication. These checks do not establish generation quality, literal glyph accuracy or Registry activation.
- GitHub push CI runs tests, Ruff and tracked-source packaging. Explicit `[github-release]` commits publish a GitHub Release only after those checks succeed. Registry publication remains separately opt-in.
