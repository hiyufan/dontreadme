# Architecture

dontreadme is a linter with three users: a person at a terminal, a CI job, and a coding agent. They need the same findings in different shapes, so the code is a pipeline of small parts, and only the edges know who is asking.

```
 file ──► parse ──► rules ──► filter ──► score ──► report ──► stdout / annotations / JSON
            │          │                                ▲
            │          └── edits ──► fix (re-lint, ≤5 passes)
            └── Doc: lines, blocks, masked prose
```

## Modules

| File | Job | Knows about |
| --- | --- | --- |
| `src/markdown.ts` | Split Markdown into blocks, build the masked prose | Markdown only |
| `src/rules/*.ts` | Turn a `Doc` into findings | The `Doc` |
| `src/lint.ts` | Run rules, apply config and inline directives, score, fix | Rules and config |
| `src/config.ts` | Find and validate `.dontreadmerc.json` | The filesystem |
| `src/report.ts` | Format results as text, JSON, Actions annotations, a job summary, a badge | Results and the locale |
| `src/i18n.ts` | Pick English or Chinese | The environment |
| `src/cli.ts` | Arguments, files, exit codes | Everything above |
| `src/index.ts` | Library entry for other tools | |

## Decisions

**Masked prose instead of an AST.** The parser does not build a syntax tree. It copies the document and blanks out code blocks, inline code, URLs, link targets, images and HTML with spaces, keeping every newline. Prose rules run plain regular expressions on that copy, and a match offset in the copy is the same offset in the original. This is why rules are a few lines each and why fixes can point at exact characters. The parser only has to be right about one thing, what is code, and it errs towards code.

**Rules are pure.** A rule gets the parsed document and returns findings. It does not read the config, the locale or other rules. Severity overrides, `allow` lists and `<!-- dontreadme-disable -->` directives are applied afterwards in `lint.ts`. Any rule can be tested by handing it a string.

**Phrases are data.** Hype, filler and wordy phrases are lists of patterns with an optional replacement. The rule writes the message, so adding a phrase is one line and cannot produce an inconsistent message.

**Messages carry both languages.** A finding holds `{ en, zh }`. The reporter picks one at the end. Rules never branch on the locale, and JSON consumers get the language they asked for.

**Fixes are edits, applied in passes.** A finding may carry text edits (`start`, `end`, `text`). The fixer sorts all edits, applies the ones that do not overlap, re-lints and repeats, at most five times. When two fixes touch the same text, the earlier one wins and the other is recomputed against the new text in the next pass. Rules only offer a fix when it is right in every sentence the pattern can match. Anything that needs judgment is left to a person or to the [Claude Code skill](skills/dontreadme/SKILL.md).

**The score is density.** Each finding has a weight: 3 for a warning, 1 for a note, more for findings that count something (dashes beyond the allowance, words beyond the paragraph limit). The score is weighted points per word, scaled so that the ripgrep README scores 3 and the examples in `examples/` score 100. A long README is not punished for being long.

**Zero runtime dependencies.** `npx dontreadme-cli` should start in about a second on a CI runner. TypeScript and `@types/node` are the only dev dependencies.

## Adding a rule

1. Pick the file: `phrases.ts` for wording, `structure.ts` for the shape of lists and headings, `density.ts` for counts and ratios.
2. Write a `Rule` with an `id`, a default severity, a one-line summary and a `check(doc)` that returns findings with messages in both languages.
3. Register it in `src/rules/index.ts`.
4. Test a match and a near miss in `test/lint.test.js`. If it has a fix, the "fix is idempotent" test must still pass.
