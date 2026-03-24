import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const API = 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc';

const SYNC_CONFIG = {
  customers: {
    endpoint: 'Customer.List',
    body: (token) => ({ api_token: token }),
    listKey: 'customer_list',
    entity: 'RivhitRawCustomer',
    keyField: 'rivhit_card_number',
    sourceKey: 'customer_id',
  },
  products: {
    endpoint: 'Item.List',
    body: (token) => ({ api_token: token }),
    listKey: 'item_list',
    entity: 'RivhitRawProduct',
    keyField: 'rivhit_item_code',
    sourceKey: 'item_code',
  },
  documents: {
    endpoint: 'Document.List',
    body: (token) => ({ api_token: token, document_type: 1 }),
    listKey: 'document_list',
    entity: 'RivhitRawDocument',
    keyField: 'rivhit_document_id',
    sourceKey: 'document_id',
  },
};

async function fetchFromRivhit(endpoint, body) {
  const url = `${API}/${endpoint}`;
  console.log(`[rivhit] POST ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log(`[rivhit] status=${res.status} length=${text.length}`);

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from Rivhit: ${text.substring(0, 200)}`);
  }

  if (json.error_code && json.error_code !== 0) {
    throw new Error(`Rivhit error ${json.error_code}: ${json.error_message || 'unknown'}`);
  }

  return json;
}

async function syncType(base44, token, type) {
  const config = SYNC_CONFIG[type];
  if (!config) throw new Error(`Unknown sync type: ${type}`);

  console.log(`[sync] === ${type} START ===`);

  // 1. Fetch from Rivhit
  const response = await fetchFromRivhit(config.endpoint, config.body(token));

  // 2. Extract list - try multiple paths
  let list = response[config.listKey]
    || response?.data?.[config.listKey]
    || [];

  if (!Array.isArray(list)) {
    console.log(`[sync] ${config.listKey} is not an array, type=${typeof list}, keys=${Object.keys(list || {})}`);
    list = [];
  }

  console.log(`[sync] ${type}: fetched ${list.length} records`);

  // 3. Upsert each record
  const entity = base44.asServiceRole.entities[config.entity];
  let saved = 0;
  let errors = 0;

  for (const item of list) {
    try {
      const keyValue = item[config.sourceKey];
      if (keyValue === undefined || keyValue === null) {
        console.log(`[sync] skipping record with no ${config.sourceKey}`);
        continue;
      }

      // Check if exists
      let existing = [];
      try {
        existing = await entity.list({ filter: { [config.keyField]: keyValue } });
        if (!Array.isArray(existing)) existing = [];
      } catch {
        existing = [];
      }

      const record = {
        [config.keyField]: keyValue,
        raw_json: JSON.stringify(item),
        synced_at: new Date().toISOString(),
        sync_status: 'success',
      };

      if (existing.length > 0) {
        await entity.update(existing[0].id, record);
      } else {
        await entity.create(record);
      }
      saved++;
    } catch (err) {
      errors++;
      console.error(`[sync] error on ${type} record:`, err.message);
    }
  }

  console.log(`[sync] === ${type} END: fetched=${list.length} saved=${saved} errors=${errors} ===`);
  return { fetched: list.length, saved, errors };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    console.log(`[sync] user=${user?.email} role=${user?.role}`);

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const syncTypeParam = body.sync_type || 'full';
    console.log(`[sync] sync_type=${syncTypeParam}`);

    // Get API token
    const settingsList = await base44.asServiceRole.entities.RivhitSettings.list();
    const settings = settingsList?.[0];
    if (!settings?.api_token) {
      return Response.json({ success: false, error: 'API token not configured' }, { status: 400 });
    }

    // Determine which types to sync
    const types = syncTypeParam === 'full'
      ? ['customers', 'products', 'documents']
      : [syncTypeParam];

    // Create sync log
    let logId = null;
    try {
      const log = await base44.asServiceRole.entities.SyncLog.create({
        sync_type: syncTypeParam,
        status: 'running',
        started_at: new Date().toISOString(),
      });
      logId = log.id;
    } catch (err) {
      console.error('[sync] failed to create SyncLog:', err.message);
    }

    // Run sync
    let totalFetched = 0;
    let totalSaved = 0;
    let totalErrors = 0;
    const results = {};

    for (const type of types) {
      try {
        const result = await syncType(base44, settings.api_token, type);
        results[type] = result;
        totalFetched += result.fetched;
        totalSaved += result.saved;
        totalErrors += result.errors;
      } catch (err) {
        console.error(`[sync] ${type} failed:`, err.message);
        results[type] = { fetched: 0, saved: 0, errors: 1, error: err.message };
        totalErrors++;
      }
    }

    // Update sync log
    const status = totalErrors > 0 && totalSaved > 0 ? 'partial'
      : totalErrors > 0 ? 'error'
      : 'success';

    if (logId) {
      try {
        await base44.asServiceRole.entities.SyncLog.update(logId, {
          status,
          records_fetched: totalFetched,
          records_saved: totalSaved,
          error_message: totalErrors > 0 ? `${totalErrors} errors` : null,
          finished_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[sync] failed to update SyncLog:', err.message);
      }
    }

    console.log(`[sync] DONE: fetched=${totalFetched} saved=${totalSaved} errors=${totalErrors}`);
    return Response.json({
      success: totalErrors === 0,
      status,
      records_fetched: totalFetched,
      records_saved: totalSaved,
      errors: totalErrors,
      results,
    });

  } catch (err) {
    console.error('[sync] top-level error:', err.message, err.stack);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});