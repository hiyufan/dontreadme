// Library entry: everything the CLI uses, for editors, bots and other tools.
export { applyEdits, defaultConfig, fix, grade, lint, slopScore } from "./lint.js";
export { parse } from "./markdown.js";
export { rules } from "./rules/index.js";
export { findConfig, validate } from "./config.js";
export type { Config, Edit, Finding, Grade, Msg, Result, Rule, Severity } from "./types.js";
