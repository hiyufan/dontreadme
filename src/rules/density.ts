import { position, wordCount } from "../markdown.js";
import type { Finding, Rule } from "../types.js";

const LONG_PARAGRAPH = 80;

export const longParagraph: Rule = {
  id: "long-paragraph",
  severity: "warn",
  summary: { en: `Paragraphs over ${LONG_PARAGRAPH} words`, zh: `超过 ${LONG_PARAGRAPH} 词（约 ${LONG_PARAGRAPH * 2} 字）的段落` },
  check(doc) {
    const out: Finding[] = [];
    for (const b of doc.blocks) {
      if (b.kind !== "paragraph") continue;
      const n = wordCount(doc.prose.slice(doc.lineStart[b.start], doc.lineStart[b.end] + doc.lines[b.end].length));
      if (n <= LONG_PARAGRAPH) continue;
      out.push({
        rule: this.id,
        severity: this.severity,
        line: b.start + 1,
        col: 1,
        weight: Math.round((3 * n) / LONG_PARAGRAPH),
        message: {
          en: `${n}-word paragraph. Nobody reads a README top to bottom; split it, or turn it into a list or a table.`,
          zh: `这一段约 ${n * 2} 字。没人会从头读 README，拆开，或者改成列表、表格。`,
        },
      });
    }
    return out;
  },
};

export const emDash: Rule = {
  id: "em-dash",
  severity: "warn",
  summary: { en: "Em dashes at a rate no person types them", zh: "密度高到不像人手打的破折号" },
  check(doc) {
    const dashes = [...doc.prose.matchAll(/—/g)];
    // About one per 150 words is a writer who likes dashes. More is a model.
    const allowed = Math.max(2, Math.floor(doc.words / 150));
    if (dashes.length <= allowed) return [];
    return [
      {
        rule: this.id,
        severity: this.severity,
        weight: Math.min(30, 2 + dashes.length - allowed),
        ...position(doc, dashes[0].index ?? 0),
        message: {
          en: `${dashes.length} em dashes in ${doc.words} words. Use a full stop, a comma or a colon for most of them.`,
          zh: `${doc.words * 2} 字里有 ${dashes.length} 个破折号。大部分可以换成句号、逗号或冒号。`,
        },
      },
    ];
  },
};

export const exclamation: Rule = {
  id: "exclamation",
  severity: "info",
  summary: { en: "Exclamation marks in prose", zh: "正文里的感叹号" },
  check(doc) {
    const hits = [...doc.prose.matchAll(/(?<=[\p{L}\p{N})\]])(?:!+(?=\s|$|\*)|！+)/gmu)];
    return hits.map((m) => ({
      rule: this.id,
      severity: this.severity,
      ...position(doc, m.index ?? 0),
      message: { en: "Exclamation mark. Let the content be exciting.", zh: "感叹号。让内容本身说话。" },
      fix: [{ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, text: m[0][0] === "！" ? "。" : "." }],
    }));
  },
};

const MAX_BADGES = 6;

export const badgeWall: Rule = {
  id: "badge-wall",
  severity: "info",
  summary: { en: `More than ${MAX_BADGES} badges`, zh: `超过 ${MAX_BADGES} 个徽章` },
  check(doc) {
    const badges = [...doc.text.matchAll(/https?:\/\/(?:img\.shields\.io|badgen\.net|badge\.fury\.io|[^\s)"']*\/badge(?:\.svg)?\b)[^\s)"']*/g)];
    if (badges.length <= MAX_BADGES) return [];
    return [
      {
        rule: this.id,
        severity: this.severity,
        ...position(doc, badges[0].index ?? 0),
        message: {
          en: `${badges.length} badges. Keep the ones a user acts on (version, CI, license) and drop the rest.`,
          zh: `${badges.length} 个徽章。留下用户真会看的（版本、CI、许可证），其余删掉。`,
        },
      },
    ];
  },
};

const SHELL = new Set(["", "sh", "bash", "shell", "console", "zsh", "fish", "powershell", "ps1", "pwsh", "cmd", "bat"]);
const MIN_LINES = 20;

export const lateQuickstart: Rule = {
  id: "late-quickstart",
  severity: "warn",
  summary: { en: "No install or run command in the first screen", zh: "第一屏里看不到安装或运行命令" },
  check(doc) {
    if (doc.lines.length < MIN_LINES) return [];
    const first = doc.blocks.find((b) => b.kind === "code" && SHELL.has(b.lang));
    // A screen is roughly 40 lines of rendered README, less once there is a banner.
    const limit = Math.max(40, Math.round(doc.lines.length * 0.3));
    if (first && first.start < limit) return [];
    return [
      {
        rule: this.id,
        severity: this.severity,
        line: first ? first.start + 1 : 1,
        col: 1,
        message: first
          ? {
              en: `The first command is on line ${first.start + 1}. Put install and a one-line example near the top.`,
              zh: `第一条命令在第 ${first.start + 1} 行。把安装和一行示例放到最前面。`,
            }
          : { en: "No install or run command anywhere. Show how to try it.", zh: "全文没有安装或运行命令。告诉读者怎么上手试。" },
      },
    ];
  },
};
