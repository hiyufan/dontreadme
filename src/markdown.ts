import type { Block, BlockKind, Doc } from "./types.js";

// Just enough CommonMark to tell prose from code. A README linter has to be right about
// what is code far more than it has to be right about nested list edge cases.

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/;
const HEADING = /^ {0,3}(#{1,6})(\s|$)/;
const LIST_ITEM = /^\s*([-*+]|\d{1,9}[.)])\s+/;
const QUOTE = /^ {0,3}>/;
const HTML = /^ {0,3}<(\/?[a-zA-Z][\w-]*|!--)/;
const TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/;
const RULE = /^ {0,3}([-*_])(\s*\1){2,}\s*$/;

const blank = (s: string | undefined) => s === undefined || s.trim() === "";

export function parse(text: string, readme = true): Doc {
  const lines = text.split("\n");
  const lineStart: number[] = [];
  let off = 0;
  for (const l of lines) {
    lineStart.push(off);
    off += l.length + 1;
  }
  const blocks = splitBlocks(lines);
  const prose = maskProse(text, lines, lineStart, blocks);
  const latin = prose.match(/[A-Za-z0-9][\w'’-]*/g)?.length ?? 0;
  const han = prose.match(/\p{Script=Han}/gu)?.length ?? 0;
  return { text, lines, lineStart, blocks, prose, words: wordCount(prose), cjk: han / 2 > latin, readme };
}

function splitBlocks(lines: string[]): Block[] {
  const out: Block[] = [];
  const push = (kind: BlockKind, start: number, end: number, level = 0, lang = "") => out.push({ kind, start, end, level, lang });
  let i = 0;

  if (lines[0]?.trim() === "---") {
    const close = lines.findIndex((l, j) => j > 0 && /^(---|\.\.\.)\s*$/.test(l));
    if (close > 0) {
      push("frontmatter", 0, close);
      i = close + 1;
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    if (blank(line) || RULE.test(line)) {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1];
      let j = i + 1;
      while (j < lines.length && !new RegExp(`^ {0,3}${marker[0]}{${marker.length},}\\s*$`).test(lines[j])) j++;
      push("code", i, Math.min(j, lines.length - 1), 0, fence[2].toLowerCase());
      i = j + 1;
      continue;
    }

    const h = HEADING.exec(line);
    if (h) {
      push("heading", i, i, h[1].length);
      i++;
      continue;
    }

    if (HTML.test(line)) {
      let j = i;
      // A comment ends at its "-->"; other HTML runs to the next blank line, as in CommonMark.
      const comment = /^ {0,3}<!--/.test(line);
      if (comment) while (j + 1 < lines.length && !lines[j].includes("-->")) j++;
      else while (j + 1 < lines.length && !blank(lines[j + 1])) j++;
      push("html", i, j);
      i = j + 1;
      continue;
    }

    if (line.includes("|") && TABLE_SEP.test(lines[i + 1] ?? "")) {
      let j = i + 1;
      while (j + 1 < lines.length && lines[j + 1].includes("|") && !blank(lines[j + 1])) j++;
      push("table", i, j);
      i = j + 1;
      continue;
    }

    if (/^( {4}|\t)/.test(line)) {
      let j = i;
      while (j + 1 < lines.length && (/^( {4}|\t)/.test(lines[j + 1]) || (blank(lines[j + 1]) && /^( {4}|\t)/.test(lines[j + 2] ?? "")))) j++;
      push("code", i, j);
      i = j + 1;
      continue;
    }

    if (LIST_ITEM.test(line)) {
      let j = i;
      for (;;) {
        const next = lines[j + 1];
        if (next === undefined) break;
        if (!blank(next) && (LIST_ITEM.test(next) || /^\s+\S/.test(next))) {
          // A fenced block inside a list item still ends the list for our purposes; keep it as code.
          if (FENCE.test(next.trimStart()) && !LIST_ITEM.test(next)) break;
          j++;
          continue;
        }
        // A blank line keeps the list going only if the next thing is another item or an indented continuation.
        if (blank(next) && (LIST_ITEM.test(lines[j + 2] ?? "") || /^\s{2,}\S/.test(lines[j + 2] ?? "")) && !FENCE.test((lines[j + 2] ?? "").trimStart())) {
          j += 2;
          continue;
        }
        break;
      }
      push("list", i, j);
      i = j + 1;
      continue;
    }

    if (QUOTE.test(line)) {
      let j = i;
      while (j + 1 < lines.length && QUOTE.test(lines[j + 1])) j++;
      push("quote", i, j);
      i = j + 1;
      continue;
    }

    let j = i;
    while (
      j + 1 < lines.length &&
      !blank(lines[j + 1]) &&
      !HEADING.test(lines[j + 1]) &&
      !FENCE.test(lines[j + 1]) &&
      !LIST_ITEM.test(lines[j + 1]) &&
      !QUOTE.test(lines[j + 1]) &&
      !HTML.test(lines[j + 1])
    )
      j++;
    // Setext heading: a paragraph underlined with === or ---.
    if (j > i && /^ {0,3}(=+|-+)\s*$/.test(lines[j])) {
      push("paragraph", i, j - 1);
      out[out.length - 1].kind = "heading";
      out[out.length - 1].level = lines[j].includes("=") ? 1 : 2;
    } else push("paragraph", i, j);
    i = j + 1;
  }
  return out;
}

const PROSE_KINDS = new Set<BlockKind>(["heading", "paragraph", "list", "quote", "table"]);

/** Blank everything a prose rule must not read, keeping every offset and newline where it was. */
function maskProse(text: string, lines: string[], lineStart: number[], blocks: Block[]): string {
  const chars = text.replace(/[^\n]/g, " ").split("");
  for (const b of blocks) {
    if (!PROSE_KINDS.has(b.kind)) continue;
    const from = lineStart[b.start];
    const to = lineStart[b.end] + lines[b.end].length;
    const masked = text
      .slice(from, to)
      .replace(/`+[^`\n]*`+/g, blankOut) // inline code
      .replace(/!\[[^\]\n]*\]\([^)\n]*\)/g, blankOut) // images, alt text included
      .replace(/\]\([^)\n]*\)/g, (m) => "]" + blankOut(m.slice(1))) // link targets, keep the link text
      .replace(/^\s*\[[^\]\n]+\]:\s*\S+.*$/gm, blankOut) // reference definitions
      .replace(/<[^>\n]+>/g, blankOut) // inline HTML and autolinks
      .replace(/\bhttps?:\/\/\S+/g, blankOut);
    for (let k = 0; k < masked.length; k++) chars[from + k] = masked[k];
  }
  return chars.join("");
}

function blankOut(s: string): string {
  return s.replace(/[^\n]/g, " ");
}

/** 1-based line and column for an offset. */
export function position(doc: Doc, offset: number): { line: number; col: number } {
  let lo = 0;
  let hi = doc.lineStart.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (doc.lineStart[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, col: offset - doc.lineStart[lo] + 1 };
}

/** Text of a block, from its first character to the end of its last line. */
export function blockText(doc: Doc, b: Block): string {
  return doc.text.slice(doc.lineStart[b.start], doc.lineStart[b.end] + doc.lines[b.end].length);
}

export function wordCount(s: string): number {
  return (s.match(/[A-Za-z0-9][\w'’-]*/g)?.length ?? 0) + Math.round((s.match(/\p{Script=Han}/gu)?.length ?? 0) / 2);
}
