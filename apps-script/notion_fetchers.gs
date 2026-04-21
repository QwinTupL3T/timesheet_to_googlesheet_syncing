function fetchTimesheetRowsFromNotion_(settings) {
  const filter = {
    and: [
      {
        property: settings.TIMESHEET_SYNCED_PROPERTY,
        checkbox: { does_not_equal: true },
      },
      {
        property: settings.TIMESHEET_TASK_RELATION_PROPERTY,
        relation: { is_not_empty: true },
      },
    ],
  };

  const pages = queryAllDataSourcePages_(settings.TIMESHEET_DATASOURCE_ID, filter, settings);

  const rows = [];
  const rawRows = [];

  pages.forEach((page) => {
    const p = page.properties || {};

    const row = {
      notionPageId: page.id,
      entryId: getPlainPropertyValue_(p, settings.TIMESHEET_ENTRY_ID_PROPERTY),
      timeSpent: getPlainPropertyValue_(p, 'Time spent'),
      action: getPlainPropertyValue_(p, 'Action'),
      actionId: getPlainPropertyValue_(p, 'Action_id'),
      startTime: getPlainPropertyValue_(p, 'Start Time'),
      endTime: getPlainPropertyValue_(p, 'End Time'),
      status: getPlainPropertyValue_(p, settings.TIMESHEET_STATUS_PROPERTY),
      taskId: getPlainPropertyValue_(p, 'Task_ID'),
      task: getPlainPropertyValue_(p, 'Task'),
      milestoneId: getPlainPropertyValue_(p, 'Milestone_ID'),
      milestone: getPlainPropertyValue_(p, 'Milestone'),
      projectId: getPlainPropertyValue_(p, 'Project_ID'),
      project: getPlainPropertyValue_(p, 'Project'),
      focus: getPlainPropertyValue_(p, 'Focus'),
      createdTime: getPlainPropertyValue_(p, 'Created time'),
      synced: getPlainPropertyValue_(p, settings.TIMESHEET_SYNCED_PROPERTY),
    };

    const isDone =
      String(row.status || '').toLowerCase().includes(
        String(settings.TIMESHEET_DONE_VALUE || '').toLowerCase()
      );

    if (!isDone) return;

    rows.push(row);

    rawRows.push([
      row.entryId,
      row.timeSpent,
      row.action,
      row.actionId,
      row.startTime,
      row.endTime,
      row.status,
      row.taskId,
      row.task,
      row.milestoneId,
      row.milestone,
      row.projectId,
      row.project,
      row.focus,
      row.createdTime,
      row.synced,
    ]);
  });

  return { rows, rawRows };
}

function fetchTaskRowsFromNotion_(settings) {
  const pages = queryAllDataSourcePages_(settings.TASKS_DATASOURCE_ID, null, settings);

  const rows = [];
  const rawRows = [];

  pages.forEach((page) => {
    const p = page.properties || {};
    const row = {
      notionPageId: page.id,
      taskId: getPlainPropertyValue_(p, settings.TASKS_ID_PROPERTY),
      task: getPlainPropertyValue_(p, settings.TASKS_NAME_PROPERTY),
      milestoneId: getPlainPropertyValue_(p, 'Milestone_ID'),
      milestone: getPlainPropertyValue_(p, 'Milestone'),
      projectId: getPlainPropertyValue_(p, 'Project_ID'),
      project: getPlainPropertyValue_(p, 'Project'),
      why: getPlainPropertyValue_(p, settings.TASKS_WHY_PROPERTY),
      description: getPlainPropertyValue_(p, settings.TASKS_DESCRIPTION_PROPERTY),
      due: getPlainPropertyValue_(p, settings.TASKS_DUE_PROPERTY),
      estimate: getPlainPropertyValue_(p, settings.TASKS_ESTIMATE_PROPERTY),
      status: getPlainPropertyValue_(p, settings.TASKS_STATUS_PROPERTY),
    };

    // Logger.log('TASK ROW DEBUG: ' + JSON.stringify({
    //   taskId: row.taskId,
    //   task: row.task,
    //   milestoneId: row.milestoneId,
    //   milestone: row.milestone,
    //   projectId: row.projectId,
    //   project: row.project,
    //   why: row.why,
    //   due: row.due,
    //   estimate: row.estimate,
    //   status: row.status
    // }));
    

    rows.push(row);
    rawRows.push([
      row.taskId,
      row.task,

      row.milestoneId,
      row.milestone,

      row.projectId,
      row.project,

      row.why,
      row.description,
      row.due,
      row.estimate,
      row.status,
    ]);
  });

  return { rows, rawRows };
}

