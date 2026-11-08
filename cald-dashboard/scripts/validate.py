"""Check data/survey.js reproduces every count table in the workbook's Analysis sheet."""
import json, sys
from collections import Counter
from openpyxl import load_workbook
SRC = sys.argv[1]
S = json.loads(open("data/survey.js", encoding="utf-8").read().split("=",1)[1].rstrip().rstrip(";"))
R = S["respondents"]
ws = load_workbook(SRC, data_only=True)["Analysis"]
rows = [(c[0].value, c[1].value) for c in ws.iter_rows()]
tables, cur = {}, None
for a, b in rows:
    if a == "Option": cur = tables.setdefault(len(tables), {"title": prev_title, "d": {}}); continue
    if cur is not None:
        if isinstance(b, (int, float)): cur["d"][a] = int(b)
        else: cur = None
    if isinstance(a, str) and b is None and not str(a).startswith(("Question","Each","Note","Source","Drawn")): prev_title = a
keys = ["languages","fiction","fictionTypes","nonfiction","junior","format"]
ok = True
for (i, t), k in zip(tables.items(), keys):
    c = Counter(o for r in R for o in (r[k] or []))
    exp = t["d"]
    # fix known label spellings in the sheet vs raw: compare after stripping
    diff = {o: (exp.get(o), c.get(o)) for o in set(exp)|set(c) if exp.get(o) != c.get(o)}
    answered = sum(1 for r in R if (r[k] if r[k] is not None else None))
    print(f"{t['title']!r:55} options={len(exp)} answered={answered} -> {'OK' if not diff else 'DIFF '+str(diff)}")
    ok &= not diff
print("ALL MATCH" if ok else "MISMATCHES FOUND")
