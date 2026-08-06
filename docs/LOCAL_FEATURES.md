# Local Site Features Map

This file documents where each major local site feature is implemented.

## Export / Import Core Pages
- Export generator: `generate_and_send.py`
- Import generator: `generate_and_send_import.py`
- Export output: `docs/index.html`, `docs/now/index.html`, `docs/date/...`
- Import output: `docs/import/index.html`, `docs/import/now/index.html`, `docs/import/YYYY-MM-DD/index.html`

## Employee Identity Isolation
- Export employee key: `exportSavedEmpId` (with legacy migration from `savedEmpId`)
- Import employee key: `importSavedEmpId`
- Export my-schedule UI: `docs/my-schedules/index.html`
- Import my-schedule UI: `docs/import/my-schedules/index.html`

## Absence Alert (Recorded Absence Modal)
- Frontend script: `docs/absence-alert.js`
- Data source JSON: `docs/absence-data.json` (this is what the browser fetches; it is **not** Excel in the browser)
- Data builder script: `process_absence.py`
- CI / automation download URL (secret): `ABSENCE_EXCEL_URL` — direct download link for the `.xlsb` absence report (SharePoint/OneDrive style URL; the script may append `download=1`).
- Team reference workbook on SharePoint (human link, same data family as the report): [absence / attendance workbook](https://omanair-my.sharepoint.com/:x:/p/8715_hq/IQD1R5qA4TnVS7Knr8-YdfzcAYpj0wCOuDb_HSa82slp23Y?e=nfZEPG)

## Floating alert icons (optional)
- Preference key (localStorage): `rosterFloatingAlertDots` — value `"0"` hides the floating envelope (`absence-alert.js`) and the floating change icon (`change-alert.js`) on roster home pages. Any other value or unset = show.
- Toggles appear in the absence modal, in the roster-change card on the home page, and on `docs/roster-diff/index.html`.

## Schedule Change Alert (Compared to Previous Version)
- Frontend script: `docs/change-alert.js`
- Change flags are embedded in employee schedule JSON under `change_alerts`
- Change generation helper: `roster_change_alerts.py`
- Schedule JSON builder: `generate_employee_schedules.py`
- Patch helper used previously: `inject_employee_change_logic.py`

## Eid Greeting Overlay
- Frontend overlay: `docs/eid-overlayxx.js`
- It is loaded conditionally from main pages on configured Eid dates.

## Roster Versions Diff Page (v1 vs v2)
- Local page: `docs/roster-diff/index.html`
- Usage: upload two roster Excel files (v1 + v2), view changed employee/day shift codes.

## Optional Inject/Patch Utilities
- Inject change-alert script tag helper: `inject_change_alerts_html.py`
- Other maintenance scripts: `scripts/` and `archive/ROLLBACK.md`
