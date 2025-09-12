// fix-empty-types.ts
import fs from "fs";
import path from "path";

const root = path.resolve("src");

function walk(dir: string) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (/\.(ts|tsx)$/.test(file)) {
      let code = fs.readFileSync(full, "utf8");

      // {} → Record<string, unknown>
      code = code.replace(
        /React\.createContext<\{\}\s*\|\s*null>/g,
        "React.createContext<Record<string, unknown> | null>"
      );

      code = code.replace(
        /function\s+(\w+)\s*\(\)\s*:\s*\{\}/g,
        "function $1(): Record<string, unknown>"
      );

      // пустые catch {} → лог с dev
      code = code.replace(/catch\s*\{\s*\}/g, `catch (e) {
  if (import.meta?.env?.DEV) console.error('auto-fix catch error', e)
}`);

      fs.writeFileSync(full, code, "utf8");
      console.log("Patched:", full);
    }
  }
}

walk(root);