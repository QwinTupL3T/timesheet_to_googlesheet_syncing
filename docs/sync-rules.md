# Sync Rules

This document describes how the LifeOS Sheets-Sync system synchronizes data between Notion and Google Sheets.

## Overview

The sync process operates in two modes:
- **Dry Run**: Analyzes changes without writing to sheets or Notion
- **Live Sync**: Writes all changes and marks rows as synced in Notion

## Sync Flow

1. **Fetch** - Retrieve raw data from Notion data sources
2. **Import** - Populate Notion_Import_* sheets with raw data
3. **Analyze** - Compare against existing sheets to identify changes
4. **Merge** - Write changes to Tasks, Milestones, Projects, and Timesheet sheets
5. **Mark** - Update Notion synced flags in batches
6. **Log** - Record sync summary in Sync_Log

## Entity Sync Rules

### Timesheet Entries

- **ID Field**: `Entry_ID`
- **Duplicate Detection**: Entry IDs already in Timesheet sheet are skipped
- **Eligible Criteria**: Must have a non-empty `Entry_ID`
- **Write Behavior**: Append new entries to end of sheet
- **Notion Update**: Mark row as `Synced = true`

### Tasks

- **ID Field**: `Task_ID`
- **On Insert**: Add new task rows with empty `Time Spent` (computed) and current `Last Synced` date
- **On Update**: Merge changes while **preserving** the `Time Spent` value
- **Rename Detection**: If task name differs between Notion and sheet, increment `tasksRenamed` counter
- **Fields Compared**: task, milestone (ID + name), project (ID + name), why, description, due, estimate, status

### Milestones

- **ID Field**: `Milestone_ID`
- **On Insert**: Add new milestone rows with empty `Progress` (formula) and current `Last Synced` date
- **On Update**: Merge changes while **preserving** the `Progress` value
- **Rename Detection**: If milestone name differs, increment `milestonesRenamed` counter
- **Fields Compared**: milestone, project (ID + name), status, targetDate, notes, dutyTask

### Projects

- **ID Field**: `Project_ID`
- **On Insert**: Add new project rows with empty `Progress` (formula) and current `Last Synced` date
- **On Update**: Merge changes while **preserving** the `Progress` value
- **Rename Detection**: If project name differs, increment `projectsRenamed` counter
- **Fields Compared**: project, objective, definitionOfDone, status, stage, hardDeadline, softDeadline, areas, resources

## Field Normalization

Before comparing field values, the system applies `normalizeForCompare_()`:

1. Convert null/undefined to empty string
2. Convert dates to `yyyy-MM-dd` format
3. Replace non-breaking spaces with regular spaces
4. Collapse multiple spaces into single space
5. Trim leading/trailing whitespace

This ensures cosmetic differences don't trigger false updates.

## Batch Processing

Timesheet entries are synced in batches (default 25 entries per batch):

1. Batch metadata is written to Sync_State sheet with status `PENDING`
2. Entries are appended to Timesheet sheet
3. Status updated to `IN_PROGRESS` with starting row number
4. Notion rows are marked synced in batches
5. Status updated to `SYNCED` on success
6. On failure, existing batch rolls back

See [Rollback Rules](rollback-rules.md) for recovery procedures.

## Bandwidth Management

Notion API has strict bandwidth quotas. The sync system:

- Spreads Notion PATCH requests with 5ms delays between requests
- Uses exponential backoff (500ms × 2^attempt) on rate-limit errors
- Retries up to 3 times on temporary failures
- Caps batch size at 25 entries to avoid quota violations

If you encounter "Bandwidth quota exceeded" errors:
- Reduce batch size in Constants
- Increase sleep delays
- Run fewer concurrent syncs
- Request quota increase from Notion if available

## Comparison Strategy

Changes are detected entity-by-entity using generic helpers:

- `compareEntityFields_()` - Checks if any field differs when normalized
- `analyzeEntityRows_()` - Processes all rows, categorizes as new/updated, tracks renames

This allows schema changes without rewriting comparison logic.
