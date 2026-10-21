import json
import logging

from . import canvas_controls as controls

from .prompt_builder import OUTPUT_MODES, SLOTS, build_prompt, default_state, parse_state
from .krea_bridge import ELEMENT_TYPES, build_from_krea, element_type


class MOSSBBoxCanvasPrompt:
    DEPRECATED = True
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"moss_state": ("STRING", {
            "default": json.dumps(default_state(), ensure_ascii=False, separators=(",", ":")),
            "multiline": True,
            "dynamicPrompts": False,
        })}}

    RETURN_TYPES = ("STRING", "INT", "INT", "STRING")
    RETURN_NAMES = ("prompt", "width", "height", "moss_json")
    FUNCTION = "build"
    CATEGORY = "conditioning/MOSS"
    DESCRIPTION = "Five-color MOSS canvas. Hybrid prose + official layout JSON; boxes guide generation without guaranteeing placement."

    def build(self, moss_state):
        result = build_prompt(moss_state)
        return (result["prompt"], result["width"], result["height"], result["moss_json"])


class MOSSBBoxCanvas:
    DEPRECATED = True
    @classmethod
    def INPUT_TYPES(cls):
        return MOSSBBoxCanvasPrompt.INPUT_TYPES()
    RETURN_TYPES = ("MOSS_BBOX_LAYOUT", "INT", "INT")
    RETURN_NAMES = ("canvas_data", "width", "height")
    FUNCTION = "build"
    CATEGORY = "conditioning/MOSS"
    DESCRIPTION = "Five-color MOSS canvas. Connect canvas_data to MOSS BBOX Prompter and dimensions to the latent."

    def build(self, moss_state):
        state = parse_state(moss_state)
        return (json.dumps(state, ensure_ascii=False, separators=(",", ":")), state["width"], state["height"])


class MOSSBBoxPrompter:
    DEPRECATED = True
    @classmethod
    def INPUT_TYPES(cls):
        inputs = MOSSBBoxCanvasPrompt.INPUT_TYPES()
        return {"required": {"canvas_data": ("MOSS_BBOX_LAYOUT",), **inputs["required"]}}

    RETURN_TYPES = MOSSBBoxCanvasPrompt.RETURN_TYPES
    RETURN_NAMES = MOSSBBoxCanvasPrompt.RETURN_NAMES
    FUNCTION = "build"
    CATEGORY = "conditioning/MOSS"
    DESCRIPTION = "Whole-image and five-color prompts. Combines the connected canvas with original text into MOSS hybrid output."

    def build(self, canvas_data, moss_state):
        layout = parse_state(canvas_data)
        text = parse_state(moss_state)
        layout["prompt"] = text["prompt"]
        layout["slots"] = text["slots"]
        layout["settings"]["auto_position"] = text["settings"]["auto_position"]
        result = build_prompt(layout)
        return (result["prompt"], result["width"], result["height"], result["moss_json"])


class MOSSFromKrea2:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "framing_data": ("KREA2_ELEMENT_FRAMING_DATA",),
            "prompt_ui_data": ("KREA2_ELEMENT_PROMPT_DATA",),
            "auto_position_hint": ("BOOLEAN", {"default": False}),
        }, "optional": {
            "output_mode": (list(OUTPUT_MODES), {"default": "hybrid", "tooltip": "hybrid keeps the existing output; caption is prose; layout_json is compact JSON; auto uses JSON when boxes exist and prose otherwise."}),
            "text_mode": (["legacy", "literal"], {"default": "legacy", "tooltip": "legacy: visible words | appearance. literal: each Text card is exact visible text, including quotes, spaces, line breaks and |."}),
            "text_style": ("STRING", {"default": "readable text with black outline", "multiline": True, "dynamicPrompts": False,
                                      "tooltip": "Appearance of Text items in literal mode. This description is separate from the visible wording and applies to all Text cards."}),
        }}

    RETURN_TYPES = MOSSBBoxCanvasPrompt.RETURN_TYPES
    RETURN_NAMES = MOSSBBoxCanvasPrompt.RETURN_NAMES
    FUNCTION = "build"
    CATEGORY = "conditioning/MOSS"
    DESCRIPTION = "Combine MOSS BBOX Canvas and Prompter. Choose hybrid, caption, layout_json or auto. Literal Text preserves exact wording; text_style describes appearance. Connect width/height to the latent."

    def build(self, framing_data, prompt_ui_data, auto_position_hint=False,
              output_mode="hybrid", text_mode="legacy", text_style="readable text with black outline"):
        result = build_from_krea(framing_data, prompt_ui_data, auto_position_hint, output_mode, text_mode, text_style)
        for warning in result["warnings"]:
            logging.getLogger(__name__).warning("MOSS BBOX: %s", warning)
        return (result["prompt"], result["width"], result["height"], result["moss_json"])


