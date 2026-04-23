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

function buildDiffDebug_(pairs) {
  const out = {};
  Object.keys(pairs).forEach((key) => {
    const item = pairs[key];
    if (item.changed) out[key] = item;
  });
  return out;
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

  for (const row of taskRows) {
    if (!row.taskId) continue;

    const taskId = String(row.taskId);
    const existing = existingTaskMap.get(taskId);

    if (!existing) {
      analysis.tasksNew++;
      analysis.taskOps.push({
        op: 'insert',
        taskId,
        task: row.task,
        milestoneId: row.milestoneId,
        milestone: row.milestone,
        projectId: row.projectId,
        project: row.project,
        why: row.why,
        description: row.description,
        due: row.due,
        estimate: row.estimate,
        status: row.status,
      });
      continue;
    }

    const existingTask = normalizeForCompare_(existing.task);
    const incomingTask = normalizeForCompare_(row.task);
    const existingMilestoneId = normalizeForCompare_(existing.milestoneId);
    const incomingMilestoneId = normalizeForCompare_(row.milestoneId);
    const existingMilestone = normalizeForCompare_(existing.milestone);
    const incomingMilestone = normalizeForCompare_(row.milestone);
    const existingProjectId = normalizeForCompare_(existing.projectId);
    const incomingProjectId = normalizeForCompare_(row.projectId);
    const existingProject = normalizeForCompare_(existing.project);
    const incomingProject = normalizeForCompare_(row.project);
    const existingWhy = normalizeForCompare_(existing.why);
    const incomingWhy = normalizeForCompare_(row.why);
    const existingDescription = normalizeForCompare_(existing.description);
    const incomingDescription = normalizeForCompare_(row.description);
    const existingDue = normalizeForCompare_(existing.due);
    const incomingDue = normalizeForCompare_(row.due);
    const existingEstimate = normalizeForCompare_(existing.estimate);
    const incomingEstimate = normalizeForCompare_(row.estimate);
    const existingStatus = normalizeForCompare_(existing.status);
    const incomingStatus = normalizeForCompare_(row.status);

    const taskChanged = existingTask !== incomingTask;
    const milestoneIdChanged = existingMilestoneId !== incomingMilestoneId;
    const milestoneChanged = existingMilestone !== incomingMilestone;
    const projectIdChanged = existingProjectId !== incomingProjectId;
    const projectChanged = existingProject !== incomingProject;
    const whyChanged = existingWhy !== incomingWhy;
    const descriptionChanged = existingDescription !== incomingDescription;
    const dueChanged = existingDue !== incomingDue;
    const estimateChanged = existingEstimate !== incomingEstimate;
    const statusChanged = existingStatus !== incomingStatus;

    const hasAnyChange =
      taskChanged ||
      milestoneIdChanged ||
      milestoneChanged ||
      projectIdChanged ||
      projectChanged ||
      whyChanged ||
      descriptionChanged ||
      dueChanged ||
      estimateChanged ||
      statusChanged;

    if (!hasAnyChange) continue;

    if (taskChanged) analysis.tasksRenamed++;

    analysis.tasksUpdated++;
    analysis.taskOps.push({
      op: 'update',
      rowNumber: existing.rowNumber,
      taskId,
      task: row.task,
      milestoneId: row.milestoneId,
      milestone: row.milestone,
      projectId: row.projectId,
      project: row.project,
      why: row.why,
      description: row.description,
      due: row.due,
      estimate: row.estimate,
      status: row.status,
    });
  }

  for (const row of milestoneRows) {
    if (!row.milestoneId) continue;

    const milestoneId = String(row.milestoneId);
    const existing = existingMilestoneMap.get(milestoneId);

    if (!existing) {
      analysis.milestonesNew++;
      analysis.milestoneOps.push({
        op: 'insert',
        milestoneId,
        milestone: row.milestone,
        projectId: row.projectId,
        project: row.project,
        status: row.status,
        targetDate: row.targetDate,
        notes: row.notes,
        dutyTask: row.dutyTask,
      });
      continue;
    }

    const milestoneChanged =
      normalizeForCompare_(existing.milestone) !== normalizeForCompare_(row.milestone);
    const projectIdChanged =
      normalizeForCompare_(existing.projectId) !== normalizeForCompare_(row.projectId);
    const projectChanged =
      normalizeForCompare_(existing.project) !== normalizeForCompare_(row.project);
    const statusChanged =
      normalizeForCompare_(existing.status) !== normalizeForCompare_(row.status);
    const targetDateChanged =
      normalizeForCompare_(existing.targetDate) !== normalizeForCompare_(row.targetDate);
    const notesChanged =
      normalizeForCompare_(existing.notes) !== normalizeForCompare_(row.notes);
    const dutyChanged =
      normalizeForCompare_(existing.dutyTask) !== normalizeForCompare_(row.dutyTask);

    const hasAnyChange =
      milestoneChanged ||
      projectIdChanged ||
      projectChanged ||
      statusChanged ||
      targetDateChanged ||
      notesChanged ||
      dutyChanged;


    if (!hasAnyChange) continue;

    if (milestoneChanged) analysis.milestonesRenamed++;

    analysis.milestonesUpdated++;
    analysis.milestoneOps.push({
      op: 'update',
      rowNumber: existing.rowNumber,
      milestoneId,
      milestone: row.milestone,
      projectId: row.projectId,
      project: row.project,
      status: row.status,
      targetDate: row.targetDate,
      notes: row.notes,
      dutyTask: row.dutyTask,
    });
  }

  for (const row of projectRows) {
    if (!row.projectId) continue;

    const projectId = String(row.projectId);
    const existing = existingProjectMap.get(projectId);

    if (!existing) {
      analysis.projectsNew++;
      analysis.projectOps.push({
        op: 'insert',
        projectId,
        project: row.project,
        objective: row.objective,
        definitionOfDone: row.definitionOfDone,
        status: row.status,
        stage: row.stage,
        hardDeadline: row.hardDeadline,
        softDeadline: row.softDeadline,
        areas: row.areas,
        resources: row.resources,
      });
      continue;
    }

    const projectChanged =
      normalizeForCompare_(existing.project) !== normalizeForCompare_(row.project);
    const objectiveChanged =
      normalizeForCompare_(existing.objective) !== normalizeForCompare_(row.objective);
    const definitionChanged =
      normalizeForCompare_(existing.definitionOfDone) !== normalizeForCompare_(row.definitionOfDone);
    const statusChanged =
      normalizeForCompare_(existing.status) !== normalizeForCompare_(row.status);
    const stageChanged =
      normalizeForCompare_(existing.stage) !== normalizeForCompare_(row.stage);
    const hardDeadlineChanged =
      normalizeForCompare_(existing.hardDeadline) !== normalizeForCompare_(row.hardDeadline);
    const softDeadlineChanged =
      normalizeForCompare_(existing.softDeadline) !== normalizeForCompare_(row.softDeadline);
    const areasChanged =
      normalizeForCompare_(existing.areas) !== normalizeForCompare_(row.areas);
    const resourcesChanged =
      normalizeForCompare_(existing.resources) !== normalizeForCompare_(row.resources);

    const hasAnyChange =
      projectChanged ||
      objectiveChanged ||
      definitionChanged ||
      statusChanged ||
      stageChanged ||
      hardDeadlineChanged ||
      softDeadlineChanged ||
      areasChanged ||
      resourcesChanged;

    if (!hasAnyChange) continue;

    if (projectChanged) analysis.projectsRenamed++;

    analysis.projectsUpdated++;
    analysis.projectOps.push({
      op: 'update',
      rowNumber: existing.rowNumber,
      projectId,
      project: row.project,
      objective: row.objective,
      definitionOfDone: row.definitionOfDone,
      status: row.status,
      stage: row.stage,
      hardDeadline: row.hardDeadline,
      softDeadline: row.softDeadline,
      areas: row.areas,
      resources: row.resources,
    });
  }

  return analysis;
}
