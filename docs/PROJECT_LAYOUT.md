# Project Layout

This repository has two separate functional sections:

- Export section (الصادر)
- Import section (الوارد)

## 1) Export Section (الصادر)

### Source scripts

- `generate_and_send.py` (main export generator)
- `generate_employee_schedules.py` (employee schedule JSON builder)
- `roster_app/` (shared helpers used by export runtime)

### Data/state

- `rosters/` (cached monthly export roster Excel + metadata)
- `last_filename.txt` (last processed export source name)

### Output

- `docs/index.html`
- `docs/now/index.html`
- `docs/date/*`
- `docs/schedules/*`
- `docs/my-schedules/*`

### Local runners

- `scripts/export/run.ps1`
- `scripts/export/load_local_month.ps1` (local Excel ingestion for export cache)

## 2) Import Section (الوارد)

### Source scripts

- `generate_and_send_import.py` (main import generator)

### Data/state

- `import_last_filename.txt`
- `import_last_hash.txt`

### Output

- `docs/import/index.html`
- `docs/import/now/index.html`
- `docs/import/schedules/*`
- `docs/import/my-schedules/*`

### Local runners

- `scripts/import/run.ps1`

## 3) Shared/Operations

- `scripts/serve_docs.ps1` (local static preview server)
- `scripts/health_check.ps1` (python compile check)
- `archive/` (legacy backups)
- Compatibility wrappers remain in `scripts/*.ps1` and forward to section folders.

## Local-only Policy

- All changes remain local unless `git push` is run explicitly.
- Organizing files does not require publishing to any remote.
