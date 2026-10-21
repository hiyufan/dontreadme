import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

test("the skill's bundled checker runs on its own", () => {
  const cli = fileURLToPath(new URL("scripts/cli.js", root));
  const r = spawnSync(process.execPath, [cli, "-", "--json"], { input: "A robust tool.", encoding: "utf8", env: { ...process.env, DONTREADME_LANG: "en" } });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout)[0].findings.some((f) => f.rule === "hype"));
});

test("SKILL.md front matter, plugin manifests and package agree on name and version", () => {
  const skill = read("SKILL.md");
  assert.match(skill, /^---\nname: dontreadme\ndescription: .{40,1024}\n/);
  const version = JSON.parse(read("package.json")).version;
  assert.match(skill, new RegExp(`version: "${version}"`));
  assert.equal(JSON.parse(read(".claude-plugin/plugin.json")).version, version);
  assert.equal(JSON.parse(read(".claude-plugin/marketplace.json")).plugins[0].name, "dontreadme");
});

test("every rule the checker knows is covered in SKILL.md", async () => {
  const { rules } = await import("../dist/index.js");
  const skill = read("SKILL.md");
  for (const r of rules) assert.match(skill, new RegExp("`" + r.id + "`"), r.id);
});
