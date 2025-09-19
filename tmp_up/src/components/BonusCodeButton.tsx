// src/components/BonusCodeButton.tsx
import { useState } from "react";
import Button from "@/components/common/button";

export default function BonusCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
          window.dispatchEvent(new CustomEvent("track", { detail: { ev: "copy_bonus", code } }));
        } catch (e) {
          console.error(e);
        }
      }}
    >
      {copied ? "Copied!" : `Copy bonus: ${code}`}
    </Button>
  );
}




















