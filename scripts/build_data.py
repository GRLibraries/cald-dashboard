"""Build data/survey.js from the survey workbook.

Reads Sheet1 (raw responses) and the 'Analysis' sheet (free-text themes and the
published counts used for validation). Names, emails and timestamps are NEVER
written out. Run:  python scripts/build_data.py path/to/workbook.xlsx
"""
import json, re, sys
import pandas as pd
from openpyxl import load_workbook

SRC = sys.argv[1] if len(sys.argv) > 1 else "2026_CALD_Collections_Survey_Results.XLSX"

LANG_MAP = {  # raw token (lower-case) -> cleaned label, mirrors the Analysis sheet rules
    "nepali": "Nepali", "nepalese": "Nepali",
    "chinese": "Chinese", "mandarin": "Chinese", "cantonese": "Chinese", "chinese-mandarin": "Chinese",
    "russian": "Russian", "russia": "Russian",
}
def clean_languages(raw):
    toks = re.split(r"\s*(?:&|\+|,|/|;|\band\b)\s*|\s+", str(raw).strip(), flags=re.I)
    out = []
    for t in toks:
        t = t.strip()
        if not t: continue
        lab = LANG_MAP.get(t.lower(), t.title())
        if lab not in out: out.append(lab)
    return out

def multi(v):
    if pd.isna(v): return None            # None = did not answer
    return [x.strip() for x in str(v).split(";") if x.strip()]

# column -> (key, canonical option fixes)
COLS = {
    "Fiction Genres": "fiction",
    "What types of items would you like to see in your language?": "fictionTypes",
    "Non-fiction - subjects": "nonfiction",
    "Junior preferences": "junior",
    "Format preferences": "format",
    "Do you prefer to read in English or your language?": "readPref",
}
df = pd.read_excel(SRC, sheet_name="Sheet1")
respondents = []
for _, r in df.iterrows():
    rec = {"id": int(r["Id"]),
           "where": str(r["Where was data collected?"]).strip(),
           "languages": clean_languages(r["What language do you speak at home?"])}
    for col, key in COLS.items():
        rec[key] = multi(r[col])
    respondents.append(rec)

# ---- free-text themes from the Analysis sheet --------------------------------
ws = load_workbook(SRC, data_only=True)["Analysis"]
rows = [(c[0].value, c[1].value) for c in ws.iter_rows(min_row=136)]
themes, cur, intro = [], None, None
for a, _ in rows:
    if a is None: continue
    a = str(a)
    if a.startswith("Free-text themes"): continue
    if a.startswith("Drawn from:"): intro = a; continue
    if a.startswith("Theme "):
        cur = {"title": a.split(":", 1)[1].strip(), "summary": None, "quotes": []}; themes.append(cur); continue
    if cur is None: continue
    if cur["summary"] is None: cur["summary"] = a; continue
    m = re.match(r'^"(.*)"\s*\(Response Id (\d+),\s*(.*)\)$', a.replace("\\'", "'"), re.S)
    assert m, a
    cur["quotes"].append({"text": m.group(1), "id": int(m.group(2)), "field": m.group(3)})

def scrub(text):
    """Drop any parenthetical mentioning emails/domains and any stray address."""
    text = re.sub(r"\s*\([^)]*(?:email|e-mail|@|\.gov\.au|\.com)[^)]*\)", "", str(text), flags=re.I)
    return re.sub(r"\S+@\S+", "[removed]", text)

meta = {"note": scrub(ws["A1"].value), "source": scrub(ws["A2"].value), "total": len(respondents)}
payload = {"meta": meta, "themesIntro": intro, "themes": themes, "respondents": respondents}
out = "window.SURVEY = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n"
bad = re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\.gov\.au", out, flags=re.I)
if bad:
    sys.exit("REFUSING TO WRITE: email-like text found in output: %s" % sorted(set(bad)))
with open("data/survey.js", "w", encoding="utf-8") as f:
    f.write(out)
print("respondents:", len(respondents), "| themes:", len(themes), "| quotes:", sum(len(t['quotes']) for t in themes))
