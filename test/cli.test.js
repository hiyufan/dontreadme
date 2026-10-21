import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const env = { ...process.env, DONTREADME_LANG: "en", NO_COLOR: "1" };
const run = (args, cwd) => spawnSync(process.execPath, [cli, ...args], { cwd, env, encoding: "utf8" });

// A README with everything the section rules ask for, so tests can add one problem at a time.
const complete = (line) => `# t\n\n${line}\n\n![demo](demo.png)\n\n\`\`\`sh\nnpm i t\nt run\n\`\`\`\n\nMIT license.\n`;

function project(readme, rc) {
  const dir = mkdtempSync(join(tmpdir(), "dontreadme-"));
  writeFileSync(join(dir, "README.md"), readme);
  if (rc) writeFileSync(join(dir, ".dontreadmerc.json"), JSON.stringify(rc));
  return dir;
}

test("checks ./README.md by default and exits 0 without --max-score", () => {
  const r = run([], project("A robust tool."));
  assert.equal(r.status, 0);
  assert.match(r.stdout, /README\.md/);
  assert.match(r.stdout, /hype/);
  assert.match(r.stdout, /slop score \d+\/100/);
});

test("--max-score fails the run, from the flag or the config", () => {
  assert.equal(run(["--max-score", "10"], project(complete("A robust, powerful tool for charts."))).status, 1);
  assert.equal(run([], project(complete("A robust, powerful tool for charts."), { maxScore: 10 })).status, 1);
  assert.equal(run(["--max-score", "10"], project(complete("A tool that reads 10 GB/s."))).status, 0);
});

test("--json is machine-readable", () => {
  const out = JSON.parse(run(["--json"], project(complete("A robust tool for charts."))).stdout);
  assert.equal(out[0].file, "README.md");
  assert.deepEqual(out[0].findings.map((f) => [f.rule, f.text]), [["hype", "robust"]]);
});

test("--format github writes annotations and a step summary", () => {
  const dir = project(complete("A robust tool for charts."));
  const summary = join(dir, "summary.md");
  const r = spawnSync(process.execPath, [cli, "--format", "github"], { cwd: dir, env: { ...env, GITHUB_STEP_SUMMARY: summary }, encoding: "utf8" });
  assert.match(r.stdout, /^::warning file=README\.md,line=3,col=3,title=dontreadme hype::/m);
  assert.match(readFileSync(summary, "utf8"), /\| `README\.md` \| \d+ \| [A-F] \| 1 \|/);
});

test("--fix rewrites in place, --stdout leaves the file alone", () => {
  const dir = project("We utilize it in order to win!");
  assert.equal(run(["--fix", "--stdout"], dir).stdout, "We use it to win.");
  assert.equal(readFileSync(join(dir, "README.md"), "utf8"), "We utilize it in order to win!");
  run(["--fix"], dir);
  assert.equal(readFileSync(join(dir, "README.md"), "utf8"), "We use it to win.");
});

test("reads stdin with -", () => {
  const out = execFileSync(process.execPath, [cli, "-", "--json"], { input: "Blazing fast.", env, encoding: "utf8" });
  assert.equal(JSON.parse(out)[0].file, "<stdin>");
});

test("--badge prints a shields.io badge", () => {
  assert.match(run(["--badge"], project(complete("Plain text about a chart tool."))).stdout, /img\.shields\.io\/badge\/readme%20slop-0%2F100%20A-brightgreen/);
});

test("usage errors exit 2", () => {
  assert.equal(run(["--nope"], project("x")).status, 2);
  assert.equal(run(["missing.md"], project("x")).status, 2);
  assert.equal(run([], project("x", { rules: { nope: "off" } })).status, 2);
});

test("speaks Chinese when asked", () => {
  const r = spawnSync(process.execPath, [cli, "--lang", "zh"], { cwd: project("一站式平台。"), env, encoding: "utf8" });
  assert.match(r.stdout, /宣传语/);
  assert.match(r.stdout, /AI 味/);
});
