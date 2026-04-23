function getColumnIndexByHeader_(headersOrSheet, headerName) {
  let headers;

  if (Array.isArray(headersOrSheet)) {
    headers = headersOrSheet;
  } else {
    headers = headersOrSheet
      .getRange(1, 1, 1, headersOrSheet.getLastColumn())
      .getValues()[0];
  }

  const index = headers.indexOf(headerName);
  if (index === -1) {
    throw new Error(`Header not found: ${headerName}`);
  }

  return index; // 0-based
}

function getSheetColumnNumberByHeader_(sheet, headerName) {
  return getColumnIndexByHeader_(sheet, headerName) + 1; // 1-based for getRange
}

function rowToObjectByHeaders_(row, headers) {
  const obj = {};
  headers.forEach((header, i) => {
    obj[header] = row[i];
  });
  return obj;
}

function columnNumberToLetter_(columnNumber) {
  let temp = '';
  let num = columnNumber;
  while (num > 0) {
    const rem = (num - 1) % 26;
    temp = String.fromCharCode(65 + rem) + temp;
    num = Math.floor((num - 1) / 26);
  }
  return temp;
}

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

  const headers = HEADERS.TASKS;
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  values.forEach((r, i) => {
    const row = rowToObjectByHeaders_(r, headers);
    const taskId = String(row['Task_ID'] || '').trim();
    if (!taskId) return;

    map.set(taskId, {
      rowNumber: i + 2,
      taskId: row['Task_ID'],
      task: row['Task'],
      milestoneId: row['Milestone_ID'],
      milestone: row['Milestone'],
      projectId: row['Project_ID'],
      project: row['Project'],
      why: row['Why?'],
      description: row['Description'],
      due: row['Due'],
      estimate: row['Estimate'],
      status: row['Status'],
      timeSpent: row['Time Spent'],
      lastSynced: row['Last Synced'],
    });
  });

  return map;
}

function readExistingMilestoneMap_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.MILESTONES);
  const lastRow = sheet.getLastRow();
  const map = new Map();

  if (lastRow < 2) return map;

  const headers = HEADERS.MILESTONES;
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  values.forEach((r, i) => {
    const row = rowToObjectByHeaders_(r, headers);
    const milestoneId = String(row['Milestone_ID'] || '').trim();
    if (!milestoneId) return;

    map.set(milestoneId, {
      rowNumber: i + 2,
      milestoneId: row['Milestone_ID'],
      milestone: row['Milestone'],
      projectId: row['Project_ID'],
      project: row['Project'],
      status: row['Status'],
      targetDate: row['Target date'],
      notes: row['Notes'],
      dutyTask: row['Duty task?'],
      progress: row['Progress'],
      lastSynced: row['Last Synced'],
    });
  });

  return map;
}

function readExistingProjectMap_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.PROJECTS);
  const lastRow = sheet.getLastRow();
  const map = new Map();

  if (lastRow < 2) return map;

  const headers = HEADERS.PROJECTS;
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  values.forEach((r, i) => {
    const row = rowToObjectByHeaders_(r, headers);
    const projectId = String(row['Project_ID'] || '').trim();
    if (!projectId) return;

    map.set(projectId, {
      rowNumber: i + 2,
      projectId: row['Project_ID'],
      project: row['Project'],
      objective: row['Objective'],
      definitionOfDone: row['Definition of Done'],
      status: row['Status'],
      stage: row['Stage'],
      hardDeadline: row['Hard Deadline'],
      softDeadline: row['Soft Deadline'],
      areas: row['Areas'],
      resources: row['Resources'],
      progress: row['Progress'],
      lastSynced: row['Last Synced'],
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

  const timeSpentCol = getSheetColumnNumberByHeader_(sheet, 'Time Spent');

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
      const existingTimeSpent = sheet.getRange(op.rowNumber, timeSpentCol).getValue();

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
        existingTimeSpent,
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

  const progressCol = getSheetColumnNumberByHeader_(sheet, 'Progress');

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
      const existingProgress = sheet.getRange(op.rowNumber, progressCol).getValue();

      sheet.getRange(op.rowNumber, 1, 1, HEADERS.MILESTONES.length).setValues([[
        op.milestoneId,
        op.milestone,
        op.projectId,
        op.project,
        op.status,
        op.targetDate,
        op.notes,
        op.dutyTask,
        existingProgress,
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

  const progressCol = getSheetColumnNumberByHeader_(sheet, 'Progress');

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
      const existingProgress = sheet.getRange(op.rowNumber, progressCol).getValue();

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
        existingProgress,
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