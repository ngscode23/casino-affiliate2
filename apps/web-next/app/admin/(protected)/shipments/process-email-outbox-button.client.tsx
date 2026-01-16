"use client";

import { useState } from "react";

import Button from "@ui/components/common/button";
import { toast } from "@ui/components/common/toast";

type ProcessResult = {
  ok?: boolean;
  total_pending?: number;
  eligible?: number;
  processed?: number;
  sent?: number;
  error?: string;
  message?: string;
};

export function ProcessEmailOutboxButton() {
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch("/api/admin/email-outbox/process", {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json" },
      });
      const json = (await res.json().catch(() => ({}))) as ProcessResult;
      if (!res.ok || !json.ok) {
        toast(json.message || json.error || "Process failed", { variant: "error" });
        return;
      }

      const eligible = Number(json.eligible ?? 0);
      const sent = Number(json.sent ?? 0);
      const totalPending = Number(json.total_pending ?? 0);

      if (!eligible) {
        toast(`Email outbox: nothing to process (pending ${totalPending})`, { variant: "success" });
        return;
      }

      toast(`Email outbox: processed ${eligible}, sent ${sent} (pending ${totalPending})`, { variant: "success" });
    } catch (err: any) {
      toast(err?.message || "Process failed", { variant: "error" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button variant="soft" onClick={run} disabled={running}>
      {running ? "Processing emails…" : "Process emails"}
    </Button>
  );
}

