# dontreadme

<p>
  <a href="https://www.npmjs.com/package/dontreadme-cli"><img src="https://img.shields.io/npm/v/dontreadme-cli?color=5af78e&label=npm" alt="npm version"></a>
  <a href="https://github.com/hiyufan/dontreadme/actions/workflows/ci.yml"><img src="https://github.com/hiyufan/dontreadme/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/dependencies-0-57c7ff" alt="zero dependencies">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/hiyufan/dontreadme?color=a9abb8" alt="MIT license"></a>
</p>

<a href="README.md">English</a> · <b>简体中文</b>

专门检查 README 里 AI 腔的 linter。它会标出宣传语、套话、`不仅仅是……更是……` 句式、本该是表格的列表、带 emoji 的标题和大段文字，给文件打分，并自动修掉不需要判断的部分。

```sh
npx dontreadme-cli            # 检查 ./README.md
npx dontreadme-cli --fix      # 就地修复能安全修复的问题
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

中英文 README 都能检查。提示语言跟随系统语言，可以用 `--lang en|zh` 指定。

## 规则

| 规则 | 检查什么 | `--fix` |
| --- | --- | --- |
| `hype` | 只下结论不给证据的形容词：`一站式`、`赋能`、`极致`、`blazing fast`、`seamless` | |
| `filler` | 删掉句子照样成立的套话：`值得注意的是`、`随着……的飞速发展`、`In today's fast-paced world` | |
| `not-just` | `不仅仅是……更是……`、`It's not just X, it's Y` | |
| `wordy` | `能够`、`通过使用`、`进行优化`、`in order to`、`utilize` | ✓ |
| `bold-list` | 三条以上 `- **名称**：说明` 格式的列表 | ✓ 改成表格 |
| `emoji-bullets` | 每一条都以 emoji 开头的列表 | ✓ |
| `emoji-headings` | 两个以上带 emoji 的标题 | ✓ |
| `generic-heading` | 简介、概述、核心特性、为什么选择 X、总结、写在最后 | |
| `long-paragraph` | 超过约 160 字（80 个英文词）的段落 | |
| `em-dash` | 每 150 词超过一个破折号 | |
| `exclamation` | 正文句末的感叹号 | ✓ |
| `badge-wall` | 超过 6 个徽章 | |
| `late-quickstart` | 前 40 行里没有命令 | |

代码块、行内代码、链接地址和 HTML 不参与检查，所以参数名叫 `--seamless` 没问题。

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

## Claude Code skill

linter 负责找问题。把 `极致性能` 改写成 `单核每秒解析 1 GB`，需要能读懂代码的人。[`skills/dontreadme`](skills/dontreadme/SKILL.md) 里的 skill 会让 agent 先跑 `--fix`，再用仓库里的真实信息逐条改写剩下的问题，然后重新检查，直到评级到 A 或 B。

```sh
mkdir -p ~/.claude/skills/dontreadme
curl -fsSL https://raw.githubusercontent.com/hiyufan/dontreadme/main/skills/dontreadme/SKILL.md -o ~/.claude/skills/dontreadme/SKILL.md
```

装好后对 Claude Code 说 “帮我清理一下 README” 就行。其他支持 `SKILL.md` 的 agent 用法相同。

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
