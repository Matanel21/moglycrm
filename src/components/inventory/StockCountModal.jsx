import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StockCountModal({ open, onClose, products, onSave }) {
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    if (open) {
      const init = {};
      products.forEach(p => { init[p.id] = p.stock_quantity ?? ""; });
      setQuantities(init);
    }
  }, [open, products]);

  const handleSave = () => {
    const changes = products
      .filter(p => {
        const newVal = quantities[p.id];
        return newVal !== "" && Number(newVal) !== (p.stock_quantity ?? null);
      })
      .map(p => ({ product: p, newQty: Number(quantities[p.id]) }));
    onSave(changes);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ספירת מלאי — עדכון כמויות</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          עדכן את הכמויות הנוכחיות. רק מוצרים שנשתנו יישמרו כתנועת ספירה.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-right text-muted-foreground">
              <th className="pb-2 font-medium">שם מוצר</th>
              <th className="pb-2 font-medium">כמות נוכחית</th>
              <th className="pb-2 font-medium">כמות חדשה</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b">
                <td className="py-2 pr-1">{p.description || "—"}</td>
                <td className="py-2 text-muted-foreground">{p.stock_quantity ?? "—"}</td>
                <td className="py-2">
                  <Input
                    type="number"
                    value={quantities[p.id] ?? ""}
                    onChange={e => setQuantities(q => ({ ...q, [p.id]: e.target.value }))}
                    className="w-28 h-8 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={handleSave}>שמור ספירה</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}