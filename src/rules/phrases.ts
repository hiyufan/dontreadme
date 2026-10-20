import { position } from "../markdown.js";
import type { Doc, Edit, Finding, Msg, Rule, Severity } from "../types.js";

// Phrase rules are data. Each entry is a pattern, an optional replacement, and nothing else:
// the rule supplies the message, so adding a phrase never means writing a sentence.

interface Phrase {
  re: RegExp;
  /** Replacement for --fix. "" deletes the match (and one following space). Omit when a fix needs judgment. */
  fix?: string;
}

/** English phrases get word boundaries; Chinese has no spaces, so its patterns are used as written. */
const en = (src: string, fix?: string): Phrase => ({ re: new RegExp(`\\b(?:${src.replace(/'/g, "['’]")})\\b`, "giu"), fix });
const zh = (src: string, fix?: string): Phrase => ({ re: new RegExp(src, "gu"), fix });

const HYPE: Phrase[] = [
  en("blazing(?:ly)?[- ]fast|lightning[- ]fast|insanely fast"),
  en("revolutionary|revolutioni[sz]e[sd]?|game[- ]chang(?:er|ing)|groundbreaking|paradigm[- ]shift(?:ing)?"),
  en("cutting[- ]edge|state[- ]of[- ]the[- ]art|next[- ]gen(?:eration)?|world[- ]class|best[- ]in[- ]class|enterprise[- ]grade|industry[- ]leading"),
  en("supercharge[sd]?|unleash(?:es|ed)?|empower(?:s|ed|ing)?|elevate[sd]?|turbocharge[sd]?"),
  en("seamless|effortless|robust|powerful|intuitive|comprehensive|versatile|feature[- ]rich"),
  en("delve[sd]?|tapestry|testament to|meticulous(?:ly)?|vibrant|pivotal|crucial|paramount"),
  en("unlock(?:s|ing)? the (?:full )?(?:power|potential)|harness(?:es|ing)? the power|the power of|to the next level"),
  zh("赋能|助力|一站式|极致|无缝|全方位|颠覆性?|革命性|划时代|降本增效|闭环|抓手|黑科技|神器|遥遥领先|天花板|丝滑|业界领先|前所未有|重磅|强大的"),
];

const FILLER: Phrase[] = [
  en("in today'?s (?:fast[- ]paced|digital|modern|ever[- ](?:changing|evolving)) (?:world|landscape|era)"),
  en("in the ever[- ](?:changing|evolving) (?:world|landscape) of"),
  en("look no further|say goodbye to|whether you'?re an? [\\w -]{1,40}? or"),
  en("it'?s worth (?:noting|mentioning) that|it is (?:worth noting|important to note) that|needless to say", ""),
  en("let'?s dive in|dive (?:deep )?into|buckle up|without further ado|rest assured|at the end of the day"),
  en("happy coding|we hope you enjoy|feel free to|don'?t hesitate to|embark on|navigate the complexities of"),
  en("and (?:so )?much more|designed with [\\w -]{1,30} in mind|built with love"),
  zh("值得注意的是|值得一提的是|总而言之|综上所述|让我们一起|话不多说|不仅如此|更重要的是"),
  zh("在当今(?:这个)?(?:快速发展|数字化|信息爆炸)?的?时代|随着[^。，,\\n]{1,20}的(?:快速|飞速|不断|蓬勃)发展"),
  zh("希望(?:对你|对大家|能)有(?:所)?帮助|赶快(?:试试|体验)吧"),
];

const WORDY: Phrase[] = [
  en("in order to", "to"),
  en("utilize", "use"),
  en("utilizes", "uses"),
  en("utilized", "used"),
  en("utilizing", "using"),
  en("make use of", "use"),
  en("due to the fact that", "because"),
  en("in the event that", "if"),
  en("prior to", "before"),
  en("at this point in time", "now"),
  en("for the purpose of", "for"),
  en("(?:is|are) able to", "can"),
  en("has the ability to|have the ability to", "can"),
  en("allows you to", "lets you"),
  en("a (?:wide|broad) (?:range|variety|array) of|a plethora of|a myriad of|a multitude of", "many"),
  en("simply|seamlessly|effortlessly|truly", ""),
  zh("能够", "能"),
  zh("通过使用", "用"),
  zh("进行(?:了)?(?=优化|配置|安装|部署|测试|处理|修改|调整|分析|管理|设置|更新|升级|检查|扫描|清理|转换|调用|编译|构建|验证)", ""),
];

