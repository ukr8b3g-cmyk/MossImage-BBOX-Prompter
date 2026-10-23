"""CPU-only MOSS prompt assembly. No ComfyUI, model or network imports."""

import json
import math
import re

SCHEMA_VERSION = "moss_bbox_v1"
SLOTS = ("red", "blue", "yellow", "green", "magenta", "cyan", "orange")
LABELS = ("character", "object", "text")
OUTPUT_MODES = ("hybrid", "caption", "layout_json", "auto")


def default_state():
    return {
        "schema_version": SCHEMA_VERSION,
        "prompt": "",
        "width": 896,
        "height": 1184,
        "slots": {slot: "" for slot in SLOTS},
        "boxes": [],
        "settings": {"auto_position": False, "active_slot": "red", "draw_mode": False, "selected_id": None},
    }


def _string(value, name):
    if not isinstance(value, str):
        raise ValueError(f"{name} must be a string")
    return value


def parse_state(value):
    source = json.loads(value) if isinstance(value, str) else value
    if not isinstance(source, dict) or source.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"Expected MOSS state schema_version={SCHEMA_VERSION}")
    state = default_state()
    state["prompt"] = _string(source.get("prompt", ""), "prompt")
    for key in ("width", "height"):
        size = source.get(key, state[key])
        # EmptyFlux2LatentImage uses size // 16; reject sizes it would silently truncate.
        if isinstance(size, bool) or not isinstance(size, int) or size <= 0 or size % 16:
            raise ValueError(f"{key} must be a positive multiple of 16 to match the MOSS latent size")
        state[key] = size
    slots = source.get("slots", {})
    if not isinstance(slots, dict):
        raise ValueError("slots must be an object")
    state["slots"] = {slot: _string(slots.get(slot, ""), slot) for slot in SLOTS}
    boxes = source.get("boxes", [])
    if not isinstance(boxes, list):
        raise ValueError("boxes must be an array")
    seen = set()
    for index, box in enumerate(boxes):
        if not isinstance(box, dict):
            raise ValueError(f"box {index + 1} must be an object")
        box_id = _string(box.get("id"), "box id")
        if not box_id or box_id in seen:
            raise ValueError("Box ids must be nonempty and unique")
        seen.add(box_id)
        if box.get("slot") not in SLOTS or box.get("label") not in LABELS:
            raise ValueError(f"Invalid slot or label for box {box_id}")
        clean = {"id": box_id, "slot": box["slot"], "label": box["label"], "text": _string(box.get("text", ""), "box text")}
        if "caption" in box:
            clean["caption"] = _string(box["caption"], "box caption")
        for key in ("x1", "y1", "x2", "y2"):
            number = box.get(key)
            if isinstance(number, bool) or not isinstance(number, (int, float)) or not math.isfinite(number):
                raise ValueError(f"{box_id}.{key} must be finite")
            clean[key] = number
        state["boxes"].append(clean)
    settings = source.get("settings", {})
    if not isinstance(settings, dict):
        raise ValueError("settings must be an object")
    for key in ("auto_position", "draw_mode"):
        value = settings.get(key, False)
        if not isinstance(value, bool):
            raise ValueError(f"{key} must be boolean")
        state["settings"][key] = value
    active = settings.get("active_slot", "red")
    if active not in SLOTS:
        raise ValueError("Invalid active_slot")
    state["settings"]["active_slot"] = active
    selected = settings.get("selected_id")
    state["settings"]["selected_id"] = selected if selected in seen else None
    return state


