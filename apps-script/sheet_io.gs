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

function readExistingEntityMap_(sheetName, headers, idField, rowMapper) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  const map = new Map();

  if (lastRow < 2) return map;

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  values.forEach((r, i) => {
    const row = rowToObjectByHeaders_(r, headers);
    const entityId = String(row[idField] || '').trim();
    if (!entityId) return;

    map.set(entityId, Object.assign({ rowNumber: i + 2 }, rowMapper(row)));
  });

  return map;
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
  return readExistingEntityMap_(SHEET_NAMES.TASKS, HEADERS.TASKS, 'Task_ID', (row) => ({
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
  }));
}

function readExistingMilestoneMap_() {
  return readExistingEntityMap_(SHEET_NAMES.MILESTONES, HEADERS.MILESTONES, 'Milestone_ID', (row) => ({
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
  }));
}

function readExistingProjectMap_() {
  return readExistingEntityMap_(SHEET_NAMES.PROJECTS, HEADERS.PROJECTS, 'Project_ID', (row) => ({
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
  }));
}

function overwriteRawImportSheet_(sheetName, headers, rows) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function mergeEntitySheet_(sheetName, headers, rowOps, fieldNames, preservedHeader) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const now = new Date();
  const preservedCol = getSheetColumnNumberByHeader_(sheet, preservedHeader);
  const inserts = [];

  rowOps.forEach((op) => {
    if (op.op === 'insert') {
      inserts.push([
        ...fieldNames.map((field) => op[field] ?? ''),
        '',
        now,
      ]);
      return;
    }

    const existingPreserved = sheet.getRange(op.rowNumber, preservedCol).getValue();
    sheet.getRange(op.rowNumber, 1, 1, headers.length).setValues([[
      ...fieldNames.map((field) => op[field] ?? ''),
      existingPreserved,
      now,
    ]]);
  });

  if (inserts.length) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, inserts.length, headers.length).setValues(inserts);
  }
}

function mergeTasks_(taskOps) {
  mergeEntitySheet_(SHEET_NAMES.TASKS, HEADERS.TASKS, taskOps, [
    'taskId',
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
  ], 'Time Spent');
}

function mergeMilestones_(milestoneOps) {
  mergeEntitySheet_(SHEET_NAMES.MILESTONES, HEADERS.MILESTONES, milestoneOps, [
    'milestoneId',
    'milestone',
    'projectId',
    'project',
    'status',
    'targetDate',
    'notes',
    'dutyTask',
  ], 'Progress');
}

function mergeProjects_(projectOps) {
  mergeEntitySheet_(SHEET_NAMES.PROJECTS, HEADERS.PROJECTS, projectOps, [
    'projectId',
    'project',
    'objective',
    'definitionOfDone',
    'status',
    'stage',
    'hardDeadline',
    'softDeadline',
    'areas',
    'resources',
  ], 'Progress');
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