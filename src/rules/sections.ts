import { blockText, wordCount } from "../markdown.js";
import type { Block, Doc, Finding, Msg, Rule } from "../types.js";

// What a README has to contain for a visitor to decide whether to use the project: what it is,
// how to get it, what using it looks like, and whether they may. These rules only run on READMEs
// (the CLI decides by file name) and only say what is missing; the skill fills the gap from the
// repository, never by inventing it.

const INSTALL_CMD =
  /^\s*(?:\$ )?(?:npm (?:i|install|add)\b|npx |pnpm (?:add|dlx)|yarn (?:add|dlx)|bun (?:add|x)|deno (?:add|install)|pip3? install|pipx install|uv (?:tool install|add|pip install)|cargo (?:install|add)|go (?:install|get)|brew install|port install|apt(?:-get)? install|dnf install|pacman -S|nix (?:profile install|run)|winget install|scoop install|choco install|gem install|composer require|dotnet (?:add|tool install)|conda install|mamba install|docker (?:run|pull)|helm install|git clone|curl [^\n|]*\|\s*(?:sh|bash)|wget [^\n|]*\|\s*(?:sh|bash)|iwr [^\n|]*\|\s*iex)/m;
const INSTALL_HEAD = /install|getting started|quick ?start|setup|set up|download|安装|快速开始|快速上手|开始使用|部署/i;
const USAGE_HEAD = /usage|example|getting started|quick ?start|tutorial|how to use|walkthrough|用法|使用|示例|例子|快速开始|快速上手|教程/i;
const LICENSE = /\blicen[cs]e\b|\blicensed\b|许可证|许可协议|开源协议|授权协议/i;
const BADGE = /shields\.io|badgen\.net|badge\.fury\.io|\/badge(?:\.svg)?\b|\/workflows\/[^)"']*\.svg|codecov\.io|coveralls\.io/i;

