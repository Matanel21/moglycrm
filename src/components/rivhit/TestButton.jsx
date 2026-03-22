import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TestButton({ label, onClick, loading, result }) {
  return (
    <div className="flex flex-col gap-2">
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
          <div className="flex flex-col gap-1">
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
            {result.url_called && (
              <span className="text-xs text-muted-foreground font-mono">{result.url_called}</span>
            )}
          </div>
        )}
      </div>
      {result && !result.success && !loading && (result.raw || result.data) && (
        <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap text-right">
          {result.raw
            ? (typeof result.raw === 'string' ? result.raw : JSON.stringify(result.raw, null, 2))
            : (typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2))}
        </pre>
      )}
    </div>
  );
}