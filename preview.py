"""Non-destructive image preview. Boxes are drawn only by the browser."""

import json
import os
import uuid

from .prompt_builder import default_state, parse_state


def preview_layout(framing_data):
    """Reuse the export coordinate validator without compiling a prompt."""
    framing = json.loads(framing_data)
    if not isinstance(framing, dict) or framing.get("version") != "krea2_element_framing_v1":
        raise ValueError("Connect the MOSS BBOX Canvas framing_data output.")
    layout = framing.get("layout")
    if not isinstance(layout, dict) or not isinstance(layout.get("boxes", []), list):
        raise ValueError("MOSS preview layout must be an object with a boxes array.")
    state = default_state()
    state["width"], state["height"] = framing.get("width"), framing.get("height")
    for index, box in enumerate(layout.get("boxes", [])):
        if not isinstance(box, dict):
            raise ValueError("MOSS preview boxes must be objects.")
        state["boxes"].append({**box, "id": str(index), "label": "object", "text": ""})
    state = parse_state(state)
    return {key: state[key] for key in ("width", "height", "boxes")}


def image_to_pil(image):
    from PIL import Image

    # Non-inplace tensor operations; input and returned IMAGE stay untouched.
    array = image.detach().cpu().mul(255).clamp(0, 255).byte().numpy()
    if array.shape[-1] == 1:
        array = array[:, :, 0]
    return Image.fromarray(array)


class MOSSBBoxPreview:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "images": ("IMAGE", {"tooltip": "Connect generation subgraph IMAGE, VAE Decode IMAGE, or Load Image IMAGE. The preview appears inside this node after execution."}),
            "framing_data": ("KREA2_ELEMENT_FRAMING_DATA", {"tooltip": "Branch MOSS BBOX Canvas framing_data here; keep its Export connection."}),
        }}

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("images",)
    FUNCTION = "preview"
    OUTPUT_NODE = True
    CATEGORY = "image/MOSS"
    DESCRIPTION = ("Current Standard and DMD templates include this optional preview node. "
                   "Connect generation IMAGE (or Load Image IMAGE) to images, and MOSS BBOX Canvas framing_data to framing_data. "
                   "Run to display the image and requested boxes inside this node. "
                   "Show Boxes and opacity affect only this preview, without re-running generation. "
                   "The IMAGE output is the original input, without boxes.")

    def preview(self, images, framing_data):
        import folder_paths

        layout = preview_layout(framing_data)
        if len(images.shape) != 4 or images.shape[0] < 1 or images.shape[-1] not in (1, 3, 4):
            raise ValueError("MOSS preview expects a nonempty IMAGE batch (BHWC, 1/3/4 channels).")
        if images.shape[1] < 1 or images.shape[2] < 1:
            raise ValueError("MOSS preview images must have positive dimensions.")
        # Unique run names prevent a previous result from being overwritten/cached.
        directory, prefix, counter, subfolder, _ = folder_paths.get_save_image_path(
            "MOSS_BBOX_preview_" + uuid.uuid4().hex, folder_paths.get_temp_directory(),
            images.shape[2], images.shape[1])
        previews = []
        for index, image in enumerate(images):
            filename = f"{prefix}_{counter + index:05}_.webp"
            thumbnail = image_to_pil(image)
            thumbnail.thumbnail((2048, 2048))
            thumbnail.save(os.path.join(directory, filename), format="WEBP", quality=90, method=4)
            previews.append({"filename": filename, "subfolder": subfolder, "type": "temp"})
        # A private UI key avoids an extra standard Comfy image preview.
        return {"ui": {"moss_bbox_preview": [{"images": previews, "layout": layout,
                    "image_size": [images.shape[2], images.shape[1]]}]},
                "result": (images,)}
