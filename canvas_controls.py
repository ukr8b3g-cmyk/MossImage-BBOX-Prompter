"""Bundled Canvas/Prompter input helpers, adapted from Krea2 v1.0.2.
Copyright (c) 2026 ukr8b3g-cmyk. MIT; see LICENSE and NOTICE.md.
Compatibility wire formats are retained for saved MOSS/Krea2 inputs.
"""

import json
import hashlib

MAX_RESOLUTION = 16384


REGIONS = ("red", "blue", "yellow", "green", "magenta")


ELEMENT_TYPES = ("obj", "text")


FRAMING_OPTIONS = (
    "Auto",
    "Cowboy shot",
    "Full body",
    "Upper body",
    "Bust-up",
    "Headshot",
    "Close-up",
    "Lower body",
    "Full object",
    "Detail shot",
    "Macro detail",
)


FRAMING_DESC_MAP = {
    "Auto": "",
    "Cowboy shot": "cowboy shot, framed from head to mid-thigh, full upper body visible, thighs partially visible",
    "Full body": "shown as a full-body view",
    "Upper body": "shown as an upper-body view",
    "Bust-up": "shown as a bust-up portrait",
    "Headshot": "shown as a headshot portrait",
    "Close-up": "shown in a close-up view",
    "Lower body": "focused on the lower body",
    "Full object": "showing the full object",
    "Detail shot": "shown as a detail shot",
    "Macro detail": "shown as a macro detail view",
}


ANGLE_OPTIONS = (
    "Auto",
    "Front view",
    "3/4 right",
    "3/4 left",
    "Eye level",
    "POV",
    "Top POV",
    "Side view",
    "Profile right",
    "Profile left",
    "Slight low",
    "Low angle",
    "Slight high",
    "High angle",
    "Top-down view",
    "Three-quarter view",
    "Dutch angle",
    "Over-the-shoulder",
    "Rear view",
    "Wide angle",
    "Telephoto",
    "Worm view",
    "Bird view",
    "Foreground frame",
)


ANGLE_DESC_MAP = {
    "Auto": "",
    "Front view": "front view, facing the camera, subject clearly visible",
    "3/4 right": "slight three-quarter view from the right, natural angled view, both front and side visible",
    "3/4 left": "slight three-quarter view from the left, natural angled view, both front and side visible",
    "Eye level": "eye-level camera angle, neutral natural viewpoint, camera at subject eye height",
    "POV": "point-of-view angle, immersive perspective, subject seen from viewer perspective",
    "Top POV": "top-down point-of-view angle, viewer looking down from above, immersive overhead perspective, subject seen from the viewer's position",
    "Side view": "side view, profile angle, subject viewed from the side",
    "Profile right": "side profile right, subject facing right, clear right-facing profile",
    "Profile left": "side profile left, subject facing left, clear left-facing profile",
    "Slight low": "slight low angle, camera a little below the subject, subtly looking upward",
    "Low angle": "low angle shot, camera below the subject, looking up at the subject",
    "Slight high": "slight high angle, camera a little above the subject, subtly looking downward",
    "High angle": "high angle shot, viewed from above, camera above the subject, looking down",
    "Top-down view": "top-down view, overhead shot, camera directly above the subject",
    "Three-quarter view": "three-quarter view, subject turned slightly, partial front and side visible",
    "Dutch angle": "dutch angle, tilted camera, diagonal composition",
    "Over-the-shoulder": "over-the-shoulder view, camera behind one subject, foreground shoulder visible",
    "Rear view": "from behind, rear view, back of the subject visible",
    "Wide angle": "wide-angle perspective, spacious view, exaggerated foreground scale, expanded sense of space",
    "Telephoto": "telephoto compression, compressed depth, background appears closer, flattened perspective",
    "Worm view": "worm's-eye view, extreme low angle, camera near the ground looking upward",
    "Bird view": "bird's-eye view, high elevated viewpoint, looking down from above",
    "Foreground frame": "framed through foreground, foreground objects partially framing the subject, added depth and presence",
}


EMPTY_LAYOUT_DATA = '{"boxes":[]}'


EMPTY_CAMERA_DATA = '{"iso":"","shutter":"","aperture":"","focal_length":""}'


EMPTY_SET_DATA = '{"sets":[],"selected":""}'


EMPTY_PROMPT_UI_DATA = ''


PRESET_SIZES = {
    "1024 x 1024": (1024, 1024),
    "1536 x 1536": (1536, 1536),
    "2048 x 2048": (2048, 2048),
    "1024 x 1344": (1024, 1344),
    "1024 x 1536": (1024, 1536),
    "1152 x 1536": (1152, 1536),
    "1536 x 2048": (1536, 2048),
    "1344 x 1024": (1344, 1024),
    "1536 x 1024": (1536, 1024),
    "1536 x 1152": (1536, 1152),
    "2048 x 1536": (2048, 1536),
}


