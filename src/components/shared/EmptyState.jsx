import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Inbox className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-medium text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}