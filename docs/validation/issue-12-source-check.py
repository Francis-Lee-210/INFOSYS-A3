"""Read-only source/markup/link checks for Issue #12 artifacts; no network/app tests."""
import hashlib
import json
import re
import zipfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
manifest = json.loads((ROOT / "references/Rae/source-manifest.json").read_text())
for entry in manifest["files"]:
    data = (ROOT / entry["repository_path"]).read_bytes()
    assert hashlib.sha256(data).hexdigest() == entry["sha256"]
    assert len(data) == entry["bytes"]
print("PASS all 4 Rae archive byte counts / manifest SHA-256 values")

with zipfile.ZipFile(ROOT / "references/Rae/A2-D1/A2-D1_Consulting_Proposal_Rae_Huang_xhua725.docx") as archive:
    original = archive.read("word/media/image2.png")
with zipfile.ZipFile(ROOT / "references/Rae/A2-D2/A2-D2_Business_Case_Slides_Rae_Huang_xhua725.pptx") as archive:
    assert original == archive.read("ppt/media/image2.png")
assert original == (ROOT / "docs/design/issue-12-original-tobe.png").read_bytes()
print("PASS original TO-BE extraction equals DOCX and PPTX embedded bytes; SHA-256 " + hashlib.sha256(original).hexdigest())

for filename, expected in [
    ("resources/api/SAP API Pool v4.xlsx", "4b18c4c7e41e0113febafd2d26a2208a51ec30b70603df0c15337dc0a6d414ce"),
    ("resources/api/specs/API_BILLING_DOCUMENT_REQUEST_SRV.openapi.json", "9dfbb583663bb493584fd62e609c3d37a6fe264c4154256249a6be7c3cd62999"),
    ("Specification-and-Rubric.docx", "c2cd2ea6c3f9d51c73942db5e168811f0b27801f31edc4e7ecd473d514f69478"),
]:
    assert hashlib.sha256((ROOT / filename).read_bytes()).hexdigest() == expected
print("PASS preserved Pool v4, official request specification and archived V3 hashes")

svg = ET.parse(ROOT / "docs/design/issue-12-process-adaptation.svg").getroot()
ns = {"s": "http://www.w3.org/2000/svg"}
assert svg.find("s:title", ns) is not None and svg.find("s:desc", ns) is not None
ET.parse(ROOT / "decisions/A3_Effort_Impact_Matrix.svg")
print("PASS adaptation and existing matrix SVG XML parse; title/description present")

class Markup(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if "href" in attrs:
            self.links.append(attrs["href"])

html_path = ROOT / "docs/design/issue-12-wireframes.html"
parser = Markup()
parser.feed(html_path.read_text())
assert len(parser.ids) == len(set(parser.ids))
assert all(x in parser.ids for x in ["screen-1", "screen-2", "screen-3", "setup"])
print("PASS HTML parser / unique static IDs / three-screen and separate setup structure")

def slug(heading):
    heading = re.sub(r"[`*_]", "", heading).lower()
    return re.sub(r"[^\w -]", "", heading).strip().replace(" ", "-")

targets = 0
def validate(source, target):
    global targets
    if re.match(r"^[a-z]+:", target) or target.startswith("//"):
        return  # Authenticated/official URL verification limits are recorded, not faked.
    path, _, anchor = unquote(target).partition("#")
    dest = (source.parent / path).resolve() if path else source
    assert dest.exists(), f"Missing relative link: {source.relative_to(ROOT)} -> {target}"
    if anchor:
        assert dest.suffix == ".md", f"Unexpected anchor type {dest}"
        headings = re.findall(r"^#{1,6} (.+)$", dest.read_text(), re.M)
        assert anchor in {slug(x) for x in headings}, f"Missing anchor: {source.name} -> {target}"
    targets += 1

authored = [*sorted((ROOT / "docs/design").glob("issue-12-*.md")), ROOT / "docs/validation/issue-12-walkthrough.md", ROOT / "docs/validation/issue-12-acceptance.md", *sorted((ROOT / "docs/development").glob("issue-12-*.md"))]
for path in authored:
    assert path.exists(), path
    for target in re.findall(r"!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)\)", path.read_text()):
        validate(path, target.strip("<>"))
for target in parser.links:
    validate(html_path, target)
for element in svg.iter():
    if "href" in element.attrib:
        validate(ROOT / "docs/design/issue-12-process-adaptation.svg", element.attrib["href"])
for path, marker in [
    (ROOT / "decisions/A3_Candidate_Comparison.md", "## 11. Dated confirmation update"),
    (ROOT / "decisions/A3_选题工作表.md", "## 8. 2026-10-16"),
]:
    text = path.read_text().split(marker, 1)[1]
    for target in re.findall(r"!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)\)", text):
        validate(path, target.strip("<>"))
print(f"PASS {targets} authored relative file/anchor links (historical unbundled references not re-audited)")
print("Source/markup/link checks complete. No API, application suite, Signavio or human evaluation performed.")
