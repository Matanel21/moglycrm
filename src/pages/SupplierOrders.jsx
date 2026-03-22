import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, Package, ChevronDown, ChevronUp } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { format } from "date-fns";
import jsPDF from "jspdf";

const UNITS = ["יחידות", "ליטר", 'ק"ג', "קרטון", 'מ"ל'];

function generateGroupId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function EmptyRow() {
  return { item_name: "", quantity: "", unit: "יחידות", price_per_unit: "", notes: "", _key: generateGroupId() };
}

function exportPDF(rows, supplierName, orderDate) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica");
  doc.setFontSize(16);
  doc.text("Supplier Order", 105, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Supplier: ${supplierName}    Date: ${orderDate}`, 105, 26, { align: "center" });

  const headers = ["Item", "Qty", "Unit", "Price/Unit", "Total", "Notes"];
  const colWidths = [55, 18, 20, 25, 22, 50];
  const startX = 10;
  let y = 36;

  doc.setFillColor(230, 235, 245);
  doc.rect(startX, y, colWidths.reduce((s, w) => s + w, 0), 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  let x = startX;
  headers.forEach((h, i) => { doc.text(h, x + 1, y + 5.5); x += colWidths[i]; });

  doc.setFont("helvetica", "normal");
  let grandTotal = 0;
  rows.forEach(row => {
    y += 8;
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setDrawColor(210, 215, 225);
    doc.line(startX, y, startX + colWidths.reduce((s, w) => s + w, 0), y);
    const qty = Number(row.quantity) || 0;
    const price = Number(row.price_per_unit) || 0;
    const total = qty * price;
    grandTotal += total;
    x = startX;
    const vals = [
      (row.item_name || "").slice(0, 25),
      String(qty || ""),
      row.unit || "",
      price ? `${price}` : "",
      total ? `${total}` : "",
      (row.notes || "").slice(0, 25),
    ];
    vals.forEach((v, i) => { doc.text(v, x + 1, y + 5.5); x += colWidths[i]; });
  });

  if (grandTotal > 0) {
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${grandTotal.toLocaleString()}`, startX, y);
  }

  doc.save(`supplier-order-${supplierName}-${orderDate}.pdf`);
}

