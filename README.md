# roster-site

Local roster generator and static site publisher.

This repository is currently maintained with a "safe refactor" approach:
- Keep behavior unchanged.
- Apply small local-only improvements.
- Verify after each step.

## Requirements

- Python 3.10+ (tested locally with Python 3.13)
- Dependencies from `requirements.txt`

Install dependencies:

```bash
pip install -r requirements.txt
```

## Project Sections

The project is split into two independent sections:

- Export (الصادر): `generate_and_send.py` -> outputs under `docs/`
- Import (الوارد): `generate_and_send_import.py` -> outputs under `docs/import/`

Detailed layout: `docs/PROJECT_LAYOUT.md`

## Environment Variables

The script reads these variables:

- `EXCEL_URL` (required): source Excel file URL
- `SMTP_HOST` (required): SMTP server host
- `SMTP_PORT` (optional, default `587`)
- `SMTP_USER` (required): SMTP username
- `SMTP_PASS` (required): SMTP password
- `MAIL_FROM` (required): sender address
- `MAIL_TO` (optional fallback): fallback recipient when subscribers are unavailable
- `PAGES_BASE_URL` (optional): base URL for generated page links

## Local Run

Run with current date:

```bash
python generate_and_send.py
```

Run for a specific roster date:

```bash
python generate_and_send.py --date 2026-04-27
```

Run Export via helper script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\export\run.ps1 -Date "2026-04-27" -NoEmail
```

Run Import section locally:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import\run.ps1 -ImportExcelUrl "<IMPORT_EXCEL_URL>"
```

Run Import section from a local Excel file:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import\run.ps1 -ExcelFilePath ".\import-rosters\import_april.xlsx" -SourceName "Import April 2026.xlsx"
```

## Local Site Preview

Serve `docs/` on an isolated local port:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\serve_docs.ps1
```

Use a custom port:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\serve_docs.ps1 -Port 8020
```

## Health Check

Run a quick local syntax/compile check:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\health_check.ps1
```

## Import Local Roster (No Email)

If you have a local monthly Excel file (for example April), import and regenerate locally:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\export\load_local_month.ps1 -ExcelFilePath ".\EXP\April_2026.xlsx" -MonthKey "2026-04" -RosterDate "2026-04-27"
```

This updates local cache (`rosters/`), rebuilds `docs/` pages, and regenerates employee schedules without sending email.

## Output Notes

- Generates pages under `docs/` (including `docs/now/`).
- Uses cached monthly roster files when download is unavailable.
- Sends email for the active shift group.

## Scope

All changes in this workflow are local unless you explicitly run git push.

## Project Memory

For persistent local context across sessions, see `PROJECT_CONTEXT.md`.