import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors = {
  "פעיל": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "לא פעיל": "bg-gray-100 text-gray-600 border-gray-200",
  "חדש": "bg-blue-100 text-blue-700 border-blue-200",
  "אזל מהמלאי": "bg-red-100 text-red-600 border-red-200",
  "טיוטה": "bg-gray-100 text-gray-600 border-gray-200",
  "אושרה": "bg-blue-100 text-blue-700 border-blue-200",
  "בהכנה": "bg-amber-100 text-amber-700 border-amber-200",
  "נשלחה": "bg-purple-100 text-purple-700 border-purple-200",
  "סופקה": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "בוטלה": "bg-red-100 text-red-600 border-red-200",
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", statusColors[status])}>
      {status}
    </Badge>
  );
}