# Schema

This folder contains the data schema definitions for the LifeOS Sheets-Sync system.

## Files

### schema.json
Complete JSON schema documenting all Google Sheets:
- **Sheets**: Definitions for all managed sheets (Timesheet, Tasks, Milestones, Projects, Sync_Log, Sync_State, Notion_Import_*, Settings)
- **Columns**: Full column metadata (name, type, description, required, computed, formula)
- **Relationships**: References between sheets (Task_ID, Milestone_ID, Project_ID)
- **Computed Fields**: Formula descriptions for Time Spent and Progress columns

**Use this file to**:
- Understand the data structure
- Validate data imports
- Generate documentation
- Build integrations
- Plan schema migrations

## Data Model

### Master Sheets (Source of Truth)
- `Timesheet` - Processed entries with resolved references
- `Tasks` - Task catalog with time tracking
- `Milestones` - Milestone definitions
- `Projects` - Project definitions

### Import Sheets (Raw Notion Data)
- `Notion_Import_Timesheet` - Raw import from Notion timesheet datasource
- `Notion_Import_Tasks` - Raw import from Notion tasks datasource
- `Notion_Import_Milestones` - Raw import from Notion milestones datasource
- `Notion_Import_Projects` - Raw import from Notion projects datasource

**Data Flow**:
```
Notion Data Sources
        ↓
Notion_Import_* sheets (overwritten on each sync)
        ↓
Comparison & Analysis
        ↓
Timesheet, Tasks, Milestones, Projects (updated)
        ↓
Sync_Log, Sync_State (audit trail)
```

### Operational Sheets
- `Sync_Log` - Audit trail of all sync operations
- `Sync_State` - Batch processing state for recovery
- `Settings` - Configuration for API tokens and Notion mappings

## Key Concepts

### Entity IDs
Each entity type uses a unique identifier:
- Entry_ID (Timesheet)
- Task_ID (Tasks)
- Milestone_ID (Milestones)
- Project_ID (Projects)
- Run_ID (Sync_State)

These IDs come from Notion and are preserved during syncs.

### Denormalization
Timesheet entries denormalize task/milestone/project names for reporting:
```
| Entry_ID | Task_ID | Task       | Milestone_ID | Milestone | Project_ID | Project      |
| 752      | 16      | Toilet     | 30           | Toilet    | 13         | Duty Tasks   |
```

This allows analysis without requiring joins.

### Computed Columns
Three columns are automatically calculated and preserved during syncs:
- `Tasks.Time Spent` - Sum of timesheet entries
- `Milestones.Progress` - Completed/total tasks
- `Projects.Progress` - Completed/total milestones

See [Formulas](../docs/formulas.md) for details.

### Last Synced
All master sheets track when each row was last synced from Notion:
- Helps identify stale data
- Used for conflict detection (not implemented yet)
- Useful for audit trails

## Example Usage

### Read the schema
```bash
cat schema.json | jq '.sheets.Timesheet'
```

### Find computed columns
```bash
cat schema.json | jq '.sheets | map(.columns[] | select(.computed == true))'
```

### Validate data structure
Match your sheets against column definitions in schema.json

## Updates

When the Notion data model changes:
1. Update schema.json with new columns and types
2. Add corresponding example data to examples/
3. Update sync logic in apps-script/ if needed
4. Document changes in docs/

The schema serves as the source of truth for all integrations.
