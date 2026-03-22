import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export default function OrderItemsEditor({ items = [], onChange, products }) {
  const addItem = () => {
    onChange([...items, { product_id: "", product_name: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };

    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[idx].product_name = product.name || "";
        updated[idx].unit_price = product.price || 0;
        updated[idx].total = (updated[idx].quantity || 0) * (product.price || 0);
      }
    }

    if (field === "quantity" || field === "unit_price") {
      updated[idx].total = (updated[idx].quantity || 0) * (updated[idx].unit_price || 0);
    }

    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">פריטים</span>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="w-3 h-3 ml-1" /> הוסף פריט
        </Button>
      </div>

      {items.map((item, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg">
          <div className="col-span-5">
            <span className="text-xs text-muted-foreground">מוצר</span>
            <Select value={item.product_id || ""} onValueChange={(v) => updateItem(idx, "product_id", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="בחר מוצר" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name || p.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <span className="text-xs text-muted-foreground">כמות</span>
            <Input type="number" min="0" className="h-9" value={item.quantity ?? ""} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value) || 0)} />
          </div>
          <div className="col-span-2">
            <span className="text-xs text-muted-foreground">מחיר</span>
            <Input type="number" min="0" step="0.01" className="h-9" value={item.unit_price ?? ""} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value) || 0)} />
          </div>
          <div className="col-span-2">
            <span className="text-xs text-muted-foreground">סה"כ</span>
            <div className="h-9 flex items-center text-sm font-medium">₪{(item.total || 0).toFixed(2)}</div>
          </div>
          <div className="col-span-1">
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(idx)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}

      {items.length > 0 && (
        <div className="flex justify-start pt-2">
          <span className="text-base font-bold">
            סה"כ: ₪{items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}