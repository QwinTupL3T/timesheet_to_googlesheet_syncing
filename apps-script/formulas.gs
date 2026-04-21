function ensureTaskTimeSpentFormulaColumn_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.TASKS);
  const lastRow = Math.max(sheet.getLastRow(), 2);

  if (lastRow < 2) return;

  const formulas = [];
  for (let row = 2; row <= lastRow; row++) {
    formulas.push([
      `=IF(A${row}="","",SUMIF(Timesheet!H:H,A${row},Timesheet!B:B))`
    ]);
  }

  sheet.getRange(2, 12, formulas.length, 1).setFormulas(formulas);
}

function ensureMilestoneProgressFormulaColumn_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.MILESTONES);
  const lastRow = Math.max(sheet.getLastRow(), 2);
  if (lastRow < 2) return;

  const formulas = [];
  for (let row = 2; row <= lastRow; row++) {
    formulas.push([`=IF(A${row}="","",IFERROR(COUNTIFS(Tasks!C:C,A${row},Tasks!K:K,"done")/COUNTIF(Tasks!C:C,A${row}),0))`]);
  }

  sheet.getRange(2, 10, formulas.length, 1).setFormulas(formulas);
}

function ensureProjectProgressFormulaColumn_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.PROJECTS);
  const lastRow = Math.max(sheet.getLastRow(), 2);
  if (lastRow < 2) return;

  const formulas = [];
  for (let row = 2; row <= lastRow; row++) {
    formulas.push([`=IF(A${row}="","",IFERROR(COUNTIFS(Milestones!C:C,A${row},Milestones!E:E,"done")/COUNTIF(Milestones!C:C,A${row}),0))`]);
  }

  sheet.getRange(2, 11, formulas.length, 1).setFormulas(formulas);
}