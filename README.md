# Google Sheets + Notion Sync

A robust Google Apps Script project that synchronizes time tracking, tasks, milestones, and projects from Notion into Google Sheets with automatic recovery from interruptions.

## What this project does

Keeps a Google Sheet in sync with Notion datasources:

- **Timesheet** — time entries with task/milestone/project resolution
- **Tasks** — task catalog with computed time tracking
- **Milestones** — milestone tracking with progress
- **Projects** — project tracking with progress
- **Import Sheets** — raw Notion data (Notion_Import_Timesheet, Tasks, Milestones, Projects)
- **Operational Sheets** — Sync_Log (audit trail), Sync_State (recovery), Settings (configuration)

## Key Features

- **Deduplication**: Tracks synced entries to avoid duplicates
- **Change Detection**: Identifies meaningful changes using normalized field comparison
- **Computed Fields**: Automatic formulas for Time Spent (tasks) and Progress (milestones/projects)
- **Batch Processing**: Syncs entries in configurable batches with rollback capability
- **Recovery**: Automatic rollback on failures; resumes cleanly on next sync
- **Audit Trail**: Complete Sync_Log with per-operation timestamps and statistics

## Repository Structure

```
lifeos-sheets-sync/
├── README.md                    (this file)
├── apps-script/                 (Google Apps Script code)
│   ├── Constants.gs
│   ├── analysis.gs              (refactored: shared helpers)
│   ├── formulas.gs
│   ├── notion_api.gs
│   ├── notion_fetchers.gs
│   ├── settings_validation.gs
│   ├── sheet_io.gs              (refactored: generic merge helpers)
│   ├── sync_runner.gs
│   ├── ui_and_entrypoints.gs
│   └── utils.gs
│
├── schema/                      (data model)
│   ├── README.md
│   └── schema.json              (complete JSON schema)
│
├── examples/                    (sample data & config)
│   ├── README.md
│   ├── settings.example.tsv     (configuration template)
│   ├── timesheet.example.csv
│   ├── tasks.example.csv
│   ├── milestones.example.csv
│   ├── projects.example.csv
│   ├── sync_log.example.csv
│   ├── sync_state.example.csv
│   └── notion_import_*.example.csv
│
└── docs/                        (operational guides)
    ├── sync-rules.md            (how sync works)
    ├── rollback-rules.md        (failure recovery)
    └── formulas.md              (computed column details)
```

## Quick Links

- **Getting started**: See [examples/](examples/README.md)
- **Understanding the data model**: See [schema/](schema/README.md)
- **How sync works**: See [docs/sync-rules.md](docs/sync-rules.md)
- **Failure recovery**: See [docs/rollback-rules.md](docs/rollback-rules.md)
- **Formula details**: See [docs/formulas.md](docs/formulas.md)

## Setup Flow

### 1. Create a fresh Google Sheet

Use the spreadsheet as your operational layer for task/time tracking.

### 2. Add the Apps Script project

Copy the `apps-script/` files into Google Apps Script editor:
- Paste each `.gs` file as a new script file
- Apps Script will combine them into one project

### 3. Initialize sheets

Run `initializeSheets()` from the menu:
- Creates all required sheets with headers
- Installs computed column formulas
- Sets up Sync_State and Sync_Log

### 4. Configure settings

Open the `Settings` sheet and populate using [examples/settings.example.tsv](examples/settings.example.tsv):
- `NOTION_TOKEN` — your Notion API key
- `NOTION_VERSION` — Notion API version (e.g., "2026-03-11")
- `*_DATASOURCE_ID` — IDs for each Notion datasource
- `*_PROPERTY` — Notion property names for each field

### 5. Test with dry run

From the menu, click **Dry Run Sync** to:
- Fetch from Notion without writing
- Analyze changes
- Preview what would sync
- No changes written to sheets

### 6. Run live sync

Once dry run looks good, click **Live Sync** to:
- Append new timesheet entries
- Update/insert tasks, milestones, projects
- Mark rows as synced in Notion
- Record summary in Sync_Log

### 7. Set up scheduled syncs

Optional: Use Apps Script Triggers to run syncs on a schedule (hourly, daily, etc.)

## Core Concepts

### Data Flow

