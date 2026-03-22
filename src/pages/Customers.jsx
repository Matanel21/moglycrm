import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, Star } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useNavigate } from "react-router-dom";
import { computePersonalForecast, getForecastStatus } from "@/lib/customerForecast";

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

function ForecastStatusBadge({ forecast }) {
  const status = getForecastStatus(forecast);
  if (status === "no_data") return <span className="text-xs text-muted-foreground">אין נתונים</span>;
  if (status === "on_time") return <span className="px-2 py-0.5 rounded-full text-xs border bg-emerald-100 text-emerald-700 border-emerald-200">בזמן</span>;
  const days = forecast.daysOverdue;
  if (status === "late_minor") return <span className="px-2 py-0.5 rounded-full text-xs border bg-amber-100 text-amber-700 border-amber-200">מאחר {days} ימים</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs border bg-red-100 text-red-600 border-red-200">מאחר {days} ימים</span>;
}

function getCustomerDocStats(cardNumber, documents) {
  const docs = documents.filter(d => d.rivhit_card_number === cardNumber);
  const totalRevenue = docs.reduce((s, d) => s + (d.total_to_pay || 0), 0);
  const avgOrder = docs.length ? Math.round(totalRevenue / docs.length) : null;
  return { totalOrders: docs.length, avgOrder };
}

const TYPE_OPTIONS = ["חנות חיות", "מספרת כלבים", "מפיץ", "אחר"];

const ALERT_OPTIONS = [
  { value: "all", label: "כל הסטטוסים" },
  { value: "late_minor", label: "מאחר עד 14 יום" },
  { value: "late_major", label: "מאחר 14+ יום" },
  { value: "on_time", label: "בזמן" },
  { value: "no_data", label: "אין נתונים" },
];

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch]           = useState("");
  const [filterTypes, setFilterTypes] = useState([]);
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

  // Build a map of card_number -> docs for perf
  const docsByCard = useMemo(() => {
    const map = {};
    documents.forEach(d => {
      if (!map[d.rivhit_card_number]) map[d.rivhit_card_number] = [];
      map[d.rivhit_card_number].push(d);
    });
    return map;
  }, [documents]);

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
        const forecast = computePersonalForecast(docsByCard[c.rivhit_card_number] || []);
        if (getForecastStatus(forecast) !== filterAlert) return false;
      }
      return true;
    });
  }, [customers, docsByCard, search, filterTypes, filterStatus, filterAlert]);

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
            <SelectTrigger className="w-36"><SelectValue placeholder="סטטוס" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="active">פעיל</SelectItem>
              <SelectItem value="inactive">לא פעיל</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAlert} onValueChange={setFilterAlert}>
            <SelectTrigger className="w-48"><SelectValue placeholder="סטטוס צפי" /></SelectTrigger>
            <SelectContent>
              {ALERT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
                <th className="px-4 py-3 font-medium text-muted-foreground">צפי הבא</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">סטטוס צפי</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">הזמנות</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">ממוצע ₪</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">PL</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">סטטוס</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={12} className="py-12 text-center text-muted-foreground">טוען נתונים...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={12} className="py-12 text-center text-muted-foreground">לא נמצאו לקוחות</td></tr>
              )}
              {filtered.map((c) => {
                const customerDocs = docsByCard[c.rivhit_card_number] || [];
                const forecast = computePersonalForecast(customerDocs);
                const { totalOrders, avgOrder } = getCustomerDocStats(c.rivhit_card_number, documents);
                const isActive = c.is_active !== false;
                const nextStr = forecast.nextPurchase
                  ? forecast.nextPurchase.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" })
                  : "—";
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
                    <td className="px-4 py-3 text-muted-foreground">{forecast.lastDate || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{forecast.hasEnoughData ? nextStr : "—"}</td>
                    <td className="px-4 py-3"><ForecastStatusBadge forecast={forecast} /></td>
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