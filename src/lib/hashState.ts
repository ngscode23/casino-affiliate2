export type LicenseFilter = "all" | "MGA" | "Curaçao" | "UKGC" | "Other";
export type MethodFilter  = "all" | "Cards" | "SEPA" | "Crypto" | "Paypal" | "Skrill";

export type HashState = {
  sort?: "rating" | "payoutHours";
  dir?: "asc" | "desc";
  license?: LicenseFilter;
  method?: MethodFilter;
};

const DEFAULTS: Required<HashState> = { sort:"rating", dir:"desc", license:"all", method:"all" };

function readHashParts() {
  let raw = window.location.hash || "";
  if (raw.startsWith("#")) raw = raw.slice(1);
  const [path = "", query = ""] = raw.split("?", 2);
  return { path, params: new URLSearchParams(query) };
}

export function parseHash(): Required<HashState> {
  const { params } = readHashParts();
  const sort = params.get("sort");
  const dir = params.get("dir");
  const license = params.get("license");
  const method = params.get("method");
  return {
    sort: sort === "rating" || sort === "payoutHours" ? sort : DEFAULTS.sort,
    dir: dir === "asc" || dir === "desc" ? dir : DEFAULTS.dir,
    license: (["all","MGA","Curaçao","UKGC","Other"] as const).includes((license||"all") as any)
      ? (license as LicenseFilter) || "all" : "all",
    method: (["all","Cards","SEPA","Crypto","Paypal","Skrill"] as const).includes((method||"all") as any)
      ? (method as MethodFilter) || "all" : "all",
  };
}

export function writeHash(state: Partial<HashState>) {
  const { path, params } = readHashParts();
  if (state.sort) params.set("sort", state.sort);
  if (state.dir) params.set("dir", state.dir);
  if (state.license) params.set("license", state.license);
  if (state.method) params.set("method", state.method);
  if (!params.has("sort")) params.set("sort", DEFAULTS.sort);
  if (!params.has("dir")) params.set("dir", DEFAULTS.dir);
  if (!params.has("license")) params.set("license", DEFAULTS.license);
  if (!params.has("method")) params.set("method", DEFAULTS.method);
  const qs = params.toString();
  window.location.hash = (path ? path : "") + (qs ? `?${qs}` : "");
}




