export default function SupplierOrders() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [draftRows, setDraftRows] = useState([EmptyRow()]);
  const [draftDate, setDraftDate] = useState(today);
  const [draftStatus, setDraftStatus] = useState("טיוטה");
  const [showDraft, setShowDraft] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [filterSupplier, setFilterSupplier] = useState("all");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date", 500),
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ["supplier-orders"],
    queryFn: () => base44.entities.SupplierOrder.list("-order_date", 2000),
  });

  const createMut = useMutation({
    mutationFn: (row) => base44.entities.SupplierOrder.create(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupplierOrder.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.SupplierOrder.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier-orders"] }),
  });

  const groups = useMemo(() => {
    const map = {};
    const filtered = filterSupplier === "all" ? allOrders : allOrders.filter(o => o.supplier_id === filterSupplier);
    filtered.forEach(r => {
      const g = r.order_group || r.id;
      if (!map[g]) map[g] = { group: g, date: r.order_date, supplierId: r.supplier_id, supplierName: r.supplier_name, status: r.status, rows: [] };
      map[g].rows.push(r);
    });
    return Object.values(map).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [allOrders, filterSupplier]);

  const updateDraftRow = (key, field, val) =>
    setDraftRows(prev => prev.map(r => r._key === key ? { ...r, [field]: val } : r));

  const removeDraftRow = (key) =>
    setDraftRows(prev => prev.filter(r => r._key !== key));

  const handleSave = async () => {
    if (!selectedSupplier) return;
    const groupId = generateGroupId();
    const validRows = draftRows.filter(r => r.item_name?.trim());
    if (!validRows.length) return;
    const sup = suppliers.find(s => s.id === selectedSupplier);
    for (const row of validRows) {
      await createMut.mutateAsync({
        supplier_id: selectedSupplier,
        supplier_name: sup?.name || "",
        item_name: row.item_name,
        quantity: Number(row.quantity) || 0,
        unit: row.unit || "יחידות",
        price_per_unit: Number(row.price_per_unit) || 0,
        notes: row.notes || "",
        order_date: draftDate,
        status: draftStatus,
        order_group: groupId,
      });
    }
    setDraftRows([EmptyRow()]);
    setShowDraft(false);
  };

  const grandTotal = draftRows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.price_per_unit) || 0), 0);

  const selectedSupplierObj = suppliers.find(s => s.id === selectedSupplier);

  return (
    <div className="space-y-6">
      <PageHeader title="הזמנות לספקים" description="יצירת הזמנות ומעקב לפי ספק" />

      {/* Supplier selector */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">בחר ספק</label>
              <Select value={selectedSupplier || ""} onValueChange={v => { setSelectedSupplier(v); setShowDraft(false); setDraftRows([EmptyRow()]); }}>
                <SelectTrigger><SelectValue placeholder="-- בחר ספק --" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedSupplier && (
              <Button onClick={() => { setShowDraft(true); setDraftRows([EmptyRow()]); setDraftDate(today); }}>
                <Plus className="w-4 h-4 ml-1" /> הזמנה חדשה
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Draft editor */}
      {showDraft && selectedSupplier && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">תאריך:</label>
                <Input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} className="w-44" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">סטטוס:</label>
                <Select value={draftStatus} onValueChange={setDraftStatus}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="טיוטה">טיוטה</SelectItem>
                    <SelectItem value="נשלח">נשלח</SelectItem>
                    <SelectItem value="התקבל">התקבל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-right">
                    <th className="px-3 py-2 font-medium">שם פריט</th>
                    <th className="px-3 py-2 font-medium">כמות</th>
                    <th className="px-3 py-2 font-medium">יחידה</th>
                    <th className="px-3 py-2 font-medium">מחיר ליחידה</th>
                    <th className="px-3 py-2 font-medium">סה"כ</th>
                    <th className="px-3 py-2 font-medium">הערות</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {draftRows.map(row => {
                    const rowTotal = (Number(row.quantity) || 0) * (Number(row.price_per_unit) || 0);
                    return (
                      <tr key={row._key} className="border-b">
                        <td className="px-2 py-1.5"><Input value={row.item_name} onChange={e => updateDraftRow(row._key, "item_name", e.target.value)} placeholder="שם הפריט" /></td>
                        <td className="px-2 py-1.5"><Input type="number" value={row.quantity} onChange={e => updateDraftRow(row._key, "quantity", e.target.value)} placeholder="0" className="w-20" /></td>
                        <td className="px-2 py-1.5">
                          <Select value={row.unit} onValueChange={v => updateDraftRow(row._key, "unit", v)}>
                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5"><Input type="number" value={row.price_per_unit} onChange={e => updateDraftRow(row._key, "price_per_unit", e.target.value)} placeholder="0" className="w-24" /></td>
                        <td className="px-2 py-1.5 text-muted-foreground text-sm">{rowTotal > 0 ? `₪${rowTotal.toLocaleString()}` : "—"}</td>
                        <td className="px-2 py-1.5"><Input value={row.notes} onChange={e => updateDraftRow(row._key, "notes", e.target.value)} placeholder="הערות" /></td>
                        <td className="px-2 py-1.5"><Button variant="ghost" size="icon" onClick={() => removeDraftRow(row._key)}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {grandTotal > 0 && (
              <div className="text-left font-semibold text-sm border-t pt-2">
                סה"כ כולל: ₪{grandTotal.toLocaleString()}
              </div>
            )}
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={() => setDraftRows(prev => [...prev, EmptyRow()])}>
                <Plus className="w-4 h-4 ml-1" /> הוסף שורה
              </Button>
              <Button onClick={handleSave}>שמור הזמנה</Button>
              <Button variant="ghost" onClick={() => exportPDF(draftRows, selectedSupplierObj?.name || "", draftDate)}>
                <Download className="w-4 h-4 ml-1" /> הורד PDF
              </Button>
              <Button variant="ghost" onClick={() => setShowDraft(false)}>ביטול</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-muted-foreground text-sm">היסטוריית הזמנות</h2>
          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="סנן לפי ספק" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הספקים</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">אין הזמנות קודמות</p>
        )}
        {groups.map(g => {
          const gTotal = g.rows.reduce((s, r) => s + (r.quantity || 0) * (r.price_per_unit || 0), 0);
          return (
            <Card key={g.group}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{g.supplierName || "—"}</span>
                    <span className="text-xs text-muted-foreground">{g.date}</span>
                    <span className="text-xs text-muted-foreground">{g.rows.length} פריטים</span>
                    {gTotal > 0 && <span className="text-xs font-medium text-primary">₪{gTotal.toLocaleString()}</span>}
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${g.status === "התקבל" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : g.status === "נשלח" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {g.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => exportPDF(g.rows, g.supplierName || "", g.date)}>
                      <Download className="w-4 h-4 ml-1" /> PDF
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setExpandedGroup(expandedGroup === g.group ? null : g.group)}>
                      {expandedGroup === g.group ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                {expandedGroup === g.group && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30 text-right">
                          <th className="px-3 py-2 font-medium">שם פריט</th>
                          <th className="px-3 py-2 font-medium">כמות</th>
                          <th className="px-3 py-2 font-medium">יחידה</th>
                          <th className="px-3 py-2 font-medium">מחיר ליחידה</th>
                          <th className="px-3 py-2 font-medium">סה"כ</th>
                          <th className="px-3 py-2 font-medium">הערות</th>
                          <th className="px-3 py-2 font-medium">סטטוס</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map(row => (
                          <tr key={row.id} className="border-b hover:bg-muted/20">
                            <td className="px-3 py-2">{row.item_name}</td>
                            <td className="px-3 py-2">{row.quantity}</td>
                            <td className="px-3 py-2">{row.unit}</td>
                            <td className="px-3 py-2">{row.price_per_unit ? `₪${row.price_per_unit}` : "—"}</td>
                            <td className="px-3 py-2">{row.quantity && row.price_per_unit ? `₪${(row.quantity * row.price_per_unit).toLocaleString()}` : "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.notes || "—"}</td>
                            <td className="px-3 py-2">
                              <Select value={row.status || "טיוטה"} onValueChange={v => updateMut.mutate({ id: row.id, data: { status: v } })}>
                                <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="טיוטה">טיוטה</SelectItem>
                                  <SelectItem value="נשלח">נשלח</SelectItem>
                                  <SelectItem value="התקבל">התקבל</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(row.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}