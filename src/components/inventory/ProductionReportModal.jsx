import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProductionReportModal({ open, onClose, products, onSave }) {
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    const product = products.find(p => p.id === productId);
    if (!product || !qty || Number(qty) <= 0) return;
    onSave({ product, qty: Number(qty), notes });
    setProductId("");
    setQty("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>דוח ייצור — הוספה למלאי</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">מוצר</label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר מוצר..." />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.description || `קוד ${p.rivhit_item_code}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">כמות יוצרת</label>
            <Input
              type="number"
              placeholder="הכנס כמות..."
              value={qty}
              onChange={e => setQty(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">הערות (אופציונלי)</label>
            <Input
              placeholder="הערות..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSave} disabled={!productId || !qty}>שמור ייצור</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}