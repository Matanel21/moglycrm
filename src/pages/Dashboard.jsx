import React, { useMemo, useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, Clock, CalendarCheck, TrendingUp, FileText, BarChart2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { differenceInDays, parseISO, addDays, format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { computePersonalForecast } from "@/lib/customerForecast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import PasswordModal from "@/components/dashboard/PasswordModal";

const HIDE = "****";
const REVEAL_DURATION = 30_000;

// (forecast computation moved to lib/customerForecast.js)

// ── useReveal hook ─────────────────────────────────────────
function useReveal() {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef(null);

  const reveal = useCallback(() => {
    setRevealed(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), REVEAL_DURATION);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setRevealed(false);
  }, []);

  return { revealed, reveal, hide };
}

// ── SecretStatCard ─────────────────────────────────────────
function SecretStatCard({ icon: Icon, label, value, color, onEyeClick, revealed }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{revealed ? value : HIDE}</p>
            <button onClick={onEyeClick} className="text-muted-foreground hover:text-foreground transition-colors">
              {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerRow({ customer, sub }) {
  return (
    <Link to={`/customers/${customer.id}`} className="flex items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/20 px-1 rounded transition-colors">
      <div>
        <p className="text-sm font-medium">{customer.business_name || "—"}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <span className="text-xs text-primary">פרופיל ←</span>
    </Link>
  );
}

// ── main ──────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const isOwner = user?.role === "admin" || user?.role === "owner";

  // Separate reveal states for revenue card, avg card, table rows, and chart
  const revenueReveal = useReveal();
  const avgReveal = useReveal();
  const tableReveal = useReveal();
  const chartReveal = useReveal();

  // Modal target: which reveal to trigger on success
  const [modalOpen, setModalOpen] = useState(false);
  const pendingReveal = useRef(null);

  const openModal = (revealFn) => {
    pendingReveal.current = revealFn;
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    pendingReveal.current?.();
    pendingReveal.current = null;
  };

  const { data: customers = [], isLoading: lc } = useQuery({
    queryKey: ["rivhit-customers"],
    queryFn: () => base44.entities.RivhitRawCustomer.list("-synced_at", 1000),
  });

  const { data: documents = [], isLoading: ld } = useQuery({
    queryKey: ["rivhit-documents-list"],
    queryFn: () => base44.entities.RivhitRawDocument.list("-document_date", 5000),
  });

  const stats = useMemo(() => {
    const activeCustomers = customers.filter(c => c.is_active !== false);
    const docsByCard = {};
    documents.forEach(d => {
      if (!docsByCard[d.rivhit_card_number]) docsByCard[d.rivhit_card_number] = [];
      docsByCard[d.rivhit_card_number].push(d);
    });
    const enriched = activeCustomers.map(c => {
      const forecast = computePersonalForecast(docsByCard[c.rivhit_card_number] || []);
      return { ...c, forecast };
    });
    const now = new Date();
    const in7 = addDays(now, 7);
    // overdue 14+ days past personal forecast
    const overdue = enriched.filter(c => c.forecast.hasEnoughData && c.forecast.daysOverdue !== null && c.forecast.daysOverdue >= 14);
    // late minor: 0-14 days past forecast
    const lateMinor = enriched.filter(c => c.forecast.hasEnoughData && c.forecast.daysOverdue !== null && c.forecast.daysOverdue < 14);
    // due soon: next forecast within 7 days
    const dueSoon = enriched.filter(c => c.forecast.hasEnoughData && c.forecast.nextPurchase && c.forecast.nextPurchase >= now && c.forecast.nextPurchase <= in7);
    const monthStart = startOfMonth(now).toISOString().slice(0, 10);
    const monthEnd   = endOfMonth(now).toISOString().slice(0, 10);
    const monthDocs  = documents.filter(d => d.document_date >= monthStart && d.document_date <= monthEnd);
    const monthRevenue = monthDocs.reduce((s, d) => s + (d.total_to_pay || 0), 0);
    const monthAvg     = monthDocs.length ? Math.round(monthRevenue / monthDocs.length) : 0;

    // Last 8 docs
    const recentDocs = [...documents]
      .sort((a, b) => (b.document_date || "").localeCompare(a.document_date || ""))
      .slice(0, 8);

    // Monthly chart — last 6 months
    const chartData = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MM/yy");
      const total = documents
        .filter(doc => (doc.document_date || "").startsWith(key))
        .reduce((s, doc) => s + (doc.total_to_pay || 0), 0);
      return { label, total };
    });

    return { activeCustomers: activeCustomers.length, lateMinor, dueSoon, overdue, monthDocs, monthRevenue, monthAvg, recentDocs, chartData };
  }, [customers, documents]);

  // Build customer lookup
  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach(c => { m[c.rivhit_card_number] = c; });
    return m;
  }, [customers]);

  if (lc || ld) {
    return (
      <div className="space-y-6">
        <PageHeader title="לוח בקרה" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="לוח בקרה" description="סקירה תפעולית של הלקוחות" />

      {/* Main KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="לקוחות פעילים"          value={stats.activeCustomers}   color="bg-blue-500" />
        <StatCard icon={Clock}         label="לא הזמינו 30+ יום"       value={stats.inactive30.length} color="bg-amber-500" />
        <StatCard icon={AlertTriangle} label="לא הזמינו 60+ יום"       value={stats.inactive60.length} color="bg-red-500" />
        <StatCard icon={CalendarCheck} label="צפי הזמנות השבוע הקרוב"  value={stats.dueSoon.length}    color="bg-emerald-500" />
      </div>

      {/* Financial (owner only) — with eye toggle */}
      {isOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SecretStatCard
            icon={TrendingUp} label="מחזור החודש" color="bg-primary"
            value={`₪${stats.monthRevenue.toLocaleString()}`}
            revealed={revenueReveal.revealed}
            onEyeClick={() => revenueReveal.revealed ? revenueReveal.hide() : openModal(revenueReveal.reveal)}
          />
          <SecretStatCard
            icon={BarChart2} label="ממוצע הזמנה החודש" color="bg-primary"
            value={stats.monthDocs.length ? `₪${stats.monthAvg.toLocaleString()}` : "—"}
            revealed={avgReveal.revealed}
            onEyeClick={() => avgReveal.revealed ? avgReveal.hide() : openModal(avgReveal.reveal)}
          />
          <StatCard icon={FileText} label="מסמכים החודש" value={stats.monthDocs.length} color="bg-primary" />
        </div>
      )}

      {/* Alert lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold">דורשים תשומת לב — עבר צפי ההזמנה</h2>
            </div>
            {stats.overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין לקוחות בהתראה</p>
            ) : (
              stats.overdue.slice(0, 8).map(c => (
                <CustomerRow key={c.id} customer={c} sub={`צפי: ${format(c.nextPurchase, "dd/MM/yy")} | ${c.daysSince} ימים מאז קנייה`} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold">לא הזמינו זמן חריג — 60+ יום</h2>
            </div>
            {stats.inactive60.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">אין לקוחות בקטגוריה זו</p>
            ) : (
              stats.inactive60.slice(0, 8).map(c => (
                <CustomerRow key={c.id} customer={c} sub={`${c.daysSince} ימים מאז קנייה אחרונה`} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Due soon */}
      {stats.dueSoon.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              <h2 className="font-semibold">צפי הזמנות השבוע הקרוב</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {stats.dueSoon.map(c => (
                <CustomerRow key={c.id} customer={c} sub={`צפי: ${format(c.nextPurchase, "dd/MM/yy")}`} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent orders + chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent documents table */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" /> הזמנות אחרונות
              </h2>
              <button
                onClick={() => tableReveal.revealed ? tableReveal.hide() : openModal(tableReveal.reveal)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {tableReveal.revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="pb-2 font-medium">לקוח</th>
                  <th className="pb-2 font-medium">תאריך</th>
                  <th className="pb-2 font-medium">סכום</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentDocs.map(doc => {
                  const cust = customerMap[doc.rivhit_card_number];
                  return (
                    <tr key={doc.id} className="border-b last:border-0">
                      <td className="py-2 text-sm">{cust?.business_name || doc.customer_name || "—"}</td>
                      <td className="py-2 text-muted-foreground text-xs">{doc.document_date || "—"}</td>
                      <td className="py-2 font-medium">
                        {tableReveal.revealed ? `₪${(doc.total_to_pay || 0).toLocaleString()}` : HIDE}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Monthly sales chart */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-muted-foreground" /> מכירות — 6 חודשים אחרונים
              </h2>
              <button
                onClick={() => chartReveal.revealed ? chartReveal.hide() : openModal(chartReveal.reveal)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {chartReveal.revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div
              className="relative cursor-pointer"
              onClick={() => !chartReveal.revealed && openModal(chartReveal.reveal)}
            >
              <div className={`transition-all duration-300 ${chartReveal.revealed ? "" : "blur-md select-none pointer-events-none"}`}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₪${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => [`₪${Number(v).toLocaleString()}`, "מכירות"]} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {!chartReveal.revealed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-card/80 backdrop-blur-sm border rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-medium">
                    <Eye className="w-4 h-4" /> לחץ לצפייה
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <PasswordModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleModalSuccess} />
    </div>
  );
}