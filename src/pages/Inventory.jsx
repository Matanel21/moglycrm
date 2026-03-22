import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, PackageX, ClipboardList, Wrench } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { format } from "date-fns";
import StockCountModal from "@/components/inventory/StockCountModal";
import ProductionReportModal from "@/components/inventory/ProductionReportModal";

function getStockStatus(qty, min) {
  if (qty === null || qty === undefined) return "unknown";
  if (qty === 0) return "zero";
  if (min && qty < min) return "low";
  if (min && qty <= min * 1.2) return "warning";
  return "ok";
}

const STATUS_BADGE = {
  ok:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  low:     "bg-red-100 text-red-600 border-red-200",
  zero:    "bg-red-100 text-red-600 border-red-200",
  unknown: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABEL = {
  ok:      "תקין",
  warning: "קרוב למינימום",
  low:     "מתחת למינימום",
  zero:    "אפס מלאי",
  unknown: "לא הוגדר",
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Inventory() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [countModalOpen, setCountModalOpen] = useState(false);
  const [productionModalOpen, setProductionModalOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["rivhit-products-inventory"],
    queryFn: () => base44.entities.RivhitRawProduct.list("-synced_at", 2000),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RivhitRawProduct.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rivhit-products-inventory"] }),
  });

  const createMovement = useMutation({
    mutationFn: (data) => base44.entities.StockMovement.create(data),
  });

  const stats = useMemo(() => {
    const lowStock = products.filter(p => {
      const s = getStockStatus(p.stock_quantity, p.stock_minimum);
      return s === "low" || s === "warning";
    }).length;
    const zeroStock = products.filter(p => p.stock_quantity === 0).length;
    return { lowStock, zeroStock };
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const s = getStockStatus(p.stock_quantity, p.stock_minimum);
      if (filter === "low" && s !== "low" && s !== "warning") return false;
      if (filter === "zero" && p.stock_quantity !== 0) return false;
      if (search && !(p.description || "").toLowerCase().includes(search.toLowerCase()) &&
          !(p.category || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, filter, search]);

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditValues({ stock_quantity: p.stock_quantity ?? "", stock_minimum: p.stock_minimum ?? "" });
  };

  const saveEdit = async (p) => {
    const qty = Number(editValues.stock_quantity);
    const prevQty = p.stock_quantity ?? 0;
    await updateProduct.mutateAsync({
      id: p.id,
      data: {
        stock_quantity: qty,
        stock_minimum: editValues.stock_minimum !== "" ? Number(editValues.stock_minimum) : null,
        stock_last_updated: format(new Date(), "yyyy-MM-dd"),
      }
    });
    if (qty !== prevQty) {
      await createMovement.mutateAsync({
        product_id: p.id,
        product_name: p.description,
        movement_type: "ספירה",
        quantity: qty - prevQty,
        movement_date: format(new Date(), "yyyy-MM-dd"),
        notes: "עדכון ידני",
      });
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="ניהול מלאי"
        description="עדכון כמויות, התראות מינימום ותנועות מלאי"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCountModalOpen(true)}>
              <ClipboardList className="w-4 h-4 ml-1" /> ספירת מלאי
            </Button>
            <Button onClick={() => setProductionModalOpen(true)}>
              <Wrench className="w-4 h-4 ml-1" /> דוח ייצור
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={AlertTriangle} label="מוצרים במלאי נמוך / קרוב למינימום" value={stats.lowStock} color="bg-amber-500" />
        <StatCard icon={PackageX}      label="מוצרים עם מלאי אפס"                value={stats.zeroStock} color="bg-red-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="חיפוש לפי שם מוצר..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          {[
            { value: "all", label: "הכל" },
            { value: "low", label: "מלאי נמוך" },
            { value: "zero", label: "מלאי אפס" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                filter === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium text-muted-foreground">שם מוצר</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">קטגוריה</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">כמות נוכחית</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">מינימום</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">סטטוס</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">עדכון אחרון</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">טוען...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">לא נמצאו מוצרים</td></tr>
              )}
              {filtered.map(p => {
                const status = getStockStatus(p.stock_quantity, p.stock_minimum);
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.description || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.category || "—"}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editValues.stock_quantity}
                          onChange={e => setEditValues(v => ({ ...v, stock_quantity: e.target.value }))}
                          className="w-24 h-8 text-sm"
                        />
                      ) : (
                        <span className="font-semibold">{p.stock_quantity ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editValues.stock_minimum}
                          onChange={e => setEditValues(v => ({ ...v, stock_minimum: e.target.value }))}
                          className="w-24 h-8 text-sm"
                          placeholder="מינימום"
                        />
                      ) : (
                        <span className="text-muted-foreground">{p.stock_minimum ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_BADGE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.stock_last_updated || "—"}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(p)}>שמור</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>ביטול</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(p)}>עריכה</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
          מציג {filtered.length} מוצרים
        </div>
      </div>

      <StockCountModal
        open={countModalOpen}
        onClose={() => setCountModalOpen(false)}
        products={products}
        onSave={async (changes) => {
          for (const { product, newQty } of changes) {
            await updateProduct.mutateAsync({
              id: product.id,
              data: {
                stock_quantity: newQty,
                stock_last_updated: format(new Date(), "yyyy-MM-dd"),
              }
            });
            await createMovement.mutateAsync({
              product_id: product.id,
              product_name: product.description,
              movement_type: "ספירה",
              quantity: newQty - (product.stock_quantity ?? 0),
              movement_date: format(new Date(), "yyyy-MM-dd"),
              notes: "ספירת מלאי",
            });
          }
          qc.invalidateQueries({ queryKey: ["rivhit-products-inventory"] });
          setCountModalOpen(false);
        }}
      />

      <ProductionReportModal
        open={productionModalOpen}
        onClose={() => setProductionModalOpen(false)}
        products={products}
        onSave={async ({ product, qty, notes }) => {
          await updateProduct.mutateAsync({
            id: product.id,
            data: {
              stock_quantity: (product.stock_quantity ?? 0) + qty,
              stock_last_updated: format(new Date(), "yyyy-MM-dd"),
            }
          });
          await createMovement.mutateAsync({
            product_id: product.id,
            product_name: product.description,
            movement_type: "ייצור",
            quantity: qty,
            movement_date: format(new Date(), "yyyy-MM-dd"),
            notes: notes || "דוח ייצור",
          });
          qc.invalidateQueries({ queryKey: ["rivhit-products-inventory"] });
          setProductionModalOpen(false);
        }}
      />
    </div>
  );
}