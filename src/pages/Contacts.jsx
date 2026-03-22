import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import ContactForm from "@/components/contacts/ContactForm";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contacts"] }); setFormOpen(false); setEditing(null); },
  });

  const handleSubmit = (data) => {
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = contacts.filter((c) => {
    const s = search.toLowerCase();
    return !s ||
      (c.full_name || "").toLowerCase().includes(s) ||
      (c.customer_name || "").toLowerCase().includes(s) ||
      (c.phone || "").includes(s);
  });

  const columns = [
    { key: "full_name", label: "שם" },
    { key: "customer_name", label: "עסק" },
    { key: "role", label: "תפקיד" },
    { key: "phone", label: "טלפון" },
    { key: "email", label: "אימייל" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="אנשי קשר"
        description={`${contacts.length} אנשי קשר`}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 ml-2" />
            איש קשר חדש
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש אנשי קשר..."
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
        emptyTitle="אין אנשי קשר"
        emptyDescription="הוסף איש קשר חדש כדי להתחיל"
      />

      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editing}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        customers={customers}
      />
    </div>
  );
}