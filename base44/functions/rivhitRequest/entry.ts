import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, method = 'GET', params = {} } = body;

    if (!endpoint) {
      return Response.json({ success: false, error: 'חסר נתיב endpoint' }, { status: 400 });
    }

    // Load settings
    const settingsList = await base44.asServiceRole.entities.RivhitSettings.list();
    const settings = settingsList?.[0];

    if (!settings?.api_token) {
      return Response.json({ success: false, error: 'טוקן API לא מוגדר. הגדר אותו בהגדרות ריווחית.' }, { status: 400 });
    }

    const baseUrl = (settings.base_url || '').replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${baseUrl}${cleanEndpoint}`;

    if (method === 'GET' && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(params).toString();
      url = `${url}?${qs}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${settings.api_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return Response.json({ success: false, error: 'timeout — הבקשה לא ענתה תוך 15 שניות' });
      }
      return Response.json({ success: false, error: `שגיאת חיבור: ${fetchErr.message}` });
    }
    clearTimeout(timeout);

    const rawText = await response.text();
    let data = null;
    let parseError = null;

    try {
      data = JSON.parse(rawText);
    } catch (_) {
      parseError = 'תגובה לא תקינה — הגוף אינו JSON תקני';
    }

    if (response.status === 401 || response.status === 403) {
      return Response.json({
        success: false,
        http_status: response.status,
        error: 'טוקן לא תקין — גישה נדחתה',
        raw: rawText,
      });
    }

    if (!response.ok) {
      return Response.json({
        success: false,
        http_status: response.status,
        error: `שגיאת שרת: ${response.status} ${response.statusText}`,
        raw: rawText,
        data,
      });
    }

    if (parseError) {
      return Response.json({ success: false, error: parseError, raw: rawText });
    }

    return Response.json({ success: true, http_status: response.status, data });

  } catch (err) {
    return Response.json({ success: false, error: `שגיאה פנימית: ${err.message}` }, { status: 500 });
  }
});