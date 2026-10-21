# dontreadme

<p>
  <a href="https://www.npmjs.com/package/dontreadme-cli"><img src="https://img.shields.io/npm/v/dontreadme-cli?color=5af78e&label=npm" alt="npm version"></a>
  <a href="https://github.com/hiyufan/dontreadme/actions/workflows/ci.yml"><img src="https://github.com/hiyufan/dontreadme/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/dependencies-0-57c7ff" alt="zero dependencies">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/hiyufan/dontreadme?color=a9abb8" alt="MIT license"></a>
</p>

<b>English</b> · <a href="README.zh-CN.md">简体中文</a>

A skill that makes your agent rewrite a README so it stops sounding generated. It checks the file with a built-in linter, applies the safe fixes, rewrites the rest using facts from your repository, and checks again. English and Chinese.

**Before** (from [`examples/slop.md`](examples/slop.md), grade F):

<!-- dontreadme-disable-next-line -->
> In today's fast-paced digital landscape, developers need tools that keep up. FluxDB is not just another database — it's a complete reimagining of how data should flow through your application. Whether you're a solo hacker or an enterprise team, FluxDB seamlessly adapts to your workflow, empowering you to build robust, scalable applications with ease.

**After** (an example rewrite, grade A, using only facts stated elsewhere in that file):

> FluxDB is a key-value store with sub-millisecond reads, encryption at rest and in transit, and a plugin system. It deploys to AWS, GCP and Azure.

## Install

Claude Code:

```text
/plugin marketplace add hiyufan/dontreadme
/plugin install dontreadme@dontreadme
```

Codex, Cursor, Gemini CLI and other agents:

```sh
npx skills add hiyufan/dontreadme
```

Claude.ai and Claude Desktop: download this repository as a ZIP (**Code → Download ZIP**) and upload it in **Settings → Capabilities → Skills**.

## Use

Ask in plain language:

```text
Clean up the README.
帮我把 README 的 AI 味去掉。
```

Or call it directly with `/dontreadme`. The agent reports the score before and after, what it changed, and anything it left on purpose. It never invents numbers: a claim with no fact behind it in the repository is cut, not replaced.

The linter inside the skill runs on Node 18 or newer with no install. Without Node, the agent works from the checklist in [`SKILL.md`](SKILL.md) instead.

## Command line and CI

The same linter is on npm for terminals and pipelines:

```sh
npx dontreadme-cli            # checks ./README.md
npx dontreadme-cli --fix      # applies the fixes that need no judgment
```

```text
examples/slop.md
   3:5   warn  “blazing-fast” is a claim, not a fact. Show a number or an example, or cut it.  hype
   5:4   info  Emoji in a heading. Plain headings read and link better. ✎  emoji-headings
   7:85  warn  “is not just”: the “not just X” setup is the most recognisable AI tic. Say what it is.  not-just
   7:114 warn  4 em dashes in 217 words. Use a full stop, a comma or a colon for most of them.  em-dash
   7:439 info  “utilizes” → “uses”. ✎  wordy
  11:1   warn  5 “**Name**: description” bullets. That is a table; readers scan a column faster than a list. ✎  bold-list
  …

  slop score 100/100 · grade F · 53 findings · 16 fixable with --fix
```

