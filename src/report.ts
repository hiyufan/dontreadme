import { say, t } from "./i18n.js";
import { rules } from "./rules/index.js";
import type { Grade, Result } from "./types.js";

// Reporters turn results into text and nothing else. The CLI decides where the text goes.

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const dim = paint(2);
const bold = paint(1);
const yellow = paint(33);
const cyan = paint(36);
const GRADE_COLOR: Record<Grade, (s: string) => string> = { A: paint(32), B: paint(32), C: paint(33), D: paint(31), F: paint(31) };

export function pretty(results: Result[]): string {
  const out: string[] = [];
  for (const r of results) {
    out.push(bold(r.file));
    const pad = String(Math.max(0, ...r.findings.map((f) => f.line))).length;
    for (const f of r.findings) {
      const where = dim(`${String(f.line).padStart(pad)}:${String(f.col).padEnd(3)}`);
      const sev = f.severity === "warn" ? yellow("warn") : cyan("info");
      const fixable = f.fix ? dim(" ✎") : "";
      out.push(`  ${where} ${sev}  ${say(f.message)}${fixable}  ${dim(f.rule)}`);
    }
    if (!r.findings.length) out.push(`  ${t.clean()}`);
    const nFix = r.findings.filter((f) => f.fix).length;
    const tail = [t.findings(r.findings.length), ...(nFix ? [t.fixable(nFix)] : [])].join(" · ");
    out.push("", `  ${GRADE_COLOR[r.grade](t.score(r.score, r.grade))} · ${tail}`, "");
  }
  return out.join("\n");
}

export function json(results: Result[]): string {
  return JSON.stringify(
    results.map((r) => ({
      file: r.file,
      score: r.score,
      grade: r.grade,
      words: r.words,
      findings: r.findings.map((f) => ({
        rule: f.rule,
        severity: f.severity,
        line: f.line,
        col: f.col,
        message: say(f.message),
        text: f.text,
        fixable: !!f.fix,
      })),
    })),
    null,
    2,
  );
}

/** Workflow commands: each finding becomes an annotation on the PR diff. */
export function github(results: Result[]): string {
  const esc = (s: string) => s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  const prop = (s: string) => esc(s).replace(/:/g, "%3A").replace(/,/g, "%2C");
  const out: string[] = [];
  for (const r of results) {
    for (const f of r.findings) {
      const level = f.severity === "warn" ? "warning" : "notice";
      out.push(`::${level} file=${prop(r.file)},line=${f.line},col=${f.col},title=${prop(`dontreadme ${f.rule}`)}::${esc(say(f.message))}`);
    }
    out.push(`${r.file}: ${t.score(r.score, r.grade)} · ${t.findings(r.findings.length)}`);
  }
  return out.join("\n");
}

/** Markdown for $GITHUB_STEP_SUMMARY or a PR comment. */
export function summary(results: Result[]): string {
  const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const out = [
    `### ${t.summaryTitle()}`,
    "",
    `| ${t.file()} | ${t.scoreCol()} | ${t.gradeCol()} | ${t.findingsCol()} |`,
    "| --- | ---: | :---: | ---: |",
    ...results.map((r) => `| \`${r.file}\` | ${r.score} | ${r.grade} | ${r.findings.length} |`),
  ];
  for (const r of results) {
    if (!r.findings.length) continue;
    out.push("", `<details><summary><code>${r.file}</code></summary>`, "", `| ${t.line()} | ${t.rule()} | ${t.message()} |`, "| ---: | --- | --- |");
    for (const f of r.findings) out.push(`| ${f.line} | \`${f.rule}\` | ${cell(say(f.message))} |`);
    out.push("", "</details>");
  }
  return out.join("\n") + "\n";
}

const BADGE_COLOR: Record<Grade, string> = { A: "brightgreen", B: "green", C: "yellow", D: "orange", F: "red" };

export function badge(r: Result): string {
  const label = encodeURIComponent(t.badgeLabel()).replace(/-/g, "--");
  const value = encodeURIComponent(`${r.score}/100 ${r.grade}`).replace(/-/g, "--");
  return `[![${t.badgeLabel()}: ${r.grade}](https://img.shields.io/badge/${label}-${value}-${BADGE_COLOR[r.grade]})](https://github.com/hiyufan/dontreadme)`;
}

export function ruleList(): string {
  const w = Math.max(...rules.map((r) => r.id.length));
  return rules.map((r) => `${r.id.padEnd(w)}  ${r.severity === "warn" ? yellow("warn") : cyan("info")}  ${say(r.summary)}`).join("\n");
}
