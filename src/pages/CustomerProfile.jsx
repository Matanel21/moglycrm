import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Phone, Mail, MapPin, Hash, User, Save, Bell, Star } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { computePersonalForecast } from "@/lib/customerForecast";

// ── helpers ────────────────────────────────────────────────
function computeStats(docs) {
  if (!docs.length) return { totalOrders: 0, totalRevenue: 0, avgOrder: 0, lastDoc: null };
  const sorted = [...docs].sort((a, b) => (b.document_date || "").localeCompare(a.document_date || ""));
  const lastDoc = sorted[0];
  const totalRevenue = docs.reduce((s, d) => s + (d.total_to_pay || 0), 0);
  const avgOrder = docs.length ? Math.round(totalRevenue / docs.length) : 0;
  return { totalOrders: docs.length, totalRevenue, avgOrder, lastDoc };
}

function getTopProducts(docs, limit = 5) {
  const counter = {};
  docs.forEach(doc => {
    const lines = doc.lines;
    if (!lines) return;
    const arr = Array.isArray(lines) ? lines : (lines.items || lines.rows || Object.values(lines));
    if (!Array.isArray(arr)) return;
    arr.forEach(line => {
      const name = line.description || line.item_description || line.name || line.item_name;
      if (!name) return;
      counter[name] = (counter[name] || 0) + (line.quantity || 1);
    });
  });
  return Object.entries(counter)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`rounded-lg p-4 text-center ${highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/40"}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

const TYPE_COLORS = {
  "חנות חיות":    "bg-blue-100 text-blue-700 border-blue-200",
  "מספרת כלבים": "bg-purple-100 text-purple-700 border-purple-200",
  "מפיץ":         "bg-amber-100 text-amber-700 border-amber-200",
  "אחר":          "bg-gray-100 text-gray-600 border-gray-200",
};

// ── component ──────────────────────────────────────────────
export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOwner = user?.role === "admin" || user?.role === "owner";

  const [notes, setNotes]             = useState("");
  const [customerType, setCustomerType] = useState("");
  const [priceList, setPriceList]     = useState("");
  const [privateLabel, setPrivateLabel] = useState(false);
  const [isActive, setIsActive]       = useState(true);
  const [saved, setSaved]             = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const list = await base44.entities.RivhitRawCustomer.filter({ id });
      return list?.[0] || null;
    },
  });

  const { data: allDocs = [] } = useQuery({
    queryKey: ["customer-docs", customer?.rivhit_card_number],
    enabled: !!customer?.rivhit_card_number,
    queryFn: () => base44.entities.RivhitRawDocument.filter({ rivhit_card_number: customer.rivhit_card_number }),
  });

  const docs = [...allDocs].sort((a, b) => (b.document_date || "").localeCompare(a.document_date || ""));

  useEffect(() => {
    if (customer) {
      setNotes(customer.crm_notes || "");
      setCustomerType(customer.customer_type || "");
      setPriceList(customer.price_list || "");
      setPrivateLabel(customer.private_label || false);
      setIsActive(customer.is_active !== false);
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.RivhitRawCustomer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["rivhit-customers"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () =>
    updateMutation.mutate({ crm_notes: notes, customer_type: customerType, price_list: priceList, private_label: privateLabel, is_active: isActive });

  const stats = computeStats(docs);
  const forecast = computePersonalForecast(docs);
  const topProducts = getTopProducts(docs);

  if (isLoading) return <div className="py-24 text-center text-muted-foreground">טוען...</div>;
  if (!customer)  return <div className="py-24 text-center text-muted-foreground">לקוח לא נמצא</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{customer.business_name || "לקוח ללא שם"}</h1>
            {customer.private_label && <Star className="w-5 h-5 text-amber-500 fill-amber-400" />}
            {customerType && (
              <span className={`px-2 py-0.5 rounded-full text-xs border ${TYPE_COLORS[customerType] || TYPE_COLORS["אחר"]}`}>{customerType}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">כרטיס ריווחית: {customer.rivhit_card_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-600 border-red-200"}`}>
            {isActive ? "פעיל" : "לא פעיל"}
          </span>
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 ml-1" />
            צור תזכורת
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left: details + CRM ─── */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="font-semibold text-sm">פרטי קשר</p>
              {[
                { Icon: User,   value: customer.contact_name },
                { Icon: Phone,  value: customer.phone },
                { Icon: Phone,  value: customer.phone2, label: "טל׳ נוסף" },
                { Icon: Mail,   value: customer.email },
                { Icon: MapPin, value: [customer.street, customer.city, customer.zipcode].filter(Boolean).join(", ") },
                { Icon: Hash,   value: customer.vat_number, label: "ע.מ." },
              ].filter(r => r.value).map(({ Icon, value, label }, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{label ? <><span className="text-muted-foreground">{label}: </span></> : ""}{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <p className="font-semibold text-sm">שדות CRM</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">סוג לקוח</label>
                <Select value={customerType} onValueChange={setCustomerType}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="בחר..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="חנות חיות">חנות חיות</SelectItem>
                    <SelectItem value="מספרת כלבים">מספרת כלבים</SelectItem>
                    <SelectItem value="מפיץ">מפיץ</SelectItem>
                    <SelectItem value="אחר">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">מחירון</label>
                <Select value={priceList} onValueChange={setPriceList}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="בחר..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="חנות">חנות</SelectItem>
                    <SelectItem value="מספרה">מספרה</SelectItem>
                    <SelectItem value="מפיץ">מפיץ</SelectItem>
                    <SelectItem value="מיוחד">מיוחד</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">סטטוס</label>
                <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pl"
                  checked={privateLabel}
                  onChange={e => setPrivateLabel(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="pl" className="text-sm flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500" /> Private Label
                </label>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">הערות פנימיות</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות CRM בלבד..." className="h-24 text-sm" />
              </div>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="w-full gap-2">
                <Save className="w-4 h-4" />
                {saved ? "נשמר ✓" : "שמור שינויים"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ─── Right: analytics + history + products ─── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section 2: Purchase analytics */}
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold text-sm mb-4">ניתוח רכישות</p>
              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין רכישות בנתונים</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    <StatCard label="קנייה אחרונה" value={stats.lastDoc?.document_date || "—"} />
                    <StatCard label="סה״כ הזמנות" value={stats.totalOrders} />
                    <StatCard label="ימים מאז קנייה" value={stats.daysSinceLast !== null ? `${stats.daysSinceLast} יום` : "—"} />
                    {isOwner && <>
                      <StatCard label="סה״כ מחזור" value={`₪${stats.totalRevenue.toLocaleString()}`} highlight />
                      <StatCard label="ממוצע הזמנה" value={`₪${stats.avgOrder.toLocaleString()}`} highlight />
                    </>}
                    <StatCard label="ממוצע ימים בין הזמנות" value={stats.avgDaysBetween !== null ? `${stats.avgDaysBetween} יום` : "אין מספיק נתונים"} />
                    <StatCard
                      label="צפי הזמנה הבאה"
                      value={stats.nextPurchase ? format(stats.nextPurchase, "dd/MM/yyyy") : "אין מספיק נתונים"}
                    />
                  </div>
                  {docs.length < 3 && (
                    <p className="text-xs text-muted-foreground">* צפי רכישה דורש לפחות 3 הזמנות</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Order history */}
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold text-sm mb-4">היסטוריית הזמנות ({stats.totalOrders})</p>
              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">אין רכישות בנתונים</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-right text-muted-foreground">
                        <th className="pb-2 font-medium">תאריך</th>
                        <th className="pb-2 font-medium">מס׳ מסמך</th>
                        <th className="pb-2 font-medium">סה״כ לתשלום</th>
                        <th className="pb-2 font-medium">סוג</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((doc) => (
                        <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-2">{doc.document_date ? format(parseISO(doc.document_date), "dd/MM/yy") : "—"}</td>
                          <td className="py-2 font-mono text-xs">{doc.document_number || doc.rivhit_document_id}</td>
                          <td className="py-2">₪{(doc.total_to_pay || 0).toLocaleString()}</td>
                          <td className="py-2 text-muted-foreground">{doc.document_type ?? "—"}</td>
                          <td className="py-2">
                            {doc.lines && (
                              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setSelectedDoc(doc)}>
                                פרטים
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Top products */}
          {topProducts.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="font-semibold text-sm mb-3">מוצרים מובילים</p>
                <div className="space-y-2">
                  {topProducts.map(({ name, count }, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        {name}
                      </span>
                      <span className="text-muted-foreground text-xs">{count}x</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Order lines popup */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>פרטי הזמנה — {selectedDoc?.document_number || selectedDoc?.rivhit_document_id}</DialogTitle>
          </DialogHeader>
          <OrderLinesTable doc={selectedDoc} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderLinesTable({ doc }) {
  if (!doc) return null;
  const lines = doc.lines;
  const arr = Array.isArray(lines) ? lines : (lines?.items || lines?.rows || (typeof lines === "object" ? Object.values(lines) : []));
  if (!arr || arr.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">אין פרטי שורות</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-right text-muted-foreground">
          <th className="pb-2 font-medium">מוצר</th>
          <th className="pb-2 font-medium">כמות</th>
          <th className="pb-2 font-medium">מחיר יחידה</th>
          <th className="pb-2 font-medium">סה״כ</th>
        </tr>
      </thead>
      <tbody>
        {arr.map((line, i) => {
          const name = line.description || line.item_description || line.name || line.item_name || "—";
          const qty  = line.quantity ?? line.qty ?? "—";
          const price = line.price ?? line.unit_price ?? null;
          const total = line.total ?? line.total_price ?? (price && qty ? price * qty : null);
          return (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2">{name}</td>
              <td className="py-2">{qty}</td>
              <td className="py-2">{price != null ? `₪${Number(price).toLocaleString()}` : "—"}</td>
              <td className="py-2">{total != null ? `₪${Number(total).toLocaleString()}` : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}