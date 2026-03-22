import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import TestButton from "@/components/rivhit/TestButton";
import RawViewer from "@/components/rivhit/RawViewer";
import { useAuth } from "@/lib/AuthContext";

export default function RivhitTest() {
  const { user } = useAuth();

  const [loadingMap, setLoadingMap] = useState({});
  const [resultMap, setResultMap] = useState({});
  const [rawMap, setRawMap] = useState({});

  const { data: settingsList = [] } = useQuery({
    queryKey: ["rivhit-settings"],
    queryFn: () => base44.entities.RivhitSettings.list(),
  });
  const settings = settingsList[0];

  if (user?.role !== "owner") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <ShieldAlert className="w-10 h-10 text-destructive" />
        <p className="text-lg font-medium">גישה מוגבלת — בעלים בלבד</p>
      </div>
    );
  }

  if (!settings?.api_token) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Settings className="w-10 h-10 text-muted-foreground" />
        <p className="text-lg font-medium">טוקן API לא מוגדר</p>
        <p className="text-sm text-muted-foreground">הגדר את פרטי ה-API לפני הבדיקה</p>
        <Link to="/rivhit-settings">
          <Button>עבור להגדרות</Button>
        </Link>
      </div>
    );
  }

  const callApi = async (key, endpoint) => {
    if (!endpoint) {
      setResultMap((prev) => ({ ...prev, [key]: { success: false, error: `נתיב ה-${key} לא מוגדר בהגדרות` } }));
      return;
    }
    setLoadingMap((prev) => ({ ...prev, [key]: true }));
    setResultMap((prev) => ({ ...prev, [key]: null }));
    setRawMap((prev) => ({ ...prev, [key]: null }));

    const res = await base44.functions.invoke("rivhitRequest", { endpoint, method: "POST" });
    const result = res.data;

    setResultMap((prev) => ({ ...prev, [key]: result }));
    if (result?.data !== undefined) {
      setRawMap((prev) => ({ ...prev, [key]: result.data }));
    } else if (result?.raw) {
      setRawMap((prev) => ({ ...prev, [key]: result.raw }));
    } else {
      setRawMap((prev) => ({ ...prev, [key]: result }));
    }
    setLoadingMap((prev) => ({ ...prev, [key]: false }));
  };

  const BASE = "https://api.rivhit.co.il/online/RivhitOnlineAPI.svc";

  const tests = [
    {
      key: "connection",
      label: "בדיקת חיבור",
      endpoint: `${BASE}/Customer.List`,
      tab: null,
    },
    {
      key: "customers",
      label: "משוך לקוחות לדוגמה",
      endpoint: `${BASE}/Customer.List`,
      tab: "customers",
    },
    {
      key: "products",
      label: "משוך מוצרים לדוגמה",
      endpoint: `${BASE}/Item.List`,
      tab: "products",
    },
    {
      key: "documents",
      label: "משוך מסמכים לדוגמה",
      endpoint: `${BASE}/Document.List`,
      tab: "documents",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="בדיקת API ריווחית"
        description="בדיקת חיבור ועיון בנתונים גולמיים בלבד — ללא שמירה"
      />

      {/* Test buttons */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm font-semibold text-muted-foreground mb-2">פעולות בדיקה</p>
          {tests.map(({ key, label, endpoint }) => (
            <TestButton
              key={key}
              label={label}
              loading={loadingMap[key]}
              result={resultMap[key]}
              onClick={() => callApi(key, endpoint)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Raw viewer */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-muted-foreground mb-4">נתונים גולמיים (Raw JSON)</p>
          <Tabs defaultValue="customers">
            <TabsList className="mb-4">
              <TabsTrigger value="customers">לקוחות</TabsTrigger>
              <TabsTrigger value="products">מוצרים</TabsTrigger>
              <TabsTrigger value="documents">מסמכים</TabsTrigger>
              <TabsTrigger value="connection">חיבור</TabsTrigger>
            </TabsList>
            {["customers", "products", "documents", "connection"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <RawViewer data={rawMap[tab]} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}