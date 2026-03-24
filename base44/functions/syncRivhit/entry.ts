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
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error(`תגובה לא תקינה מריווחית: ${text.substring(0, 200)}`);
  }
}

async function syncCustomers(base44, token) {
  const data = await rivhitPost('Customer.List', { api_token: token });
  const list = data?.customer_list || data?.CustomerList || data?.data || (Array.isArray(data) ? data : []);
  console.log('customers fetched:', list.length);

  let saved = 0;
  for (const c of list) {
    try {
      const existing = await base44.asServiceRole.entities.RivhitRawCustomer.filter({ rivhit_card_number: c.customer_id });
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
        raw_json: c,
        synced_at: new Date().toISOString(),
        sync_status: 'success',
      };
      if (existing && existing.length > 0) {
        // Never overwrite is_active if set manually
        const { is_active, ...updateData } = record;
        await base44.asServiceRole.entities.RivhitRawCustomer.update(existing[0].id, updateData);
      } else {
        await base44.asServiceRole.entities.RivhitRawCustomer.create(record);
      }
      saved++;
    } catch (err) {
      console.error('שגיאה בלקוח', c.customer_id, err.message);
    }
  }
  return { fetched: list.length, saved };
}

async function syncProducts(base44, token) {
  const data = await rivhitPost('Item.List', { api_token: token });
  const list = data?.item_list || data?.ItemList || data?.data || (Array.isArray(data) ? data : []);
  console.log('products fetched:', list.length);

  let saved = 0;
  for (const p of list) {
    try {
      const shouldExclude =
        p.item_code === 0 ||
        /משלוח|הנחה|מלל/.test(p.description || '');

      const existing = await base44.asServiceRole.entities.RivhitRawProduct.filter({ rivhit_item_code: p.item_code });
      const record = {
        rivhit_item_code: p.item_code,
        description: p.description ?? null,
        barcode: p.barcode ?? null,
        price: p.price ?? null,
        currency: p.currency ?? null,
        category: p.group_name ?? null,
        raw_json: p,
        synced_at: new Date().toISOString(),
        sync_status: 'success',
      };
      if (existing && existing.length > 0) {
        // Never overwrite exclude_from_analysis if set manually
        const { exclude_from_analysis, ...updateData } = record;
        await base44.asServiceRole.entities.RivhitRawProduct.update(existing[0].id, updateData);
      } else {
        await base44.asServiceRole.entities.RivhitRawProduct.create({ ...record, exclude_from_analysis: shouldExclude });
      }
      saved++;
    } catch (err) {
      console.error('שגיאה במוצר', p.item_code, err.message);
    }
  }
  return { fetched: list.length, saved };
}

async function syncDocuments(base44, token) {
  const data = await rivhitPost('Document.List', { api_token: token, document_type: 1 });
  const list = data?.document_list || data?.DocumentList || data?.data || (Array.isArray(data) ? data : []);
  console.log('documents fetched:', list.length);

  let saved = 0;
  for (const d of list) {
    try {
      const existing = await base44.asServiceRole.entities.RivhitRawDocument.filter({ rivhit_document_id: d.document_id });
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
        lines: d.document_lines ?? null,
        raw_json: d,
        synced_at: new Date().toISOString(),
        sync_status: 'success',
      };
      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.RivhitRawDocument.update(existing[0].id, record);
      } else {
        await base44.asServiceRole.entities.RivhitRawDocument.create(record);
      }
      saved++;
    } catch (err) {
      console.error('שגיאה במסמך', d.document_id, err.message);
    }
  }
  return { fetched: list.length, saved };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { sync_type = 'full' } = body;

    const settingsList = await base44.asServiceRole.entities.RivhitSettings.list();
    const settings = settingsList?.[0];
    if (!settings?.api_token) {
      return Response.json({ success: false, error: 'טוקן API לא מוגדר בהגדרות' }, { status: 400 });
    }

    // Create SyncLog
    const logRecord = await base44.asServiceRole.entities.SyncLog.create({
      sync_type,
      status: 'running',
      started_at: new Date().toISOString(),
    });
    const logId = logRecord.id;

    let totalFetched = 0;
    let totalSaved = 0;

    try {
      const types = sync_type === 'full' ? ['customers', 'products', 'documents'] : [sync_type];

      for (const type of types) {
        let result;
        if (type === 'customers') result = await syncCustomers(base44, settings.api_token);
        else if (type === 'products') result = await syncProducts(base44, settings.api_token);
        else if (type === 'documents') result = await syncDocuments(base44, settings.api_token);

        totalFetched += result.fetched;
        totalSaved += result.saved;
      }

      await base44.asServiceRole.entities.SyncLog.update(logId, {
        status: 'success',
        records_fetched: totalFetched,
        records_saved: totalSaved,
        finished_at: new Date().toISOString(),
      });

      return Response.json({ success: true, records_fetched: totalFetched, records_saved: totalSaved });

    } catch (syncErr) {
      console.error('sync error:', syncErr.message);
      await base44.asServiceRole.entities.SyncLog.update(logId, {
        status: 'error',
        records_fetched: totalFetched,
        records_saved: totalSaved,
        error_message: syncErr.message,
        finished_at: new Date().toISOString(),
      });
      return Response.json({ success: false, error: syncErr.message }, { status: 500 });
    }

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});