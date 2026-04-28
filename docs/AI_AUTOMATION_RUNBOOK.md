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
- `schedule: */10 * * * *` (every 10 minutes)
- manual trigger via `workflow_dispatch`

Core logic:
1. Reads current source filename from `EXPORT_SOURCE_NAME_URL`
2. Compares with cached `last_filename.txt`
3. Decides:
   - `changed = true` if filename differs
   - also supports mandatory refresh hours
4. If processing required:
   - runs `generate_and_send.py`
   - runs `generate_employee_schedules.py`
   - commits updated `docs`, `rosters`, and state files

---

## 4.2 Import Workflow

File: `.github/workflows/import_roster.yml`

Trigger:
- `schedule: */10 * * * *`
- manual trigger

Core logic:
1. Reads source filename from `IMPORT_SOURCE_NAME_URL`
2. Compares against `import_last_filename.txt`
3. If needed:
   - runs `generate_and_send_import.py`
   - commits updated `docs/import` and state files

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

## New roster uploaded
- Source filename changes at `*_SOURCE_NAME_URL`
- Next scheduled run detects diff
- Generator rebuilds site
- Action commits and pushes
- GitHub Pages deploys new static output

## Same roster filename but content changed
- If filename does not change, automatic detection may miss change.
- Mitigations:
  - enforce filename versioning upstream, or
  - rely on mandatory refresh windows, or
  - implement hash-based compare (future enhancement).

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
  - missing secrets in this repo
  - invalid OneShare links
  - workflow disabled
  - action failed during fetch/parse
- Fix:
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
- Add hash-based source comparison (not filename-only).
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