const NOT_JUST: Phrase[] = [
  en("(?:it'?s|is|are|this is|isn'?t|aren'?t) not (?:just|only|merely)|not just (?:a|an|another)|more than just (?:a|an)"),
  zh("不(?:仅仅|只)是[^。！？\\n]{1,30}(?:更|而)是"),
];

const q = (s: string) => `“${s.trim()}”`;

function phraseRule(id: string, severity: Severity, summary: Msg, phrases: Phrase[], message: (m: string, fix?: string) => Msg): Rule {
  return {
    id,
    severity,
    summary,
    check(doc) {
      const out: Finding[] = [];
      const seen = new Set<number>();
      for (const p of phrases) {
        p.re.lastIndex = 0;
        for (const m of doc.prose.matchAll(p.re)) {
          const at = m.index ?? 0;
          if (seen.has(at)) continue;
          seen.add(at);
          const original = doc.text.slice(at, at + m[0].length);
          out.push({
            rule: id,
            severity,
            ...position(doc, at),
            message: message(original, p.fix),
            text: original,
            fix: p.fix === undefined ? undefined : replacement(doc, at, original, p.fix),
          });
        }
      }
      return out.sort((a, b) => a.line - b.line || a.col - b.col);
    },
  };
}

/** Build the edit for a phrase, or nothing when the fix would break the sentence. */
function replacement(doc: Doc, at: number, original: string, fix: string): Edit[] | undefined {
  const end = at + original.length;
  const before = doc.text.slice(0, at);
  const sentenceStart = /(^|[.!?。！？]\s*|\n\s*(?:[-*+]|\d+[.)])?\s*|\*\*)$/.test(before);
  if (fix === "") {
    // Deleting the first word of a sentence would leave the next one lowercase; that needs a person.
    if (sentenceStart || /^[A-Z]/.test(original)) return undefined;
    const trailing = doc.text[end] === " " ? 1 : 0;
    // "Fast, seamless sync" → don't leave a doubled space or a dangling comma; only delete clean words.
    if (!trailing && /[A-Za-z]/.test(original) && doc.text[at - 1] === " " && /[\s,.]/.test(doc.text[end] ?? "")) {
      return [{ start: at - 1, end, text: "" }];
    }
    return [{ start: at, end: end + trailing, text: "" }];
  }
  const cased = /^[A-Z]/.test(original) ? fix[0].toUpperCase() + fix.slice(1) : fix;
  return [{ start: at, end, text: cased }];
}

export const hype = phraseRule(
  "hype",
  "warn",
  { en: "Marketing adjectives that claim instead of show", zh: "只下结论不给证据的营销形容词" },
  HYPE,
  (m) => ({
    en: `${q(m)} is a claim, not a fact. Show a number or an example, or cut it.`,
    zh: `${q(m)} 是宣传语，不是事实。换成数字或例子，或者删掉。`,
  }),
);

export const filler = phraseRule(
  "filler",
  "warn",
  { en: "Stock phrases that add words and no information", zh: "不带信息量的套话" },
  FILLER,
  (m) => ({
    en: `${q(m)} is filler. The sentence works without it.`,
    zh: `${q(m)} 是套话，删掉句子照样成立。`,
  }),
);

export const wordy = phraseRule(
  "wordy",
  "info",
  { en: "Long ways of saying short things", zh: "能说短却说长的表达" },
  WORDY,
  (m, fix) =>
    fix
      ? { en: `${q(m)} → “${fix}”.`, zh: `${q(m)} → “${fix}”。` }
      : { en: `${q(m)} adds nothing. Delete it.`, zh: `${q(m)} 没有意义，删掉。` },
);

export const notJust = phraseRule(
  "not-just",
  "warn",
  { en: "“It's not just X, it's Y” framing", zh: "“不仅仅是 X，更是 Y” 句式" },
  NOT_JUST,
  (m) => ({
    en: `${q(m)}: the “not just X” setup is the most recognisable AI tic. Say what it is.`,
    zh: `${q(m)}：“不仅仅是……更是……” 是最典型的 AI 腔，直接说它是什么。`,
  }),
);
