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
- Frontend script: `docs/absence-alert.js` (matches by employee ID even when that person is missing from the current roster)
- Independent list page (already exists): `docs/roster-diff/index.html` tab **Absence** / الغياب. It reads `absence-data.json` for all dates in the SharePoint file (usually previous months), not the current roster month. Homepage shows absences only as the floating alert, not as a list.
- Data source JSON: `docs/absence-data.json` (this is what the browser fetches; it is **not** Excel in the browser)
- Data builder script: `process_absence.py` — does not filter records to the current roster month
- CI / automation download URL (secret): `ABSENCE_EXCEL_URL` — SharePoint sharing link for the `.xlsb` absence report. The old Excel Online `:x:` guest link now returns “cannot access this document”; CI seeds a guest session from the working `EXPORT_EXCEL_URL` (`ROSTER_UPLOADS/latest.xlsx`) and looks for `absence-report.xlsb` in that same shared folder, plus `AbsenceReports/` and `ABSENCE_UPLOADS/`. Power Automate must **overwrite** `ROSTER_UPLOADS/absence-report.xlsb` (or `AbsenceReports/absence-report.xlsb`) — creating a new uniquely-named file breaks the share — then POST `absence-report-updated`.
- Team reference workbook on SharePoint (human link, same data family as the report): [absence / attendance workbook](https://omanair-my.sharepoint.com/:x:/p/8715_hq/IQCur1yjH3NDSJQ2rsFRsbeEARX8F5eqo8p7d3wxlGeeoao?e=lY4drC)

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
