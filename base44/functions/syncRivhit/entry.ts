import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const BASE = 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc';

async function rivhitPost(endpoint, body) {
  const url = `${BASE}/${endpoint}`;
  console.log('POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`rivhitPost ${endpoint} status=${res.status} body=${text.substring(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error(`תגובה לא תקינה מריווחית: ${text.substring(0, 200)}`);
  }
}

async function syncCustomers(base44, token) {
  console.log('=== syncCustomers START ===');
  const data = await rivhitPost('Customer.List', { api_token: token });
  const list = data?.customer_list || data?.CustomerList || data?.data || (Array.isArray(data) ? data : []);
  console.log('customers fetched:', list.length);

  let saved = 0;
  for (const c of list) {
    try {
      console.log('processing customer:', c.customer_id);
      let existing = [];
      try {
        existing = await base44.asServiceRole.entities.RivhitRawCustomer.list({ filter: { rivhit_card_number: c.customer_id } });
      } catch (filterErr) {
        console.error('filter error, trying without filter:', filterErr.message);
        existing = [];
      }
      const record = {
        rivhit_card_number: c.customer_id,
        business_name: c.name_last ?? c.name ?? null,
        contact_name: c.name_first ?? null,
        street: c.street ?? null,
        city: c.city ?? null,
        zipcode: c.zipcode ?? null,
        phone: c.phone ?? null,
        phone2: c.phone2 ?? null,
        fax: c.fax ?? null,
        email: c.email ?? null,
        vat_number: c.vat_number ?? null,
        agent: c.agent_id != null ? String(c.agent_id) : null,
        raw_json: typeof c === 'string' ? c : JSON.stringify(c),
        synced_at: new Date().toISOString(),
        sync_status: 'success',
      };
      if (existing && existing.length > 0) {
        console.log('updating existing customer:', existing[0].id);
        const { is_active, ...updateData } = record;
        await base44.asServiceRole.entities.RivhitRawCustomer.update(existing[0].id, updateData);
      } else {
        console.log('creating new customer:', c.customer_id);
        await base44.asServiceRole.entities.RivhitRawCustomer.create(record);
      }
      saved++;
    } catch (err) {
      console.error('שגיאה בלקוח', c.customer_id, err.message, err.stack);
    }
  }
  console.log(`=== syncCustomers END: fetched=${list.length} saved=${saved} ===`);
  return { fetched: list.length, saved };
}

async function syncProducts(base44, token) {
  console.log('=== syncProducts START ===');
  const data = await rivhitPost('Item.List', { api_token: token });
  const list = data?.item_list || data?.ItemList || data?.data || (Array.isArray(data) ? data : []);
  console.log('products fetched:', list.length);

  let saved = 0;
  for (const p of list) {
    try {
      console.log('processing product:', p.item_code);
      const shouldExclude =
        p.item_code === 0 ||
        /משלוח|הנחה|מלל/.test(p.description || '');

      let existing = [];
      try {
        existing = await base44.asServiceRole.entities.RivhitRawProduct.list({ filter: { rivhit_item_code: p.item_code } });
      } catch (filterErr) {
        console.error('filter error, trying without filter:', filterErr.message);
        existing = [];
      }
      const record = {
        rivhit_item_code: p.item_code,
        description: p.description ?? null,
        barcode: p.barcode ?? null,
        price: p.price ?? null,
        currency: p.currency ?? null,
        category: p.group_name ?? null,
        raw_json: typeof p === 'string' ? p : JSON.stringify(p),
        synced_at: new Date().toISOString(),
        sync_status: 'success',
      };
      if (existing && existing.length > 0) {
        console.log('updating existing product:', existing[0].id);
        const { exclude_from_analysis, ...updateData } = record;
        await base44.asServiceRole.entities.RivhitRawProduct.update(existing[0].id, updateData);
      } else {
        console.log('creating new product:', p.item_code);
        await base44.asServiceRole.entities.RivhitRawProduct.create({ ...record, exclude_from_analysis: shouldExclude });
      }
      saved++;
    } catch (err) {
      console.error('שגיאה במוצר', p.item_code, err.message, err.stack);
    }
  }
  console.log(`=== syncProducts END: fetched=${list.length} saved=${saved} ===`);
  return { fetched: list.length, saved };
}

