import { position } from "../markdown.js";
/** English phrases get word boundaries; Chinese has no spaces, so its patterns are used as written. */
const en = (src, fix) => ({ re: new RegExp(`\\b(?:${src.replace(/'/g, "['’]")})\\b`, "giu"), fix });
const zh = (src, fix) => ({ re: new RegExp(src, "gu"), fix });
// Sources, so a pattern can be traced and argued with:
//   [K]  Kobak et al. 2025, "Delving into LLM-assisted writing in biomedical publications through excess
//        vocabulary", Science Advances 11(27). Style words whose share of PubMed abstracts jumped from
//        2022 to 2024; the ratio r = 2024 share / 2022 share is computed from their published counts.
//   [W]  Wikipedia: Signs of AI writing (WikiProject AI Cleanup), as catalogued by blader/humanizer
//        and seyedehsanhadi/sloptrim.
//   [Z]  larashero3-dotcom/lieflat-less-ai-tone: 300 AI vs 329 human Chinese articles, 2.8M characters.
//        A pattern is used only where the AI rate is at least 2x the human rate.
/** Marketing and inflated significance: the sentence claims something it does not show. */
const HYPE = [
    en("blazing(?:ly)?[- ]fast|lightning[- ]fast|insanely fast"),
    en("revolutionary|revolutioni[sz](?:e[sd]?|ing)|game[- ]chang(?:er|ing)|groundbreaking|paradigm[- ]shift(?:ing)?"),
    en("cutting[- ]edge|bleeding[- ]edge|state[- ]of[- ]the[- ]art|next[- ]gen(?:eration)?|world[- ]class|best[- ]in[- ]class|best[- ]of[- ]breed|enterprise[- ]grade|industry[- ]leading|top[- ]tier|unparalleled|unprecedented|future[- ]proof"),
    en("supercharge[sd]?|unleash(?:es|ed)?|empower(?:s|ed|ing)?|elevate[sd]?|turbocharge[sd]?|skyrocket(?:s|ed|ing)?"),
    en("seamless|effortless|robust|powerful|intuitive|comprehensive|versatile|feature[- ]rich|simple yet (?:powerful|effective|elegant)"),
    en("unlock(?:s|ing)? (?:the |your |its )?(?:full )?(?:power|potential)|unlock(?:s|ing)? (?:new|endless) possibilities|harness(?:es|ing)? the power of|to the next level|like never before"),
    // [W] inflated significance
    en("stands? as an? (?:testament|reminder|symbol|beacon|cornerstone|hallmark)|a testament to|plays? an? (?:crucial|pivotal|vital|key|central) role|sets? the stage for|paves? the way for|an indelible mark|marks? a (?:turning point|milestone|new era)"),
    en("the future (?:looks|is) bright|exciting times (?:lie )?ahead|stay(?:s|ing)? ahead of the curve|from startups to enterprises|the ultimate (?:tool|solution|toolkit|companion) for|we(?:'re| are) (?:excited|thrilled|proud) to (?:announce|introduce|share)"),
    zh("赋能|助力|一站式|极致|无缝|全方位|颠覆性?|革命性|划时代|降本增效|闭环(?!控制|系统|反馈|回路)|抓手|黑科技|神器|遥遥领先|天花板|丝滑|业界领先|前所未有|史无前例|重磅|强大的"),
    zh("至关重要|举足轻重|令人瞩目|令人惊叹|意义非凡|毋庸置疑|不可磨灭|不可或缺|范式转移|底层逻辑|顶层设计|深远的?影响|发挥着?(?:关键|重要)作用"),
];
/** [K][W] Words that models use far more than people do. Fine once; a cluster reads as generated. */
const AI_VOCAB = [
    en("delv(?:e|es|ed|ing)|showcas(?:e|es|ed|ing)|underscor(?:e|es|ed|ing)|meticulous(?:ly)?|intricac(?:y|ies)|intricate(?:ly)?"),
    en("garner(?:s|ed|ing)?|bolster(?:s|ed|ing)?|foster(?:s|ed|ing)?|encompass(?:es|ed|ing)?|leverag(?:es|ed|ing)|elucidat(?:e|es|ed|ing)|encapsulat(?:e|es|ed|ing)|unravel(?:s|ed|ing)?"),
    en("tapestry|testament|realms?|endeavou?rs?|groundwork|interplay|multifaceted|nuanced|pivotal|crucial|paramount|commendable|formidable|transformative|renowned|vibrant|enduring"),
    en("notably|additionally"),
    en("aligns? with|navigat(?:e|es|ing) the (?:complexities|landscape|world) of|the (?:\\w+ )?landscape of"),
];
/** Phrases a sentence works without, including the ones that announce a point instead of making it. */
const FILLER = [
    en("in today'?s (?:[\\w-]+ ){0,2}(?:world|landscape|era|environment)|in the ever[- ](?:changing|evolving) (?:world|landscape) of|in a world where|in an era of|in an increasingly (?:digital|connected|interconnected|complex|competitive) world|more (?:important )?than ever before"),
    en("look no further|say goodbye to|whether you'?re an? [\\w -]{1,40}? or|imagine a world where|ever (?:wanted|wondered) (?:to|how|why|if)"),
    en("it'?s worth (?:noting|mentioning) that|it is (?:worth noting|important to note) that|needless to say|it should be (?:noted|mentioned) that|it bears mentioning that", ""),
    en("it'?s important to (?:remember|note|understand)|it cannot be overstated|it is important to (?:remember|understand)"),
    en("let'?s (?:dive|delve|jump) (?:in|into)|let'?s (?:explore|break (?:it|this) down)|dive (?:deep )?into|deep dive|here'?s what you need to know|buckle up|without further ado|rest assured|at the end of the day"),
    en("here'?s the thing|the truth is|make no mistake|at its core|the real question is|the bottom line is|when all is said and done"),
    en("happy coding|we hope you enjoy|feel free to|don'?t hesitate to|embark on|and (?:so )?much more|designed with [\\w -]{1,30} in mind|built with love"),
    en("experts (?:agree|argue|believe|say)|industry (?:experts|reports|observers)|studies (?:show|suggest)|it is widely (?:believed|accepted)"),
    zh("值得注意的是|值得一提的是|需要指出的是|不可否认的是|众所周知|不难发现|不得不说|毫不夸张地说|总而言之|综上所述|话不多说|不仅如此|更重要的是"),
    zh("让我们一起(?:来)?(?:看看|探索|开始)?|接下来(?:我们|我)?将(?:为你|为大家|带你)|在当今(?:这个)?(?:快速发展|数字化|信息爆炸)?的?(?:时代|社会)|随着[^。，,\\n]{1,20}的(?:快速|飞速|不断|蓬勃)发展"),
    zh("希望(?:对你|对大家|能)有(?:所)?帮助|赶快(?:试试|体验)吧|欢迎(?:大家)?(?:Star|star|点赞|收藏)"),
    // [Z] 起手式 3.2x, 提示性冒号 3.8x
    zh("说白了|说穿了|先说结论"),
    zh("(?:一句话(?:总结|概括)|简单(?:来)?说|总结一下|核心(?:是|在于)|关键(?:是|在于)|本质(?:是|上)|答案是|换句话说|也就是说)[：:]"),
];
/** Text that only makes sense in a chat window: greetings, offers, disclaimers, unfilled slots. */
const CHATBOT = [
    en("I hope this helps|let me know if you(?:'d| would)? (?:like|want|need)|would you like me to|great question|you'?re absolutely right|happy to help"),
    en("here(?: is|'?s) (?:a|an|the|your) (?:\\w+ ){0,3}(?:README|readme|overview|summary|draft|version|rewrite)(?: for| of)?(?: your)?"),
    en("as an? (?:AI|AI language model|large language model|language model)|as of my (?:last |latest )?(?:training|knowledge)(?: (?:update|cutoff))?|up to my (?:last )?(?:training|knowledge)|based on (?:the )?available information"),
    { re: /\b(?:certainly|of course|absolutely)!(?=\s|$)/gimu },
    { re: /\[(?:your|insert|add|enter|todo|tbd)\b[^\]\n]{0,40}\]|\[(?:project|company|repo(?:sitory)?|author|user)[ _-]?name\]|\{\{ ?[a-z_]+ ?\}\}/giu },
    zh("希望(?:这|以上)(?:些)?(?:内容|回答|信息)?(?:能)?(?:对你)?有(?:所)?帮助|如果你(?:还)?(?:有|需要)(?:任何|其他)?(?:问题|帮助)|以下是(?:为你|为您)?(?:生成|撰写|整理)?的|作为(?:一个)?(?:AI|人工智能)(?:语言模型|助手)?"),
];
const WORDY = [
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
    // [W] copula avoidance
    en("serves as|stands as|functions as", "is"),
    en("boasts", "has"),
    en("simply|seamlessly|effortlessly|truly", ""),
    zh("能够", "能"),
    zh("通过使用", "用"),
    zh("进行(?:了)?(?=优化|配置|安装|部署|测试|处理|修改|调整|分析|管理|设置|更新|升级|检查|扫描|清理|转换|调用|编译|构建|验证)", ""),
    // [Z] 翻译腔 2.6-5.3x
    zh("这意味着|对于[^，。\\n]{2,15}来说|对[^，。\\n]{2,15}而言"),
];
/** Setting up a claim nobody made in order to knock it down. [W] most frequent tell; [Z] 翻案腔 3.4x. */
const NOT_JUST = [
    en("(?:it'?s|is|are|this is|isn'?t|aren'?t) not (?:just|only|merely)|not just (?:a|an|another)|more than just (?:a|an)|not only [^.\\n]{2,40}? but(?: also)?|(?:doesn'?t|don'?t) just [^.,\\n]{2,30}?,? (?:it|they) "),
    { re: /, no (?:guessing|hassle|fluff|stress|jargon|bloat|nonsense|BS)\b/giu },
    zh("不(?:仅仅|只)是[^。！？\\n]{1,30}(?:更|而|也)是"),
    zh("(?:不是|并非|并不是)[^。！？\\n]{1,30}[，,]\\s*(?:而是|是)|不在于[^。！？\\n]{1,30}而在于|与其说[^。！？\\n]{1,30}不如说|看似[^。！？\\n]{1,30}(?:实则|其实)|你以为[^。！？\\n]{1,30}其实"),
];
/** [W] An -ing clause bolted onto a fact to make it sound deeper. */
const ING_TAIL = [
    { re: /, (?:underscoring|showcasing|emphasizing|reflecting|symbolizing|fostering|cementing|solidifying|reinforcing|demonstrating|signaling|paving)\b/giu },
];
const q = (s) => `“${s.trim()}”`;
function phraseRule(id, severity, summary, phrases, message) {
    return {
        id,
        severity,
        summary,
        check(doc) {
            const hits = [];
            for (const p of phrases)
                for (const m of doc.prose.matchAll(p.re))
                    hits.push({ at: m.index ?? 0, len: m[0].length, p });
            // When two patterns of one rule cover the same words, report the first, longest match once.
            hits.sort((a, b) => a.at - b.at || b.len - a.len);
            const out = [];
            let covered = -1;
            for (const { at, len, p } of hits) {
                if (at < covered || mentioned(doc.text, at, len))
                    continue;
                covered = at + len;
                const original = doc.text.slice(at, at + len);
                out.push({
                    rule: id,
                    severity,
                    ...position(doc, at),
                    message: message(original, p.fix),
                    text: original,
                    fix: p.fix === undefined ? undefined : replacement(doc, at, original, p.fix),
                });
            }
            return out.sort((a, b) => a.line - b.line || a.col - b.col);
        },
    };
}
const OPEN = "“\"'‘「『《（";
const CLOSE = "”\"'’」』》）";
/** “robust”, 「赋能」, (说白了): the phrase is being talked about, not used. Wikipedia's guide says to leave those alone. */
function mentioned(text, at, len) {
    const i = OPEN.indexOf(text[at - 1] ?? "");
    if (i < 0)
        return false;
    const close = text.indexOf(CLOSE[i], at + len);
    return close >= 0 && close - (at + len) <= 12 && !text.slice(at + len, close).includes("\n");
}
/** Build the edit for a phrase, or nothing when the fix would break the sentence. */
function replacement(doc, at, original, fix) {
    const end = at + original.length;
    const before = doc.text.slice(0, at);
    const sentenceStart = /(^|[.!?。！？]\s*|\n\s*(?:[-*+]|\d+[.)])?\s*|\*\*)$/.test(before);
    if (fix === "") {
        // Deleting the first word of a sentence would leave the next one lowercase; that needs a person.
        if (sentenceStart || /^[A-Z]/.test(original))
            return undefined;
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
export const hype = phraseRule("hype", "warn", { en: "Marketing adjectives that claim instead of show", zh: "只下结论不给证据的营销形容词" }, HYPE, (m) => ({
    en: `${q(m)} is a claim, not a fact. Show a number or an example, or cut it.`,
    zh: `${q(m)} 是宣传语，不是事实。换成数字或例子，或者删掉。`,
}));
export const filler = phraseRule("filler", "warn", { en: "Stock phrases that add words and no information", zh: "不带信息量的套话" }, FILLER, (m) => ({
    en: `${q(m)} is filler. The sentence works without it.`,
    zh: `${q(m)} 是套话，删掉句子照样成立。`,
}));
export const wordy = phraseRule("wordy", "info", { en: "Long ways of saying short things", zh: "能说短却说长的表达" }, WORDY, (m, fix) => fix
    ? { en: `${q(m)} → “${fix}”.`, zh: `${q(m)} → “${fix}”。` }
    : { en: `${q(m)} adds nothing. Delete it.`, zh: `${q(m)} 没有意义，删掉。` });
export const notJust = phraseRule("not-just", "warn", { en: "“It's not just X, it's Y” framing", zh: "“不仅仅是 X，更是 Y” 句式" }, NOT_JUST, (m) => ({
    en: `${q(m)}: the “not just X” setup is the most recognisable AI tic. Say what it is.`,
    zh: `${q(m)}：“不仅仅是……更是……” 是最典型的 AI 腔，直接说它是什么。`,
}));
export const aiVocab = phraseRule("ai-vocab", "info", { en: "Words whose use jumped after ChatGPT (delve, showcase, underscore, …)", zh: "ChatGPT 之后使用率暴涨的英文词（delve、showcase、underscore……）" }, AI_VOCAB, (m) => ({
    en: `${q(m)} is one of the words models overuse. One is fine; several read as generated. Use a plainer word.`,
    zh: `${q(m)} 是模型过度使用的词。偶尔一个没关系，扎堆出现就像机器写的。换个朴素的词。`,
}));
const CHAT_ARTIFACTS = /utm_source=(?:chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)|:contentReference\[oaicite:\d+\]\{[^}]*\}|【\d+†[^】]*】|\bturn\d+(?:search|view|news)\d+\b/g;
const chatbotPhrases = phraseRule("chatbot", "warn", { en: "Leftovers from a chat: greetings, offers, disclaimers, unfilled [placeholders]", zh: "聊天残留：客套话、追问、免责声明、没填的占位符" }, CHATBOT, (m) => ({
    en: `${q(m)} is chat residue. A README talks to its reader, not to the person who prompted it.`,
    zh: `${q(m)} 是聊天残留。README 是写给读者的，不是回复提问的人。`,
}));
/** Inside a code block or an inline code span, where text is an example, not a leftover. */
function inCode(doc, offset) {
    const { line } = position(doc, offset);
    if (doc.blocks.some((b) => b.kind === "code" && b.start <= line - 1 && line - 1 <= b.end))
        return true;
    return ((doc.text.slice(doc.lineStart[line - 1], offset).match(/`/g)?.length ?? 0) & 1) === 1;
}
export const chatbot = {
    ...chatbotPhrases,
    check(doc) {
        // Citation markup and tracking parameters live in links, which the prose mask hides, so read the raw text.
        const raw = [...doc.text.matchAll(CHAT_ARTIFACTS)].filter((m) => !inCode(doc, m.index ?? 0)).map((m) => ({
            rule: "chatbot",
            severity: "warn",
            ...position(doc, m.index ?? 0),
            message: {
                en: `${q(m[0])} was pasted from a chatbot answer. Remove it.`,
                zh: `${q(m[0])} 是从聊天机器人回答里复制来的，删掉。`,
            },
            text: m[0],
        }));
        return [...chatbotPhrases.check(doc), ...raw].sort((a, b) => a.line - b.line || a.col - b.col);
    },
};
export const ingTail = phraseRule("ing-tail", "info", { en: "“…, underscoring its importance” clauses tacked onto a fact", zh: "英文句尾附加的 “, underscoring …” 分词短语" }, ING_TAIL, (m) => ({
    en: `${q(m)} tacks a meaning onto the fact before it. End the sentence at the fact, or state the consequence plainly.`,
    zh: `${q(m)} 给前面的事实硬加一层意义。句子在事实处结束，或者直接说后果。`,
}));
