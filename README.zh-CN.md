# dontreadme

<p>
  <a href="https://www.npmjs.com/package/dontreadme-cli"><img src="https://img.shields.io/npm/v/dontreadme-cli?color=5af78e&label=npm" alt="npm version"></a>
  <a href="https://github.com/hiyufan/dontreadme/actions/workflows/ci.yml"><img src="https://github.com/hiyufan/dontreadme/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/dependencies-0-57c7ff" alt="zero dependencies">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/hiyufan/dontreadme?color=a9abb8" alt="MIT license"></a>
</p>

<a href="README.md">English</a> · <b>简体中文</b>

一个让 agent 帮你改 README 的 skill，目标是读起来不像 AI 写的。它先用内置的 linter 检查文件，自动修掉不需要判断的部分，再用仓库里的真实信息改写剩下的问题，最后复查一遍。中英文都支持。

**改写前**（[`examples/slop.zh-CN.md`](examples/slop.zh-CN.md)，评级 F）：

<!-- dontreadme-disable-next-line -->
> 随着互联网技术的飞速发展，开发者对数据存储提出了更高的要求。FluxDB 不仅仅是一个数据库，更是一套全方位赋能开发者的数据解决方案。它能够帮助你无缝对接各类云平台，真正做到降本增效、业界领先。

**改写后**（改写示例，评级 A，只用了原文件其他地方写明的事实）：

> FluxDB 是一个键值数据库，读取延迟低于 1 毫秒，数据全程加密，支持插件扩展，安装后无需配置。

## 安装

Claude Code：

```text
/plugin marketplace add hiyufan/dontreadme
/plugin install dontreadme@dontreadme
```

Codex、Cursor、Gemini CLI 等其他 agent：

```sh
npx skills add hiyufan/dontreadme
```

Claude.ai 和 Claude 桌面版：把仓库下载成 ZIP（**Code → Download ZIP**），在 **设置 → Capabilities → Skills** 里上传。

## 使用

直接说：

```text
帮我把 README 的 AI 味去掉。
Clean up the README.
```

也可以用 `/dontreadme` 直接调用。agent 会告诉你改写前后的分数、改了哪些地方，以及哪些问题是有意保留的。它不会编数字：仓库里找不到依据的说法会被删掉，而不是换成新的说法。

skill 里的 linter 只需要 Node 18 以上，不用安装任何东西。没有 Node 时，agent 会按 [`SKILL.md`](SKILL.md) 里的清单逐条检查。

## 命令行和 CI

同一个 linter 也发布在 npm 上，可以在终端和流水线里用：

```sh
npx dontreadme-cli            # 检查 ./README.md
npx dontreadme-cli --fix      # 自动修复不需要判断的问题
```

```text
examples/slop.zh-CN.md
   3:3   warn  “一站式” 是宣传语，不是事实。换成数字或例子，或者删掉。  hype
   7:1   warn  “随着互联网技术的飞速发展” 是套话，删掉句子照样成立。  filler
   7:38  warn  “不仅仅是一个数据库，更是”：“不仅仅是……更是……” 是最典型的 AI 腔，直接说它是什么。  not-just
   7:69  info  “能够” → “能”。 ✎  wordy
  11:1   warn  4 条 “**名称**：说明” 列表。这本该是表格，读者扫一列比扫一串列表快。 ✎  bold-list
  …

  AI 味 100/100 · 评级 F · 34 处问题 · 其中 12 处可用 --fix 自动修复
```