const headings = (doc: Doc) => doc.blocks.filter((b) => b.kind === "heading").map((b) => ({ b, text: doc.lines[b.start].replace(/^\s*#{1,6}\s+/, "") }));
const codeText = (doc: Doc, b: Block) => doc.lines.slice(b.start + 1, b.end).join("\n");

function once(rule: Rule, line: number, message: Msg): Finding[] {
  return [{ rule: rule.id, severity: rule.severity, line, col: 1, message }];
}

export const noIntro: Rule = {
  id: "no-intro",
  severity: "warn",
  summary: { en: "No sentence under the title saying what the project is", zh: "标题下面没有一句话说明项目是什么" },
  check(doc) {
    if (!doc.readme) return [];
    const firstSection = doc.blocks.findIndex((b, i) => i > 0 && b.kind === "heading" && b.level <= 2 && !(b.level === 1 && i === doc.blocks.findIndex((x) => x.kind === "heading")));
    const top = doc.blocks.slice(0, firstSection < 0 ? doc.blocks.length : firstSection);
    // Prose in a paragraph or quote counts, and so does text inside the centred <p> many READMEs open with.
    const said = top.some((b) => {
      // A tagline set as a small heading under the title counts too.
      if (b.kind === "heading" && b.level >= 3) return wordCount(doc.lines[b.start]) >= 5;
      if (b.kind === "paragraph" || b.kind === "quote") return wordCount(doc.prose.slice(doc.lineStart[b.start], doc.lineStart[b.end] + doc.lines[b.end].length)) >= 5;
      if (b.kind === "html") return wordCount(blockText(doc, b).replace(/<[^>]*>/g, " ").replace(/!?\[[^\]]*\]\([^)]*\)/g, " ")) >= 5;
      return false;
    });
    if (said) return [];
    return once(this, 1, {
      en: "Nothing under the title says what this is. Open with one sentence: what it does and for whom.",
      zh: "标题下面没有一句话说明这是什么。开头用一句话写清楚：它做什么、给谁用。",
    });
  },
};

export const noInstall: Rule = {
  id: "no-install",
  severity: "warn",
  summary: { en: "No way to install or run the project", zh: "没有安装或运行方法" },
  check(doc) {
    if (!doc.readme) return [];
    const hasCommand = doc.blocks.some((b) => b.kind === "code" && INSTALL_CMD.test(codeText(doc, b)));
    if (hasCommand || headings(doc).some((h) => INSTALL_HEAD.test(h.text))) return [];
    return once(this, 1, {
      en: "No install command and no install section. Show the one command that gets it running.",
      zh: "没有安装命令，也没有安装章节。给出能把它跑起来的那一条命令。",
    });
  },
};

export const noUsage: Rule = {
  id: "no-usage",
  severity: "warn",
  summary: { en: "No example of using it", zh: "没有使用示例" },
  check(doc) {
    if (!doc.readme) return [];
    // Any code beyond the install line counts as an example: a second command, an import, a config file.
    const example = doc.blocks.some(
      (b) => b.kind === "code" && codeText(doc, b).split("\n").some((l) => l.trim() && !/^\s*(#|\/\/)/.test(l) && !INSTALL_CMD.test(l)),
    );
    if (example || headings(doc).some((h) => USAGE_HEAD.test(h.text))) return [];
    return once(this, 1, {
      en: "No usage example. Show the shortest real use and what it prints or returns.",
      zh: "没有使用示例。给出最短的真实用法，以及它输出或返回什么。",
    });
  },
};

export const noDemo: Rule = {
  id: "no-demo",
  severity: "info",
  summary: { en: "No screenshot, GIF or recording", zh: "没有截图、动图或演示录屏" },
  check(doc) {
    if (!doc.readme || doc.words < 150) return [];
    const images = [...doc.text.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)|<img\b[^>]*\bsrc=["']([^"']+)["']|<video\b|asciinema\.org\/a\/|\.(?:gif|mp4|webm|cast)\b/gi)];
    if (images.some((m) => !BADGE.test(m[1] ?? m[2] ?? m[0]))) return [];
    return once(this, 1, {
      en: "No screenshot or recording. If it has output or a UI, one image near the top shows more than a paragraph.",
      zh: "没有截图或录屏。如果它有输出或界面，开头放一张图比一段文字更直观。",
    });
  },
};

export const noLicense: Rule = {
  id: "no-license",
  severity: "info",
  summary: { en: "No license mentioned", zh: "没有提到许可证" },
  check(doc) {
    if (!doc.readme || LICENSE.test(doc.text)) return [];
    return once(this, doc.lines.length, {
      en: "No license mentioned. Say which one in a short section at the end, so people know they may use it.",
      zh: "没有提到许可证。在末尾加一小节写明协议，让别人知道能不能用。",
    });
  },
};

const MIN_TOC_SECTIONS = 8;
const MIN_TOC_WORDS = 1500;

export const noToc: Rule = {
  id: "no-toc",
  severity: "info",
  summary: { en: `Long README (${MIN_TOC_SECTIONS}+ sections) without a table of contents`, zh: `超过 ${MIN_TOC_SECTIONS} 节的长 README 没有目录` },
  check(doc) {
    if (!doc.readme || doc.words < MIN_TOC_WORDS) return [];
    const sections = headings(doc).filter((h) => h.b.level === 2 || h.b.level === 3);
    if (sections.length < MIN_TOC_SECTIONS) return [];
    // A table of contents is a list (or a <details> block) of at least three in-page links.
    const hasToc = doc.blocks.some((b) => (b.kind === "list" || b.kind === "html") && (blockText(doc, b).match(/\]\(#|href="#/g)?.length ?? 0) >= 3);
    if (hasToc || /\[\[_?TOC_?\]\]|\[TOC\]/i.test(doc.text)) return [];
    const firstSection = sections[0].b.start;
    return once(this, firstSection + 1, {
      en: `${sections.length} sections and no table of contents. Add a short list of links before the first section.`,
      zh: `共 ${sections.length} 节，没有目录。在第一节前加一个简短的链接列表。`,
    });
  },
};
