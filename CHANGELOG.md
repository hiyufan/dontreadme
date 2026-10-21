# Changelog

## 0.1.0

First release.

- 25 rules in English and Chinese: chatbot, hype, filler, `not-just`, ai-vocab, ing-tail, wordy, bold-list, emoji-bullets, emoji-headings, numbered-headings, title-case, generic-heading, long-paragraph, em-dash, bold-overuse, exclamation, badge-wall, late-quickstart, and six README structure checks (no-intro, no-install, no-usage, no-demo, no-license, no-toc) that say what a visitor would miss.
- Patterns sourced from Kobak et al. 2025 (excess vocabulary in PubMed), Wikipedia's Signs of AI writing, and a measured Chinese corpus; see "Where the rules come from" in the README.
- Phrases inside quotation marks are treated as mentions and skipped.
- Slop score from 0 to 100 and a grade from A to F.
- `--fix` for the changes that need no judgment, including turning `**Name**: description` lists into tables.
- Output as text, JSON, or GitHub Actions annotations with a job summary.
- Ships as an agent skill first: `SKILL.md` at the root with the checker bundled in `scripts/`, so it runs with no install. Installs as a Claude Code plugin, with `npx skills add`, or as a ZIP on Claude.ai.
- The same checker on npm as `dontreadme-cli`, plus a GitHub Action.
