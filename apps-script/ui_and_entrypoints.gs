function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Notion Sync')
    .addItem('Dry Run Sync', 'dryRunSync')
    .addItem('Run Live Sync', 'liveSync')
    .addSeparator()
    .addItem('Initialize / Repair Sheets', 'initializeSheets')
    .addToUi();
}

function initializeSheets() {
  const ss = SpreadsheetApp.getActive();
  ensureSheetWithHeaders_(ss, SHEET_NAMES.SETTINGS, ['Key', 'Value']);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.RAW_TIMESHEET, HEADERS.RAW_TIMESHEET);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.RAW_TASKS, HEADERS.RAW_TASKS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.RAW_MILESTONES, HEADERS.RAW_MILESTONES);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.RAW_PROJECTS, HEADERS.RAW_PROJECTS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.TIMESHEET, HEADERS.TIMESHEET);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.TASKS, HEADERS.TASKS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.MILESTONES, HEADERS.MILESTONES);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.PROJECTS, HEADERS.PROJECTS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.SYNC_LOG, HEADERS.SYNC_LOG);

  seedDefaultSettings_();
  ensureTaskTimeSpentFormulaColumn_();
  ensureMilestoneProgressFormulaColumn_();
  ensureProjectProgressFormulaColumn_();

  SpreadsheetApp.getActive().toast('Sheets initialized.');
}

function dryRunSync() {
  runSync_({ dryRun: true });
}

function liveSync() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Run live sync?',
    'This will overwrite the raw import tabs, append new timesheet rows, merge tasks, and mark imported Notion timesheet rows as Synced = true.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response !== ui.Button.OK) return;
  runSync_({ dryRun: false });
}

function showSummary_(analysis, dryRun, warnings) {
  const lines = [
    `${dryRun ? 'Dry run complete' : 'Live sync complete'}`,
    '',
    `Timesheet fetched: ${analysis.timesheetFetched}`,
    `Timesheet eligible: ${analysis.timesheetEligible}`,
    `New timesheet rows: ${analysis.timesheetNew}`,
    `Duplicate timesheet rows: ${analysis.timesheetDuplicates}`,
    '',
    `Tasks fetched: ${analysis.tasksFetched}`,
    `New tasks: ${analysis.tasksNew}`,
    `Tasks updated: ${analysis.tasksUpdated}`,
    `Tasks renamed: ${analysis.tasksRenamed}`,
    '',
    '',
    `Milestones fetched: ${analysis.milestonesFetched}`,
    `New Milestones: ${analysis.milestonesNew}`,
    `Milestones updated: ${analysis.milestonesUpdated}`,
    `Milestones renamed: ${analysis.milestonesRenamed}`,
    '',
    '',
    `Projects fetched: ${analysis.projectsFetched}`,
    `New Projects: ${analysis.projectsNew}`,
    `Projects updated: ${analysis.projectsUpdated}`,
    `Projects renamed: ${analysis.projectsRenamed}`,
    '',
    `Notion rows to mark synced: ${analysis.notionPageIdsToMarkSynced.length}`,
    `Warnings: ${warnings}`,
  ];

  const message = lines.join('\n');

  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    Logger.log(message);
    SpreadsheetApp.getActive().toast(
      dryRun ? 'Dry run complete. Check logs.' : 'Live sync complete. Check logs.'
    );
  }
}