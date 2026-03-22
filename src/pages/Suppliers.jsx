import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Textarea } from "@/components/ui/textarea";

const EMPTY = { name: "", contact_name: "", phone: "", email: "", products_supplied: "", payment_terms: "", notes: "" };

function SupplierForm({ supplier, onSubmit, onClose, isSubmitting }) {
  const [form, setForm] = useState(supplier || EMPTY);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-3">
      {[
        { key: "name", label: "שם ספק *", placeholder: "שם הספק" },
        { key: "contact_name", label: "איש קשר", placeholder: "שם איש קשר" },
        { key: "phone", label: "טלפון", placeholder: "050-0000000" },
        { key: "email", label: "אימייל", placeholder: "email@example.com" },
        { key: "products_supplied", label: "מה מספק", placeholder: "סוגי מוצרים / שירותים" },
        { key: "payment_terms", label: "תנאי תשלום", placeholder: "שוטף+30, מזומן וכו׳" },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
          <Input value={form[key]} onChange={set(key)} placeholder={placeholder} />
        </div>
      ))}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">הערות</label>
        <Textarea value={form.notes} onChange={set("notes")} placeholder="הערות נוספות..." className="h-20 text-sm" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>ביטול</Button>
        <Button onClick={() => onSubmit(form)} disabled={isSubmitting || !form.name.trim()}>
          {isSubmitting ? "שומר..." : "שמור"}
        </Button>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); setFormOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); setFormOpen(false); setEditing(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const handleSubmit = (data) => {
    if (editing?.id) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const filtered = suppliers.filter(s =>
    !search || (s.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title="ספקים"
        description={`${suppliers.length} ספקים`}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 ml-2" />
            ספק חדש
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="חיפוש לפי שם..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-right">
              <th className="px-4 py-3 font-medium text-muted-foreground">שם ספק</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">איש קשר</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">טלפון</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">מה מספק</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">תנאי תשלום</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">טוען...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">לא נמצאו ספקים</td></tr>
            )}
            {filtered.map(s => (
              <tr key={s.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.contact_name || "—"}</td>
                <td className="px-4 py-3">{s.phone || "—"}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{s.products_supplied || "—"}</td>
                <td className="px-4 py-3">{s.payment_terms || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(s); setFormOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm(`למחוק את ${s.name}?`)) deleteMutation.mutate(s.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "עריכת ספק" : "ספק חדש"}</DialogTitle>
          </DialogHeader>
          <SupplierForm
            supplier={editing}
            onSubmit={handleSubmit}
            onClose={() => { setFormOpen(false); setEditing(null); }}
            isSubmitting={isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}