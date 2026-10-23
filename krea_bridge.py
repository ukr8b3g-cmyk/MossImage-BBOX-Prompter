"""Convert compatible Canvas/Prompter wire data to MOSS layout input."""

import json

from . import canvas_controls as controls

from .prompt_builder import SLOTS, build_prompt, default_state

ELEMENT_TYPES = ("character", "object", "text")

FONT_DESCRIPTIONS = {"serif": "serif lettering", "sans": "sans-serif lettering",
    "rounded": "rounded sans-serif lettering", "script": "cursive script lettering",
    "handwritten": "handwritten lettering", "brush": "brush lettering",
    "blackletter": "blackletter lettering", "monospace": "monospaced lettering"}
WEIGHT_DESCRIPTIONS = {"light": "light weight", "regular": "regular weight", "bold": "bold weight"}


def individual_text_caption(style):
    """Editor presets become ordinary item captions, never model schema fields."""
    if not isinstance(style, dict) or style.get("mode") != "individual":
        return None
    parts = [FONT_DESCRIPTIONS.get(style.get("font"), ""),
             WEIGHT_DESCRIPTIONS.get(style.get("weight"), "")]
    for key in ("color", "extra"):
        value = style.get(key, "")
        if not isinstance(value, str):
            raise ValueError(f"Text style {key} must be a string")
        parts.append(("lettering color: " if key == "color" and value.strip() else "") + value.strip())
    return ", ".join(part for part in parts if part)


def element_type(value):
    if value == "obj":
        return "object"
    if value not in ELEMENT_TYPES:
        raise ValueError(f"MOSS Type must be character, object or text; got {value!r}")
    return value



def build_from_krea(framing_data, prompt_ui_data, auto_position_hint=False,
                    output_mode="hybrid", text_mode="legacy",
                    text_style="readable text with black outline"):
    if text_mode not in ("legacy", "literal"):
        raise ValueError(f"Unknown MOSS text mode: {text_mode!r}")
    if not isinstance(text_style, str):
        raise ValueError("MOSS text_style must be a string")
    framing = json.loads(framing_data)
    prompts = json.loads(prompt_ui_data)
    if framing.get("version") != "krea2_element_framing_v1":
        raise ValueError("Connect the MOSS BBOX Canvas framing_data output.")
    if prompts.get("version") != "krea2_element_prompt_ui_v1":
        raise ValueError("Connect the MOSS BBOX Prompter prompt_ui_data output.")
    state = default_state()
    state["width"], state["height"] = framing["width"], framing["height"]
    summary = [prompts.get("scene", ""), prompts.get("background", "")]
    camera = framing.get("camera", {})
    camera_text = ", ".join(f"{label} {camera[key]}" for key, label in (
        ("iso", "ISO"), ("shutter", "shutter speed"), ("aperture", "aperture"),
        ("focal_length", "focal length")) if camera.get(key))
    if camera_text:
        summary.append("Camera settings: " + camera_text + ".")
    state["prompt"] = "\n".join(part for part in summary if part)
    state["settings"]["auto_position"] = auto_position_hint
    metadata = {}
    for slot in SLOTS:
        data = prompts.get("slots", {}).get(slot, {})
        kind = element_type(data.get("type", "object"))
        content = controls._clean(data.get("prompt", ""))
        if kind == "text":
            if text_mode == "literal":
                text = data.get("literal_text", data.get("prompt", ""))
                if not isinstance(text, str):
                    raise ValueError(f"{slot} literal text must be a string")
                individual = individual_text_caption(data.get("text_style"))
                content, caption = text, text_style if individual is None else individual
            else:
                content = controls._strip_text_marker(content)
                text, caption = controls._split_visible_text_desc(content)
        else:
            text = ""
            caption = controls._append_framing_hint(content, data.get("framing", "Auto"))
            caption = controls._append_angle_hint(caption, data.get("angle", "Auto"))
        # Do not invent descriptions for empty, unused color cards.
        state["slots"][slot] = caption if content or kind != "text" else ""
        metadata[slot] = (kind, text)
    for index, source in enumerate(framing.get("layout", {}).get("boxes", [])):
        slot = source.get("slot")
        if slot not in SLOTS:
            raise ValueError(f"Unknown Canvas box color: {slot}")
        label, text = metadata[slot]
        state["boxes"].append({"id": str(index), "slot": slot, "label": label, "text": text,
                               **{key: source[key] for key in ("x1", "y1", "x2", "y2")}})
    used = {box["slot"] for box in state["boxes"]}
    caption_output = output_mode == "caption" or (output_mode == "auto" and not state["boxes"])
    if caption_output:
        for slot, (kind, text) in metadata.items():
            if slot not in used and kind == "text" and text:
                caption = state["slots"][slot]
                state["slots"][slot] = caption + ('\n' if caption else '') + '"' + text + '"'
    result = build_prompt(state, output_mode)
    if text_mode == "literal" and not caption_output:
        for slot, (kind, text) in metadata.items():
            if slot not in used and kind == "text" and text:
                result["warnings"].append(
                    f"{slot}: text has no box and is omitted; add a box or choose caption output.")
    return result
