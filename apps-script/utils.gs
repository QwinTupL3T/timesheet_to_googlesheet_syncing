function chunkArray_(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}



function ensureSheetWithHeaders_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const mismatch = headers.some((h, i) => currentHeaders[i] !== h);

  if (mismatch) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function withScriptLock_(fn) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Could not obtain script lock. Another sync may already be running.');
  }

  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function getPlainPropertyValue_(properties, propertyName) {
  const prop = properties[propertyName];
  if (!prop) return '';

  switch (prop.type) {
    case 'title':
      return (prop.title || []).map((x) => x.plain_text || '').join('');
    case 'rich_text':
      return (prop.rich_text || []).map((x) => x.plain_text || '').join('');
    case 'number':
      return prop.number ?? '';
    case 'select':
      return prop.select ? prop.select.name : '';
    case 'status':
      return prop.status ? prop.status.name : '';
    case 'checkbox':
      return prop.checkbox === true;
    case 'date':
      return prop.date ? prop.date.start : '';
    case 'created_time':
      return prop.created_time || '';
    case 'url':
      return prop.url || '';
    case 'email':
      return prop.email || '';
    case 'phone_number':
      return prop.phone_number || '';
    case 'multi_select':
      return (prop.multi_select || []).map((x) => x.name).join(', ');
    case 'relation':
      return (prop.relation || []).map((x) => x.id).join(', ');
    case 'formula':
      return getFormulaValue_(prop.formula);
    case 'rollup':
      return getRollupValue_(prop.rollup);
    case 'people':
      return (prop.people || []).map((x) => x.name || x.id).join(', ');
    case 'unique_id':
      return prop.unique_id ? prop.unique_id.number ?? '' : '';
    default:
      return '';
  }
}

function getFormulaValue_(formula) {
  if (!formula) return '';
  switch (formula.type) {
    case 'string':
      return formula.string || '';
    case 'number':
      return formula.number ?? '';
    case 'boolean':
      return formula.boolean === true;
    case 'date':
      return formula.date ? formula.date.start : '';
    default:
      return '';
  }
}

function getRollupValue_(rollup) {
  if (!rollup) return '';

  switch (rollup.type) {
    case 'number':
      return rollup.number ?? '';

    case 'date':
      return rollup.date ? rollup.date.start : '';

    case 'array':
      return (rollup.array || [])
        .map((item) => {
          switch (item.type) {
            case 'title':
              return (item.title || []).map((x) => x.plain_text || '').join('');

            case 'rich_text':
              return (item.rich_text || []).map((x) => x.plain_text || '').join('');

            case 'number':
              return item.number ?? '';

            case 'select':
              return item.select ? item.select.name : '';

            case 'status':
              return item.status ? item.status.name : '';

            case 'date':
              return item.date ? item.date.start : '';

            case 'unique_id':
              return item.unique_id ? item.unique_id.number ?? '' : '';

            default:
              return '';
          }
        })
        .filter((v) => v !== '' && v !== null && v !== undefined)
        .join(', ');

    default:
      return '';
  }
}