async function syncDocuments(base44, token) {
  console.log('=== syncDocuments START ===');
  const data = await rivhitPost('Document.List', { api_token: token, document_type: 1 });
  const list = data?.document_list || data?.DocumentList || data?.data || (Array.isArray(data) ? data : []);
  console.log('documents fetched:', list.length);

  let saved = 0;
  for (const d of list) {
    try {
      console.log('processing document:', d.document_id);
      let existing = [];
      try {
        existing = await base44.asServiceRole.entities.RivhitRawDocument.list({ filter: { rivhit_document_id: d.document_id } });
      } catch (filterErr) {
        console.error('filter error, trying without filter:', filterErr.message);
        existing = [];
      }
      const record = {
        rivhit_document_id: d.document_id,
        document_number: d.document_number ?? null,
        document_type: d.document_type ?? null,
        document_date: d.document_date ?? null,
        rivhit_card_number: d.customer_id ?? null,
        customer_name: d.customer_name ?? null,
        total_before_vat: d.sum ?? null,
        discount_amount: d.discount ?? null,
        vat_amount: d.vat ?? null,
        total_to_pay: d.total ?? null,
        lines: d.document_lines ? JSON.stringify(d.document_lines) : null,
        raw_json: typeof d === 'string' ? d : JSON.stringify(d),
        synced_at: new Date().toISOString(),
        sync_status: 'success',
      };
      if (existing && existing.length > 0) {
        console.log('updating existing document:', existing[0].id);
        await base44.asServiceRole.entities.RivhitRawDocument.update(existing[0].id, record);
      } else {
        console.log('creating new document:', d.document_id);
        await base44.asServiceRole.entities.RivhitRawDocument.create(record);
      }
      saved++;
    } catch (err) {
      console.error('שגיאה במסמך', d.document_id, err.message, err.stack);
    }
  }
  console.log(`=== syncDocuments END: fetched=${list.length} saved=${saved} ===`);
  return { fetched: list.length, saved };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    console.log('user:', user?.email, 'role:', user?.role);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'owner') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { sync_type = 'full' } = body;
    console.log('sync_type:', sync_type);

    const settingsList = await base44.asServiceRole.entities.RivhitSettings.list();
    const settings = settingsList?.[0];
    if (!settings?.api_token) {
      return Response.json({ success: false, error: 'טוקן API לא מוגדר בהגדרות' }, { status: 400 });
    }
    console.log('api_token found, length:', settings.api_token.length);

    // Create SyncLog
    let logId = null;
    try {
      const logRecord = await base44.asServiceRole.entities.SyncLog.create({
        sync_type,
        status: 'running',
        started_at: new Date().toISOString(),
      });
      logId = logRecord.id;
      console.log('SyncLog created:', logId);
    } catch (logErr) {
      console.error('Failed to create SyncLog:', logErr.message);
    }

    let totalFetched = 0;
    let totalSaved = 0;

    try {
      const types = sync_type === 'full' ? ['customers', 'products', 'documents'] : [sync_type];
      console.log('syncing types:', types);

      for (const type of types) {
        let result = { fetched: 0, saved: 0 };
        if (type === 'customers') result = await syncCustomers(base44, settings.api_token);
        else if (type === 'products') result = await syncProducts(base44, settings.api_token);
        else if (type === 'documents') result = await syncDocuments(base44, settings.api_token);
        else console.warn('unknown sync type:', type);

        totalFetched += result.fetched;
        totalSaved += result.saved;
      }

      if (logId) {
        await base44.asServiceRole.entities.SyncLog.update(logId, {
          status: 'success',
          records_fetched: totalFetched,
          records_saved: totalSaved,
          finished_at: new Date().toISOString(),
        });
      }

      console.log(`=== SYNC COMPLETE: fetched=${totalFetched} saved=${totalSaved} ===`);
      return Response.json({ success: true, records_fetched: totalFetched, records_saved: totalSaved });

    } catch (syncErr) {
      console.error('sync error:', syncErr.message, syncErr.stack);
      if (logId) {
        try {
          await base44.asServiceRole.entities.SyncLog.update(logId, {
            status: 'error',
            records_fetched: totalFetched,
            records_saved: totalSaved,
            error_message: syncErr.message,
            finished_at: new Date().toISOString(),
          });
        } catch (updateErr) {
          console.error('Failed to update SyncLog on error:', updateErr.message);
        }
      }
      return Response.json({ success: false, error: syncErr.message }, { status: 500 });
    }

  } catch (err) {
    console.error('top-level error:', err.message, err.stack);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});
