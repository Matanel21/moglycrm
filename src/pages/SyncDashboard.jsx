import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw, Users, Package, FileText, Clock } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { format } from "date-fns";

const STATUS_STYLES = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  error: "bg-red-100 text-red-600 border-red-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  running: "bg-amber-100 text-amber-700 border-amber-200",
};

const STATUS_LABELS = {
  success: "הצלחה",
  error: "שגיאה",
  partial: "חלקי",
  running: "רץ...",
};

const SYNC_BUTTONS = [
  { type: "customers", label: "סנכרן לקוחות" },
  { type: "products",  label: "סנכרן מוצרים" },
  { type: "documents", label: "סנכרן מסמכים" },
  { type: "full",      label: "סנכרן הכל" },
];

export default function SyncDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingType, setLoadingType] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const { data: customers = [] } = useQuery({ queryKey: ["sync-customers-count"], queryFn: () => base44.entities.RivhitRawCustomer.list() });
  const { data: products = [] }  = useQuery({ queryKey: ["sync-products-count"],  queryFn: () => base44.entities.RivhitRawProduct.list() });
  const { data: documents = [] } = useQuery({ queryKey: ["sync-documents-count"], queryFn: () => base44.entities.RivhitRawDocument.list() });
  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: () => base44.entities.SyncLog.list("-created_date", 20),
  });

  const lastSync = logs.find(l => l.status === "success")?.finished_at;

  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (!isDev && user?.role !== "owner" && user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <ShieldAlert className="w-10 h-10 text-destructive" />
        <p className="text-lg font-medium">גישה מוגבלת — בעלים בלבד</p>
      </div>
    );
  }

  const handleSync = async (sync_type) => {
    setLoadingType(sync_type);
    setLastResult(null);
    const res = await base44.functions.invoke("syncRivhit", { sync_type });
    const result = res.data;
    setLastResult(result);
    setLoadingType(null);
    queryClient.invalidateQueries({ queryKey: ["sync-customers-count"] });
    queryClient.invalidateQueries({ queryKey: ["sync-products-count"] });
    queryClient.invalidateQueries({ queryKey: ["sync-documents-count"] });
    refetchLogs();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="לוח סנכרון ריווחית" description="סנכרון ידני ומעקב אחר תהליכי סנכרון" />

      {/* Sync buttons */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-muted-foreground mb-4">סנכרון ידני</p>
          <div className="flex flex-wrap gap-3">
            {SYNC_BUTTONS.map(({ type, label }) => (
              <Button
                key={type}
                variant={type === "full" ? "default" : "outline"}
                disabled={loadingType !== null}
                onClick={() => handleSync(type)}
                className="gap-2"
              >
                {loadingType === type && <RefreshCw className="w-4 h-4 animate-spin" />}
                {loadingType === type ? "מסנכרן..." : label}
              </Button>
            ))}
          </div>

          {lastResult && (
            <div className={`mt-4 rounded-md border px-4 py-3 text-sm font-medium ${lastResult.success ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
              {lastResult.success
                ? `✓ סנכרון הושלם — ${lastResult.records_saved} רשומות נשמרו מתוך ${lastResult.records_fetched}`
                : `✗ שגיאה: ${lastResult.error}`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "לקוחות", count: customers.length, icon: Users, color: "text-blue-600" },
          { label: "מוצרים",  count: products.length,  icon: Package, color: "text-purple-600" },
          { label: "מסמכים", count: documents.length, icon: FileText, color: "text-amber-600" },
          { label: "סנכרון אחרון", count: lastSync ? format(new Date(lastSync), "dd/MM HH:mm") : "—", icon: Clock, color: "text-muted-foreground" },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-3">
              <Icon className={`w-6 h-6 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Logs table */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-muted-foreground mb-4">לוג סנכרונים אחרונים</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-right">
                  <th className="pb-2 font-medium">תאריך</th>
                  <th className="pb-2 font-medium">סוג</th>
                  <th className="pb-2 font-medium">סטטוס</th>
                  <th className="pb-2 font-medium">התקבלו</th>
                  <th className="pb-2 font-medium">נשמרו</th>
                  <th className="pb-2 font-medium">שגיאה</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">אין לוגים עדיין</td></tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2">{log.started_at ? format(new Date(log.started_at), "dd/MM/yy HH:mm") : "—"}</td>
                    <td className="py-2">{log.sync_type || "—"}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded border text-xs font-medium ${STATUS_STYLES[log.status] || ""}`}>
                        {STATUS_LABELS[log.status] || log.status}
                      </span>
                    </td>
                    <td className="py-2">{log.records_fetched ?? "—"}</td>
                    <td className="py-2">{log.records_saved ?? "—"}</td>
                    <td className="py-2 text-destructive max-w-[200px] truncate">{log.error_message || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}