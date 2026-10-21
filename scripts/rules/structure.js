const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator})[️‍\p{Extended_Pictographic}]*\s*/u;
const ITEM = /^(\s*)([-*+])\s+(.*)$/;
// "**Fast**: does x", "**Fast** — does x", "**Fast:** does x", optionally after an emoji.
const BOLD_LEAD = /^(?:(?:\p{Extended_Pictographic}|\p{Regional_Indicator})[️‍\p{Extended_Pictographic}]*\s*)?\*\*([^*]+?)\*\*\s*(?:[:：]|\s[—–-])\s*(.+)$|^(?:(?:\p{Extended_Pictographic})[️‍]*\s*)?\*\*([^*]+?)[:：]\*\*\s*(.+)$/u;
/** Top-level items of a list, or nothing when the list nests or wraps (those are not tables waiting to happen). */
function flatItems(doc, b) {
    const items = [];
    for (let i = b.start; i <= b.end; i++) {
        const line = doc.lines[i];
        if (line.trim() === "")
            continue;
        const m = ITEM.exec(line);
        if (!m || (items.length && m[1] !== items[0].indent))
            return undefined;
        items.push({ line: i, indent: m[1], marker: m[2], body: m[3] });
    }
    return items;
}
function lineEdit(doc, line, text) {
    return { start: doc.lineStart[line], end: doc.lineStart[line] + doc.lines[line].length, text };
}
const cell = (s) => s.trim().replace(/\|/g, "\\|");
export const boldList = {
    id: "bold-list",
    severity: "warn",
    summary: { en: "“**Name**: description” bullet lists that should be a table", zh: "应该写成表格的 “**名称**：说明” 列表" },
    check(doc) {
        const out = [];
        for (const b of doc.blocks) {
            if (b.kind !== "list")
                continue;
            const items = flatItems(doc, b);
            if (!items || items.length < 3)
                continue;
            const rows = items.map((it) => BOLD_LEAD.exec(it.body));
            if (rows.some((r) => !r))
                continue;
            const head = doc.cjk ? ["名称", "说明"] : ["", ""];
            const table = [
                `| ${head[0]} | ${head[1]} |`,
                "| --- | --- |",
                ...rows.map((r) => `| ${cell((r[1] ?? r[3]).replace(EMOJI, ""))} | ${cell(r[2] ?? r[4])} |`),
            ].join("\n");
            out.push({
                rule: this.id,
                severity: this.severity,
                line: b.start + 1,
                col: 1,
                message: {
                    en: `${items.length} “**Name**: description” bullets. That is a table; readers scan a column faster than a list.`,
                    zh: `${items.length} 条 “**名称**：说明” 列表。这本该是表格，读者扫一列比扫一串列表快。`,
                },
                fix: [{ start: doc.lineStart[b.start], end: doc.lineStart[b.end] + doc.lines[b.end].length, text: table }],
            });
        }
        return out;
    },
};
export const emojiBullets = {
    id: "emoji-bullets",
    severity: "info",
    summary: { en: "Lists where every item starts with an emoji", zh: "每一条都以 emoji 开头的列表" },
    check(doc) {
        const out = [];
        for (const b of doc.blocks) {
            if (b.kind !== "list")
                continue;
            const items = flatItems(doc, b);
            if (!items || items.length < 3 || !items.every((it) => EMOJI.test(it.body)))
                continue;
            out.push({
                rule: this.id,
                severity: this.severity,
                line: b.start + 1,
                col: 1,
                weight: 2,
                message: {
                    en: `${items.length} bullets each led by an emoji. They decorate, they don't inform.`,
                    zh: `${items.length} 条列表都用 emoji 开头，只是装饰，不带信息。`,
                },
                fix: items.map((it) => lineEdit(doc, it.line, `${it.indent}${it.marker} ${it.body.replace(EMOJI, "")}`)),
            });
        }
        return out;
    },
};
export const emojiHeadings = {
    id: "emoji-headings",
    severity: "info",
    summary: { en: "Section headings decorated with emoji", zh: "用 emoji 装饰的章节标题" },
    check(doc) {
        const hits = doc.blocks
            .filter((b) => b.kind === "heading" && b.level > 1)
            .map((b) => ({ b, m: /^(\s*#{1,6}\s+)(.*)$/.exec(doc.lines[b.start]) }))
            .filter((h) => h.m && EMOJI.test(h.m[2]));
        // One is a choice. Several is a template.
        if (hits.length < 2)
            return [];
        return hits.map(({ b, m }) => ({
            rule: this.id,
            severity: this.severity,
            line: b.start + 1,
            col: m[1].length + 1,
            message: { en: "Emoji in a heading. Plain headings read and link better.", zh: "标题里的 emoji。纯文字标题更好读，锚点链接也更干净。" },
            fix: [lineEdit(doc, b.start, m[1] + m[2].replace(EMOJI, ""))],
        }));
    },
};
const GENERIC = /^(conclusion|final thoughts|summary|in summary|wrapping up|introduction|overview|why choose\b.*|why use\b.*\?|key features|features at a glance|总结|结语|写在最后|结束语|简介|概述|为什么选择.*)[:：!！]?$/i;
export const genericHeadings = {
    id: "generic-heading",
    severity: "info",
    summary: { en: "Essay sections a README does not need (Overview, Conclusion, …)", zh: "README 用不着的作文式章节（概述、总结……）" },
    check(doc) {
        const out = [];
        for (const b of doc.blocks) {
            if (b.kind !== "heading")
                continue;
            const title = doc.lines[b.start].replace(/^\s*#{1,6}\s+/, "").replace(EMOJI, "").replace(/#+\s*$/, "").trim();
            if (!GENERIC.test(title))
                continue;
            out.push({
                rule: this.id,
                severity: this.severity,
                line: b.start + 1,
                col: 1,
                message: {
                    en: `“${title}” is an essay section. Name the section after what it says, or cut it.`,
                    zh: `“${title}” 是作文式章节。按内容给它起名，或者删掉。`,
                },
                text: title,
            });
        }
        return out;
    },
};
const NUMBERED = /^(\s*#{1,6}\s+)((?:[一二三四五六七八九十]{1,3}|第[一二三四五六七八九十]{1,3}(?:部分|步|章|节)?)[、.．:：]\s*)(.+)$/u;
export const numberedHeadings = {
    id: "numbered-headings",
    severity: "info",
    summary: { en: "Chinese headings numbered 一、二、三、", zh: "用 “一、二、三、” 给小标题编号" },
    check(doc) {
        // [Z] 序数词当小标题 3.1x. Three in a row is a template; one or two may be deliberate.
        const hits = doc.blocks
            .filter((b) => b.kind === "heading")
            .map((b) => ({ b, m: NUMBERED.exec(doc.lines[b.start]) }))
            .filter((h) => h.m);
        if (hits.length < 3)
            return [];
        return hits.map(({ b, m }) => ({
            rule: this.id,
            severity: this.severity,
            line: b.start + 1,
            col: m[1].length + 1,
            message: { en: "Numbered heading. Let the heading say what the section is about.", zh: "小标题编号。让标题本身说明这一节讲什么，编号删掉。" },
            fix: [lineEdit(doc, b.start, m[1] + m[3])],
        }));
    },
};
// Words that stay lowercase in title case, so "Getting Started with the CLI" counts as title case.
const MINOR = new Set("a an and as at but by for from in into nor of on or over per the to up via vs with".split(" "));
export const titleCase = {
    id: "title-case",
    severity: "info",
    summary: { en: "Most headings In Title Case", zh: "大部分英文标题用了 Title Case" },
    check(doc) {
        const heads = doc.blocks
            .filter((b) => b.kind === "heading" && b.level > 1)
            .map((b) => ({ b, words: doc.lines[b.start].replace(/^\s*#{1,6}\s+/, "").replace(/`[^`]*`/g, "").match(/[A-Za-z][\w'’-]*/g) ?? [] }))
            .filter((h) => h.words.length >= 3);
        const isTitle = (w) => w.slice(1).every((x) => MINOR.has(x.toLowerCase()) || /^[A-Z0-9]/.test(x)) && w.slice(1).some((x) => /^[A-Z][a-z]/.test(x));
        const titled = heads.filter((h) => isTitle(h.words));
        // [W] One Title Case heading is a style guide. Most of them, across several, is a template.
        if (titled.length < 3 || titled.length * 2 < heads.length)
            return [];
        return [
            {
                rule: this.id,
                severity: this.severity,
                line: titled[0].b.start + 1,
                col: 1,
                weight: 2,
                message: {
                    en: `${titled.length} of ${heads.length} headings are In Title Case. Sentence case reads as written, not generated.`,
                    zh: `${heads.length} 个英文标题里有 ${titled.length} 个用了 Title Case。改成只有首字母大写更自然。`,
                },
            },
        ];
    },
};
