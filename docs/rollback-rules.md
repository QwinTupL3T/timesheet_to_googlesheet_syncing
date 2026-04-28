# Rollback Rules

This document describes how the system recovers from interrupted syncs and rolls back partial changes.

## Rollback Scenarios

### Scenario 1: Timesheet Batch Sync Interrupted

**Situation**: Batch of timesheet entries was appended to Timesheet sheet, but Notion marking failed

**Detection**:
- On next sync, `recoverInterruptedTimesheetBatches_()` scans Sync_State sheet
- Looks for batches with status `PENDING` or `IN_PROGRESS` (not `SYNCED` or `ROLLED_BACK`)

**Recovery Process**:
1. Read `Start_Row` and `Row_Count` from interrupted batch
2. Delete rows from Timesheet sheet using `deleteRows(Start_Row, Row_Count)`
3. If Notion marking partially succeeded, `markNotionRowsUnsyncedBatch_()` unmarks synced rows
4. Update Sync_State with status `ROLLED_BACK`
5. Retry sync on next run (entries will be fetched again from Notion)

### Scenario 2: Notion API Fails During Marking

**Situation**: All timesheet entries appended to sheet, but PATCH request to Notion failed mid-batch

**Detection**:
- Exception caught in `withRetry_()` after max retry attempts
- Batch status remains `IN_PROGRESS`

**Recovery**:
```
withRetry_(() => {
  notionPatchPageProperties_(pageId, { Synced: true }, settings)
}, 3)  // Retries up to 3 times with exponential backoff
```

If all retries exhaust:
1. Exception bubbles up to sync runner
2. Rollback handler deletes previously appended rows
3. Marks batch as `ROLLED_BACK`
4. Notion rows are marked `Synced = false` to retry next sync

### Scenario 3: Script Timeout During Batch Loop

**Situation**: Apps Script execution timeout (6-minute limit) during batch processing

**Detection**:
- Sync script terminates unexpectedly
- Sync_State has batches with `IN_PROGRESS` status

**Recovery - Manual**:
1. Check Sync_Log for `Status = Failed`
2. Review Sync_State for incomplete batches
3. Manually delete corresponding rows from Timesheet sheet
4. Run sync again - entries will be re-fetched

**Recovery - Automatic (Next Sync)**:
```javascript
recoverInterruptedTimesheetBatches_(settings)
// Runs at start of every sync
// Cleans up any incomplete batches
```

## Rollback Operations

### appendTimesheetBatch_(rows)
```javascript
const startRow = sheet.getLastRow() + 1;
sheet.getRange(startRow, 1, rows.length, HEADERS.TIMESHEET.length).setValues(rows);
return startRow;  // Return starting row for rollback
```

### rollbackTimesheetBatchAppend_(startRow, rowCount)
```javascript
sheet.deleteRows(startRow, rowCount);
```

### markNotionRowsUnsyncedBatch_(pageIds, settings)
```javascript
// Sets Synced property to false on Notion pages
pageIds.forEach((pageId) => {
  notionPatchPageProperties_(pageId, {
    [settings.TIMESHEET_SYNCED_PROPERTY]: { checkbox: false }
  }, settings);
});
```

## Sync State Transitions

```
PENDING -> IN_PROGRESS -> SYNCED (success)
       \            \_> ROLLED_BACK (failure)
        \_> ROLLED_BACK (interrupted)
```

- **PENDING**: Batch created, ready to process
- **IN_PROGRESS**: Sheet write succeeded, marking Notion in progress
- **SYNCED**: All operations completed successfully
- **ROLLED_BACK**: Recoverable failure, batch cleaned up

## Prevention Strategies

### 1. Enable Batch Size Capping
Keep batch size small (default 25) to fit within script execution time limits.

### 2. Use Dry Run First
Always run Dry Run before Live Sync to validate:
```
Call dryRunSync() first -> Review analysis -> Call liveSync()
```

### 3. Monitor Bandwidth
Check Sync_Log for "Bandwidth quota exceeded" errors:
- Increase sleeps between API calls
- Reduce batch size
- Schedule syncs further apart

### 4. Script Lock Protection
All sync operations use `withScriptLock_()`:
```javascript
if (!lock.tryLock(30000)) {
  throw new Error('Could not obtain script lock. Another sync may already be running.');
}
```
This prevents concurrent syncs from corrupting data.

## Testing Rollback

To test rollback behavior:

1. **Simulate Timeout**:
   - Run Live Sync with small timeout
   - Script will terminate mid-sync
   - Run next sync - `recoverInterruptedTimesheetBatches_()` should clean up

2. **Simulate API Failure**:
   - Modify settings with invalid Notion token
   - Run Live Sync
   - `withRetry_()` will exhaust retries
   - Rollback handler activates

3. **Verify State**:
   - Check Sync_Log for failure entry
   - Check Sync_State for `ROLLED_BACK` batch
   - Verify Timesheet sheet wasn't modified
   - Verify Notion rows unmarked

## Limits and Assumptions

- **Rollback is row-oriented**: Only Timesheet entries are rolled back (Tasks/Milestones/Projects are not batched)
- **Notion API idempotency**: Marking `Synced = true` multiple times is safe
- **Sheet row deletion**: Assumes deleted rows don't affect formula references
- **Lock timeout**: 30-second lock timeout may be insufficient for large batches

Consider these limits when designing custom workflows.
