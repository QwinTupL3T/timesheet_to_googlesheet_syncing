function readExistingTimesheetIds_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.TIMESHEET);
  const lastRow = sheet.getLastRow();
  const set = new Set();

  if (lastRow < 2) return set;

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  values.forEach((r) => {
    const v = String(r[0] || '').trim();
    if (v) set.add(v);
  });

  return set;
}

function readExistingTaskMap_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.TASKS);
  const lastRow = sheet.getLastRow();
  const map = new Map();

  if (lastRow < 2) return map;

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.TASKS.length).getValues();

  values.forEach((r, i) => {
    const taskId = String(r[0] || '').trim();
    if (!taskId) return;

    map.set(taskId, {
      rowNumber: i + 2,
      taskId: r[0],
      task: r[1],
      milestoneId: r[2],
      milestone: r[3],
      projectId: r[4],
      project: r[5],
      why: r[6],
      description: r[7],
      due: r[8],
      estimate: r[9],
      status: r[10],
      timeSpent: r[11],
      lastSynced: r[12],
    });
  });

  return map;
}

function readExistingMilestoneMap_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.MILESTONES);
  const lastRow = sheet.getLastRow();
  const map = new Map();

  if (lastRow < 2) return map;

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.MILESTONES.length).getValues();

  values.forEach((r, i) => {
    const milestoneId = String(r[0] || '').trim();
    if (!milestoneId) return;

    map.set(milestoneId, {
      rowNumber: i + 2,
      milestoneId: r[0],
      milestone: r[1],
      projectId: r[2],
      project: r[3],
      status: r[4],
      targetDate: r[5],
      notes: r[6],
      dutyTask: r[7],
      progress: r[8],
      lastSynced: r[9],
    });
  });

  return map;
}

function readExistingProjectMap_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.PROJECTS);
  const lastRow = sheet.getLastRow();
  const map = new Map();

  if (lastRow < 2) return map;

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.PROJECTS.length).getValues();

  values.forEach((r, i) => {
    const projectId = String(r[0] || '').trim();
    if (!projectId) return;

    map.set(projectId, {
      rowNumber: i + 2,
      projectId: r[0],
      project: r[1],
      objective: r[2],
      definitionOfDone: r[3],
      status: r[4],
      stage: r[5],
      hardDeadline: r[6],
      softDeadline: r[7],
      areas: r[8],
      resources: r[9],
      progress: r[10],
      lastSynced: r[11],
    });
  });

  return map;
}

function overwriteRawImportSheet_(sheetName, headers, rows) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function appendNewTimesheetRows_(rows) {
  if (!rows.length) return;

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.TIMESHEET);
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, HEADERS.TIMESHEET.length).setValues(rows);
}

function mergeTasks_(taskOps) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.TASKS);
  const now = new Date();

  const inserts = [];
  taskOps.forEach((op) => {
    if (op.op === 'insert') {
      inserts.push([
        op.taskId,
        op.task,
        op.milestoneId,
        op.milestone,
        op.projectId,
        op.project,
        op.why,
        op.description,
        op.due,
        op.estimate,
        op.status,
        '',
        now,
      ]);
    } else {
      sheet.getRange(op.rowNumber, 1, 1, HEADERS.TASKS.length).setValues([[
        op.taskId,
        op.task,
        op.milestoneId,
        op.milestone,
        op.projectId,
        op.project,
        op.why,
        op.description,
        op.due,
        op.estimate,
        op.status,
        sheet.getRange(op.rowNumber, 12).getValue(),
        now,
      ]]);
    }
  });

  if (inserts.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, inserts.length, HEADERS.TASKS.length).setValues(inserts);
  }
}

function mergeMilestones_(milestoneOps) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.MILESTONES);
  const now = new Date();

  const inserts = [];
  milestoneOps.forEach((op) => {
    if (op.op === 'insert') {
      inserts.push([
        op.milestoneId,
        op.milestone,
        op.projectId,
        op.project,
        op.status,
        op.targetDate,
        op.notes,
        op.dutyTask,
        '',
        now,
      ]);
    } else {
      sheet.getRange(op.rowNumber, 1, 1, HEADERS.MILESTONES.length).setValues([[
        op.milestoneId,
        op.milestone,
        op.projectId,
        op.project,
        op.status,
        op.targetDate,
        op.notes,
        op.dutyTask,
        sheet.getRange(op.rowNumber, 9).getValue(),
        now,
      ]]);
    }
  });

  if (inserts.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, inserts.length, HEADERS.MILESTONES.length).setValues(inserts);
  }
}

function mergeProjects_(projectOps) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.PROJECTS);
  const now = new Date();

  const inserts = [];
  projectOps.forEach((op) => {
    if (op.op === 'insert') {
      inserts.push([
        op.projectId,
        op.project,
        op.objective,
        op.definitionOfDone,
        op.status,
        op.stage,
        op.hardDeadline,
        op.softDeadline,
        op.areas,
        op.resources,
        '',
        now,
      ]);
    } else {
      sheet.getRange(op.rowNumber, 1, 1, HEADERS.PROJECTS.length).setValues([[
        op.projectId,
        op.project,
        op.objective,
        op.definitionOfDone,
        op.status,
        op.stage,
        op.hardDeadline,
        op.softDeadline,
        op.areas,
        op.resources,
        sheet.getRange(op.rowNumber, 11).getValue(),
        now,
      ]]);
    }
  });

  if (inserts.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, inserts.length, HEADERS.PROJECTS.length).setValues(inserts);
  }
}

function writeSyncLog_(logObj) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.SYNC_LOG);
  sheet.appendRow([
    logObj.timestamp || '',
    logObj.mode || '',
    logObj.timesheetFetched || '',
    logObj.timesheetEligible || '',
    logObj.timesheetNew || '',
    logObj.timesheetDuplicates || '',
    logObj.tasksFetched || '',
    logObj.tasksNew || '',
    logObj.tasksUpdated || '',
    logObj.tasksRenamed || '',
    logObj.milestonesFetched || '',
    logObj.milestonesNew || '',
    logObj.milestonesUpdated || '',
    logObj.milestonesRenamed || '',
    logObj.projectsFetched || '',
    logObj.projectsNew || '',
    logObj.projectsUpdated || '',
    logObj.projectsRenamed || '',
    logObj.notionRowsMarkedSynced || '',
    logObj.status || '',
    logObj.warnings || '',
    logObj.error || '',
  ]);
}
