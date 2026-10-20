---
name: dontreadme
description: Rewrite a README so it stops sounding generated. Use when the user asks to clean up, de-slop, tighten or review a README or other project docs, or before publishing a repository.
---

# dontreadme

`dontreadme-cli` finds the tells. You do the rewriting it cannot do safely. Never invent facts to replace a claim.

## Steps

1. Run the mechanical fixes, then get the remaining findings:

   ```sh
   npx -y dontreadme-cli README.md --fix
   npx -y dontreadme-cli README.md --json
   ```

   Use the user's file if it is not `README.md`. Pass `--lang zh` for a Chinese README.

2. Fix each remaining finding by its `rule`:

   | Rule | What to do |
   | --- | --- |
   | `hype` | Replace the adjective with the fact behind it, found in the repo: a benchmark, a size, a count, a supported platform. If there is no fact, delete the word. |
   | `filler` | Delete the phrase and repair the sentence. |
   | `not-just` | Say what the thing is in one plain sentence. Drop the contrast. |
   | `wordy` | Use the shorter form the message gives. |
   | `bold-list`, `emoji-bullets` | `--fix` usually handled these. If not, turn the list into a two-column table by hand. |
   | `emoji-headings`, `generic-heading` | Rename the section after what it contains, or merge it into a neighbour. Delete Overview and Conclusion sections that repeat the rest. |
   | `long-paragraph` | Split it. Pull options, steps or comparisons out into a list or table. |
   | `em-dash` | Replace most dashes with a full stop, comma, colon or parentheses. |
   | `exclamation` | Use a full stop. |
   | `badge-wall` | Keep version, CI and license badges. Ask before removing others. |
   | `late-quickstart` | Move install and the shortest working example above the first long section. |

3. Keep everything that is true and specific: commands, flags, numbers, file paths, links, code blocks. Do not change code blocks.

4. Run `npx -y dontreadme-cli README.md` again. Stop when the grade is A or B, or when what remains is a deliberate choice; say which findings you left and why.

5. Show the user a short summary of what changed. Do not paste the whole README back.

## Words that are fine

The linter flags words, not meaning. `powerful` in `a powerful laser` or `robust` in `robust statistics` is correct usage. When a flagged word is the right word, keep it and add it to `allow` in `.dontreadmerc.json`, or silence the line with `<!-- dontreadme-disable-next-line hype -->`.
