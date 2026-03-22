import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import OrderForm from "@/components/orders/OrderForm";

export default function Orders() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date"),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orders"] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orders"] }); setFormOpen(false); setEditing(null); },
  });

  const handleSubmit = (data) => {
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = orders.filter((o) => {
    const s = search.toLowerCase();
    return !s ||
      (o.customer_name || "").toLowerCase().includes(s) ||
      (o.status || "").includes(s);
  });

  const columns = [
    { key: "customer_name", label: "לקוח" },
    { key: "order_date", label: "תאריך" },
    { key: "items_count", label: "פריטים", render: (row) => (row.items || []).length },
    { key: "total_amount", label: 'סה"כ', render: (row) => row.total_amount != null ? `₪${row.total_amount.toFixed(2)}` : "—" },
    { key: "status", label: "סטטוס", render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="הזמנות"
        description={`${orders.length} הזמנות`}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 ml-2" />
            הזמנה חדשה
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש הזמנות..."
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
        emptyTitle="אין הזמנות"
        emptyDescription="צור הזמנה חדשה כדי להתחיל"
      />

      <OrderForm
        open={formOpen}
        onOpenChange={setFormOpen}
        order={editing}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        customers={customers}
        products={products}
      />
    </div>
  );
}