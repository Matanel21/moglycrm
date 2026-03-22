import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, FileText, ChevronDown, ChevronUp } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { format } from "date-fns";
import jsPDF from "jspdf";

function generateGroupId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function EmptyRow() {
  return { product_name: "", stock_quantity: "", required_quantity: "", notes: "", _key: generateGroupId() };
}

function exportPDF(rows, reportDate) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica");
  doc.setFontSize(16);
  doc.text("Shortage Report", 105, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Date: ${reportDate}`, 105, 26, { align: "center" });

  const headers = ["Product Name", "In Stock", "Required", "Notes"];
  const colWidths = [70, 30, 30, 60];
  const startX = 15;
  let y = 36;

  doc.setFillColor(230, 235, 245);
  doc.rect(startX, y, colWidths.reduce((s, w) => s + w, 0), 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  let x = startX;
  headers.forEach((h, i) => { doc.text(h, x + 2, y + 5.5); x += colWidths[i]; });

  doc.setFont("helvetica", "normal");
  rows.forEach((row) => {
    y += 8;
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setDrawColor(210, 215, 225);
    doc.line(startX, y, startX + colWidths.reduce((s, w) => s + w, 0), y);
    x = startX;
    const vals = [row.product_name, String(row.stock_quantity ?? ""), String(row.required_quantity ?? ""), row.notes || ""];
    vals.forEach((v, i) => { doc.text(String(v).slice(0, 30), x + 2, y + 5.5); x += colWidths[i]; });
  });

  doc.save(`shortage-report-${reportDate}.pdf`);
}

export default function ShortageReport() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [activeGroup, setActiveGroup] = useState(null); // null = new draft
  const [draftRows, setDraftRows] = useState([EmptyRow()]);
  const [draftDate, setDraftDate] = useState(today);
  const [expandedGroup, setExpandedGroup] = useState(null);

  const { data: allRows = [] } = useQuery({
    queryKey: ["product-shortages"],
    queryFn: () => base44.entities.ProductShortage.list("-report_date", 2000),
  });

  const createMut = useMutation({
    mutationFn: (row) => base44.entities.ProductShortage.create(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-shortages"] }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductShortage.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-shortages"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.ProductShortage.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-shortages"] }),
  });

  // Group saved rows by report_group
  const groups = useMemo(() => {
    const map = {};
    allRows.forEach(r => {
      const g = r.report_group || r.id;
      if (!map[g]) map[g] = { group: g, date: r.report_date, rows: [] };
      map[g].rows.push(r);
    });
    return Object.values(map).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [allRows]);

  const handleSave = async () => {
    const groupId = generateGroupId();
    const validRows = draftRows.filter(r => r.product_name?.trim());
    if (!validRows.length) return;
    for (const row of validRows) {
      await createMut.mutateAsync({
        product_name: row.product_name,
        stock_quantity: Number(row.stock_quantity) || 0,
        required_quantity: Number(row.required_quantity) || 0,
        notes: row.notes || "",
        report_date: draftDate,
        status: "פתוח",
        report_group: groupId,
      });
    }
    setDraftRows([EmptyRow()]);
    setActiveGroup(null);
  };

  const updateDraftRow = (key, field, val) =>
    setDraftRows(prev => prev.map(r => r._key === key ? { ...r, [field]: val } : r));

  const removeDraftRow = (key) =>
    setDraftRows(prev => prev.filter(r => r._key !== key));

  return (
    <div className="space-y-6">
      <PageHeader
        title="רשימת חוסרים לייצור"
        actions={
          <Button onClick={() => { setActiveGroup("new"); setDraftRows([EmptyRow()]); setDraftDate(today); }}>
            <Plus className="w-4 h-4 ml-1" /> דוח חוסרים חדש
          </Button>
        }
      />

      {/* New draft editor */}
      {activeGroup === "new" && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium">תאריך הדוח:</label>
              <Input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} className="w-44" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-right">
                    <th className="px-3 py-2 font-medium">שם הפריט</th>
                    <th className="px-3 py-2 font-medium">כמות במלאי</th>
                    <th className="px-3 py-2 font-medium">נדרש לייצור</th>
                    <th className="px-3 py-2 font-medium">הערות</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {draftRows.map(row => (
                    <tr key={row._key} className="border-b">
                      <td className="px-2 py-1.5"><Input value={row.product_name} onChange={e => updateDraftRow(row._key, "product_name", e.target.value)} placeholder="שם הפריט" /></td>
                      <td className="px-2 py-1.5"><Input type="number" value={row.stock_quantity} onChange={e => updateDraftRow(row._key, "stock_quantity", e.target.value)} placeholder="0" className="w-24" /></td>
                      <td className="px-2 py-1.5"><Input type="number" value={row.required_quantity} onChange={e => updateDraftRow(row._key, "required_quantity", e.target.value)} placeholder="0" className="w-24" /></td>
                      <td className="px-2 py-1.5"><Input value={row.notes} onChange={e => updateDraftRow(row._key, "notes", e.target.value)} placeholder="הערות" /></td>
                      <td className="px-2 py-1.5">
                        <Button variant="ghost" size="icon" onClick={() => removeDraftRow(row._key)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={() => setDraftRows(prev => [...prev, EmptyRow()])}>
                <Plus className="w-4 h-4 ml-1" /> הוסף שורה
              </Button>
              <Button onClick={handleSave}>שמור דוח</Button>
              <Button variant="ghost" onClick={() => exportPDF(draftRows, draftDate)}>
                <Download className="w-4 h-4 ml-1" /> הורד PDF
              </Button>
              <Button variant="ghost" onClick={() => setActiveGroup(null)}>ביטול</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <div className="space-y-3">
        <h2 className="font-semibold text-muted-foreground text-sm">היסטוריית דוחות</h2>
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">אין דוחות קודמים</p>
        )}
        {groups.map(g => (
          <Card key={g.group}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{g.date || "—"}</span>
                  <span className="text-xs text-muted-foreground">{g.rows.length} פריטים</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => exportPDF(g.rows, g.date)}>
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
                        <th className="px-3 py-2 font-medium">שם הפריט</th>
                        <th className="px-3 py-2 font-medium">במלאי</th>
                        <th className="px-3 py-2 font-medium">נדרש</th>
                        <th className="px-3 py-2 font-medium">הערות</th>
                        <th className="px-3 py-2 font-medium">סטטוס</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map(row => (
                        <tr key={row.id} className="border-b hover:bg-muted/20">
                          <td className="px-3 py-2">{row.product_name}</td>
                          <td className="px-3 py-2">{row.stock_quantity ?? "—"}</td>
                          <td className="px-3 py-2">{row.required_quantity ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.notes || "—"}</td>
                          <td className="px-3 py-2">
                            <Select value={row.status || "פתוח"} onValueChange={v => updateMut.mutate({ id: row.id, data: { status: v } })}>
                              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="פתוח">פתוח</SelectItem>
                                <SelectItem value="טופל">טופל</SelectItem>
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
        ))}
      </div>
    </div>
  );
}