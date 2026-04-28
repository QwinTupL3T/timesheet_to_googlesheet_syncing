# LifeOS Sheets-Sync Documentation & Examples

This folder contains comprehensive documentation and example data files for the LifeOS Sheets-Sync system.

## Directory Structure

```
lifeos-sheets-sync/
├── schema/                          # Data schema definitions
│   ├── README.md
│   └── schema.json                  # Complete data model
│
├── examples/                        # Sample data files
│   ├── settings.example.tsv         # Configuration template
│   ├── timesheet.example.csv        # Processed timesheet entries
│   ├── tasks.example.csv            # Task definitions
│   ├── milestones.example.csv       # Milestone definitions
│   ├── projects.example.csv         # Project definitions
│   ├── sync_log.example.csv         # Sync audit trail
│   ├── sync_state.example.csv       # Batch state tracking
│   ├── notion_import_timesheet.example.csv  # Raw Notion import
│   ├── notion_import_tasks.example.csv
│   ├── notion_import_milestones.example.csv
│   └── notion_import_projects.example.csv
│
└── docs/                            # Operational documentation
    ├── sync-rules.md                # Sync behavior and logic
    ├── rollback-rules.md            # Recovery procedures
    └── formulas.md                  # Computed column definitions
```

## Quick Start

### 1. Understand the Data Model
→ [Schema Documentation](schema/README.md)
- Master sheets, import sheets, and relationships
- All column definitions and types
- Computed columns and formulas

### 2. See Real Examples
→ [Example Data](examples/)
- Actual sample data from working sync
- All 11 sheets with realistic values
- Settings configuration template

### 3. Learn the Rules
→ [Sync Rules](docs/sync-rules.md)
- How data is fetched, compared, and merged
- Entity-specific behavior
- Field normalization and batch processing

### 4. Understand Recovery
→ [Rollback Rules](docs/rollback-rules.md)
- Failure scenarios and detection
- Automatic and manual recovery
- Testing procedures

### 5. Formula Details
→ [Formulas](docs/formulas.md)
- Time Spent calculation
- Milestone/Project progress tracking
- Setup and troubleshooting

## Key Concepts

### Data Flow
```
Notion Datasources (read-only)
         ↓
   Notion_Import_* sheets (raw data)
         ↓
   Analysis & Comparison
         ↓
Master Sheets (Timesheet, Tasks, Milestones, Projects)
         ↓
Sync_Log & Sync_State (audit trail)
```

### Master Sheets
- **Timesheet**: All time entries with resolved task/milestone/project names
- **Tasks**: Task catalog with computed time tracking
- **Milestones**: Milestone definitions with progress tracking
- **Projects**: Project definitions with progress tracking

These are the source of truth for queries and reporting.

### Entity IDs
Each entity type has a unique identifier from Notion:
- `Entry_ID` (Timesheet)
- `Task_ID` (Tasks)
- `Milestone_ID` (Milestones)
- `Project_ID` (Projects)

### Computed Columns
Three columns calculate automatically (not overwritten by sync):
- `Tasks.Time Spent` = SUMIF of Timesheet entries
- `Milestones.Progress` = "completed/total" tasks
- `Projects.Progress` = "completed/total" milestones

### Batch Processing
Timesheet entries are synced in batches (default 25) with rollback capability:
- Each batch recorded in Sync_State sheet
- Failed batches can be automatically recovered
- See [Rollback Rules](docs/rollback-rules.md) for details

## Common Tasks

### Review Sync History
→ Open examples/sync_log.example.csv
- See what synced when
- Identify failures and warnings
- Track batch processing

### Check Current Configuration
→ Open examples/settings.example.tsv
- Notion datasource IDs
- Property name mappings
- API token (sanitized in example)

### Understand Task Time Tracking
→ See examples/timesheet.example.csv + examples/tasks.example.csv
- Each timesheet entry links to a task
- Task.Time Spent sums all entries
- Useful for burndown charts

### Verify Schema Compliance
→ Compare your sheets against schema/schema.json
- Column names and types
- Required vs optional fields
- Computed columns

### Test Failure Scenarios
→ Follow [Rollback Rules](docs/rollback-rules.md)
- Simulate timeout or API failure
- Verify automatic recovery
- Manual cleanup procedures

## Configuration

The `Settings` sheet stores configuration:

```
Key: NOTION_TOKEN
Value: ntn_xxxxxxxxxxxxxxxxxxxxxxxxx

Key: TIMESHEET_DATASOURCE_ID
Value: your-timesheet-datasource-id

Key: TASKS_DATASOURCE_ID
Value: your-tasks-datasource-id

... (more settings)
```

See examples/settings.example.tsv for full configuration template.

### Required Settings

You must set these before first sync:
- `NOTION_TOKEN` - Bearer token for Notion API
- `NOTION_VERSION` - Notion API version (e.g., "2026-03-11")
- `*_DATASOURCE_ID` - IDs for each Notion datasource
- `*_PROPERTY` - Notion property names for each field

## Troubleshooting

### Sync fails with "Bandwidth quota exceeded"
→ See [Sync Rules - Bandwidth Management](docs/sync-rules.md#bandwidth-management)
- Reduce batch size
- Increase sleep delays
- Spread syncs further apart

### Entries appear in Notion_Import but not Timesheet
→ Check [Sync Rules - Entity Sync Rules](docs/sync-rules.md#entity-sync-rules)
- Verify Entry_ID is not empty
- Check for duplicate Entry_IDs
- Review Sync_Log for errors

### Time Spent formula shows #REF! error
→ See [Formulas - Troubleshooting](docs/formulas.md#troubleshooting)
- Check sheet names are correct
- Verify column positions
- Reinstall formulas via initializeSheets()

### Sync interrupted mid-batch
→ See [Rollback Rules - Recovery](docs/rollback-rules.md#recovery---automatic-next-sync)
- Next sync automatically recovers
- Sync_State marks batch as ROLLED_BACK
- No manual cleanup needed

## For Questions

Refer to:
1. **Data structure**: [schema/README.md](schema/README.md)
2. **Sync behavior**: [docs/sync-rules.md](docs/sync-rules.md)
3. **Recovery actions**: [docs/rollback-rules.md](docs/rollback-rules.md)
4. **Formulas**: [docs/formulas.md](docs/formulas.md)
5. **Example data**: [examples/](examples/)

All documentation is designed to be clear and actionable.
