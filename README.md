# Google Sheets + Notion Sync

Schema contracts, sample exports, and configuration templates for a Google Apps Script project that syncs structured data from Notion into Google Sheets.

## What this repo contains

This repository stores the **schema and setup contract** for the sync layer, so the project can be versioned in GitHub without committing live secrets or depending on one specific spreadsheet state.

The sync currently works across these logical datasets:

- **Timesheet** — work log / activity entries
- **Tasks** — canonical task list
- **Milestones** — canonical milestone list
- **Projects** — canonical project list
- **Raw Notion imports** — snapshots of fetched rows before canonical merge
- **Sync log** — execution history and failures
- **Settings** — property mapping and datasource configuration

## Why these files exist

Google Sheets and Notion are operational tools, but GitHub should hold the durable setup contract:

- expected sheet/tab schemas
- expected Notion property mappings
- required settings keys
- safe example config
- sanitized sample exports for testing and documentation

This makes the project easier to:
- rebuild on a fresh spreadsheet
- review in pull requests
- debug sync issues
- onboard later without reverse-engineering the sheet manually

## Repository files

### Schema and config
- `sheets-schema.json` — canonical tab names and headers
- `settings-required.json` — required settings keys for the Apps Script
- `settings.example.json` — safe example config with placeholders instead of secrets
- `notion-schema.contract.json` — expected Notion database/property contract

### Sample exports
- `timesheet_sample.csv`
- `tasks_sample.csv`
- `milestones_sample.csv`
- `projects_sample.csv`
- `notion_import_timesheet_sample.csv`
- `notion_import_tasks_sample.csv`
- `notion_import_projects_sample.csv`
- `sync_log_sample.csv`

These samples are **sanitized fixtures**, useful for documentation and tests.

## Expected sheet structure

### Canonical tabs
- `Timesheet`
- `Tasks`
- `Milestones`
- `Projects`

### Raw import tabs
- `Notion_Import_Timesheet`
- `Notion_Import_Tasks`
- `Notion_Import_Projects`

### Utility tabs
- `Settings`
- `Sync_Log`

## Settings model

The Apps Script reads the `Settings` tab as key/value pairs.

It expects:
- Notion auth/version settings
- datasource IDs for each database
- property name mappings for Timesheet / Tasks / Milestones / Projects

Use `settings-required.json` as the full required key list.

Use `settings.example.json` as the starter template.

## Security note

Do **not** commit:
- real `NOTION_TOKEN`
- live datasource IDs if you want them private
- personal spreadsheet URLs
- unsanitized exports with sensitive data

If a real token was ever exposed, rotate it before using the project again.

## Setup flow

1. Create a fresh Google Sheet.
2. Add the Apps Script project.
3. Initialize tabs and headers from the script.
4. Populate the `Settings` tab using `settings.example.json`.
5. Replace placeholder values with real datasource IDs and property names.
6. Run a dry sync first.
7. Verify raw imports and canonical tabs.
8. Run live sync.

## Data model notes

The sync is designed as **Notion -> Google Sheets**.

That means:
- Notion is the upstream source of truth
- Google Sheets is the synced operational/reporting layer
- local edits in Sheets are not guaranteed to persist if sync rewrites the affected rows

## Progress fields

Current progress fields are stored as display values like:

- milestone progress: `done_tasks/total_tasks`
- project progress: `done_milestones/total_milestones`

## Known implementation assumptions

- IDs are used as the stable merge keys
- display names should come from rollups/formulas that resolve to readable text, not raw relation references
- sheet headers are the internal schema contract
- Notion property names are configurable through the `Settings` tab

## Suggested commit message

Recommended initial commit title:

`chore: add schema contracts and sample exports for Notion Sheets sync`

Other good options:
- `chore: add github-safe schemas, config template, and sample exports`
- `docs: add readme and schema fixtures for notion sheets sync`
- `chore: version sync schemas and sanitized csv exports`

## License / usage

Adapt freely for personal workflow automation, but review all property mappings before running against a live Notion workspace.
