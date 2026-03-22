import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, Clock, CalendarCheck, TrendingUp, FileText, BarChart2 } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { differenceInDays, parseISO, addDays, format, startOfMonth, endOfMonth } from "date-fns";

// ── helpers ────────────────────────────────────────────────
function computeCustomerStats(customer, docs) {
  const myDocs = docs
    .filter(d => d.rivhit_card_number === customer.rivhit_card_number)
    .sort((a, b) => (b.document_date || "").localeCompare(a.document_date || ""));
  if (!myDocs.length) return { lastDate: null, daysSince: null, nextPurchase: null };
  const lastDate = myDocs[0].document_date;
  const daysSince = lastDate ? differenceInDays(new Date(), parseISO(lastDate)) : null;

  let nextPurchase = null;
  if (myDocs.length >= 3) {
    const gaps = [];
    for (let i = 0; i < myDocs.length - 1; i++) {
      if (myDocs[i].document_date && myDocs[i + 1].document_date)
        gaps.push(differenceInDays(parseISO(myDocs[i].document_date), parseISO(myDocs[i + 1].document_date)));
    }
    if (gaps.length) {
      const avg = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
      nextPurchase = addDays(parseISO(lastDate), avg);
    }
  }
  return { lastDate, daysSince, nextPurchase };
}

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
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

// ── component ──────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const isOwner = user?.role === "admin" || user?.role === "owner";

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

    const enriched = activeCustomers.map(c => ({
      ...c,
      ...computeCustomerStats(c, documents),
    }));

    const inactive30 = enriched.filter(c => c.daysSince !== null && c.daysSince >= 30);
    const inactive60 = enriched.filter(c => c.daysSince !== null && c.daysSince >= 60);

    // Customers whose expected next purchase is within next 7 days
    const now = new Date();
    const in7 = addDays(now, 7);
    const dueSoon = enriched.filter(c => c.nextPurchase && c.nextPurchase >= now && c.nextPurchase <= in7);

    // Overdue: next purchase was in the past but no order
    const overdue = enriched.filter(c => c.nextPurchase && c.nextPurchase < now && c.daysSince !== null && c.daysSince >= (differenceInDays(now, c.nextPurchase) + 1));

    // Financial stats for this month
    const monthStart = startOfMonth(now).toISOString().slice(0, 10);
    const monthEnd   = endOfMonth(now).toISOString().slice(0, 10);
    const monthDocs  = documents.filter(d => d.document_date >= monthStart && d.document_date <= monthEnd);
    const monthRevenue = monthDocs.reduce((s, d) => s + (d.total_to_pay || 0), 0);
    const monthAvg     = monthDocs.length ? Math.round(monthRevenue / monthDocs.length) : 0;

    return { activeCustomers: activeCustomers.length, inactive30, inactive60, dueSoon, overdue, monthDocs, monthRevenue, monthAvg };
  }, [customers, documents]);

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
        <StatCard icon={Users}        label="לקוחות פעילים"          value={stats.activeCustomers}       color="bg-blue-500" />
        <StatCard icon={Clock}        label="לא הזמינו 30+ יום"       value={stats.inactive30.length}     color="bg-amber-500" />
        <StatCard icon={AlertTriangle} label="לא הזמינו 60+ יום"      value={stats.inactive60.length}     color="bg-red-500" />
        <StatCard icon={CalendarCheck} label="צפי הזמנות השבוע הקרוב" value={stats.dueSoon.length}        color="bg-emerald-500" />
      </div>

      {/* Financial (owner only) */}
      {isOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={TrendingUp} label="מחזור החודש"          value={`₪${stats.monthRevenue.toLocaleString()}`}  color="bg-primary" />
          <StatCard icon={BarChart2}  label="ממוצע הזמנה החודש"    value={stats.monthDocs.length ? `₪${stats.monthAvg.toLocaleString()}` : "—"} color="bg-primary" />
          <StatCard icon={FileText}   label="מסמכים החודש"          value={stats.monthDocs.length}                       color="bg-primary" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue */}
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

        {/* 60+ days */}
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
    </div>
  );
}