提示语言跟随系统语言，可以用 `--lang en|zh` 指定。另见[选项](#选项)、[GitHub Action](#github-action) 和[配置](#配置)。

## 规则

| 规则 | 检查什么 | `--fix` | 依据 |
| --- | --- | --- | --- |
| `chatbot` | 聊天残留：`以下是为你生成的`、`希望对你有帮助`、`I hope this helps`、`[Your Name]` 占位符、带 `utm_source=chatgpt.com` 的链接 | | W |
| `hype` | 只下结论不给证据：`一站式`、`赋能`、`至关重要`、`举足轻重`、`blazing fast`、`plays a pivotal role` | | W |
| `filler` | 删掉句子照样成立的套话：`值得注意的是`、`说白了`、`核心是：`、`随着……的飞速发展`、`Let's dive in` | | W, Z |
| `not-just` | `不是……而是……`、`不仅仅是……更是……`、`与其说……不如说`、`It's not just X, it's Y` | | W, Z |
| `ai-vocab` | ChatGPT 之后使用率暴涨的英文词：`delve`、`showcase`、`underscore`、`intricate`、`meticulous` | | K, W |
| `ing-tail` | 英文句尾硬加的 `…, underscoring its importance` | | W |
| `wordy` | `能够`、`通过使用`、`进行优化`、`这意味着`、`in order to`、`serves as` | ✓ | W, Z |
| `bold-list` | 三条以上 `- **名称**：说明` 格式的列表 | ✓ 改成表格 | W |
| `emoji-bullets` | 每一条都以 emoji 开头的列表 | ✓ | W |
| `emoji-headings` | 两个以上带 emoji 的标题 | ✓ | W |
| `numbered-headings` | 三个以上用 `一、二、三、` 编号的小标题 | ✓ | Z |
| `title-case` | 大部分英文标题用了 Title Case | | W |
| `generic-heading` | 简介、概述、核心特性、为什么选择 X、总结、写在最后 | | W |
| `long-paragraph` | 超过约 160 字（80 个英文词）的段落 | | |
| `em-dash` | 每 150 词超过一个破折号（`—` 或 `——`） | | W, Z |
| `bold-overuse` | 每 60 词超过一处加粗 | | W |
| `exclamation` | 正文句末的感叹号 | ✓ | |
| `badge-wall` | 超过 6 个徽章 | | |
| `late-quickstart` | 前 40 行里没有命令 | | |

代码块、行内代码、链接地址和 HTML 不参与检查，所以参数名叫 `--seamless` 没问题。放在引号里的词（比如「赋能」）是在被讨论而不是被使用，也会跳过。

`--fix` 只做在任何句子里都正确的修改：不会删掉句首的词，也不会碰代码。连续运行两次，第二次不会再有改动。其余问题需要人来改，或者交给 [Claude Code skill](#claude-code-skill)。

## 评分

每处问题计分：warn 3 分，info 1 分；超长段落和过多的破折号按超出程度加分。最终分数是按字数折算的密度，0 到 100，所以 README 写得长不会因为长而扣分。

| 分数 | 评级 |
| --- | --- |
| 0 – 9 | A |
| 10 – 24 | B |
| 25 – 44 | C |
| 45 – 69 | D |
| 70 – 100 | F |

作为参照，ripgrep 的 README 得 3 分，[`examples/`](examples) 里的两个示例都是 100 分。

生成自己的徽章：

```sh
npx dontreadme-cli --badge
```

## 规则从哪来

每条规则都能追溯到下面的来源，对应上表的“依据”一列，[`src/rules/phrases.ts`](src/rules/phrases.ts) 里每个短语旁边也有标注：

- K 是 [Kobak 等 2025](https://www.science.org/doi/full/10.1126/sciadv.adt3813)，发表在 Science Advances，研究 PubMed 摘要里的超额词汇。按[作者公开的 PubMed 词频数据](https://github.com/berenslab/llm-excess-vocab)计算，2024 年含 `delves` 的摘要比例是 2022 年的 48 倍，`showcasing` 和 `underscores` 是 14 倍，`meticulously` 是 10 倍。`ai-vocab` 只收倍率约 2.5 以上、且在 README 里会出现的风格词。
- W 是 Wikipedia 的 [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)（WikiProject AI Cleanup 整理的识别指南），参考了 [blader/humanizer](https://github.com/blader/humanizer) 和 [sloptrim](https://github.com/seyedehsanhadi/sloptrim) 的整理。
- Z 是 [lieflat-less-ai-tone](https://github.com/larashero3-dotcom/lieflat-less-ai-tone) 的中文语料实测：300 篇 AI 文章对 329 篇人写文章，共 283 万字，只有 AI 用量达到人类 2 倍以上的句式才算数。一些“感觉很像 AI”但没通过实测的中文句式，这里没有收。

其余几条规则针对 README 本身：读者第一屏需要看到什么，以及能多快扫完。

单独一处命中不能证明 README 是 AI 写的。指南里的原则同样适用：要看多处特征是否同时出现，所以分数统计的是密度，不看单次命中。调规则之前，先拿人写的 README（ripgrep、bat、fd、fzf、jq、uv、gh、chalk、xsv）跑过一遍，结果全部是 A 或 B。

## GitHub Action

在 PR 里逐行标注问题，并把分数表写进 job summary。

```yaml
name: README
on: [pull_request]
jobs:
  dontreadme:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: hiyufan/dontreadme@v0
        with:
          files: README.md README.zh-CN.md
          max-score: 25        # 超过就失败；留空则只标注
          lang: zh
```

## 选项

```text
npx dontreadme-cli [文件...]

--fix                 就地改写文件
--stdout              配合 --fix，打印结果而不写回文件
--format <格式>       pretty（默认）、json、github
--max-score <n>       任一文件超过 n 分时退出码为 1
--badge               打印 README 徽章
--rules               列出所有规则
--config <路径>       配置文件（默认向上查找 .dontreadmerc.json）
--lang <en|zh>        提示语言
```

`-` 表示从标准输入读取。退出码：0 正常，1 超过 `--max-score`，2 用法或文件错误。

## 配置

`.dontreadmerc.json`，从被检查文件所在目录向上查找：

```json
{
  "rules": { "badge-wall": "off", "long-paragraph": "info" },
  "allow": ["一站式"],
  "maxScore": 25
}
```

也可以直接写在 Markdown 里：

```md
<!-- dontreadme-disable-next-line hype -->
这台激光器功率强大的原因是……

<!-- dontreadme-disable em-dash -->
```

不写规则名则关闭全部规则。

## 作为库使用

```js
import { lint, fix } from "dontreadme-cli";

const { score, grade, findings } = lint(markdown);
const { text } = fix(markdown);
```

各模块如何配合见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 参与贡献

新增一个短语只需要一行数据加一个测试，见 [CONTRIBUTING.md](CONTRIBUTING.md)。最有用的 issue 是“写得没问题却被标出来了”。

## 许可证

MIT
