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

function markNotionRowsSynced_(pageIds, settings) {
  const chunks = chunkArray_(pageIds, 10);

  for (const chunk of chunks) {
    for (const pageId of chunk) {
      notionRequest_(
        `https://api.notion.com/v1/pages/${pageId}`,
        'patch',
        {
          properties: {
            [settings.TIMESHEET_SYNCED_PROPERTY]: {
              checkbox: true,
            },
          },
        },
        settings
      );
    }

    Utilities.sleep(250);
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