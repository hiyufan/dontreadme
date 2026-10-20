import { parse } from "./markdown.js";
import { rules as allRules } from "./rules/index.js";
import type { Config, Edit, Finding, Grade, Rule } from "./types.js";

export const defaultConfig = (): Config => ({ rules: {}, allow: [] });

export interface Lint {
  findings: Finding[];
  score: number;
  grade: Grade;
  words: number;
}

// Pipeline: parse → run rules → drop what the author silenced → score.
// Rules never see the config or each other, so each can be tested on its own.
export function lint(text: string, config: Config = defaultConfig(), rules: Rule[] = allRules): Lint {
  const doc = parse(text.replace(/\r\n?/g, "\n"));
  const silenced = directives(doc.lines);
  const allow = config.allow.map((a) => a.toLowerCase());
  const findings: Finding[] = [];
  for (const rule of rules) {
    const setting = config.rules[rule.id];
    if (setting === "off" || silenced.file.has(rule.id) || silenced.file.has("*")) continue;
    for (const f of rule.check(doc)) {
      const line = silenced.lines.get(f.line);
      if (line && (line.has("*") || line.has(rule.id))) continue;
      if (f.text && allow.includes(f.text.toLowerCase())) continue;
      findings.push(setting ? { ...f, severity: setting } : f);
    }
  }
  findings.sort((a, b) => a.line - b.line || a.col - b.col);
  const score = slopScore(findings, doc.words);
  return { findings, score, grade: grade(score), words: doc.words };
}

const WEIGHT = { warn: 3, info: 1 } as const;

/**
 * 0 is clean, 100 is a sales page. Weighted findings per word, so a long README is not
 * punished for being long and a short one cannot hide three hype words in fifty.
 */
export function slopScore(findings: Finding[], words: number): number {
  const points = findings.reduce((s, f) => s + (f.weight ?? WEIGHT[f.severity]), 0);
  // Calibrated so a hand-written README like ripgrep's lands in A and a template-generated one in D or F.
  return Math.min(100, Math.round((points * 1000) / Math.max(words, 300)));
}

export function grade(score: number): Grade {
  return score < 10 ? "A" : score < 25 ? "B" : score < 45 ? "C" : score < 70 ? "D" : "F";
}

/** `<!-- dontreadme-disable rule -->` silences a rule for the file; `-disable-next-line` for one line. No rule names means all. */
function directives(lines: string[]) {
  const file = new Set<string>();
  const byLine = new Map<number, Set<string>>();
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/<!--\s*dontreadme-disable(-next-line)?\s*([\w\s,-]*?)\s*-->/g)) {
      const ids = m[2].split(/[\s,]+/).filter(Boolean);
      const target = m[1] ? byLine.set(i + 2, byLine.get(i + 2) ?? new Set()).get(i + 2)! : file;
      for (const id of ids.length ? ids : ["*"]) target.add(id);
    }
  });
  return { file, lines: byLine };
}

/** Apply non-overlapping edits. When two overlap, the earlier one wins and the other waits for the next pass. */
export function applyEdits(text: string, edits: Edit[]): { text: string; applied: number } {
  const sorted = [...edits].sort((a, b) => a.start - b.start || a.end - b.end);
  let out = "";
  let cursor = 0;
  let applied = 0;
  for (const e of sorted) {
    if (e.start < cursor) continue;
    out += text.slice(cursor, e.start) + e.text;
    cursor = e.end;
    applied++;
  }
  return { text: out + text.slice(cursor), applied };
}

/** Fix what can be fixed without judgment. Re-lints between passes, since one fix can move or reveal another. */
export function fix(text: string, config: Config = defaultConfig()): { text: string; fixed: number } {
  let fixed = 0;
  text = text.replace(/\r\n?/g, "\n");
  for (let pass = 0; pass < 5; pass++) {
    const edits = lint(text, config).findings.flatMap((f) => f.fix ?? []);
    if (!edits.length) break;
    const r = applyEdits(text, edits);
    if (r.text === text) break;
    text = r.text;
    fixed += r.applied;
  }
  return { text, fixed };
}
