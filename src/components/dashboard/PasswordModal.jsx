import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const CORRECT = "0243";

export default function PasswordModal({ open, onClose, onSuccess }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pwd === CORRECT) {
      setPwd("");
      setError(false);
      onSuccess();
      onClose();
    } else {
      setError(true);
      setPwd("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPwd(""); setError(false); onClose(); } }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" /> הזן סיסמא
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <Input
            type="password"
            placeholder="סיסמא..."
            value={pwd}
            onChange={e => { setPwd(e.target.value); setError(false); }}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">סיסמא שגויה</p>}
          <Button type="submit" className="w-full">אשר</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}