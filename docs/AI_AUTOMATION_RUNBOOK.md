# Roster Site Automation Runbook (AI-to-AI)

This document is written for another AI/operator to fully understand, operate, and troubleshoot this project with minimal assumptions.

## 1) Project Purpose

This repository generates and publishes a static duty-roster website to GitHub Pages.

Main outputs:
- Export site pages under `docs/`
- Import site pages under `docs/import/`
- Training pages under `docs/training/`
- Supporting JSON data under `docs/schedules/` and `docs/import/schedules/`

The site is rebuilt automatically by GitHub Actions when source data changes (or on scheduled refresh windows).

---

## 2) Repository Structure (Operational)

- Export generator: `generate_and_send.py`
- Import generator: `generate_and_send_import.py`
- Employee schedule JSON generator: `generate_employee_schedules.py`
- Training sync script: `sync_onedrive_training_root.py`
- Training archive/page generator: `generate_training_archive_pages.py`
- Shared helper package: `roster_app/`
- GitHub workflows: `.github/workflows/*.yml`

Published content root:
- `docs/` (must contain up-to-date generated static files)

---

## 3) GitHub Pages Publishing Mode (Critical)

This repository currently serves pages from the repository path:
- `https://<user>.github.io/<repo>/`

And the generated files are inside:
- `docs/`

If Pages source is configured to repository root instead of `docs`, links can break unless root redirection and path logic are aligned.

Current behavior includes root redirect handling and docs-aware path logic.  
When changing deployment mode, always re-test all primary buttons:
- Import
- Training
- Diff
- My Schedule
- Full Roster

---

## 4) Automation Workflows

## 4.1 Export Workflow

File: `.github/workflows/roster.yml`

Trigger:
- **Primary:** `repository_dispatch` type `export-roster-updated` (Power Automate HTTP after `latest.xlsx` is written)
- **Backup:** `schedule: */10 * * * *` (GitHub often delays this by hours on public repos — do not rely on it for same-day overwrites)
- **Manual:** `workflow_dispatch`

Core logic:
1. Reads current source filename from `EXPORT_SOURCE_NAME_URL`
2. Compares with committed `last_filename.txt` (name) and SHA-256 of `EXPORT_EXCEL_URL` (content)
3. Regenerates when **either** changes, or on `workflow_dispatch` / `repository_dispatch` (no fixed “mandatory hours” gate)
4. Email sends only when name or content changed (not every poll or empty forced refresh)
5. If processing required:
   - runs `generate_and_send.py`
   - runs `generate_employee_schedules.py`
   - commits updated `docs`, `rosters`, and state files using rebase+retry push
6. All docs-pushing workflows share concurrency group `docs-main` so export cannot lose a push to import/training/absence

---

## 4.2 Import Workflow

File: `.github/workflows/import_roster.yml`

Trigger:
- **Primary:** `repository_dispatch` type `import-roster-updated`
- **Backup:** `schedule: */10 * * * *`
- **Manual:** `workflow_dispatch`

Core logic:
1. Reads source filename from `IMPORT_SOURCE_NAME_URL`
2. Compares name against `import_last_filename.txt` and Excel hash under `import-rosters/.versions/`
3. Regenerates when name or content changes (or dispatch / manual)
4. If needed:
   - runs `generate_and_send_import.py`
   - commits updated `docs/import` and state files (rebase+retry, same `docs-main` queue)

---

## 4.3 Training Workflow

File: `.github/workflows/update-training-root-folder.yml`

Trigger:
- `schedule: */30 * * * *`
- manual trigger

Core logic:
1. Pulls remote training source from `TRAINING_PAGE_SOURCE_URL`
2. Syncs content via `sync_onedrive_training_root.py`
3. Rebuilds archive/index pages
4. Commits changes under `docs/training`

---

## 4.4 A Cup of Book Workflow

File: `.github/workflows/update-a-cup-of-book-page.yml`

Trigger:
- on push to related files
- manual trigger

Purpose:
- Rebuilds the A Cup of Book static page from image sources

---

## 5) Required Repository Secrets

Add these in:
`GitHub > Repo > Settings > Secrets and variables > Actions > Repository secrets`

## 5.1 Export
- `EXPORT_EXCEL_URL`  
  Direct downloadable URL to Export Excel.
- `EXPORT_SOURCE_NAME_URL`  
  URL to text content containing current source filename.

## 5.2 Import
- `IMPORT_EXCEL_URL`  
  Direct downloadable URL to Import Excel.
- `IMPORT_SOURCE_NAME_URL`  
  URL to text content containing current import source filename.

## 5.3 Training
- `TRAINING_PAGE_SOURCE_URL`  
  Direct URL used by training sync script.

## 5.4 Site/Linking
- `PAGES_BASE_URL`  
  Base URL used for generated links in notifications/pages.
  Set explicitly to the active Pages URL for this repo.

## 5.5 Email (if email sending is enabled)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `MAIL_TO`

## 5.6 Subscription (if subscription endpoints are used)
- `SUBSCRIBE_URL`
- `SUBSCRIBE_TOKEN`