def pixel_bbox(box, width, height):
    """Raw canvas xyxy -> official centralized pixel yxyx, without a 1000 grid."""
    x0, x1 = sorted((box["x1"], box["x2"]))
    y0, y1 = sorted((box["y1"], box["y2"]))
    return [math.floor(round(y0, 9)) - height // 2, math.floor(round(x0, 9)) - width // 2,
            math.ceil(round(y1, 9)) - height // 2, math.ceil(round(x1, 9)) - width // 2]


def position_hint(box, width, height):
    cx = (box["x1"] + box["x2"]) / (2 * width)
    cy = (box["y1"] + box["y2"]) / (2 * height)
    horizontal = "left" if cx < .34 else "right" if cx > .66 else "center"
    vertical = "upper" if cy < .34 else "lower" if cy > .66 else "middle"
    return f"{vertical}-{horizontal} area"


def _position_terms(text):
    words = set(re.findall(r"\b(left|right|top|bottom|upper|lower|center|middle)\b", text.lower()))
    left = "left" in words or "左" in text
    right = "right" in words or "右" in text
    top = bool(words & {"top", "upper"}) or any(word in text for word in ("上部", "上側", "左上", "右上"))
    bottom = bool(words & {"bottom", "lower"}) or any(word in text for word in ("下部", "下側", "左下", "右下"))
    center = "center" in words or "中央" in text or "中心" in text
    return left, right, top, bottom, center


def _position_conflict(terms, box, width, height):
    left, right, top, bottom, center = terms
    cx = (box["x1"] + box["x2"]) / (2 * width)
    cy = (box["y1"] + box["y2"]) / (2 * height)
    return ((left and cx > .66) or (right and cx < .34) or (top and cy > .66)
            or (bottom and cy < .34) or (center and (cx < .34 or cx > .66)))


def position_conflict(text, box, width, height):
    return _position_conflict(_position_terms(text), box, width, height)


def build_prompt(value, output_mode="hybrid"):
    if output_mode not in OUTPUT_MODES:
        raise ValueError(f"Unknown MOSS output mode: {output_mode!r}")
    state = parse_state(value)
    width, height = state["width"], state["height"]
    selected_mode = ("layout_json" if state["boxes"] else "caption") if output_mode == "auto" else output_mode
    items, warnings = [], []
    prose = [state["prompt"]] if state["prompt"] else []
    parts = [state["prompt"]] if state["prompt"] and selected_mode == "caption" else []
    terms_by_slot = {}
    scene_terms = _position_terms(state["prompt"]) if state["boxes"] else ()
    used = set()
    has_unboxed = False
    for index, box in enumerate(state["boxes"]):
        slot = box["slot"]
        caption = box.get("caption", state["slots"][slot])
        used.add(slot)
        item = {"label": box["label"], "caption": caption}
        if box["label"] == "text":
            item["text"] = box["text"]
        item["bbox"] = pixel_bbox(box, width, height)
        items.append(item)
        hint = position_hint(box, width, height) if state["settings"]["auto_position"] else None
        description = f"{box['label'].capitalize()} (box {index + 1}, {slot}):\n{caption}"
        if box["label"] == "text":
            description += f"\nText to render:\n{box['text']}"
        if hint is not None:
            description += f"\nPosition from current box: {hint}."
        prose.append(description)
        if selected_mode == "caption":
            description = caption
            if box["label"] == "text":
                description += ('\n' if description else '') + '"' + box["text"] + '"'
            if hint is not None:
                description += f"\nIn the {hint}."
            if description:
                parts.append(description)
        term_key = ("id", box["id"]) if "caption" in box else slot
        if term_key not in terms_by_slot:
            terms_by_slot[term_key] = tuple(a or b for a, b in zip(scene_terms, _position_terms(caption)))
        if _position_conflict(terms_by_slot[term_key], box, width, height):
            warnings.append(f"Box {index + 1}: possible conflict with manual position words; original text kept.")
        if not caption.strip() and (box["label"] != "text" or not box["text"].strip()):
            warnings.append(f"Box {index + 1}: empty description/text is kept in the output.")
        elif box["label"] == "text" and not box["text"].strip():
            warnings.append(f"Box {index + 1}: visible text is empty; enter the intended wording.")
        if box["x1"] == box["x2"] or box["y1"] == box["y2"]:
            warnings.append(f"Box {index + 1}: zero-area box is kept in the output.")
        elif item["bbox"][0] == item["bbox"][2] or item["bbox"][1] == item["bbox"][3]:
            warnings.append(f"Box {index + 1}: box is too small at export precision; enlarge it.")
        if (min(box["x1"], box["x2"]) < 0 or max(box["x1"], box["x2"]) > width
                or min(box["y1"], box["y2"]) < 0 or max(box["y1"], box["y2"]) > height):
            warnings.append(f"Box {index + 1}: outside the {width}x{height} canvas; coordinates are kept.")
    for slot in SLOTS:
        if slot not in used and state["slots"][slot]:
            has_unboxed = True
            prose.append(f"Unboxed description ({slot}):\n{state['slots'][slot]}")
            warnings.append(f"{slot}: description has no box; included in prose only.")
            if selected_mode == "caption":
                parts.append(state["slots"][slot])
    layout = {"summary": {"caption": state["prompt"]}, "items": items,
              "bbox_coord_space": "abs_centralized", "bbox_format": "yxyx"}
    moss_json = json.dumps(layout, ensure_ascii=False, separators=(",", ":"))
    natural = "\n\n".join(prose)
    if selected_mode == "layout_json":
        prompt = moss_json
        if has_unboxed:
            warnings.append("Layout JSON omits unboxed descriptions; add boxes or choose caption/hybrid output.")
    elif selected_mode == "caption":
        prompt = "\n\n".join(parts)
    else:
        prompt = natural + ("\n\n" if natural else "") + moss_json
    return {"prompt": prompt,
            "moss_json": moss_json, "natural": natural, "width": width, "height": height, "warnings": warnings}
