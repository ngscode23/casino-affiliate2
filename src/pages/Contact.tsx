// src/pages/Contact.tsx
import { useState } from "react";
import { track } from "@/lib/analytics";

export default function Contact() {
  const [status, setStatus] = useState<"idle"|"loading"|"ok"|"error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const form = new FormData(e.currentTarget);
    // отправка на Netlify Forms / свой endpoint
    const res = await fetch("/api/contact", { method: "POST", body: form });

    if (res.ok) {
      setStatus("ok");
      // вот этот вызов и есть твой кейс
      track({ name: "submit_lead", params: { source: "contact_form" } });
    } else {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} data-netlify="true" name="contact">
      {/* поля формы */}
      <button type="submit" disabled={status === "loading"}>
        Отправить
      </button>
    </form>
  );
}


