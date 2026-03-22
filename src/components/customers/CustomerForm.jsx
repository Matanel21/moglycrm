import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PAYMENT_TERMS = ["שוטף+0", "שוטף+30", "שוטף+60", "שוטף+90", "מזומן", "אשראי"];
const PRICE_LISTS = ["מחירון א", "מחירון ב", "מחירון ג", "מותאם אישית"];
const STATUSES = ["פעיל", "לא פעיל", "חדש"];

export default function CustomerForm({ open, onOpenChange, customer, onSubmit, isSubmitting }) {
  const [form, setForm] = useState(customer || {});

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer?.id ? "עריכת לקוח" : "לקוח חדש"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>שם העסק</Label>
              <Input value={form.business_name || ""} onChange={(e) => handleChange("business_name", e.target.value)} />
            </div>
            <div>
              <Label>מספר כרטיס ריווחית</Label>
              <Input value={form.rivhit_card_number || ""} onChange={(e) => handleChange("rivhit_card_number", e.target.value)} />
            </div>
            <div>
              <Label>מספר עוסק מורשה</Label>
              <Input value={form.vat_number || ""} onChange={(e) => handleChange("vat_number", e.target.value)} />
            </div>
            <div>
              <Label>איש קשר</Label>
              <Input value={form.contact_name || ""} onChange={(e) => handleChange("contact_name", e.target.value)} />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input value={form.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} />
            </div>
            <div>
              <Label>אימייל</Label>
              <Input type="email" value={form.email || ""} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
            <div>
              <Label>עיר</Label>
              <Input value={form.city || ""} onChange={(e) => handleChange("city", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>כתובת</Label>
              <Input value={form.address || ""} onChange={(e) => handleChange("address", e.target.value)} />
            </div>
            <div>
              <Label>תנאי תשלום</Label>
              <Select value={form.payment_terms || ""} onValueChange={(v) => handleChange("payment_terms", v)}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>מחירון</Label>
              <Select value={form.price_list || ""} onValueChange={(v) => handleChange("price_list", v)}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>
                  {PRICE_LISTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status || "חדש"} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>הערות</Label>
              <Textarea value={form.notes || ""} onChange={(e) => handleChange("notes", e.target.value)} rows={3} />
            </div>
          </div>
          <div className="flex justify-start gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "שומר..." : "שמור"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}