import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useNavigate } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";

function getCustomerStats(cardNumber, documents) {
  const docs = documents.filter(d => d.rivhit_card_number === cardNumber);
  if (!docs.length) return { lastDate: null, daysSince: null, totalOrders: 0 };
  const sorted = [...docs].sort((a, b) => (b.document_date || "").localeCompare(a.document_date || ""));
  const lastDate = sorted[0].document_date;
  const daysSince = lastDate ? differenceInDays(new Date(), parseISO(lastDate)) : null;
  return { lastDate, daysSince, totalOrders: docs.length };
}

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["rivhit-customers"],
    queryFn: () => base44.entities.RivhitRawCustomer.list("-synced_at", 500),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["rivhit-documents-list"],
    queryFn: () => base44.entities.RivhitRawDocument.list("-document_date", 2000),
  });

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const s = search.toLowerCase();
      const matchSearch = !s ||
        (c.business_name || "").toLowerCase().includes(s) ||
        (c.city || "").toLowerCase().includes(s) ||
        (c.phone || "").includes(s);
      const matchType = filterType === "all" || c.customer_type === filterType;
      const matchStatus = filterStatus === "all" ||
        (filterStatus === "active" && c.is_active !== false) ||
        (filterStatus === "inactive" && c.is_active === false);
      return matchSearch && matchType && matchStatus;
    });
  }, [customers, search, filterType, filterStatus]);

  return (
    <div className="space-y-4">
      <PageHeader title="לקוחות" description={`${customers.length} לקוחות במערכת`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, עיר, טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="סוג לקוח" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            <SelectItem value="חנות חיות">חנות חיות</SelectItem>
            <SelectItem value="מספרת כלבים">מספרת כלבים</SelectItem>
            <SelectItem value="מפיץ">מפיץ</SelectItem>
            <SelectItem value="אחר">אחר</SelectItem>
          </SelectContent>
        </Select>
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
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium text-muted-foreground">שם עסק</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">עיר</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">טלפון</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">סוג לקוח</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">קנייה אחרונה</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">ימים מאז</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">הזמנות</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">סטטוס</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">טוען...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">לא נמצאו לקוחות</td></tr>
              )}
              {filtered.map((c) => {
                const { lastDate, daysSince, totalOrders } = getCustomerStats(c.rivhit_card_number, documents);
                const isActive = c.is_active !== false;
                const daysColor = daysSince === null ? "" : daysSince > 90 ? "text-red-600 font-semibold" : daysSince > 45 ? "text-amber-600" : "text-emerald-600";
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{c.business_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.city || "—"}</td>
                    <td className="px-4 py-3">{c.phone || "—"}</td>
                    <td className="px-4 py-3">
                      {c.customer_type ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">{c.customer_type}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">{lastDate || <span className="text-muted-foreground text-xs">אין רכישות</span>}</td>
                    <td className={`px-4 py-3 ${daysColor}`}>
                      {daysSince !== null ? `${daysSince} ימים` : "—"}
                    </td>
                    <td className="px-4 py-3">{totalOrders || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-600 border-red-200"}`}>
                        {isActive ? "פעיל" : "לא פעיל"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}