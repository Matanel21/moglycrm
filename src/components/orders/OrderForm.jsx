import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OrderItemsEditor from "./OrderItemsEditor";

const STATUSES = ["טיוטה", "אושרה", "בהכנה", "נשלחה", "סופקה", "בוטלה"];

export default function OrderForm({ open, onOpenChange, order, onSubmit, isSubmitting, customers, products }) {
  const [form, setForm] = useState(order || { items: [], status: "טיוטה" });

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    setForm((prev) => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.business_name || "",
      delivery_address: customer?.address || prev.delivery_address || "",
    }));
  };

  const handleItemsChange = (items) => {
    const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
    setForm((prev) => ({ ...prev, items, total_amount: total }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order?.id ? "עריכת הזמנה" : "הזמנה חדשה"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>לקוח</Label>
              <Select value={form.customer_id || ""} onValueChange={handleCustomerSelect}>
                <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.business_name || c.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תאריך הזמנה</Label>
              <Input type="date" value={form.order_date || ""} onChange={(e) => handleChange("order_date", e.target.value)} />
            </div>
            <div>
              <Label>סטטוס</Label>
              <Select value={form.status || "טיוטה"} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>כתובת למשלוח</Label>
              <Input value={form.delivery_address || ""} onChange={(e) => handleChange("delivery_address", e.target.value)} />
            </div>
          </div>

          <OrderItemsEditor items={form.items || []} onChange={handleItemsChange} products={products} />

          <div>
            <Label>הערות</Label>
            <Textarea value={form.notes || ""} onChange={(e) => handleChange("notes", e.target.value)} rows={2} />
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