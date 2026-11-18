"""Validate the archive, published asset paths and HTML landmarks without a server."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

root = Path(__file__).resolve().parents[1] / "dist"
class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=set()
        self.files=[]
    def handle_starttag(self, tag, attrs):
        data=dict(attrs)
        if "id" in data:
            assert data["id"] not in self.ids, data["id"]
            self.ids.add(data["id"])
        for key in ("src","href"):
            ref=data.get(key)
            if ref and not urlsplit(ref).scheme and not ref.startswith("#"):
                self.files.append(ref)

doc=Document()
doc.feed((root/"index.html").read_text("utf-8"))
assert {"byt-front","evening-front","issue-front","media-shelf","reader","archive-extra","scan"} <= doc.ids
raw=(root/"archive.js").read_text("utf-8")
records=json.loads(raw.removeprefix("window.EFIR_RECORDS = ").strip().removesuffix(";"))
ids=[r["code"] for r in records]
assert len(ids)==len(set(ids)) and {511,512,513,514,515,516} <= set(ids)
for r in records:
    assert r["edition"]["paragraphs"] and r["title"] and r["credit"]
    assert urlsplit(r["originalUrl"]).scheme in ("https","http")
    for item in sum([r.get("supplement",{}).get(k,[]) for k in ("links","media")],[]):
        assert urlsplit(item["url"]).scheme in ("https","http"), (r["code"],item)
        if item.get("file"): assert item.get("alt"),r["code"]
for f in root.glob("*"):
    if f.suffix in (".html",".css",".js"):
        source=f.read_text("utf-8")
        doc.files.extend(re.findall(r"(?<![\w./-])assets/[\w.\-]+",source))
        assert not re.search(r"file:///|[A-Z]:[\\/]Users[\\/]",source,re.I),f.name
for name in set(doc.files):
    assert (root/name).is_file(),name
print(f"{len(records)} записей, {len(set(doc.files))} локальных файлов проверено.")

