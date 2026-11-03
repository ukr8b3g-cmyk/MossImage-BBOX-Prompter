from comfy_api.latest import io

from .external_text import link_text


class MOSSBBoxTextLink(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="MOSSBBoxTextLink", display_name="MOSS BBOX Text Link", category="conditioning/MOSS",
            description="Assign a STRING to one Canvas box. Connect external_text to Prompter. Empty text replaces the body with empty text; saved manual text is preserved.",
            inputs=[
                io.String.Input("text", force_input=True, tooltip="Connect multiline text, join, replace or LLM STRING output."),
                io.Custom("KREA2_ELEMENT_FRAMING_DATA").Input("framing_data"),
                io.String.Input("target", default="", dynamic_prompts=False, socketless=True, tooltip="Choose a box from the connected Canvas."),
                io.Custom("MOSS_BBOX_TEXT_LINKS").Input("previous", optional=True, tooltip="Optional: another Text Link, for additional boxes."),
            ],
            outputs=[io.Custom("MOSS_BBOX_TEXT_LINKS").Output("external_text")],
            hidden=[io.Hidden.unique_id],
        )

    @classmethod
    def execute(cls, framing_data, text, target, previous=None):
        return io.NodeOutput(link_text(framing_data, text, target, previous, cls.hidden.unique_id))
