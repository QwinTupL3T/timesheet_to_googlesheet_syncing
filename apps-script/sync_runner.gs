function runSync_({ dryRun }) {
  withScriptLock_(() => {
    const startedAt = new Date();
    const settings = getSettings_();
    const warnings = validateEnvironment_(settings);

    try {
      validateRequiredSettings_(settings);

      const timesheetPayload = fetchTimesheetRowsFromNotion_(settings);
      const taskPayload = fetchTaskRowsFromNotion_(settings);
      const milestonePayload = fetchMilestonesRowsFromNotion_(settings);
      const projectPayload = fetchProjectsRowsFromNotion_(settings);

      if (timesheetPayload.rows.length === 0) warnings.push('No timesheet rows fetched');
      if (taskPayload.rows.length === 0) warnings.push('No task rows fetched');
      if (milestonePayload.rows.length === 0) warnings.push('No milestone rows fetched');
      if (projectPayload.rows.length === 0) warnings.push('No project rows fetched');

      const existingTimesheetIds = readExistingTimesheetIds_();
      const existingTaskMap = readExistingTaskMap_();
      const existingMilestoneMap = readExistingMilestoneMap_();
      const existingProjectMap = readExistingProjectMap_();

      const analysis = analyzeSync_({
        timesheetRows: timesheetPayload.rows,
        taskRows: taskPayload.rows,
        milestoneRows: milestonePayload.rows,
        projectRows: projectPayload.rows,
        existingTimesheetIds,
        existingTaskMap,
        existingMilestoneMap,
        existingProjectMap,
      });

      if (!dryRun) {
        overwriteRawImportSheet_(SHEET_NAMES.RAW_TIMESHEET, HEADERS.RAW_TIMESHEET, timesheetPayload.rawRows);
        overwriteRawImportSheet_(SHEET_NAMES.RAW_TASKS, HEADERS.RAW_TASKS, taskPayload.rawRows);
        overwriteRawImportSheet_(SHEET_NAMES.RAW_MILESTONES, HEADERS.RAW_MILESTONES, milestonePayload.rawRows);
        overwriteRawImportSheet_(SHEET_NAMES.RAW_PROJECTS, HEADERS.RAW_PROJECTS, projectPayload.rawRows);

        mergeProjects_(analysis.projectOps);
        mergeMilestones_(analysis.milestoneOps);
        mergeTasks_(analysis.taskOps);
        appendNewTimesheetRows_(analysis.newTimesheetRows);

        if (analysis.notionPageIdsToMarkSynced.length > 0) {
          markNotionRowsSynced_(analysis.notionPageIdsToMarkSynced, settings);
        }

        ensureTaskTimeSpentFormulaColumn_();
        ensureMilestoneProgressFormulaColumn_();
        ensureProjectProgressFormulaColumn_();
      }

      const logObj = {
        timestamp: startedAt,
        mode: dryRun ? 'Dry Run' : 'Live Sync',
        timesheetFetched: analysis.timesheetFetched,
        timesheetEligible: analysis.timesheetEligible,
        timesheetNew: analysis.timesheetNew,
        timesheetDuplicates: analysis.timesheetDuplicates,
        tasksFetched: analysis.tasksFetched,
        tasksNew: analysis.tasksNew,
        tasksUpdated: analysis.tasksUpdated,
        tasksRenamed: analysis.tasksRenamed,
        milestonesFetched: analysis.milestonesFetched,
        milestonesNew: analysis.milestonesNew,
        milestonesUpdated: analysis.milestonesUpdated,
        milestonesRenamed: analysis.milestonesRenamed,
        projectsFetched: analysis.projectsFetched,
        projectsNew: analysis.projectsNew,
        projectsUpdated: analysis.projectsUpdated,
        projectsRenamed: analysis.projectsRenamed,
        notionRowsMarkedSynced: dryRun ? 0 : analysis.notionPageIdsToMarkSynced.length,
        status: 'Success',
        warnings: warnings.join(' | '),
        error: '',
      };

      writeSyncLog_(logObj);
      showSummary_(analysis, dryRun, warnings.join(' | '));
    } catch (err) {
      writeSyncLog_({
        timestamp: startedAt,
        mode: dryRun ? 'Dry Run' : 'Live Sync',
        timesheetFetched: '',
        timesheetEligible: '',
        timesheetNew: '',
        timesheetDuplicates: '',
        tasksFetched: '',
        tasksNew: '',
        tasksUpdated: '',
        tasksRenamed: '',
        notionRowsMarkedSynced: '',
        status: 'Failed',
        warnings: warnings.join(' | '),
        error: String(err && err.message ? err.message : err),
      });
      try {
        SpreadsheetApp.getUi().alert(`Sync failed:\n\n${err.message || err}`);
      } catch (e) {
        Logger.log(`Sync failed: ${err.message || err}`);
        SpreadsheetApp.getActive().toast('Sync failed. Check execution logs.');
      }
      throw err;
    }
  });
}