Messages follow your system locale (`--lang en|zh` to override). See [Options](#options), the [GitHub Action](#github-action) and [Configuration](#configuration).

## Rules

| Rule | Flags | `--fix` | Source |
| --- | --- | --- | --- |
| `chatbot` | Chat leftovers: `I hope this helps`, `Certainly!`, `as of my last training update`, `[Your Name]`, `utm_source=chatgpt.com` links, `以下是为你生成的` | | W |
| `hype` | Claims without evidence: `blazing fast`, `cutting-edge`, `plays a pivotal role`, `stands as a testament`, `一站式`, `赋能`, `至关重要` | | W |
| `filler` | Phrases a sentence works without: `In today's fast-paced world`, `Let's dive in`, `It's worth noting that`, `说白了`, `核心是：` | | W, Z |
| `not-just` | `It's not just X, it's Y`, `not only … but also`, `不是……而是……`, `与其说……不如说` | | W, Z |
| `ai-vocab` | Words whose use jumped after ChatGPT: `delve`, `showcase`, `underscore`, `intricate`, `meticulous`, `realm`, `tapestry` | | K, W |
| `ing-tail` | `…, underscoring its importance` tacked onto a fact | | W |
| `wordy` | `in order to`, `utilize`, `serves as`, `a wide range of`, `能够`, `进行优化` | ✓ | W |
| `bold-list` | Three or more `- **Name**: description` bullets | ✓ becomes a table | W |
| `emoji-bullets` | Lists where every item starts with an emoji | ✓ | W |
| `emoji-headings` | Two or more headings with emoji | ✓ | W |
| `numbered-headings` | Three or more Chinese headings numbered `一、二、三、` | ✓ | Z |
| `title-case` | Most headings In Title Case | | W |
| `generic-heading` | Overview, Introduction, Key Features, Why Choose X, Conclusion, 总结 | | W |
| `long-paragraph` | Paragraphs over 80 words (160 Chinese characters) | | |
| `em-dash` | More than one em dash (`—` or `——`) per 150 words | | W, Z |
| `bold-overuse` | More than one bold phrase per 60 words | | W |
| `exclamation` | `!` at the end of prose sentences | ✓ | |
| `badge-wall` | More than 6 badges | | |
| `late-quickstart` | No shell command in the first 40 lines | | |
| `no-intro` | Nothing under the title says what the project is | | |
| `no-install` | No install command or install section | | |
| `no-usage` | No usage example beyond the install line | | |
| `no-demo` | No screenshot, GIF or recording (note) | | |
| `no-license` | No license mentioned (note) | | |
| `no-toc` | 8+ sections and 1500+ words without a table of contents (note) | | |

The `no-` rules only run on files named `README*`. They say what is missing; the skill fills it from the repository and never invents it.

Code blocks, inline code, URLs and HTML are never checked, so `--seamless` as a flag name is fine. A phrase inside quotation marks is being talked about, not used, so it is skipped too.

`--fix` only makes changes that are right in every sentence a pattern can match. It will not delete a word that starts a sentence, and it never touches code. Run it twice and nothing changes the second time. Everything else needs a person, or the [Claude Code skill](#claude-code-skill).

## Score

Each finding adds points: 3 for a warning, 1 for a note, more for a paragraph that runs far over the limit or a dash count far over the allowance. The score is points per word, from 0 to 100, so a long README is not penalised for length.

| Score | Grade |
| --- | --- |
| 0 – 9 | A |
| 10 – 24 | B |
| 25 – 44 | C |
| 45 – 69 | D |
| 70 – 100 | F |

For calibration, the ripgrep README scores 3. The two files in [`examples/`](examples) score 100.

Show yours:

```sh
npx dontreadme-cli --badge
```

## Where the rules come from

Every pattern is traceable to one of these, marked in the Source column above and next to each pattern in [`src/rules/phrases.ts`](src/rules/phrases.ts):

- K is [Kobak et al. 2025](https://www.science.org/doi/full/10.1126/sciadv.adt3813) in Science Advances, a study of excess vocabulary in PubMed abstracts. From [their published PubMed counts](https://github.com/berenslab/llm-excess-vocab), `delves` appears in 48× as many abstracts in 2024 as in 2022, `showcasing` and `underscores` 14×, `meticulously` 10×. `ai-vocab` keeps the style words with a ratio of about 2.5 or more that also show up in READMEs.
- W is Wikipedia's [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), the field guide of WikiProject AI Cleanup, as catalogued by [blader/humanizer](https://github.com/blader/humanizer) and [sloptrim](https://github.com/seyedehsanhadi/sloptrim).
- Z is [lieflat-less-ai-tone](https://github.com/larashero3-dotcom/lieflat-less-ai-tone), which compared 300 AI-written and 329 human Chinese articles (2.8 million characters) and kept a pattern only when models used it at least twice as often as people. Several Chinese patterns that feel like AI writing did not pass that test and are not here.

The other rules are about READMEs specifically: what a reader needs on the first screen and how fast they can scan it.

No single finding proves a README was generated. The guide's own advice applies: several signs together are what matter, which is why the score counts density rather than any one hit. Before tuning a rule, it was run against hand-written READMEs (ripgrep, bat, fd, fzf, jq, uv, gh, chalk, xsv): all score A or B.

## GitHub Action

Annotates the lines in the pull request and writes a score table to the job summary.

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
          files: README.md docs/*.md
          max-score: 25        # fail above this; empty to only annotate
          lang: en             # or zh
```

## Options

```text
npx dontreadme-cli [files...]

--fix                 rewrite files in place
--stdout              with --fix, print the result instead of writing
--format <fmt>        pretty (default), json, github
--max-score <n>       exit 1 when a file scores above n
--badge               print a README badge
--rules               list every rule
--config <path>       config file (default: nearest .dontreadmerc.json)
--lang <en|zh>        message language
```

`-` reads from stdin. Exit codes: 0 ok, 1 over `--max-score`, 2 usage or file error.

## Configuration

`.dontreadmerc.json`, looked up from the file's folder upwards:

```json
{
  "rules": { "badge-wall": "off", "long-paragraph": "info" },
  "allow": ["comprehensive"],
  "maxScore": 25
}
```

Or in the Markdown itself:

```md
<!-- dontreadme-disable-next-line hype -->
A robust estimator for the median.

<!-- dontreadme-disable em-dash -->
```

A disable comment with no rule names silences every rule.

## As a library

```js
import { lint, fix } from "dontreadme-cli";

const { score, grade, findings } = lint(markdown);
const { text } = fix(markdown);
```

How the pieces fit is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Contributing

New phrases are one line of data plus a test. See [CONTRIBUTING.md](CONTRIBUTING.md). Reports of good writing that got flagged are the most useful issues.

## License

MIT
