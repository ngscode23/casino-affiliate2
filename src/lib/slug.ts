// src/lib/slug.ts
export function slugify(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}



