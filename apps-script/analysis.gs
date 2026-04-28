function normalizeForCompare_(value) {
  if (value === null || value === undefined) return '';

  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return String(value)
    .replace(/\u00A0/g, ' ')   // non-breaking space
    .replace(/\s+/g, ' ')      // collapse whitespace
    .trim();
}

function compareEntityFields_(existing, row, fieldNames) {
  return fieldNames.some((fieldName) =>
    normalizeForCompare_(existing[fieldName]) !== normalizeForCompare_(row[fieldName])
  );
}

function analyzeEntityRows_(rows, existingMap, idKey, compareFields, renameKey) {
  const result = {
    newCount: 0,
    updatedCount: 0,
    renamedCount: 0,
    ops: [],
  };

  for (const row of rows) {
    if (!row[idKey]) continue;

    const entityId = String(row[idKey]);
    const existing = existingMap.get(entityId);

    if (!existing) {
      result.newCount++;
      result.ops.push(Object.assign({ op: 'insert' }, row));
      continue;
    }

    if (!compareEntityFields_(existing, row, compareFields)) continue;

    if (renameKey && normalizeForCompare_(existing[renameKey]) !== normalizeForCompare_(row[renameKey])) {
      result.renamedCount++;
    }

    result.updatedCount++;
    result.ops.push(Object.assign({ op: 'update', rowNumber: existing.rowNumber }, row));
  }

  return result;
}

function analyzeSync_({
  timesheetRows,
  taskRows,
  milestoneRows,
  projectRows,
  existingTimesheetIds,
  existingTaskMap,
  existingMilestoneMap,
  existingProjectMap,
}) {
  const analysis = {
    timesheetFetched: timesheetRows.length,
    timesheetEligible: 0,
    timesheetNew: 0,
    timesheetDuplicates: 0,

    tasksFetched: taskRows.length,
    tasksNew: 0,
    tasksUpdated: 0,
    tasksRenamed: 0,

    milestonesFetched: milestoneRows.length,
    milestonesNew: 0,
    milestonesUpdated: 0,
    milestonesRenamed: 0,

    projectsFetched: projectRows.length,
    projectsNew: 0,
    projectsUpdated: 0,
    projectsRenamed: 0,

    newTimesheetRows: [],
    notionPageIdsToMarkSynced: [],
    taskOps: [],
    milestoneOps: [],
    projectOps: [],
  };

  for (const row of timesheetRows) {
    if (!row.entryId) continue;
    analysis.timesheetEligible++;

    if (existingTimesheetIds.has(String(row.entryId))) {
      analysis.timesheetDuplicates++;
      continue;
    }

    analysis.timesheetNew++;
    analysis.newTimesheetRows.push([
      row.entryId,
      row.timeSpent,
      row.action,
      row.actionId,
      row.startTime,
      row.endTime,
      row.taskId,
      row.task,
      row.milestoneId,
      row.milestone,
      row.projectId,
      row.project,
      row.focus,
      row.createdTime,
    ]);
    analysis.notionPageIdsToMarkSynced.push(row.notionPageId);
  }

  const taskAnalysis = analyzeEntityRows_(taskRows, existingTaskMap, 'taskId', [
    'task',
    'milestoneId',
    'milestone',
    'projectId',
    'project',
    'why',
    'description',
    'due',
    'estimate',
    'status',
  ], 'task');

  analysis.tasksNew = taskAnalysis.newCount;
  analysis.tasksUpdated = taskAnalysis.updatedCount;
  analysis.tasksRenamed = taskAnalysis.renamedCount;
  analysis.taskOps = taskAnalysis.ops;

  const milestoneAnalysis = analyzeEntityRows_(milestoneRows, existingMilestoneMap, 'milestoneId', [
    'milestone',
    'projectId',
    'project',
    'status',
    'targetDate',
    'notes',
    'dutyTask',
  ], 'milestone');

  analysis.milestonesNew = milestoneAnalysis.newCount;
  analysis.milestonesUpdated = milestoneAnalysis.updatedCount;
  analysis.milestonesRenamed = milestoneAnalysis.renamedCount;
  analysis.milestoneOps = milestoneAnalysis.ops;

  const projectAnalysis = analyzeEntityRows_(projectRows, existingProjectMap, 'projectId', [
    'project',
    'objective',
    'definitionOfDone',
    'status',
    'stage',
    'hardDeadline',
    'softDeadline',
    'areas',
    'resources',
  ], 'project');

  analysis.projectsNew = projectAnalysis.newCount;
  analysis.projectsUpdated = projectAnalysis.updatedCount;
  analysis.projectsRenamed = projectAnalysis.renamedCount;
  analysis.projectOps = projectAnalysis.ops;

  return analysis;
}
