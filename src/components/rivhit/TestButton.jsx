import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TestButton({ label, onClick, loading, result }) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={onClick}
        disabled={loading}
        className="min-w-[180px]"
      >
        {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
        {label}
      </Button>
      {result && !loading && (
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
            result.success ? "text-emerald-600" : "text-destructive"
          )}
        >
          {result.success ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {result.success
            ? `תקין (HTTP ${result.http_status})`
            : result.error}
        </span>
      )}
    </div>
  );
}