# Project Context (Local)

This file keeps important decisions and structure notes so project context is not lost between chats or app restarts.

## Goal

Keep `roster-site` clean and organized with safe, local-only refactoring.

## Current Structure

- Export section (الصادر): `generate_and_send.py`, `generate_employee_schedules.py`, `roster_app/`, `rosters/`, output in `docs/`.
- Import section (الوارد): `generate_and_send_import.py`, output in `docs/import/`.
- `docs/PROJECT_LAYOUT.md`: section-level folder map and responsibilities.
- `archive/`: backups and legacy files/folders moved out of active paths.

## Safety Rules

- Do not push to remote unless explicitly requested.
- Prefer archive/move over permanent delete for legacy source files.
- Remove generated cache files (`__pycache__`, `*.pyc`) when cleaning.
- Keep runtime state files in root unless code is updated to read new paths.

## Session Notes

- Repository lives in: `C:\Users\PC\Documents\GitHub\roster-site`.
- Existing cleanup was already started before this session (archive + helper module extraction).
- `__pycache__` bytecode files were removed in this session.
- Repository root was flattened to: `C:\Users\PC\Documents\GitHub\roster-site`.
- Added local helper scripts under `scripts/` for site preview and health checks.
- Added section-specific runners: `scripts/export_run.ps1` and `scripts/import_run.ps1`.

## Next Cleanup Steps (Optional)

- Add a small `scripts/` folder for maintenance commands.
- Add `docs/PROJECT_LAYOUT.md` with a full folder map.
- Add a quick health check command to validate import + run flow.
