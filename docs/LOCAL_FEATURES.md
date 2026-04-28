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
- Data source JSON: `docs/absence-data.json`
- Data builder script: `process_absence.py`
- External source variable: `ABSENCE_EXCEL_URL`

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
