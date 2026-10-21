import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { defaultConfig } from "./lint.js";
import { rules } from "./rules/index.js";
export const CONFIG_FILE = ".dontreadmerc.json";
/** Nearest .dontreadmerc.json from `dir` up to the filesystem root, or the defaults. */
export function findConfig(dir) {
    for (let d = resolve(dir);; d = dirname(d)) {
        const p = join(d, CONFIG_FILE);
        if (existsSync(p))
            return { config: readConfig(p), path: p };
        if (dirname(d) === d)
            return { config: defaultConfig() };
    }
}
export function readConfig(path) {
    let raw;
    try {
        raw = JSON.parse(readFileSync(path, "utf8"));
    }
    catch (e) {
        throw new Error(`${path}: ${e.message}`);
    }
    return validate(raw, path);
}
export function validate(raw, where = CONFIG_FILE) {
    const c = defaultConfig();
    if (typeof raw !== "object" || raw === null || Array.isArray(raw))
        throw new Error(`${where}: expected a JSON object`);
    const o = raw;
    const ids = new Set(rules.map((r) => r.id));
    if (o.rules !== undefined) {
        if (typeof o.rules !== "object" || o.rules === null)
            throw new Error(`${where}: "rules" must be an object`);
        for (const [id, v] of Object.entries(o.rules)) {
            if (!ids.has(id))
                throw new Error(`${where}: unknown rule "${id}"`);
            if (v !== "off" && v !== "warn" && v !== "info")
                throw new Error(`${where}: rule "${id}" must be "off", "warn" or "info"`);
            c.rules[id] = v;
        }
    }
    if (o.allow !== undefined) {
        if (!Array.isArray(o.allow) || o.allow.some((a) => typeof a !== "string"))
            throw new Error(`${where}: "allow" must be a list of strings`);
        c.allow = o.allow;
    }
    if (o.maxScore !== undefined) {
        if (typeof o.maxScore !== "number" || o.maxScore < 0 || o.maxScore > 100)
            throw new Error(`${where}: "maxScore" must be 0-100`);
        c.maxScore = o.maxScore;
    }
    return c;
}
