function getSettings_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.SETTINGS);
  if (!sheet) throw new Error(`Missing sheet: ${SHEET_NAMES.SETTINGS}`);

  const values = sheet.getDataRange().getValues();
  const map = {};

  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0] || '').trim();
    const value = values[i][1];
    if (key) map[key] = value;
  }

  return map;
}

function validateRequiredSettings_(settings) {
  const required = [
    'NOTION_TOKEN',
    'NOTION_VERSION',
    'TIMESHEET_DATASOURCE_ID',
    'TASKS_DATASOURCE_ID',
    'TIMESHEET_STATUS_PROPERTY',
    'TIMESHEET_DONE_VALUE',
    'TIMESHEET_SYNCED_PROPERTY',
    'TIMESHEET_ENTRY_ID_PROPERTY',
    'TIMESHEET_TASK_RELATION_PROPERTY',
    'TIMESHEET_TASK_ID_PROPERTY',
    'TIMESHEET_TIME_SPENT_PROPERTY',
    'TIMESHEET_ACTION_PROPERTY',
    'TIMESHEET_ACTION_ID_PROPERTY',
    'TIMESHEET_START_TIME_PROPERTY',
    'TIMESHEET_END_TIME_PROPERTY',
    'TIMESHEET_TASK_NAME_PROPERTY',
    'TIMESHEET_MILESTONE_ID_PROPERTY',
    'TIMESHEET_MILESTONE_NAME_PROPERTY',
    'TIMESHEET_PROJECT_ID_PROPERTY',
    'TIMESHEET_PROJECT_NAME_PROPERTY',
    'TIMESHEET_FOCUS_PROPERTY',
    'TIMESHEET_CREATED_TIME_PROPERTY',

    'TASKS_ID_PROPERTY',
    'TASKS_NAME_PROPERTY',
    'TASKS_WHY_PROPERTY',
    'TASKS_DESCRIPTION_PROPERTY',
    'TASKS_DUE_PROPERTY',
    'TASKS_ESTIMATE_PROPERTY',
    'TASKS_STATUS_PROPERTY',
    'TASKS_MILESTONE_ID_PROPERTY',
    'TASKS_MILESTONE_NAME_PROPERTY',
    'TASKS_PROJECT_ID_PROPERTY',
    'TASKS_PROJECT_NAME_PROPERTY',

    'MILESTONES_DATASOURCE_ID',
    'MILESTONES_NAME_PROPERTY',
    'MILESTONES_ID_PROPERTY',
    'MILESTONES_PROJECT_PROPERTY',
    'MILESTONES_STATUS_PROPERTY',
    'MILESTONES_TARGET_DATE_PROPERTY',
    'MILESTONES_NOTES_PROPERTY',
    'MILESTONES_DUTY_TASK_PROPERTY',
    'MILESTONES_PROJECT_ID_PROPERTY',

    'PROJECTS_DATASOURCE_ID',
    'PROJECTS_NAME_PROPERTY',
    'PROJECTS_ID_PROPERTY',
    'PROJECTS_OBJECTIVE_PROPERTY',
    'PROJECTS_DEFINITION_OF_DONE_PROPERTY',
    'PROJECTS_STATUS_PROPERTY',
    'PROJECTS_STAGE_PROPERTY',
    'PROJECTS_HARD_DEADLINE_PROPERTY',
    'PROJECTS_SOFT_DEADLINE_PROPERTY',
    'PROJECTS_AREAS_PROPERTY',
    'PROJECTS_RESOURCES_PROPERTY',
  ];

  const missing = required.filter((k) => !String(settings[k] || '').trim());
  if (missing.length) {
    throw new Error(`Missing Settings values: ${missing.join(', ')}`);
  }
}

function validateEnvironment_(settings) {
  const errors = [];
  const warnings = [];

  if (!settings.NOTION_TOKEN) errors.push('Missing NOTION_TOKEN');
  if (!settings.TIMESHEET_DATASOURCE_ID) errors.push('Missing TIMESHEET_DATASOURCE_ID');
  if (!settings.TASKS_DATASOURCE_ID) errors.push('Missing TASKS_DATASOURCE_ID');
  if (!settings.MILESTONES_DATASOURCE_ID) errors.push('Missing MILESTONES_DATASOURCE_ID');
  if (!settings.PROJECTS_DATASOURCE_ID) errors.push('Missing PROJECTS_DATASOURCE_ID');

  const ss = SpreadsheetApp.getActive();
  const requiredSheets = [
    SHEET_NAMES.SETTINGS,
    SHEET_NAMES.RAW_TIMESHEET,
    SHEET_NAMES.RAW_TASKS,
    SHEET_NAMES.RAW_MILESTONES,
    SHEET_NAMES.RAW_PROJECTS,
    SHEET_NAMES.TIMESHEET,
    SHEET_NAMES.TASKS,
    SHEET_NAMES.MILESTONES,
    SHEET_NAMES.PROJECTS,
    SHEET_NAMES.SYNC_LOG,
  ];

  for (const name of requiredSheets) {
    if (!ss.getSheetByName(name)) errors.push(`Missing sheet: ${name}`);
  }

  if (errors.length) {
    throw new Error('Validation failed:\n' + errors.join('\n'));
  }

  return warnings;
}