# Attribution

The current MOSS Canvas and Prompter delegate to the installed
Krea2-BBOX-Prompter Canvas and Prompter implementations. The MOSS export adapter also calls the installed
Krea2 text/framing/angle helpers; no Krea2 UI source is copied or modified.
This integration requires that installed package. The notes below concern
the earlier custom MOSS interface retained for existing workflows.

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
