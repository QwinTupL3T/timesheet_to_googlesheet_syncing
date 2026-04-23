function ensureTaskTimeSpentFormulaColumn_() {
  const ss = SpreadsheetApp.getActive();
  const taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  const timesheetSheet = ss.getSheetByName(SHEET_NAMES.TIMESHEET);

  const lastRow = Math.max(taskSheet.getLastRow(), 2);
  if (lastRow < 2) return;

  const targetCol = getSheetColumnNumberByHeader_(taskSheet, 'Time Spent');

  const timesheetTaskIdColLetter = columnNumberToLetter_(
    getSheetColumnNumberByHeader_(timesheetSheet, 'Task_ID')
  );
  const timesheetTimeSpentColLetter = columnNumberToLetter_(
    getSheetColumnNumberByHeader_(timesheetSheet, 'Time spent')
  );

  const formulas = [];
  for (let row = 2; row <= lastRow; row++) {
    formulas.push([
      `=IF(A${row}="","",SUMIF(Timesheet!${timesheetTaskIdColLetter}:${timesheetTaskIdColLetter},A${row},Timesheet!${timesheetTimeSpentColLetter}:${timesheetTimeSpentColLetter}))`
    ]);
  }

  taskSheet.getRange(2, targetCol, formulas.length, 1).setFormulas(formulas);
}

function ensureMilestoneProgressFormulaColumn_() {
  const ss = SpreadsheetApp.getActive();
  const milestoneSheet = ss.getSheetByName(SHEET_NAMES.MILESTONES);
  const taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);

  const lastRow = Math.max(milestoneSheet.getLastRow(), 2);
  if (lastRow < 2) return;

  const targetCol = getSheetColumnNumberByHeader_(milestoneSheet, 'Progress');

  const tasksMilestoneIdColLetter = columnNumberToLetter_(
    getSheetColumnNumberByHeader_(taskSheet, 'Milestone_ID')
  );
  const tasksStatusColLetter = columnNumberToLetter_(
    getSheetColumnNumberByHeader_(taskSheet, 'Status')
  );

  const formulas = [];
  for (let row = 2; row <= lastRow; row++) {
    formulas.push([
      `=IF(A${row}="","",COUNTIFS(Tasks!${tasksMilestoneIdColLetter}:${tasksMilestoneIdColLetter},A${row},Tasks!${tasksStatusColLetter}:${tasksStatusColLetter},"done")&"/"&COUNTIF(Tasks!${tasksMilestoneIdColLetter}:${tasksMilestoneIdColLetter},A${row}))`
    ]);
  }

  milestoneSheet.getRange(2, targetCol, formulas.length, 1).setFormulas(formulas);
}

function ensureProjectProgressFormulaColumn_() {
  const ss = SpreadsheetApp.getActive();
  const projectSheet = ss.getSheetByName(SHEET_NAMES.PROJECTS);
  const milestoneSheet = ss.getSheetByName(SHEET_NAMES.MILESTONES);

  const lastRow = Math.max(projectSheet.getLastRow(), 2);
  if (lastRow < 2) return;

  const targetCol = getSheetColumnNumberByHeader_(projectSheet, 'Progress');

  const milestoneProjectIdColLetter = columnNumberToLetter_(
    getSheetColumnNumberByHeader_(milestoneSheet, 'Project_ID')
  );
  const milestoneStatusColLetter = columnNumberToLetter_(
    getSheetColumnNumberByHeader_(milestoneSheet, 'Status')
  );

  const formulas = [];
  for (let row = 2; row <= lastRow; row++) {
    formulas.push([
      `=IF(A${row}="","",COUNTIFS(Milestones!${milestoneProjectIdColLetter}:${milestoneProjectIdColLetter},A${row},Milestones!${milestoneStatusColLetter}:${milestoneStatusColLetter},"done")&"/"&COUNTIF(Milestones!${milestoneProjectIdColLetter}:${milestoneProjectIdColLetter},A${row}))`
    ]);
  }

  projectSheet.getRange(2, targetCol, formulas.length, 1).setFormulas(formulas);
}