function fetchMilestonesRowsFromNotion_(settings) {
  const pages = queryAllDataSourcePages_(settings.MILESTONES_DATASOURCE_ID, null, settings);

  const rows = [];
  const rawRows = [];

  pages.forEach((page) => {
    const p = page.properties || {};

    const row = {
      notionPageId: page.id,
      milestoneId: getPlainPropertyValue_(p, settings.MILESTONES_ID_PROPERTY),
      milestone: getPlainPropertyValue_(p, settings.MILESTONES_NAME_PROPERTY),

      projectId: getPlainPropertyValue_(p, 'Project_ID'),
      project: getPlainPropertyValue_(p, 'Project'),

      status: getPlainPropertyValue_(p, settings.MILESTONES_STATUS_PROPERTY),
      targetDate: getPlainPropertyValue_(p, settings.MILESTONES_TARGET_DATE_PROPERTY),
      notes: getPlainPropertyValue_(p, settings.MILESTONES_NOTES_PROPERTY),
      tasks: getPlainPropertyValue_(p, settings.MILESTONES_TASKS_PROPERTY),
      dutyTask: getPlainPropertyValue_(p, settings.MILESTONES_DUTY_TASK_PROPERTY),
    };

    // Logger.log('MILESTONE ROW DEBUG: ' + JSON.stringify({
    //   milestoneId: row.milestoneId,
    //   milestone: row.milestone,
    //   projectId: row.projectId,
    //   project: row.project,
    //   status: row.status,
    //   targetDate: row.targetDate,
    //   notes: row.notes,
    //   tasks: row.tasks,
    //   dutyTask: row.dutyTask
    // }));

    rows.push(row);

    rawRows.push([
      row.milestoneId,
      row.milestone,
      row.projectId,
      row.project,
      row.status,
      row.targetDate,
      row.notes,
      row.tasks,
      row.dutyTask,
    ]);
  });

  return { rows, rawRows };
}

function fetchProjectsRowsFromNotion_(settings) {
  const pages = queryAllDataSourcePages_(settings.PROJECTS_DATASOURCE_ID, null, settings);

  const rows = [];
  const rawRows = [];

  pages.forEach((page) => {
    const p = page.properties || {};

    const row = {
      notionPageId: page.id,
      projectId: getPlainPropertyValue_(p, settings.PROJECTS_ID_PROPERTY),
      project: getPlainPropertyValue_(p, settings.PROJECTS_NAME_PROPERTY),

      objective: getPlainPropertyValue_(p, settings.PROJECTS_OBJECTIVE_PROPERTY),
      definitionOfDone: getPlainPropertyValue_(p, settings.PROJECTS_DEFINITION_OF_DONE_PROPERTY),

      status: getPlainPropertyValue_(p, settings.PROJECTS_STATUS_PROPERTY),
      stage: getPlainPropertyValue_(p, settings.PROJECTS_STAGE_PROPERTY),

      hardDeadline: getPlainPropertyValue_(p, settings.PROJECTS_HARD_DEADLINE_PROPERTY),
      softDeadline: getPlainPropertyValue_(p, settings.PROJECTS_SOFT_DEADLINE_PROPERTY),

      areas: getPlainPropertyValue_(p, settings.PROJECTS_AREAS_PROPERTY),
      resources: getPlainPropertyValue_(p, settings.PROJECTS_RESOURCES_PROPERTY),
    };

    // Logger.log('PROJECT ROW DEBUG: ' + JSON.stringify({
    //   projectId: row.projectId,
    //   project: row.project,
    //   objective: row.objective,
    //   definitionOfDone: row.definitionOfDone,
    //   status: row.status,
    //   stage: row.stage,
    //   hardDeadline: row.hardDeadline,
    //   softDeadline: row.softDeadline,
    //   areas: row.areas,
    //   resources: row.resources
    // }));

    rows.push(row);

    rawRows.push([
      row.projectId,
      row.project,
      row.objective,
      row.definitionOfDone,
      row.status,
      row.stage,
      row.hardDeadline,
      row.softDeadline,
      row.areas,
      row.resources,
    ]);
  });

  return { rows, rawRows };
}