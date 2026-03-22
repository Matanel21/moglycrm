import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import CustomerForm from "@/components/customers/CustomerForm";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["customers"] }); setFormOpen(false); setEditing(null); },
  });

  const handleSubmit = (data) => {
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = customers.filter((c) => {
    const s = search.toLowerCase();
    return !s || 
      (c.business_name || "").toLowerCase().includes(s) ||
      (c.contact_name || "").toLowerCase().includes(s) ||
      (c.rivhit_card_number || "").includes(s) ||
      (c.city || "").toLowerCase().includes(s);
  });

  const columns = [
    { key: "business_name", label: "שם העסק" },
    { key: "rivhit_card_number", label: "כרטיס ריווחית" },
    { key: "contact_name", label: "איש קשר" },
    { key: "phone", label: "טלפון" },
    { key: "city", label: "עיר" },
    { key: "payment_terms", label: "תנאי תשלום" },
    { key: "status", label: "סטטוס", render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="לקוחות"
        description={`${customers.length} לקוחות`}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 ml-2" />
            לקוח חדש
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לקוחות..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        onRowClick={(row) => { setEditing(row); setFormOpen(true); }}
        emptyTitle="אין לקוחות"
        emptyDescription="הוסף לקוח חדש כדי להתחיל"
      />

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}