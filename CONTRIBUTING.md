# Contributing

```sh
git clone https://github.com/hiyufan/dontreadme && cd dontreadme
npm install
npm test                                  # builds, then runs node:test
node dist/cli.js examples/slop.md         # see every rule fire
```

Read [ARCHITECTURE.md](ARCHITECTURE.md) first. It is short.

## Adding a phrase

Phrases live in `src/rules/phrases.ts` as data. Add a pattern to the right list (`HYPE`, `FILLER`, `WORDY`, `NOT_JUST`) and a line in `test/lint.test.js` with one text that must match and one near miss that must not.

A phrase belongs here only if it is common in generated READMEs **and** a plain rewrite exists. Add a `fix` only when the replacement is right in every sentence the pattern can match.

## Adding a rule

Write a `Rule` in `src/rules/structure.ts` (shape of the document) or `src/rules/density.ts` (counts and ratios), register it in `src/rules/index.ts`, and add its message in English and Chinese. Rules are pure functions of the parsed document: no config, no I/O, no other rules.

## Style

TypeScript, zero runtime dependencies. This repository's own READMEs must pass `--max-score 10`; CI checks it.
