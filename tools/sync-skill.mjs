// The skill runs the checker straight from its own folder, with no npm install, so the compiled
// files are copied into scripts/ and committed. CI fails if they drift from src/.
import { cpSync, readdirSync, rmSync, writeFileSync } from "node:fs";

rmSync("scripts", { recursive: true, force: true });
cpSync("dist", "scripts", { recursive: true, filter: (p) => !p.endsWith(".d.ts") });
console.log(`scripts/: ${readdirSync("scripts", { recursive: true }).length} files`);
// The skill folder may be copied without the repository's package.json; keep the files ES modules anyway.
writeFileSync("scripts/package.json", '{ "type": "module" }\n');
