import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { endpoint, params = {} } = body;

    if (!endpoint) return Response.json({ success: false, error: 'חסר endpoint' }, { status: 400 });

    const settingsList = await base44.asServiceRole.entities.RivhitSettings.list();
    const settings = settingsList?.[0];

    if (!settings?.api_token) return Response.json({ success: false, error: 'טוקן חסר בהגדרות' }, { status: 400 });

    const BASE = 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc';
    const url = `${BASE}/${endpoint.replace(/^\//, '')}`;

    console.log('=== RIVHIT REQUEST ===');
    console.log('URL:', url);
    console.log('TOKEN:', settings.api_token?.substring(0, 8) + '...');

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ token_api: settings.api_token, ...params }),
      signal: controller.signal,
    });

    const rawText = await response.text();
    console.log('STATUS:', response.status);
    console.log('RAW:', rawText.substring(0, 200));

    let data = null;
    try { data = JSON.parse(rawText); } catch (_) {}

    return Response.json({
      success: response.ok,
      http_status: response.status,
      url_called: url,
      data,
      raw: rawText.substring(0, 500),
    });

  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});