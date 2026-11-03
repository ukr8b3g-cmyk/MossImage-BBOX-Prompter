"""Per-box external text, carried by the Prompter without changing saved text."""
import json


def external_items(value):
    if not isinstance(value, list):
        raise ValueError("MOSS Text Link: external_text must be a list of box assignments.")
    result, seen = [], set()
    for item in value:
        if not isinstance(item, dict) or any(not isinstance(item.get(k), str) for k in ("canvas", "box", "text", "link")):
            raise ValueError("MOSS Text Link: invalid box assignment.")
        key = (item["canvas"], item["box"])
        if not all(key) or key in seen:
            raise ValueError("MOSS Text Link: select each Canvas box only once.")
        seen.add(key)
        result.append({k: item[k] for k in ("canvas", "box", "text", "link")})
    return result


def link_text(framing_data, text, target, previous=None, link_id=""):
    if not isinstance(text, str):
        raise ValueError("MOSS Text Link: connect a STRING source; empty text is allowed.")
    framing = json.loads(framing_data)
    canvas = framing.get("moss_canvas_id")
    if framing.get("version") != "krea2_element_framing_v1" or not isinstance(canvas, str) or not canvas:
        raise ValueError("MOSS Text Link: connect an updated MOSS BBOX Canvas.")
    boxes = framing.get("layout", {}).get("boxes", [])
    if not isinstance(target, str) or not target or sum(str(b.get("id", "")) == target for b in boxes) != 1:
        raise ValueError("MOSS Text Link: select an existing box on the connected Canvas.")
    items = [] if previous is None else external_items(previous)
    return external_items(items + [{"canvas": canvas, "box": target, "text": text, "link": str(link_id)}])


def canvas_text(prompts, framing):
    items = external_items(prompts.get("external_text", []))
    selected = {item["box"]: item["text"] for item in items if item["canvas"] == framing.get("moss_canvas_id")}
    ids = [str(box.get("id", "")) for box in framing.get("layout", {}).get("boxes", [])]
    if any(ids.count(target) != 1 for target in selected):
        raise ValueError("MOSS Text Link: the target box no longer exists; select its replacement explicitly.")
    return selected
