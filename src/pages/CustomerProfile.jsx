import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Phone, Mail, MapPin, Hash, User, Save, Bell } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";

function StatCard({ label, value }) {
  return (
    <div className="bg-muted/40 rounded-lg p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "owner";

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

  const [notes, setNotes] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notesSaved, setNotesSaved] = useState(false);

  React.useEffect(() => {
    if (customer) {
      setNotes(customer.crm_notes || "");
      setCustomerType(customer.customer_type || "");
      setIsActive(customer.is_active !== false);
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.RivhitRawCustomer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["rivhit-customers"] });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ crm_notes: notes, customer_type: customerType, is_active: isActive });
  };

  // Stats
  const totalOrders = docs.length;
  const totalRevenue = docs.reduce((s, d) => s + (d.total_to_pay || 0), 0);
  const avgOrder = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0;
  const lastDoc = docs[0];
  const daysSinceLast = lastDoc?.document_date ? differenceInDays(new Date(), parseISO(lastDoc.document_date)) : null;
  let avgDaysBetween = "—";
  if (docs.length > 1) {
    const gaps = [];
    for (let i = 0; i < docs.length - 1; i++) {
      if (docs[i].document_date && docs[i + 1].document_date) {
        gaps.push(differenceInDays(parseISO(docs[i].document_date), parseISO(docs[i + 1].document_date)));
      }
    }
    if (gaps.length) avgDaysBetween = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) + " ימים";
  }

  if (isLoading) return <div className="py-24 text-center text-muted-foreground">טוען...</div>;
  if (!customer) return <div className="py-24 text-center text-muted-foreground">לקוח לא נמצא</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{customer.business_name || "לקוח ללא שם"}</h1>
          <p className="text-sm text-muted-foreground">כרטיס ריווחית: {customer.rivhit_card_number}</p>
        </div>
        <div className="mr-auto flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-100 text-red-600 border-red-200"}`}>
            {isActive ? "פעיל" : "לא פעיל"}
          </span>
          <Button variant="outline" size="sm" onClick={() => alert("פיצ'ר בפיתוח")}>
            <Bell className="w-4 h-4 ml-1" />
            צור משימה
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Contact details */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="font-semibold text-sm mb-3">פרטי קשר</p>
              {[
                { icon: User, value: customer.contact_name },
                { icon: Phone, value: customer.phone },
                { icon: Phone, value: customer.phone2, label: "טל\' נוסף" },
                { icon: Mail, value: customer.email },
                { icon: MapPin, value: [customer.street, customer.city, customer.zipcode].filter(Boolean).join(", ") },
                { icon: Hash, value: customer.vat_number, label: "ע.מ." },
              ].filter(item => item.value).map(({ icon: Icon, value, label }, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{label ? `${label}: ` : ""}{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CRM Fields */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <p className="font-semibold text-sm">שדות CRM</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">סוג לקוח</label>
                <Select value={customerType} onValueChange={setCustomerType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="בחר סוג..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="חנות חיות">חנות חיות</SelectItem>
                    <SelectItem value="מספרת כלבים">מספרת כלבים</SelectItem>
                    <SelectItem value="מפיץ">מפיץ</SelectItem>
                    <SelectItem value="אחר">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">סטטוס</label>
                <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">הערות פנימיות</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הערות לשימוש פנימי בלבד..."
                  className="h-24 text-sm"
                />
              </div>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="w-full gap-2">
                <Save className="w-4 h-4" />
                {notesSaved ? "נשמר ✓" : "שמור שינויים"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="סה״כ הזמנות" value={totalOrders} />
            <StatCard label="ממוצע הזמנה" value={totalOrders ? `₪${Number(avgOrder).toLocaleString()}` : "—"} />
            <StatCard label="ימים מאז אחרון" value={daysSinceLast !== null ? daysSinceLast : "אין"} />
            <StatCard label="ממוצע בין הזמנות" value={avgDaysBetween} />
            {isAdmin && (
              <div className="col-span-2 sm:col-span-4 bg-muted/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">₪{totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">סה״כ מחזור</p>
              </div>
            )}
          </div>

          {/* Order history */}
          <Card>
            <CardContent className="p-5">
              <p className="font-semibold text-sm mb-4">היסטוריית מסמכים ({totalOrders})</p>
              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">אין רכישות</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-right">
                        <th className="pb-2 font-medium text-muted-foreground">מס׳ מסמך</th>
                        <th className="pb-2 font-medium text-muted-foreground">תאריך</th>
                        <th className="pb-2 font-medium text-muted-foreground">סוג</th>
                        {isAdmin && <th className="pb-2 font-medium text-muted-foreground">סה״כ</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((doc) => (
                        <tr key={doc.id} className="border-b last:border-0">
                          <td className="py-2 font-mono">{doc.document_number || doc.rivhit_document_id}</td>
                          <td className="py-2">{doc.document_date ? format(parseISO(doc.document_date), "dd/MM/yyyy") : "—"}</td>
                          <td className="py-2 text-muted-foreground">{doc.document_type ?? "—"}</td>
                          {isAdmin && <td className="py-2">₪{(doc.total_to_pay || 0).toLocaleString()}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}