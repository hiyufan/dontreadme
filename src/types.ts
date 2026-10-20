export type Severity = "warn" | "info";

/** A message in both languages. The reporter picks one; rules never look at the locale. */
export interface Msg {
  en: string;
  zh: string;
}

/** Replace text[start, end) with `text`. Offsets are into the whole document. */
export interface Edit {
  start: number;
  end: number;
  text: string;
}

export type BlockKind = "frontmatter" | "heading" | "paragraph" | "list" | "quote" | "table" | "code" | "html";

export interface Block {
  kind: BlockKind;
  /** First and last line, 0-based and inclusive. */
  start: number;
  end: number;
  /** Heading level 1-6; 0 for everything else. */
  level: number;
  /** Fence info string for code blocks ("sh", "ts", ...); empty otherwise. */
  lang: string;
}

export interface Doc {
  text: string;
  lines: string[];
  /** Offset of the first character of each line. */
  lineStart: number[];
  blocks: Block[];
  /** `text` with code, URLs, HTML tags and image syntax blanked to spaces, so prose rules can regex it and keep offsets. */
  prose: string;
  /** Rough word count of the prose. A CJK character counts as half a word. */
  words: number;
  /** True when most of the prose is Chinese. */
  cjk: boolean;
}

export interface Finding {
  rule: string;
  severity: Severity;
  /** 1-based, like every editor. */
  line: number;
  col: number;
  message: Msg;
  /** Score points. Defaults to the severity's weight; rules that count (dashes, words) scale it. */
  weight?: number;
  /** The matched text, when the finding is about a phrase. `allow` in the config is checked against it. */
  text?: string;
  /** When present, applying these edits resolves the finding. */
  fix?: Edit[];
}

export interface Rule {
  id: string;
  severity: Severity;
  /** One line for --rules and the docs. */
  summary: Msg;
  check(doc: Doc): Finding[];
}

export type RuleSetting = "off" | Severity;

export interface Config {
  rules: Record<string, RuleSetting>;
  /** Phrases the author wants to keep; matched case-insensitively against a finding's text. */
  allow: string[];
  /** Fail (exit 1) when a file's slop score is above this. */
  maxScore?: number;
}

export interface Result {
  file: string;
  findings: Finding[];
  score: number;
  grade: Grade;
  words: number;
}

export type Grade = "A" | "B" | "C" | "D" | "F";
