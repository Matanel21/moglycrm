import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, Star } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";

const TYPE_COLORS = {
  "חנות חיות":    "bg-blue-100 text-blue-700 border-blue-200",
  "מספרת כלבים": "bg-purple-100 text-purple-700 border-purple-200",
  "מפיץ":         "bg-amber-100 text-amber-700 border-amber-200",
  "אחר":          "bg-gray-100 text-gray-600 border-gray-200",
};

function TypeBadge({ type }) {
  if (!type) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${TYPE_COLORS[type] || TYPE_COLORS["אחר"]}`}>
      {type}
    </span>
  );
}

function DaysCell({ days }) {
  if (days === null) return <span className="text-muted-foreground text-xs">אין רכישות</span>;
  const cls = days >= 60 ? "text-red-600 font-semibold" : days >= 45 ? "text-amber-600 font-semibold" : "text-foreground";
  return <span className={cls}>{days} ימים</span>;
}

function getCustomerStats(cardNumber, documents) {
  const docs = documents
    .filter(d => d.rivhit_card_number === cardNumber)
    .sort((a, b) => (b.document_date || "").localeCompare(a.document_date || ""));
  if (!docs.length) return { lastDate: null, daysSince: null, totalOrders: 0, avgOrder: null };
  const lastDate = docs[0].document_date;
  const daysSince = lastDate ? differenceInDays(new Date(), parseISO(lastDate)) : null;
  const totalRevenue = docs.reduce((s, d) => s + (d.total_to_pay || 0), 0);
  const avgOrder = docs.length ? Math.round(totalRevenue / docs.length) : null;
  return { lastDate, daysSince, totalOrders: docs.length, avgOrder };
}

const ALERT_OPTIONS = [
  { value: "all", label: "כל ההתראות" },
  { value: "30", label: "לא הזמין 30+ יום" },
  { value: "60", label: "לא הזמין 60+ יום" },
];

const TYPE_OPTIONS = ["חנות חיות", "מספרת כלבים", "מפיץ", "אחר"];

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch]         = useState("");
  const [filterTypes, setFilterTypes] = useState([]); // multi-select
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAlert, setFilterAlert]   = useState("all");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["rivhit-customers"],
    queryFn: () => base44.entities.RivhitRawCustomer.list("-synced_at", 1000),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["rivhit-documents-list"],
    queryFn: () => base44.entities.RivhitRawDocument.list("-document_date", 5000),
  });

  const toggleType = (type) => {
    setFilterTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const s = search.toLowerCase();
      if (s && ![(c.business_name||""), (c.city||""), (c.phone||"")].some(v => v.toLowerCase().includes(s))) return false;
      if (filterTypes.length && !filterTypes.includes(c.customer_type)) return false;
      if (filterStatus === "active" && c.is_active === false) return false;
      if (filterStatus === "inactive" && c.is_active !== false) return false;
      if (filterAlert !== "all") {
        const { daysSince } = getCustomerStats(c.rivhit_card_number, documents);
        const threshold = parseInt(filterAlert);
        if (daysSince === null || daysSince < threshold) return false;
      }
      return true;
    });
  }, [customers, documents, search, filterTypes, filterStatus, filterAlert]);

  return (
    <div className="space-y-4">
      <PageHeader title="לקוחות" description={`${customers.length} לקוחות במערכת`} />

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם, עיר, טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="active">פעיל</SelectItem>
              <SelectItem value="inactive">לא פעיל</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAlert} onValueChange={setFilterAlert}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="התראות" />
            </SelectTrigger>
            <SelectContent>
              {ALERT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {/* Multi-select type filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">סוג:</span>
          <button
            onClick={() => setFilterTypes([])}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${filterTypes.length === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
          >
            הכל
          </button>
          {TYPE_OPTIONS.map(type => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${filterTypes.includes(type) ? TYPE_COLORS[type] + " ring-1 ring-offset-1" : "bg-background border-border hover:bg-muted"}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium text-muted-foreground">שם עסק</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">סוג לקוח</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">עיר</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">טלפון</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">קנייה אחרונה</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">ימים מאז</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">הזמנות</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">ממוצע ₪</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">PL</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">סטטוס</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={11} className="py-12 text-center text-muted-foreground">טוען נתונים...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={11} className="py-12 text-center text-muted-foreground">לא נמצאו לקוחות</td></tr>
              )}
              {filtered.map((c) => {
                const { lastDate, daysSince, totalOrders, avgOrder } = getCustomerStats(c.rivhit_card_number, documents);
                const isActive = c.is_active !== false;
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{c.business_name || "—"}</td>
                    <td className="px-4 py-3"><TypeBadge type={c.customer_type} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.city || "—"}</td>
                    <td className="px-4 py-3">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lastDate || "—"}</td>
                    <td className="px-4 py-3"><DaysCell days={daysSince} /></td>
                    <td className="px-4 py-3">{totalOrders || "—"}</td>
                    <td className="px-4 py-3">{avgOrder ? `₪${avgOrder.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3">
                      {c.private_label && <Star className="w-4 h-4 text-amber-500 fill-amber-400" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-600 border-red-200"}`}>
                        {isActive ? "פעיל" : "לא פעיל"}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
          מציג {filtered.length} מתוך {customers.length} לקוחות
        </div>
      </div>
    </div>
  );
}