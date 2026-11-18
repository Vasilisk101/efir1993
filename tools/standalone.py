"""Export the static site as a single HTML file with its bundled media."""
import base64
import mimetypes
import re
import sys
from functools import lru_cache
from pathlib import Path

DIST = Path(__file__).resolve().parents[1] / "dist"
ASSET = re.compile(r"(?<![\w./-])assets/[\w.\-]+")

@lru_cache(maxsize=None)
def uri(name):
    path = DIST / name
    mime = {".woff2": "font/woff2", ".ttf": "font/ttf", ".webp": "image/webp"}.get(path.suffix)
    mime = mime or mimetypes.guess_type(name)[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return "data:" + mime + ";base64," + encoded

def embed(text):
    return ASSET.sub(lambda m: uri(m[0]), text)

def export():
    html = (DIST / "index.html").read_text(encoding="utf-8")
    def style(m):
        return "<style>\n" + embed((DIST / m[1]).read_text(encoding="utf-8")) + "\n</style>"
    def script(m):
        code = embed((DIST / m[1]).read_text(encoding="utf-8"))
        return "<script>\n" + code.replace("</script", r"<\/script") + "\n</script>"
    html = embed(html)
    html = re.sub(r'<link rel="stylesheet" href="([\w.-]+)">', style, html)
    return re.sub(r'<script src="([\w.-]+)"></script>', script, html)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("python tools/standalone.py output.html")
    destination = Path(sys.argv[1]).resolve()
    if destination.is_relative_to(DIST):
        raise SystemExit("Укажите путь за пределами dist.")
    destination.write_text(export(), encoding="utf-8")