## 5.7 Optional data sync features
- `ABSENCE_EXCEL_URL`
- `A_CUP_OF_BOOK` (if used by related scripts)

Important:
- Never hardcode secrets in committed code.
- Do not expose secrets in generated `docs/` assets.

---

## 6) OneShare/SharePoint URL Requirements

For stable automation:
- URLs must be non-interactive direct download or plain text endpoints.
- The runner must be able to fetch without browser session cookies.
- `*_SOURCE_NAME_URL` endpoints must return a simple filename text response.

If a workflow starts failing suddenly:
- first suspect expired/changed OneShare links.
- then validate all secrets still exist in the target repository (new repo does not inherit old secrets automatically).

---

## 7) First-Time Setup in a New Repository

1. Push repository content to target repo.
2. Enable GitHub Pages for the intended branch/folder mode.
3. Add all required secrets listed above.
4. Run workflows manually once:
   - `Roster Site + Email`
   - `Import Roster Site (WO/Export)`
   - `Update training docs folder`
5. Confirm generated files are committed by actions.
6. Validate live links from homepage:
   - Import
   - Training
   - Diff
   - My Schedule

---

## 8) Runtime State Files (Do Not Ignore)

These are used by workflows to detect changes:
- `last_filename.txt`
- `import_last_filename.txt`
- related hash/state files in root and data folders

If these are removed/reset:
- workflows may treat next run as first run and trigger full processing.

---

## 9) How Updates Happen in Practice

## New roster uploaded (required Power Automate step)

After **Create file** succeeds (`/ROSTER_UPLOADS/latest.xlsx` + source-name text):

1. HTTP **POST** `https://api.github.com/repos/khalidsaif912/new/dispatches`
2. Headers:
   - `Accept: application/vnd.github+json`
   - `Authorization: Bearer <GitHub PAT>`
   - `X-GitHub-Api-Version: 2022-11-28`
3. Body:
   - Export: `{"event_type":"export-roster-updated"}`
   - Import: `{"event_type":"import-roster-updated"}`
4. PAT: classic `repo` scope, **or** fine-grained **Contents: Read and write** on `khalidsaif912/new`
5. GitHub Actions regenerates and pushes immediately. Cron is only a backup.

Without this HTTP action, same-name overwrites wait for GitHub’s delayed schedule (often hours).

## Same roster filename but content changed
- CI compares **SHA-256** of the Excel bytes and a **logical content fingerprint**
  (cell values) under `rosters/.versions/{YYYY-MM}/`.
- Downloads use cache-busting (`_cb=…`) + `Cache-Control: no-cache` so SharePoint/CDN
  is less likely to serve a stale copy when the file was overwritten in place.
- If either hash or fingerprint differs → regenerate pages + rebuild roster-diff.
- Prefer renaming versions upstream (`Version 5` → `Version 5.1` → `Version 6`) when possible.
- Concurrent docs workflows queue on `docs-main` and `git pull --rebase` before push so a generate is not discarded.

## Training list changed
- Training workflow runs every 30 minutes
- Pulls source, regenerates training pages, commits if changed

---

## 10) Validation Checklist After Any Change

1. `Actions` tab has green runs for the relevant workflow.
2. Latest commit is present on `main`.
3. Live site homepage opens.
4. Buttons route correctly under current repo path:
   - `/import/`
   - `/training/`
   - `/roster-diff/`
   - `/my-schedules/`
5. Date pages and `/now/` pages navigate without 404.

---

## 11) Troubleshooting Matrix

## Symptom: Homepage works, inner buttons fail
- Cause: wrong base path logic for Pages path (`/<repo>` vs `/<repo>/docs` mode).
- Fix:
  - verify current Pages source mode
  - ensure generated pages use correct runtime root detection
  - regenerate and redeploy

## Symptom: No automatic updates
- Cause candidates:
  - Power Automate did not POST `repository_dispatch` after Create file
  - GitHub cron delay (backup only — often hours)
  - missing secrets in this repo
  - invalid OneShare links
  - workflow disabled
  - action failed during fetch/parse **or** (legacy) `git push` lost a race
- Fix:
  - confirm PA HTTP action after Create file (`export-roster-updated` / `import-roster-updated`)
  - check Actions logs
  - test each URL endpoint from runner perspective
  - re-add secrets

## Symptom: Actions run but no commit
- Cause: generated output unchanged or detection skipped.
- Check:
  - `changed`/`should_process` values in workflow logs
  - cache/state filename files

## Symptom: Email not sent
- Check SMTP secrets and mail recipient settings.
- Confirm `should_send_email` branch was true in logs.

---

## 12) Recommended Hardening (Future)

- Move fixed base URL fallback away from old repository naming.
- Centralize base-path helper in generator templates to avoid drift.
- Add post-deploy URL smoke test workflow.
- Add workflow alerts on repeated failures.

---

## 13) Operator Notes for AI Agents

When maintaining this project:
- Prefer updating generators over patching many generated files manually.
- If links break globally, inspect deployment base mode first (Pages source/path).
- Keep commits scoped and descriptive (export/import/training path fixes separately).
- After path-related changes, test both local and GitHub Pages behavior.

