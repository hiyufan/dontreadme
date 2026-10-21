import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyEdits, fix, grade, lint, parse, validate } from "../dist/index.js";
import { setLang } from "../dist/i18n.js";

setLang("en");

const ids = (text, config) => lint(text, config).findings.map((f) => f.rule);
const example = (name) => readFileSync(new URL(`../examples/${name}`, import.meta.url), "utf8");

test("parser keeps code, URLs and HTML out of prose", () => {
  const doc = parse(
    [
      "Run `robust --seamless` now.",
      "",
      "```js",
      "// a blazing fast comment",
      "```",
      "",
      "See [docs](https://example.com/powerful) or <img alt=\"robust\">.",
      "",
      "    indented code is robust",
    ].join("\n"),
  );
  assert.deepEqual(
    doc.blocks.map((b) => b.kind),
    ["paragraph", "code", "paragraph", "code"],
  );
  assert.equal(doc.prose.length, doc.text.length);
  assert.doesNotMatch(doc.prose, /robust|seamless|blazing|powerful/);
  assert.match(doc.prose, /docs/);
});

test("an HTML comment ends at -->, so the line after it is still prose", () => {
  const doc = parse("<!-- note -->\nA robust tool.");
  assert.deepEqual(doc.blocks.map((b) => b.kind), ["html", "paragraph"]);
});

test("parser recognises headings, lists, tables, quotes and front matter", () => {
  const doc = parse(["---", "title: x", "---", "# A", "Setext", "===", "- one", "- two", "", "| a | b |", "| - | - |", "| 1 | 2 |", "", "> quote"].join("\n"));
  assert.deepEqual(
    doc.blocks.map((b) => `${b.kind}${b.level || ""}`),
    ["frontmatter", "heading1", "heading1", "list", "table", "quote"],
  );
});

test("a plain, specific README scores A", () => {
  const r = lint(readFileSync(new URL("../README.md", import.meta.url), "utf8"));
  assert.equal(r.grade, "A", JSON.stringify(r.findings.map((f) => [f.line, f.rule, f.text])));
});

test("the slop examples score F in both languages", () => {
  for (const name of ["slop.md", "slop.zh-CN.md"]) {
    const r = lint(example(name));
    assert.equal(r.grade, "F", name);
    for (const rule of ["hype", "filler", "not-just", "bold-list", "emoji-bullets", "emoji-headings", "generic-heading", "exclamation"]) {
      assert.ok(r.findings.some((f) => f.rule === rule), `${name}: expected ${rule}`);
    }
  }
});

test("hype and filler match whole words, any case, straight or curly quotes", () => {
  assert.deepEqual(ids("A Robust tool."), ["hype"]);
  assert.deepEqual(ids("Robustness matters."), []);
  assert.deepEqual(ids("It’s worth noting that x."), ["filler"]);
  assert.deepEqual(ids("It's not just a tool."), ["not-just"]);
  assert.deepEqual(ids("一站式平台，不仅仅是工具，更是伙伴。"), ["hype", "not-just"]);
});

test("wordy fixes keep capitalisation and never orphan a sentence start", () => {
  assert.equal(fix("We utilize it in order to win.").text, "We use it to win.");
  assert.equal(fix("In order to win, run it.").text, "To win, run it.");
  // "Simply" opens the sentence: deleting it would leave "run" lowercase, so leave it for a person.
  assert.equal(fix("Simply run it.").text, "Simply run it.");
  assert.equal(fix("You can simply run it.").text, "You can run it.");
  assert.equal(fix("它能够对代码进行优化。").text, "它能对代码优化。");
});

test("bold bullet lists become a table, emoji and all", () => {
  const src = ["Intro paragraph here.", "", "- ⚡ **Fast**: reads in 1 ms", "- **Small:** 4 kB", "- **Safe** — no unsafe code", ""].join("\n");
  assert.ok(ids(src).includes("bold-list"));
  assert.equal(
    fix(src).text,
    ["Intro paragraph here.", "", "|  |  |", "| --- | --- |", "| Fast | reads in 1 ms |", "| Small | 4 kB |", "| Safe | no unsafe code |", ""].join("\n"),
  );
});

test("lists that wrap, nest or mix styles are left alone", () => {
  assert.ok(!ids("- **A**: one\n- **B**: two\n- plain three\n").includes("bold-list"));
  assert.ok(!ids("- **A**: one\n  - **B**: two\n- **C**: three\n").includes("bold-list"));
  assert.ok(!ids("- **A**: one\n- **B**: two\n").includes("bold-list"));
});

test("a single emoji heading is a choice, several are a template", () => {
  assert.deepEqual(ids("# T\n\n## 🚀 Start\n\ntext\n"), []);
  assert.equal(ids("# T\n\n## 🚀 Start\n\ntext\n\n## 📦 Install\n").filter((r) => r === "emoji-headings").length, 2);
  assert.equal(fix("## 🚀 Start\n\n## 📦 Install\n").text, "## Start\n\n## Install\n");
});

test("em dashes are fine in moderation", () => {
  const words = ("word ".repeat(50) + "\n\n").repeat(10);
  assert.ok(!ids(`${words} — a — b — c`).includes("em-dash"));
  assert.deepEqual(ids("a — b — c — d — e"), ["em-dash"]);
});

test("exclamation marks are flagged and fixed, image syntax is not", () => {
  assert.deepEqual(ids("![logo](x.png)\n\nNice!\n"), ["exclamation"]);
  assert.equal(fix("Nice! 很好！").text, "Nice. 很好。");
  assert.deepEqual(ids("a != b"), []);
});

