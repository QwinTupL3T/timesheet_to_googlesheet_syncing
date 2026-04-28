function queryAllDataSourcePages_(dataSourceId, filter, settings) {
  const all = [];
  let cursor = null;

  do {
    const payload = {};
    if (filter) payload.filter = filter;
    if (cursor) payload.start_cursor = cursor;

    const response = notionRequest_(
      `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
      'post',
      payload,
      settings
    );

    const results = response.results || [];
    all.push(...results);

    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return all;
}

function appendTimesheetBatch_(rows) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.TIMESHEET);
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, HEADERS.TIMESHEET.length).setValues(rows);
  return startRow;
}

function rollbackTimesheetBatchAppend_(startRow, rowCount) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.TIMESHEET);
  sheet.deleteRows(startRow, rowCount);
}

function notionPatchPageProperties_(pageId, properties, settings) {
  const url = `https://api.notion.com/v1/pages/${pageId}`;

  const response = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${settings.NOTION_TOKEN}`,
      'Notion-Version': String(settings.NOTION_VERSION),
    },
    payload: JSON.stringify({ properties }),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error(`Notion PATCH failed (${code}): ${text}`);
  }

  return JSON.parse(text);
}

function withRetry_(fn, maxAttempts) {
  let attempt = 0;
  let lastErr;

  while (attempt < maxAttempts) {
    try {
      return fn();
    } catch (err) {
      lastErr = err;
      attempt++;

      if (attempt >= maxAttempts) break;

      const delay = Math.pow(2, attempt) * 500;
      Utilities.sleep(delay);
    }
  }

  throw lastErr;
}

function markNotionRowsSyncedBatch_(pageIds, settings) {
  if (!pageIds.length) return [];

  const marked = [];

  pageIds.forEach((pageId) => {
    withRetry_(() => {
      notionPatchPageProperties_(pageId, {
        [settings.TIMESHEET_SYNCED_PROPERTY]: { checkbox: true }
      }, settings);
    }, 3);
    marked.push(pageId);
    Utilities.sleep(5);
  });

  return marked;
}

function markNotionRowsUnsyncedBatch_(pageIds, settings) {
  if (!pageIds.length) return;

  pageIds.forEach((pageId) => {
    notionPatchPageProperties_(pageId, {
      [settings.TIMESHEET_SYNCED_PROPERTY]: { checkbox: false }
    }, settings);
    Utilities.sleep(5); //sync sleep
  });
}

function getOrCreateSyncStateSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Sync_State');
  if (!sheet) {
    sheet = ss.insertSheet('Sync_State');
    sheet.getRange(1, 1, 1, 7).setValues([[
      'Run_ID',
      'Batch_No',
      'Status',
      'Start_Row',
      'Row_Count',
      'Page_IDs_JSON',
      'Created_At',
    ]]);
  }
  return sheet;
}

function writeBatchState_(runId, batchNo, status, startRow, rowCount, pageIds) {
  const sheet = getOrCreateSyncStateSheet_();
  sheet.appendRow([
    runId,
    batchNo,
    status,
    startRow || '',
    rowCount || '',
    JSON.stringify(pageIds || []),
    new Date(),
  ]);
  return sheet.getLastRow();
}

function updateBatchStateRow_(rowNumber, patch) {
  const sheet = getOrCreateSyncStateSheet_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];

  Object.keys(patch).forEach((key) => {
    const idx = headers.indexOf(key);
    if (idx !== -1) row[idx] = patch[key];
  });

  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
}

function recoverInterruptedTimesheetBatches_(settings) {
  const sheet = getOrCreateSyncStateSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  for (let i = values.length - 1; i >= 0; i--) {
    const rowNumber = i + 2;
    const status = values[i][2];
    const startRow = values[i][3];
    const rowCount = values[i][4];
    const pageIds = JSON.parse(values[i][5] || '[]');

    if (status === 'APPENDED') {
      rollbackTimesheetBatchAppend_(startRow, rowCount);

      if (pageIds.length) {
        try {
          markNotionRowsUnsyncedBatch_(pageIds, settings);
        } catch (e) {
          Logger.log('Rollback unsync failed: ' + (e.message || e));
        }
      }

      updateBatchStateRow_(rowNumber, { Status: 'ROLLED_BACK' });
    }
  }
}

function processTimesheetBatchesWithRecovery_(newTimesheetRows, notionPageIdsToMarkSynced, settings) {
  recoverInterruptedTimesheetBatches_(settings);

  const runId = Utilities.getUuid();
  const BATCH_SIZE = 25;

  const rowBatches = chunkArray_(newTimesheetRows, BATCH_SIZE);
  const pageIdBatches = chunkArray_(notionPageIdsToMarkSynced, BATCH_SIZE);

  for (let i = 0; i < rowBatches.length; i++) {
    const rowsBatch = rowBatches[i];
    const pageIdsBatch = pageIdBatches[i] || [];

    const stateRow = writeBatchState_(runId, i + 1, 'PENDING', '', rowsBatch.length, pageIdsBatch);

    const startRow = appendTimesheetBatch_(rowsBatch);
    updateBatchStateRow_(stateRow, {
      Status: 'APPENDED',
      Start_Row: startRow,
    });

    markNotionRowsSyncedBatch_(pageIdsBatch, settings);

    updateBatchStateRow_(stateRow, {
      Status: 'SYNCED',
    });
  }
}

function notionRequest_(url, method, bodyObj, settings) {
  const options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      Authorization: `Bearer ${settings.NOTION_TOKEN}`,
      'Notion-Version': String(settings.NOTION_VERSION),
      'Content-Type': 'application/json',
    },
  };

  if (bodyObj) {
    options.payload = JSON.stringify(bodyObj);
  }

  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const text = res.getContentText();
  let json = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Notion returned non-JSON response (${code}): ${text}`);
  }

  if (code < 200 || code >= 300) {
    throw new Error(`Notion API error (${code}): ${json.message || text}`);
  }

  return json;
}