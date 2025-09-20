import { useEffect } from "react";

type Props = { data: Record<string, unknown>; id?: string };

export default function SiteJsonLd({ data, id = "jsonld-site" }: Props) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const head = document.head || document.getElementsByTagName("head")[0];
    let script = document.getElementById(id) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      head.appendChild(script);
    }

    script.text = JSON.stringify(data);

    return () => {
      const existing = document.getElementById(id);
      existing?.parentNode?.removeChild(existing);
    };
  }, [id, data]);

  return null;
}
