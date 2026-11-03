"""Reference-only crop. No prompt mutation, preview files or model management."""
import json
import math


def analysis_target(frame, box_id):
    """Empty target means Auto: the first stored box, without changing saved IDs."""
    if box_id:
        return box_id
    if isinstance(frame, str):
        frame = json.loads(frame)
    boxes = frame.get('layout', {}).get('boxes', []) if isinstance(frame, dict) else []
    first = boxes[0].get('id') if isinstance(boxes, list) and boxes and isinstance(boxes[0], dict) else None
    if not isinstance(first, str) or not first:
        raise ValueError('Auto target: no box on the connected Canvas. Add a box or select an existing target.')
    return first


def crop_bounds(frame, box_id, width, height):
    if isinstance(frame, str):
        frame = json.loads(frame)
    if not isinstance(frame, dict) or frame.get('version') != 'krea2_element_framing_v1':
        raise ValueError('Invalid Canvas framing data')
    def number(value):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError('Non-finite Canvas coordinate')
        return value
    cw, ch = number(frame.get('width')), number(frame.get('height'))
    if min(cw, ch, width, height) <= 0:
        raise ValueError('Invalid image or Canvas size')
    boxes = frame.get('layout', {}).get('boxes')
    if not isinstance(boxes, list) or not isinstance(box_id, str) or not box_id:
        raise ValueError('Select one existing box')
    matches = [b for b in boxes if isinstance(b, dict) and b.get('id') == box_id]
    if len(matches) != 1:
        raise ValueError('Missing or duplicate box ID')
    b = matches[0]
    x1, x2 = sorted([number(b.get('x1')), number(b.get('x2'))])
    y1, y2 = sorted([number(b.get('y1')), number(b.get('y2'))])
    scale = min(cw / width, ch / height)
    ox, oy = (cw - width * scale) / 2, (ch - height * scale) / 2
    x1, x2 = max(x1, ox), min(x2, ox + width * scale)
    y1, y2 = max(y1, oy), min(y2, oy + height * scale)
    if x2 <= x1 or y2 <= y1:
        raise ValueError('Box does not overlap the reference image')
    return (max(0, math.floor((x1-ox)/scale)), max(0, math.floor((y1-oy)/scale)),
            min(width, math.ceil((x2-ox)/scale)), min(height, math.ceil((y2-oy)/scale)))


def crop_image(frame, box_id, image):
    import torch
    if image is None or image.ndim != 4 or image.shape[0] != 1 or image.shape[3] != 3:
        raise ValueError('Reference analysis requires one RGB image')
    left, top, right, bottom = crop_bounds(frame, box_id, image.shape[2], image.shape[1])
    crop = image[:, top:bottom, left:right, :].clone()
    if not torch.isfinite(crop).all():
        raise ValueError('Reference crop contains non-finite pixels')
    h, w = crop.shape[1:3]
    scale = min(1, 1024 / max(w, h))
    if scale < 1:
        size = (max(1, math.floor(h*scale+.5)), max(1, math.floor(w*scale+.5)))
        crop = torch.nn.functional.interpolate(crop.movedim(-1, 1), size=size,
            mode='bilinear', align_corners=False, antialias=True).movedim(1, -1)
    return crop


def node_class():
    from comfy_api.latest import io
    class MOSSBBoxReferenceCrop(io.ComfyNode):
        @classmethod
        def define_schema(cls):
            return io.Schema(node_id='MOSSBBoxReferenceCrop', display_name='MOSS BBOX Reference Crop',
                category='conditioning/MOSS', inputs=[
                    io.Custom('KREA2_ELEMENT_FRAMING_DATA').Input('framing_data'),
                    io.String.Input('box_id', default='', dynamic_prompts=False, advanced=True),
                    io.Image.Input('image', optional=True)], outputs=[io.Image.Output()])
        @classmethod
        def execute(cls, framing_data, box_id, image=None):
            return io.NodeOutput(crop_image(framing_data, box_id, image))
    return MOSSBBoxReferenceCrop
