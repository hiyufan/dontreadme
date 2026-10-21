#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findConfig, readConfig } from "./config.js";
import { setLang, t } from "./i18n.js";
import { fix, lint } from "./lint.js";
import { badge, github, json, pretty, ruleList, summary } from "./report.js";
export function parseArgs(argv) {
    const a = { files: [], fix: false, stdout: false, format: "pretty", badge: false, rules: false, help: false, version: false };
    // Settle the language first so --help and errors come out in it whatever the order.
    const li = argv.indexOf("--lang");
    if (li >= 0 && (argv[li + 1] === "en" || argv[li + 1] === "zh"))
        setLang(argv[li + 1]);
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const val = () => {
            const v = argv[++i];
            if (v === undefined)
                throw new Error(`${arg} needs a value`);
            return v;
        };
        switch (arg) {
            case "--fix":
                a.fix = true;
                break;
            case "--stdout":
                a.stdout = true;
                break;
            case "--format": {
                const f = val();
                if (f !== "pretty" && f !== "json" && f !== "github")
                    throw new Error("--format must be pretty, json or github");
                a.format = f;
                break;
            }
            case "--json":
                a.format = "json";
                break;
            case "--max-score": {
                const n = Number(val());
                if (!Number.isFinite(n) || n < 0 || n > 100)
                    throw new Error("--max-score must be 0-100");
                a.maxScore = n;
                break;
            }
            case "--badge":
                a.badge = true;
                break;
            case "--rules":
                a.rules = true;
                break;
            case "--config":
                a.config = val();
                break;
            case "--lang": {
                const l = val();
                if (l !== "en" && l !== "zh")
                    throw new Error("--lang must be en or zh");
                break;
            }
            case "-h":
            case "--help":
                a.help = true;
                break;
            case "-v":
            case "--version":
                a.version = true;
                break;
            default:
                if (arg.startsWith("-") && arg !== "-")
                    throw new Error(`unknown option: ${arg}`);
                a.files.push(arg);
        }
    }
    return a;
}
function read(file) {
    return file === "-" ? readFileSync(0, "utf8") : readFileSync(file, "utf8");
}
export function main(argv, cwd = process.cwd(), env = process.env) {
    let args;
    try {
        args = parseArgs(argv);
    }
    catch (e) {
        console.error(`dontreadme: ${e.message}`);
        return 2;
    }
    if (args.help)
        return console.log(t.help()), 0;
    if (args.version) {
        // package.json sits next to dist/ in the npm package and next to scripts/ in the skill.
        let version = "unknown";
        try {
            version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
        }
        catch { }
        return console.log(version), 0;
    }
    if (args.rules)
        return console.log(ruleList()), 0;
    const files = args.files.length ? args.files : ["README.md"];
    if (!args.files.length && !existsSync(resolve(cwd, "README.md"))) {
        console.error(`dontreadme: ${t.noReadme()}`);
        return 2;
    }
    let exit = 0;
    const results = [];
    for (const file of files) {
        const path = file === "-" ? file : resolve(cwd, file);
        if (path !== "-" && !existsSync(path)) {
            console.error(`dontreadme: ${t.notFound(file)}`);
            exit = 2;
            continue;
        }
        let config;
        try {
            config = args.config ? readConfig(resolve(cwd, args.config)) : findConfig(path === "-" ? cwd : dirname(path)).config;
        }
        catch (e) {
            console.error(`dontreadme: ${e.message}`);
            return 2;
        }
        const name = path === "-" ? "<stdin>" : relative(cwd, path) || file;
        let text = read(path);
        // Only a README is expected to have install steps, a demo and a license.
        const readme = path === "-" || /^readme/i.test(basename(path));
        if (args.fix) {
            const r = fix(text, config, { readme });
            if (args.stdout) {
                process.stdout.write(r.text);
                continue;
            }
            if (r.fixed && path !== "-")
                writeFileSync(path, r.text);
            console.error(r.fixed ? t.fixed(name, r.fixed) : t.nothingToFix(name));
            text = r.text;
        }
        const l = lint(text, config, undefined, { readme });
        results.push({ file: name, ...l });
        const max = args.maxScore ?? config.maxScore;
        if (max !== undefined && l.score > max) {
            console.error(`dontreadme: ${t.overMax(name, l.score, max)}`);
            exit = Math.max(exit, 1);
        }
    }
    if (args.fix && args.stdout)
        return exit;
    if (args.badge) {
        for (const r of results)
            console.log(badge(r));
        return exit;
    }
    if (args.format === "json")
        console.log(json(results));
    else if (args.format === "github") {
        console.log(github(results));
        if (env.GITHUB_STEP_SUMMARY)
            appendFileSync(env.GITHUB_STEP_SUMMARY, summary(results));
    }
    else
        console.log(pretty(results));
    return exit;
}
// Run when executed (directly or through the npm bin symlink), not when the tests import main().
const entry = process.argv[1];
if (entry && realpathSync(entry) === fileURLToPath(import.meta.url))
    process.exitCode = main(process.argv.slice(2));