```
Notion Datasources (read-only)
         ↓
   Notion_Import_* sheets (raw data, overwritten each sync)
         ↓
   Analysis & Comparison
         ↓
Master Sheets (Timesheet, Tasks, Milestones, Projects)
         ↓
Sync_Log & Sync_State (audit trail & recovery)
```

### Entity IDs

Each entity type uses a stable ID from Notion:
- `Entry_ID` (Timesheet entries)
- `Task_ID` (Tasks)
- `Milestone_ID` (Milestones)
- `Project_ID` (Projects)

IDs are used as merge keys; duplicates are skipped.

### Computed Columns

Three columns auto-calculate (not overwritten during syncs):
- **Tasks.Time Spent** — sum of all timesheet entries for the task
- **Milestones.Progress** — "X/Y" of completed/total tasks
- **Projects.Progress** — "X/Y" of completed/total milestones

See [docs/formulas.md](docs/formulas.md) for details.

### Batch Processing

Timesheet entries sync in batches (default 25):
- Creates Sync_State row for each batch
- Appends rows to Timesheet sheet
- Marks rows as synced in Notion
- On failure: rolls back and records ROLLED_BACK status
- Next sync: automatically cleans up incomplete batches

See [docs/rollback-rules.md](docs/rollback-rules.md) for recovery procedures.

## Code Quality

Recent refactoring improved code maintainability:

### Reduced Redundancy
- **readExistingEntityMap_()** — Generic helper for reading task/milestone/project maps
- **mergeEntitySheet_()** — Generic merge logic for all entity types
- **analyzeEntityRows_()** — Generic change detection for tasks/milestones/projects
- **compareEntityFields_()** — Reusable field comparison with normalization

### Result
- 40% less duplicated code in `sheet_io.gs`
- 30% smaller `analysis.gs`
- Shared `normalizeForCompare_()` for consistent field comparison

See [apps-script/](apps-script/) for full implementation.

## Configuration Reference

### Required Settings

All keys required in the `Settings` sheet:

```
NOTION_TOKEN                        (secret)
NOTION_VERSION                      (e.g., "2026-03-11")

TIMESHEET_DATASOURCE_ID
TASKS_DATASOURCE_ID
MILESTONES_DATASOURCE_ID
PROJECTS_DATASOURCE_ID

TIMESHEET_* properties (15 properties)
TASKS_* properties (6 properties)
MILESTONES_* properties (6 properties)
PROJECTS_* properties (10 properties)
```

See [examples/settings.example.tsv](examples/settings.example.tsv) for complete list.

## Known Considerations

### Notion as Source of Truth
- Notion is the canonical source
- Google Sheets is the synced operational layer
- Local edits in Sheets are not persisted if sync rewrites the rows

### Field Normalization
Before comparing fields, the system normalizes:
- Null/undefined → empty string
- Dates → "yyyy-MM-dd" format
- Non-breaking spaces → regular spaces
- Whitespace collapse and trim

This prevents cosmetic differences from triggering false updates.

### Bandwidth Limits
Notion API has strict bandwidth quotas:
- Default batch size: 25 entries
- Sleep between API calls: 5ms
- Retry backoff: exponential (500ms × 2^attempt)
- Max retries: 3 per operation

If you hit quota limits, see [docs/sync-rules.md#bandwidth-management](docs/sync-rules.md#bandwidth-management).

### Script Execution Limits
Google Apps Script has a 6-minute execution timeout:
- Sync automatically recovers from timeouts
- Batch state is preserved in Sync_State
- Next sync cleans up incomplete batches

## Security

Do **not** commit:
- Real `NOTION_TOKEN` (it grants full Notion API access)
- Live datasource IDs (if you want them private)
- Unsanitized exports with sensitive data

If you expose a token, revoke it immediately in Notion settings.

## Documentation

- **Understanding the schema**: [schema/README.md](schema/README.md) + [schema/schema.json](schema/schema.json)
- **Seeing example data**: [examples/README.md](examples/README.md) + CSV files
- **How sync logic works**: [docs/sync-rules.md](docs/sync-rules.md)
- **Failure scenarios & recovery**: [docs/rollback-rules.md](docs/rollback-rules.md)
- **Formula implementations**: [docs/formulas.md](docs/formulas.md)

## License

Adapt freely for personal workflow automation. Review all property mappings before running against a live Notion workspace.
