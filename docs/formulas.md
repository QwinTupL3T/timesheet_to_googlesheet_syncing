# Formulas

This document describes the computed columns in each sheet.

## Overview

Three sheets have computed columns that automatically calculate derived values:
- **Tasks**: `Time Spent`
- **Milestones**: `Progress`
- **Projects**: `Progress`

These columns use Google Sheets formulas and are automatically updated when the source data changes.

## Time Spent (Tasks sheet)

**Column**: `L` (12th column)

**Purpose**: Sum of all timesheet entries logged against each task

**Formula**:
```
=SUMIF(Timesheet!$G:$G, $A2, Timesheet!$B:$B)
```

**Breakdown**:
- `Timesheet!$G:$G` - Task_ID column in Timesheet sheet
- `$A2` - Task_ID in current row
- `Timesheet!$B:$B` - Time spent column in Timesheet sheet

**Result**: Total minutes spent on the task

**Example**:
```
Task_ID = 16 (Toilet)
Timesheet entries with Task_ID = 16:
  - 27 minutes
  - 52 minutes
  - 16 minutes
Time Spent = 27 + 52 + 16 = 95 minutes
```

**Preservation**: Sync system does NOT overwrite Time Spent during updates

**Update Triggers**: Automatically recalculates when:
- New timesheet entries added
- Time spent values modified in Timesheet
- Task_ID values change

## Progress (Milestones sheet)

**Column**: `I` (9th column)

**Purpose**: Track milestone completion as fraction of subtasks completed

**Formula**:
```
=COUNTIFS(Tasks!$C:$C, $A2, Tasks!$L:$L, "Done") & "/" & COUNTIF(Tasks!$C:$C, $A2)
```

**Breakdown**:
- Count tasks linked to this milestone (`Tasks!$C:$C` = Milestone_ID) with status "Done"
- Count total tasks linked to this milestone
- Format as "X/Y"

**Result**: "completed/total" format

**Example**:
```
Milestone_ID = 4 (Timesheet setup)
Tasks linked to milestone 4:
  - Task 12: Status = Done ✓
  - Task 7: Status = Todo ✗
  - Task 10: Status = Done ✓
  - Task 8: Status = Todo ✗
Progress = 2/4
```

**Preservation**: Sync system does NOT overwrite Progress during updates

**Update Triggers**: Automatically recalculates when:
- Tasks added/removed
- Task status changed
- Task milestone assignment changed

## Progress (Projects sheet)

**Column**: `K` (11th column)

**Purpose**: Track project completion as fraction of milestones completed

**Formula**:
```
=COUNTIFS(Milestones!$C:$C, $A2, Milestones!$E:$E, "Done") & "/" & COUNTIF(Milestones!$C:$C, $A2)
```

**Breakdown**:
- Count milestones linked to this project (`Milestones!$C:$C` = Project_ID) with status "Done"
- Count total milestones linked to this project
- Format as "X/Y"

**Result**: "completed/total" format

**Example**:
```
Project_ID = 4 (LifeOS)
Milestones linked to project 4:
  - Milestone 4: Status = (empty) ✗
  - Milestone 20: Status = (empty) ✗
Progress = 0/2
```

**Preservation**: Sync system does NOT overwrite Progress during updates

**Update Triggers**: Automatically recalculates when:
- Milestones added/removed
- Milestone status changed
- Milestone project assignment changed

## Setup Instructions

The sync system automatically installs formulas via:

```javascript
ensureTaskTimeSpentFormulaColumn_()    // Installs Time Spent formula
ensureMilestoneProgressFormulaColumn_() // Installs Milestone Progress formula
ensureProjectProgressFormulaColumn_()   // Installs Project Progress formula
```

These run during `initializeSheets()` and after every sync to ensure formulas persist.

## Formula Cell References

### Tasks.L (Time Spent)
- Applied to all rows starting from row 2
- Formula adjusts automatically: `$A2` becomes `$A3`, `$A4`, etc.

### Milestones.I (Progress)
- Applied to all rows starting from row 2
- Uses flexible range references for robustness

### Projects.K (Progress)
- Applied to all rows starting from row 2
- Uses flexible range references for robustness

## Troubleshooting

**Formulas disappeared after sync**:
- They are automatically reapplied
- Check if `ensureTaskTimeSpentFormulaColumn_()` ran successfully
- Check Sync_Log for errors

**Progress shows 0/0 even with tasks/milestones**:
- Verify Task_ID/Milestone_ID links match exactly
- Check that status values match expected values (case-sensitive)
- Verify sheet references (`Timesheet!$G:$G`) are correct

**Time Spent shows 0 even with entries**:
- Verify Timesheet entries have matching Task_ID values
- Check that Task_IDs in both sheets are identical
- Verify column letters are correct (G for Task_ID, B for Time spent)

**Formulas fail with #REF! error**:
- Sheet names may have changed
- Column positions may have shifted
- Run `initializeSheets()` to reinstall all formulas

## Performance Considerations

Large timesheet logs (>1000 entries) may see slower formula recalculation:

- `Time Spent` formula scans entire Timesheet!$B:$B column
- Consider limiting Timesheet sheet to last N months
- Archive old entries to separate sheets if needed

To optimize:
```javascript
// Use bounded ranges instead of full columns
=SUMIF(Timesheet!$G$2:$G$10000, $A2, Timesheet!$B$2:$B$10000)
```

This limits the search range to rows 2-10000, improving recalculation speed.
