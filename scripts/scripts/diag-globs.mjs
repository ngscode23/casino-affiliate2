import fg from "fast-glob";
const globs = [
  "./apps/web-next/app/**/*.{ts,tsx}",
  "./apps/web-next/components/**/*.{ts,tsx}",
  "./apps/web-next/lib/**/*.{ts,tsx}",
  "./apps/web-next/utils/**/*.{ts,tsx}"
];
(async () => {
  const res = await fg(globs, { dot: false });
  console.log("# Files matched:", res.length);
  console.log(res.slice(0, 20)); // первые 20
})();