def _text(default="", multiline=True):
    return ("STRING", {"default": default, "multiline": multiline, "dynamicPrompts": False})


def _hidden_text(default=""):
    return ("STRING", {"default": default, "multiline": True, "dynamicPrompts": False})


def _clean(value):
    return str(value or "").strip()


def _safe_json_loads(data, fallback):
    try:
        parsed = json.loads(str(data or ""))
        return parsed if isinstance(parsed, type(fallback)) else fallback
    except Exception:
        return fallback


def _resolve_size(preset, width, height, width_override=None, height_override=None):
    if preset in PRESET_SIZES:
        resolved_width, resolved_height = PRESET_SIZES[preset]
    else:
        resolved_width, resolved_height = int(width), int(height)

    if width_override is not None:
        resolved_width = int(width_override)
    if height_override is not None:
        resolved_height = int(height_override)

    return resolved_width, resolved_height


def _normalize_framing(value):
    value = _clean(value)
    return value if value in FRAMING_OPTIONS else "Auto"


def _normalize_angle(value):
    value = _clean(value)
    return value if value in ANGLE_OPTIONS else "Auto"


def _append_framing_hint(desc, framing):
    desc = _clean(desc)
    framing = _normalize_framing(framing)
    hint = _clean(FRAMING_DESC_MAP.get(framing, ""))
    if not hint:
        return desc
    if desc:
        return f"{desc}, {hint}"
    return hint


def _append_angle_hint(desc, angle):
    desc = _clean(desc)
    angle = _normalize_angle(angle)
    hint = _clean(ANGLE_DESC_MAP.get(angle, ""))
    if not hint:
        return desc
    if desc:
        return f"{desc}, {hint}"
    return hint


def _prompt_ui_data(scene, background, slot_values):
    return {
        "version": "krea2_element_prompt_ui_v1",
        "scene": _clean(scene),
        "background": _clean(background),
        "slots": slot_values,
    }


def _slot_values_from_inputs(values):
    slot_values = {}
    for slot in REGIONS:
        typ = _clean(values.get(f"{slot}_type") or "obj").lower()
        if typ not in ELEMENT_TYPES:
            typ = "obj"
        slot_values[slot] = {
            "type": typ,
            "prompt": _clean(values.get(f"{slot}_prompt")),
            "framing": _normalize_framing(values.get(f"{slot}_framing") or "Auto"),
            "angle": _normalize_angle(values.get(f"{slot}_angle") or "Auto"),
        }
    return slot_values


def _looks_like_quoted_text(value):
    s = _clean(value)
    if len(s) < 2:
        return False
    pairs = [('"', '"'), ("'", "'"), ("“", "”"), ("「", "」"), ("『", "』")]
    return any(s.startswith(a) and s.endswith(b) for a, b in pairs)


def _strip_text_marker(value):
    s = _clean(value)
    low = s.lower()
    for prefix in ("text:", "txt:"):
        if low.startswith(prefix):
            return s[len(prefix):].strip()
    if _looks_like_quoted_text(s):
        return s[1:-1].strip()
    return s


def _split_visible_text_desc(value):
    s = _clean(value)
    if "|" in s:
        a, b = s.split("|", 1)
        return _clean(a), _clean(b) or "readable text with black outline"
    return s, "readable text with black outline"


