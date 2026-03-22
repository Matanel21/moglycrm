import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATEGORIES = ["שמפו", "מרכך", "בושם", "ספריי", "אביזרים", "ציוד מקצועי", "אחר"];
const UNITS = ["יחידה", "מארז", "ליטר", "קילוגרם"];
const STATUSES = ["פעיל", "לא פעיל", "אזל מהמלאי"];

export default function ProductForm({ open, onOpenChange, product, onSubmit, isSubmitting }) {
  const [form, setForm] = useState(product || {});

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product?.id ? "עריכת מוצר" : "מוצר חדש"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>שם המוצר</Label>
              <Input value={form.name || ""} onChange={(e) => handleChange("name", e.target.value)} />
            </div>
            <div>
              <Label>קוד פריט ריווחית</Label>
              <Input value={form.rivhit_item_code || ""} onChange={(e) => handleChange("rivhit_item_code", e.target.value)} />
            </div>
            <div>
              <Label>מק"ט</Label>
              <Input value={form.sku || ""} onChange={(e) => handleChange("sku", e.target.value)} />
            </div>
            <div>
              <Label>ברקוד</Label>
              <Input value={form.barcode || ""} onChange={(e) => handleChange("barcode", e.target.value)} />
            </div>
            <div>
              <Label>קטגוריה</Label>
              <Select value={form.category || ""} onValueChange={(v) => handleChange("category", v)}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>יחידת מידה</Label>
              <Select value={form.unit || "יחידה"} onValueChange={(v) => handleChange("unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>מחיר מחירון</Label>
              <Input type="number" step="0.01" value={form.price ?? ""} onChange={(e) => handleChange("price", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>עלות</Label>
              <Input type="number" step="0.01" value={form.cost ?? ""} onChange={(e) => handleChange("cost", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>נפח (מ"ל)</Label>
              <Input type="number" value={form.volume_ml ?? ""} onChange={(e) => handleChange("volume_ml", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status || "פעיל"} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>תיאור</Label>
              <Textarea value={form.description || ""} onChange={(e) => handleChange("description", e.target.value)} rows={3} />
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