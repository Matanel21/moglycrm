import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Save, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useAuth } from "@/lib/AuthContext";

export default function RivhitSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  const { data: settingsList = [], isLoading } = useQuery({
    queryKey: ["rivhit-settings"],
    queryFn: () => base44.entities.RivhitSettings.list(),
  });

  useEffect(() => {
    if (settingsList.length > 0) {
      setForm(settingsList[0]);
    }
  }, [settingsList]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (form.id) {
        return base44.entities.RivhitSettings.update(form.id, data);
      } else {
        return base44.entities.RivhitSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rivhit-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (!isDev && user?.role !== "owner") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <ShieldAlert className="w-10 h-10 text-destructive" />
        <p className="text-lg font-medium">גישה מוגבלת — בעלים בלבד</p>
      </div>
    );
  }

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const { id, ...data } = form;
    saveMutation.mutate(data);
  };

  if (isLoading) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="הגדרות ריווחית API" description="הגדרות חיבור ל-API של ריווחית" />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <Label>טוקן API <span className="text-destructive">*</span></Label>
              <div className="relative mt-1">
                <Input
                  type={showToken ? "text" : "password"}
                  value={form.api_token || ""}
                  onChange={(e) => handleChange("api_token", e.target.value)}
                  placeholder="הדבק כאן את הטוקן..."
                  className="pl-10"
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>כתובת בסיס (Base URL)</Label>
              <Input
                value={form.base_url || ""}
                onChange={(e) => handleChange("base_url", e.target.value)}
                placeholder="https://api.rivhit.co.il/online/..."
                className="mt-1"
                dir="ltr"
              />
            </div>

            <hr className="border-border" />
            <p className="text-sm font-medium text-muted-foreground">נתיבי Endpoints</p>

            {[
              { field: "endpoint_connection", label: "בדיקת חיבור", placeholder: "/ping" },
              { field: "endpoint_customers", label: "לקוחות", placeholder: "/customers" },
              { field: "endpoint_products", label: "מוצרים", placeholder: "/products" },
              { field: "endpoint_documents", label: "מסמכים", placeholder: "/documents" },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <Label>{label}</Label>
                <Input
                  value={form[field] || ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  placeholder={placeholder}
                  className="mt-1"
                  dir="ltr"
                />
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                <Save className="w-4 h-4 ml-2" />
                {saveMutation.isPending ? "שומר..." : "שמור הגדרות"}
              </Button>
              {saved && <span className="text-sm text-emerald-600 font-medium">✓ נשמר בהצלחה</span>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}