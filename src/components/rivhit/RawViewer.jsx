import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function RawViewer({ data }) {
  const [search, setSearch] = useState("");

  if (!data) {
    return (
      <div className="text-sm text-muted-foreground text-center py-12">
        לחץ על כפתור המשיכה כדי לראות נתונים גולמיים
      </div>
    );
  }

  const pretty = JSON.stringify(data, null, 2);
  const lines = pretty.split("\n");

  const filtered = search
    ? lines.filter((line) => line.toLowerCase().includes(search.toLowerCase()))
    : lines;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש בנתונים..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>
      <pre
        dir="ltr"
        className="bg-muted/60 rounded-lg p-4 text-xs overflow-auto max-h-[500px] leading-relaxed font-mono border border-border whitespace-pre-wrap break-all"
      >
        {filtered.length > 0 ? filtered.join("\n") : "אין תוצאות לחיפוש"}
      </pre>
      <p className="text-xs text-muted-foreground">
        {search ? `${filtered.length} שורות תואמות מתוך ${lines.length}` : `${lines.length} שורות`}
      </p>
    </div>
  );
}