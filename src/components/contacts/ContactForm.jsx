import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ContactForm({ open, onOpenChange, contact, onSubmit, isSubmitting, customers }) {
  const [form, setForm] = useState(contact || {});

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    setForm((prev) => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.business_name || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact?.id ? "עריכת איש קשר" : "איש קשר חדש"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>שייך לעסק</Label>
            <Select value={form.customer_id || ""} onValueChange={handleCustomerSelect}>
              <SelectTrigger><SelectValue placeholder="בחר עסק" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.business_name || c.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>שם מלא</Label>
            <Input value={form.full_name || ""} onChange={(e) => handleChange("full_name", e.target.value)} />
          </div>
          <div>
            <Label>תפקיד</Label>
            <Input value={form.role || ""} onChange={(e) => handleChange("role", e.target.value)} />
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
            <Label>הערות</Label>
            <Textarea value={form.notes || ""} onChange={(e) => handleChange("notes", e.target.value)} rows={3} />
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