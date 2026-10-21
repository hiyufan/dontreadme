---
name: dontreadme
description: Rewrite a README (or other project docs) so it stops sounding AI-generated and has what a visitor needs (intro, install, example, license), keeping every fact. Use when the user asks to clean up, improve, de-slop, tighten, humanize or review a README, docs page or release notes, or before publishing a repository. Works on English and Chinese.
license: MIT
metadata:
  version: "0.1.0"
---

# dontreadme

Rewrite the README so a reader trusts it and can use the project: plain claims, facts from the repository, nothing that reads like a chatbot or a sales page, and the sections a visitor looks for. Keep every command, flag, number, path, link and code block. Never invent a fact to replace a claim.

## 1. Check

This skill ships a checker with no dependencies. Run it from this skill's folder with Node 18 or newer:

```sh
node <this skill's folder>/scripts/cli.js README.md --json
```

Use the user's file if it is not `README.md`. Add `--lang zh` for messages in Chinese. If Node is not available, skip to step 2 and use the table there as your checklist.

The output has a score from 0 (clean) to 100 and a grade from A to F, and a list of findings with `line`, `rule`, `message` and `text`.

## 2. Fix

First apply the fixes that need no judgment, if the checker ran:

```sh
node <this skill's folder>/scripts/cli.js README.md --fix
```

Then rewrite each remaining finding by its rule:

| Rule | What to do |
| --- | --- |
| `chatbot` | Delete it: `Certainly!`, `I hope this helps`, `Here is a README for your project`, `以下是为你生成的`. Fill or remove `[Your Name]` placeholders. Strip `utm_source=chatgpt.com` and citation markup from links. |
| `hype` | Replace the adjective with the fact behind it, found in the repository: a benchmark, a size, a count, a supported platform. If there is no fact, delete the word. `blazing fast` → `parses 1 GB in 0.8 s` (only if the repo says so). |
| `filler` | Delete the phrase and repair the sentence: `In today's fast-paced world`, `Let's dive in`, `It's worth noting that`, `说白了`, `值得注意的是`, `核心是：`. |
| `not-just` | Say what the thing is in one plain sentence. Drop the contrast: `It's not just a CLI, it's a workflow` → `A CLI that …`. `不是 A，而是 B` → `是 B`. |
| `ai-vocab` | Use the plain word: `delve into` → `look at`, `showcase` → `show`, `underscore` → `show` or cut, `leverage` → `use`, `realm` → `area`. |
| `ing-tail` | End the sentence at the fact. If the consequence matters, state it as its own sentence. |
| `wordy` | Use the shorter form the message gives. |
| `bold-list`, `emoji-bullets` | `--fix` usually turns these into a two-column table. Otherwise do it by hand. |
| `emoji-headings`, `numbered-headings`, `title-case` | Plain headings in sentence case. Drop emoji and `一、二、三、` numbering. Keep proper nouns capitalised. |
| `generic-heading` | Rename the section after what it contains, or merge it into a neighbour. Delete Overview and Conclusion sections that repeat the rest. |
| `long-paragraph` | Split it. Pull options, steps or comparisons out into a list or table. |
| `em-dash` | Replace most dashes with a full stop, comma, colon or parentheses. |
| `bold-overuse` | Keep at most one bold phrase per section. |
| `exclamation` | Use a full stop. |
| `badge-wall` | Keep version, CI and license badges. Ask before removing others. |
| `late-quickstart` | Move install and the shortest working example above the first long section. |

Then fill what the README is missing. Every addition must come from the repository: read the package manifest, the CLI's `--help`, the examples or tests, the LICENSE file. If the repository does not have it, tell the user what is missing instead of writing it.

| Rule | What to add |
| --- | --- |
| `no-intro` | One sentence under the title: what it does and for whom. Take it from the package description or the code, not from the old marketing copy. |
| `no-install` | The one command that installs or runs it, from the manifest (`package.json` name and `bin`, `pyproject.toml`, `Cargo.toml`, a Dockerfile, a release asset). |
| `no-usage` | The shortest real example and what it prints or returns. Run it if you can; copy real output, never invent it. |
| `no-demo` | Do not create an image. Tell the user a screenshot or recording would help and where to put it. If one already exists in the repository (`docs/`, `assets/`), link it near the top. |
| `no-license` | A `## License` section naming the license in the LICENSE file. If there is no LICENSE file, ask the user. |
| `no-toc` | A short list of links to the `##` sections, placed before the first one. |

## 3. Verify

Run the check again. Stop when the grade is A or B and no `no-` finding is left that the repository could answer, or when what remains is a deliberate choice. Then give the user a short summary: the score before and after, what kinds of changes you made, and any findings you left on purpose and why. Do not paste the whole README back.

## Words that are fine

The checker flags words, not meaning. `powerful` in `a powerful laser` or `robust` in `robust statistics` is correct usage. A phrase inside quotation marks is a mention, not a use. When a flagged word is the right word, keep it: add it to `allow` in `.dontreadmerc.json`, or put `<!-- dontreadme-disable-next-line hype -->` above the line.

## Where the rules come from

Kobak et al. 2025 (Science Advances), measured excess vocabulary in PubMed after ChatGPT; Wikipedia's "Signs of AI writing"; and a 2.8-million-character comparison of AI and human Chinese writing (lieflat-less-ai-tone). Details are in the repository README.
