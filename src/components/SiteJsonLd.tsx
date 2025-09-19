import { useEffect } from "react";
import { upsertJsonLd } from "@/lib/jsonld";

type Props = { data: Record<string, unknown>; id?: string };

export default function SiteJsonLd({ data, id = "jsonld-site" }: Props) {
  useEffect(() => {
    return upsertJsonLd(id, data);
  }, [id, data]);
  return null;
}