test("long paragraphs, badge walls and a missing quickstart", () => {
  assert.deepEqual(ids("word ".repeat(81)), ["long-paragraph"]);
  const badges = Array.from({ length: 7 }, (_, i) => `![b](https://img.shields.io/badge/b-${i}-blue)`).join(" ");
  assert.deepEqual(ids(badges), ["badge-wall"]);
  const noCode = Array.from({ length: 30 }, (_, i) => `Line ${i}.\n`).join("\n");
  assert.deepEqual(ids(noCode), ["late-quickstart"]);
  assert.deepEqual(ids("```sh\nnpm i x\n```\n" + noCode), []);
});

test("config turns rules off, changes severity and allows phrases", () => {
  const text = "A robust and powerful tool.";
  assert.deepEqual(ids(text, validate({ rules: { hype: "off" } })), []);
  assert.deepEqual(
    lint(text, validate({ rules: { hype: "info" } })).findings.map((f) => f.severity),
    ["info", "info"],
  );
  assert.deepEqual(ids(text, validate({ allow: ["Robust"] })), ["hype"]);
  assert.throws(() => validate({ rules: { nope: "off" } }), /unknown rule/);
  assert.throws(() => validate({ maxScore: 200 }), /maxScore/);
});

test("inline directives silence a line or the whole file", () => {
  assert.deepEqual(ids("<!-- dontreadme-disable-next-line hype -->\nA robust tool.\n\nAnother robust one."), ["hype"]);
  assert.deepEqual(ids("<!-- dontreadme-disable -->\n\nA robust tool!"), []);
  assert.deepEqual(ids("<!-- dontreadme-disable exclamation -->\n\nA robust tool!"), ["hype"]);
});

test("overlapping edits: the first wins and the rest wait for the next pass", () => {
  const r = applyEdits("abcdef", [
    { start: 1, end: 3, text: "X" },
    { start: 2, end: 4, text: "Y" },
    { start: 4, end: 5, text: "Z" },
  ]);
  assert.deepEqual(r, { text: "aXdZf", applied: 2 });
});

test("fix is idempotent", () => {
  for (const name of ["slop.md", "slop.zh-CN.md"]) {
    const once = fix(example(name)).text;
    assert.equal(fix(once).text, once, name);
  }
});

test("score scales with density and grades follow it", () => {
  assert.equal(lint("A robust tool.").score > lint("```sh\nx\n```\n\nA robust tool.\n\n" + "Plain words here.\n\n".repeat(300)).score, true);
  assert.deepEqual([0, 9, 10, 24, 25, 44, 45, 69, 70, 100].map(grade), ["A", "A", "B", "B", "C", "C", "D", "D", "F", "F"]);
});

test("chat leftovers, in prose and in pasted links", () => {
  assert.deepEqual(ids("Certainly! Here is a README for your project.").filter((r) => r === "chatbot").length, 2);
  assert.ok(ids("I hope this helps.").includes("chatbot"));
  assert.ok(ids("Set it up as of my last training update.").includes("chatbot"));
  assert.ok(ids("Contact [Your Name] for access.").includes("chatbot"));
  assert.ok(ids("See [the docs](https://example.com/?utm_source=chatgpt.com).").includes("chatbot"));
  assert.ok(ids("以下是为你生成的 README。").includes("chatbot"));
  assert.deepEqual(ids("Pass `[your token]` as the first argument."), []);
  assert.deepEqual(ids("Links like `?utm_source=chatgpt.com` are flagged."), []);
});

test("excess vocabulary from the PubMed study, without technical nouns", () => {
  assert.deepEqual(ids("This tool showcases intricate parsing."), ["ai-vocab", "ai-vocab"]);
  assert.deepEqual(ids("The test harness runs in CI."), []);
});

test("-ing tails, but not syntax highlighting", () => {
  assert.deepEqual(ids("It was rewritten in Rust, underscoring its speed."), ["ing-tail", "ai-vocab"]);
  assert.deepEqual(ids("Prints files with colors, highlighting syntax."), []);
});

test("Chinese contrast framing and hype, but not closed-loop control", () => {
  assert.deepEqual(ids("真正的壁垒不是技术，而是认知。"), ["not-just"]);
  assert.deepEqual(ids("它采用闭环控制。"), []);
  assert.deepEqual(ids("说白了，预算不够。"), ["filler"]);
  assert.deepEqual(ids("核心是：先跑起来。"), ["filler"]);
});

test("phrases being quoted are mentioned, not used", () => {
  assert.deepEqual(ids("Words like “seamless” and 「赋能」 are flagged."), []);
  assert.deepEqual(ids("A seamless tool."), ["hype"]);
});

test("numbered Chinese headings are stripped, title case is noted", () => {
  const zhDoc = "## 一、安装\n\n## 二、配置\n\n## 三、使用\n";
  assert.equal(ids(zhDoc).filter((r) => r === "numbered-headings").length, 3);
  assert.equal(fix(zhDoc).text, "## 安装\n\n## 配置\n\n## 使用\n");
  const tc = "## Getting Started With It\n\n## Advanced Configuration Options\n\n## Frequently Asked Questions\n";
  assert.deepEqual(ids(tc), ["title-case"]);
  assert.deepEqual(ids("## Getting started with it\n\n## Advanced configuration options\n\n## Frequently asked questions\n"), []);
});

test("bold sprinkled through prose", () => {
  const text = Array.from({ length: 8 }, (_, i) => `Item **${i}** is here.`).join(" ");
  assert.deepEqual(ids(text), ["bold-overuse"]);
  assert.deepEqual(ids("One **important** note."), []);
});

test("Chinese em dashes count too", () => {
  assert.deepEqual(ids("甲——乙——丙——丁——戊"), ["em-dash"]);
});
