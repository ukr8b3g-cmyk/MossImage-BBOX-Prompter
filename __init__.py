from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
from importlib.util import find_spec

# Keep the existing CPU-only prompt compiler usable without a ComfyUI install.
if find_spec("comfy_api") is not None:
    from .text_link import MOSSBBoxTextLink
    NODE_CLASS_MAPPINGS["MOSSBBoxTextLink"] = MOSSBBoxTextLink
    NODE_DISPLAY_NAME_MAPPINGS["MOSSBBoxTextLink"] = "MOSS BBOX Text Link"
    from .reference_crop import node_class
    NODE_CLASS_MAPPINGS["MOSSBBoxReferenceCrop"] = node_class()
    NODE_DISPLAY_NAME_MAPPINGS["MOSSBBoxReferenceCrop"] = "MOSS BBOX Reference Crop"
    from .image_analysis import MOSSBBoxImageAnalysis
    NODE_CLASS_MAPPINGS["MOSSBBoxImageAnalysis"] = MOSSBBoxImageAnalysis
    NODE_DISPLAY_NAME_MAPPINGS["MOSSBBoxImageAnalysis"] = "MOSS BBOX Image Analysis"

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