class MOSSSharedCanvas:
    @classmethod
    def INPUT_TYPES(cls):
        inputs = controls.CanvasControls.INPUT_TYPES()
        inputs["required"]["width"][1]["default"] = 896
        inputs["required"]["height"][1]["default"] = 1184
        inputs["required"]["preset"][1]["default"] = "Custom"
        return inputs

    RETURN_TYPES = ("KREA2_ELEMENT_FRAMING_DATA",)
    RETURN_NAMES = ("framing_data",)
    FUNCTION = "execute"
    CATEGORY = "conditioning/MOSS"
    DESCRIPTION = "Five-color MOSS canvas with shared drawing, presets and workflow persistence. Default 896 x 1184."

    def execute(self, **kwargs):
        return controls.CanvasControls().execute(**kwargs)


class MOSSSharedPrompter:
    @classmethod
    def INPUT_TYPES(cls):
        inputs = controls.PromptControls.INPUT_TYPES()
        for slot in SLOTS:
            inputs["required"][f"{slot}_type"] = ([*ELEMENT_TYPES, "obj"], {"default": "object"})
        return inputs

    RETURN_TYPES = ("KREA2_ELEMENT_PROMPT_DATA",)
    RETURN_NAMES = ("prompt_ui_data",)
    FUNCTION = "execute"
    CATEGORY = "conditioning/MOSS"
    DESCRIPTION = "MOSS scene and five color prompts. Choose character, object or text for each color. Includes text controls, presets and workflow persistence."

    def execute(self, **kwargs):
        slots = {}
        for slot in SLOTS:
            slots[slot] = {
                "type": element_type(kwargs.get(f"{slot}_type", "object")),
                "prompt": controls._clean(kwargs.get(f"{slot}_prompt", "")),
                "framing": controls._normalize_framing(kwargs.get(f"{slot}_framing", "Auto")),
                "angle": controls._normalize_angle(kwargs.get(f"{slot}_angle", "Auto")),
            }
            if slots[slot]["type"] == "text":
                slots[slot]["literal_text"] = kwargs.get(f"{slot}_prompt", "")
        data = controls._prompt_ui_data(kwargs.get("scene", ""), kwargs.get("background", ""), slots)
        return (json.dumps(data, ensure_ascii=False, separators=(",", ":")),)


NODE_CLASS_MAPPINGS = {"MOSSBBoxCanvasPrompt": MOSSBBoxCanvasPrompt,
                       "MOSSBBoxCanvas": MOSSBBoxCanvas, "MOSSBBoxPrompter": MOSSBBoxPrompter,
                       "MOSSFromKrea2": MOSSFromKrea2,
                       "MOSSSharedCanvas": MOSSSharedCanvas, "MOSSSharedPrompter": MOSSSharedPrompter}
NODE_DISPLAY_NAME_MAPPINGS = {"MOSSBBoxCanvasPrompt": "MOSS BBOX Canvas + Prompt (Hybrid)",
                            "MOSSBBoxCanvas": "MOSS BBOX Canvas", "MOSSBBoxPrompter": "MOSS BBOX Prompter (Hybrid)",
                            "MOSSFromKrea2": "MOSS BBOX Export",
                            "MOSSSharedCanvas": "MOSS BBOX Canvas",
                            "MOSSSharedPrompter": "MOSS BBOX Prompter"}
