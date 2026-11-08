# 2026 CALD Collections Survey – dashboard

Static dashboard (no build step, no dependencies) for the 2026 CALD collections survey.

- **Overview** – the six tables from the workbook's *Analysis* sheet, plus the free-text themes. Click a language chip to break every table (and the quotes) down by language spoken at home.
- **Compare languages** – side-by-side counts and percentages for every language group with 5+ respondents.
- The selected view/language is stored in the URL hash (e.g. `#Nepali`, `#compare`) so you can share a link to a specific breakdown.

## Publish with GitHub Pages
1. Push this folder to a GitHub repo.
2. **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and `/ (root)`.
3. The site appears at `https://<user>.github.io/<repo>/`.

You can also open `index.html` directly from disk.

## Files
| Path | Purpose |
|---|---|
| `index.html` | Page shell |
| `assets/style.css`, `assets/app.js` | Styling and dashboard logic |
| `data/survey.js` | **Anonymised** respondent-level data + free-text themes (generated) |
| `scripts/build_data.py` | Regenerates `data/survey.js` from the workbook |
| `scripts/validate.py` | Checks the generated data reproduces every count in the *Analysis* sheet |

## Updating the data
```bash
pip install pandas openpyxl
python scripts/build_data.py path/to/2026_CALD_Collections_Survey_Results.XLSX
python scripts/validate.py   path/to/2026_CALD_Collections_Survey_Results.XLSX
```
Keep the workbook **outside** the repo (or rely on `.gitignore`): Sheet1 contains names and email addresses. The build script drops names, emails and timestamps.

## Language cleaning rules
Same as the workbook: each language named is counted once per respondent; Nepalese→Nepali; Mandarin/Cantonese/Chinese-Mandarin→Chinese; Russia→Russian. Edit `LANG_MAP` in `scripts/build_data.py` to change them. Respondents naming several languages appear under each one, so language groups overlap.

## Display tweaks vs. the workbook
Two option labels are corrected for display only: "Digitial eBooks" → "Digital eBooks", "Popular, well-know authors" → "Popular, well-known authors".
