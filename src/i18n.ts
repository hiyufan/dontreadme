import type { Msg } from "./types.js";

export type Lang = "en" | "zh";

let current: Lang | undefined;

/** Chinese when the user asked for it or the system locale is Chinese, English otherwise. */
export function detectLang(env: NodeJS.ProcessEnv = process.env): Lang {
  const explicit = env.DONTREADME_LANG;
  if (explicit) return explicit.toLowerCase().startsWith("zh") ? "zh" : "en";
  const posix = env.LC_ALL || env.LC_MESSAGES || env.LANG || env.LANGUAGE;
  // "C" / "POSIX" mean no preference; fall through to the OS locale (macOS and Windows rarely set LANG for GUI terminals).
  const locale = posix && !/^(C|POSIX)([.@]|$)/i.test(posix) ? posix : Intl.DateTimeFormat().resolvedOptions().locale;
  return /^zh/i.test(locale) ? "zh" : "en";
}

export function setLang(lang: Lang | undefined) {
  current = lang;
}

export function lang(): Lang {
  return (current ??= detectLang());
}

export function say(m: Msg): string {
  return m[lang()];
}

const zh = () => lang() === "zh";
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Every string the CLI prints that is not a rule message. */
export const t = {
  score: (score: number, grade: string) => (zh() ? `AI 味 ${score}/100 · 评级 ${grade}` : `slop score ${score}/100 · grade ${grade}`),
  findings: (n: number) => (zh() ? `${n} 处问题` : plural(n, "finding")),
  fixable: (n: number) => (zh() ? `其中 ${n} 处可用 --fix 自动修复` : `${n} fixable with --fix`),
  clean: () => (zh() ? "没有发现问题。" : "No findings."),
  fixed: (file: string, n: number) => (zh() ? `${file}：已修改 ${n} 处` : `${file}: ${plural(n, "edit")} applied`),
  nothingToFix: (file: string) => (zh() ? `${file}：没有可自动修复的内容` : `${file}: nothing to fix automatically`),
  overMax: (file: string, score: number, max: number) =>
    zh() ? `${file} 的 AI 味 ${score} 超过上限 ${max}` : `${file} scores ${score}, above --max-score ${max}`,
  notFound: (file: string) => (zh() ? `找不到文件：${file}` : `no such file: ${file}`),
  noReadme: () => (zh() ? "当前目录没有 README.md，请指定文件。" : "No README.md here. Pass a file."),
  summaryTitle: () => (zh() ? "dontreadme 报告" : "dontreadme report"),
  file: () => (zh() ? "文件" : "File"),
  scoreCol: () => (zh() ? "AI 味" : "Slop"),
  gradeCol: () => (zh() ? "评级" : "Grade"),
  findingsCol: () => (zh() ? "问题" : "Findings"),
  line: () => (zh() ? "行" : "Line"),
  rule: () => (zh() ? "规则" : "Rule"),
  message: () => (zh() ? "说明" : "Message"),
  badgeLabel: () => "readme slop",
  help: () =>
    zh()
      ? `dontreadme：找出 README 里的 AI 腔，并修掉能自动修的部分。

用法
  npx dontreadme-cli [文件...]       默认检查 ./README.md
  npx dontreadme-cli --fix           就地修复可自动修复的问题

选项
  --fix                 就地改写文件（只改不需要判断的地方）
  --stdout              配合 --fix：把结果打印出来而不是写回文件
  --format <格式>       pretty（默认）、json、github（GitHub Actions 注释）
  --max-score <n>       任一文件 AI 味超过 n 时退出码为 1
  --badge               打印一行 README 徽章 Markdown
  --rules               列出所有规则
  --config <路径>       指定配置文件（默认向上查找 .dontreadmerc.json）
  --lang <en|zh>        界面语言（也可用 DONTREADME_LANG）
  -h, --help            显示帮助
  -v, --version         显示版本

退出码：0 正常，1 超过 --max-score，2 用法或文件错误。`
      : `dontreadme: find the AI voice in a README, and fix what can be fixed without judgment.

Usage
  npx dontreadme-cli [files...]      checks ./README.md by default
  npx dontreadme-cli --fix           rewrite the safe fixes in place

Options
  --fix                 rewrite files in place (only fixes that need no judgment)
  --stdout              with --fix: print the result instead of writing the file
  --format <fmt>        pretty (default), json, github (Actions annotations)
  --max-score <n>       exit 1 when any file scores above n
  --badge               print a README badge in Markdown
  --rules               list every rule
  --config <path>       config file (default: nearest .dontreadmerc.json)
  --lang <en|zh>        interface language (or DONTREADME_LANG)
  -h, --help            show this help
  -v, --version         show the version

Exit codes: 0 ok, 1 above --max-score, 2 usage or file error.`,
};