class CanvasControls:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "width": ("INT", {"default": 1024, "min": 1, "max": MAX_RESOLUTION, "step": 1}),
                "height": ("INT", {"default": 1024, "min": 1, "max": MAX_RESOLUTION, "step": 1}),
                "preset": ([
                    "1024 x 1024", "1536 x 1536", "2048 x 2048", "1024 x 1344", "1024 x 1536",
                    "1152 x 1536", "1536 x 2048", "1344 x 1024", "1536 x 1024", "1536 x 1152",
                    "2048 x 1536", "Custom"
                ], {"default": "1024 x 1024"}),
                "layout_data": _hidden_text(EMPTY_LAYOUT_DATA),
                "camera_data": _hidden_text(EMPTY_CAMERA_DATA),
                "grid_mode": (["Off", "Thirds", "Center Cross"], {"default": "Thirds"}),
                "ui_language": (["Auto", "English", "Japanese"], {"default": "Auto"}),
                "camera_set_data": _hidden_text(EMPTY_SET_DATA),
                "canvas_preset_data": _hidden_text(EMPTY_SET_DATA),
            },
            "optional": {
                "width_override": (
                    "INT",
                    {
                        "forceInput": True,
                        "min": 1,
                        "max": MAX_RESOLUTION,
                        "step": 1,
                        "display_name": "width",
                        "tooltip": "Overrides the Canvas width when connected.",
                    },
                ),
                "height_override": (
                    "INT",
                    {
                        "forceInput": True,
                        "min": 1,
                        "max": MAX_RESOLUTION,
                        "step": 1,
                        "display_name": "height",
                        "tooltip": "Overrides the Canvas height when connected.",
                    },
                ),
            }
        }

    RETURN_TYPES = ("KREA2_ELEMENT_FRAMING_DATA",)
    RETURN_NAMES = ("framing_data",)
    FUNCTION = "execute"
    CATEGORY = "conditioning/MOSS"

    def execute(
        self,
        width,
        height,
        preset,
        layout_data,
        camera_data,
        grid_mode,
        ui_language='Auto',
        camera_set_data='',
        canvas_preset_data='',
        width_override=None,
        height_override=None,
    ):
        width, height = _resolve_size(
            preset,
            width,
            height,
            width_override=width_override,
            height_override=height_override,
        )
        raw_layout = str(layout_data or "")
        try:
            layout = json.loads(raw_layout) if raw_layout.strip() else {"boxes": []}
        except json.JSONDecodeError as exc:
            raise ValueError("MOSS Canvas layout_data is invalid JSON; restore or redraw the boxes.") from exc
        if not isinstance(layout, dict) or not isinstance(layout.get("boxes", []), list):
            raise ValueError("MOSS Canvas layout_data must be a JSON object; boxes must be an array.")
        camera = _safe_json_loads(camera_data, {})
        data = {
            "version": "krea2_element_framing_v1",
            "width": int(width),
            "height": int(height),
            "preset": preset,
            "layout": layout,
            "camera": camera,
            "grid_mode": grid_mode,
            "ui_language": ui_language,
            "camera_set_data": _safe_json_loads(camera_set_data, {"sets": [], "selected": ""}),
            "canvas_preset_data": _safe_json_loads(canvas_preset_data, {"sets": [], "selected": ""}),
        }
        return (json.dumps(data, ensure_ascii=False, separators=(",", ":")),)

    @classmethod
    def IS_CHANGED(cls, *args, **kwargs):
        payload = json.dumps([args, kwargs], ensure_ascii=False, sort_keys=True)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class PromptControls:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "scene": _text(""),
                "background": _text(""),
                "red_prompt": _text(""),
                "blue_prompt": _text(""),
                "yellow_prompt": _text(""),
                "green_prompt": _text(""),
                "magenta_prompt": _text(""),
                "red_type": (["obj", "text"], {"default": "obj"}),
                "blue_type": (["obj", "text"], {"default": "obj"}),
                "yellow_type": (["obj", "text"], {"default": "obj"}),
                "green_type": (["obj", "text"], {"default": "obj"}),
                "magenta_type": (["obj", "text"], {"default": "obj"}),
                "prompt_ui_data": _hidden_text(EMPTY_PROMPT_UI_DATA),
                "red_framing": (FRAMING_OPTIONS, {"default": "Auto"}),
                "blue_framing": (FRAMING_OPTIONS, {"default": "Auto"}),
                "yellow_framing": (FRAMING_OPTIONS, {"default": "Auto"}),
                "green_framing": (FRAMING_OPTIONS, {"default": "Auto"}),
                "magenta_framing": (FRAMING_OPTIONS, {"default": "Auto"}),
                "red_angle": (ANGLE_OPTIONS, {"default": "Auto"}),
                "blue_angle": (ANGLE_OPTIONS, {"default": "Auto"}),
                "yellow_angle": (ANGLE_OPTIONS, {"default": "Auto"}),
                "green_angle": (ANGLE_OPTIONS, {"default": "Auto"}),
                "magenta_angle": (ANGLE_OPTIONS, {"default": "Auto"}),
            }
        }

    RETURN_TYPES = ("KREA2_ELEMENT_PROMPT_DATA",)
    RETURN_NAMES = ("prompt_ui_data",)
    FUNCTION = "execute"
    CATEGORY = "conditioning/MOSS"

    def execute(self, scene, background, red_prompt, blue_prompt, yellow_prompt, green_prompt, magenta_prompt,
                red_type="obj", blue_type="obj", yellow_type="obj", green_type="obj", magenta_type="obj",
                prompt_ui_data="", red_framing="Auto", blue_framing="Auto", yellow_framing="Auto",
                green_framing="Auto", magenta_framing="Auto", red_angle="Auto", blue_angle="Auto",
                yellow_angle="Auto", green_angle="Auto", magenta_angle="Auto"):
        slot_values = _slot_values_from_inputs(locals())
        data = _prompt_ui_data(scene, background, slot_values)
        return (json.dumps(data, ensure_ascii=False, separators=(",", ":")),)

    @classmethod
    def IS_CHANGED(cls, *args, **kwargs):
        payload = json.dumps([args, kwargs], ensure_ascii=False, sort_keys=True)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()
