import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import ProductForm from "@/components/products/ProductForm";

export default function Products() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); setFormOpen(false); setEditing(null); },
  });

  const handleSubmit = (data) => {
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = products.filter((p) => {
    const s = search.toLowerCase();
    return !s ||
      (p.name || "").toLowerCase().includes(s) ||
      (p.rivhit_item_code || "").includes(s) ||
      (p.sku || "").includes(s) ||
      (p.category || "").toLowerCase().includes(s);
  });

  const columns = [
    { key: "name", label: "שם המוצר" },
    { key: "rivhit_item_code", label: "קוד ריווחית" },
    { key: "sku", label: "מק\"ט" },
    { key: "category", label: "קטגוריה" },
    { key: "price", label: "מחיר", render: (row) => row.price != null ? `₪${row.price.toFixed(2)}` : "—" },
    { key: "unit", label: "יחידה" },
    { key: "status", label: "סטטוס", render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="מוצרים"
        description={`${products.length} מוצרים`}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 ml-2" />
            מוצר חדש
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש מוצרים..."
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
        emptyTitle="אין מוצרים"
        emptyDescription="הוסף מוצר חדש כדי להתחיל"
      />

      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}