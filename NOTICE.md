# Attribution

The MOSS Canvas and Prompter include an adapted subset of the Krea2 BBOX
Prompter Suite v1.0.2 Canvas/Prompter implementation, copyright 2026
ukr8b3g-cmyk, MIT License. The corresponding code is in `canvas_controls.py`
and `web/moss_controls.mjs`. It retains the input/state formats for saved
workflows, with MOSS-owned CSS, browser hooks and preset writes. Prompt Effect,
Background Effect, their preset catalogs, server APIs and debug tools are not
included. Krea2 does not need to be installed separately and its files are not
modified. The MIT copyright and permission notice are retained in `LICENSE`.

The five-color Canvas interaction and portions of the drawing, hit testing,
pointer movement and four-corner resize implementation are adapted from
**Krea2-BBOX-Prompter** by ukr8b3g-cmyk, MIT License, copyright 2026.
Source inspected locally at commit `98f3a29c28b95369cad6ba2a507a699f9a36a41b`.
The original MIT notice is retained in `LICENSE`.

The MOSS output field names and coordinate behavior follow the installed
ComfyUI-Q `comfy_extras/nodes_moss_image.py` at
`e087d8f6cb7c6cdb11b59dc7c9bf17c79f8d877d`.
`nodes_bounding_boxes.py` was also inspected for element/type conventions.
Core source is not bundled or modified. Its GPL-3.0 license is in the ComfyUI
checkout. This node uses an independent CPU-only builder and independent state.
