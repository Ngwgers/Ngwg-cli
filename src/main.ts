// Ngwg-cli bootstrap.
//
// The CLI knows none of the other repositories as filesystem siblings by
// contract: it *resolves* the Ngwg core at runtime and, like a plugin,
// downloads it into <root>/.ngwg/core when it is not available. The same
// guarantee covers the default theme and the official default plugins
// (files, feature) — their sources are hardcoded here (this is the only
// place) and can be overridden:
//
//   ngwg.yaml:  Ngwg.core-repo-url / Ngwg.theme-repo-url / plugins.<key>
//   environment: NGWG_CORE, NGWG_DEFAULT_THEME, NGWG_FILES_PLUGIN,
//                NGWG_FEATURE_PLUGIN
//
// Once the core is resolved, the command implementations are loaded from
// <core>/src/cli.ts and handed everything they need.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

// --- the only hardcoded sources in the entire project ------------------------

const OFFICIAL_ORG = "github.com/Ngwgers";
const DEFAULT_CORE_REPO = `git@github.com:Ngwgers/Ngwg-core`;
const DEFAULT_THEME_REPO = `git@github.com:Ngwgers/Ngwg-default-theme`;
const DEFAULT_PLUGINS: Record<string, string> = {
  files: "git@github.com:Ngwgers/Ngwg-files",
  feature: "git@github.com:Ngwgers/Ngwg-feature",
};

function fail(msg: string): never {
  console.error(`ngwg: ${msg}`);
  process.exit(1);
}

/** Best-effort scrape of `core-repo-url` / `theme-repo-url` from ngwg.yaml —
 * the real YAML parser lives in the core we may not have downloaded yet. */
function scrapeNgwgSection(rootDir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of ["ngwg.yaml", "ngwg.yml"]) {
    const p = path.join(rootDir, name);
    if (!existsSync(p)) continue;
    let inNgwg = false;
    for (const raw of readFileSync(p, "utf8").split(/\r?\n/)) {
      const line = raw.replace(/#.*$/, "").trimEnd();
      if (!line.trim()) continue;
      const indent = line.length - line.trimStart().length;
      const key = line.trim();
      if (indent === 0) {
        inNgwg = key === "Ngwg:" || key === "ngwg:";
        continue;
      }
      if (inNgwg) {
        const m = /^([a-z-]+):\s*(.+)$/.exec(key);
        if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
  return out;
}

function isCoreDir(p: string): boolean {
  return existsSync(path.join(p, "src", "index.ts"));
}

/** git clone --depth 1 (supports git@ / https / user/repo shorthand). */
function downloadRepo(url: string, dest: string, validate: (dir: string) => boolean): void {
  const cloneUrl = /^[\w.-]+\/[\w.-]+$/.test(url) ? `${OFFICIAL_ORG}/${url}` : url;
  mkdirSync(path.dirname(dest), { recursive: true });
  const res = spawnSync("git", ["clone", "--depth", "1", cloneUrl, dest], { stdio: "pipe" });
  if (res.status !== 0 || !validate(dest)) {
    fail(
      `could not fetch ${cloneUrl} into ${dest}.\n` +
        (res.stderr?.toString() || "") +
        `Set Ngwg.core-repo-url in ngwg.yaml or NGWG_CORE in the environment to a local core directory.`,
    );
  }
}

/**
 * Core resolution order:
 *   $NGWG_CORE → <cli>/../Ngwg-core (monorepo dev checkout) →
 *   <root>/.ngwg/core (auto-download on first use, configurable via
 *   Ngwg.core-repo-url)
 */
function resolveCoreDir(rootDir: string, coreRepoUrl: string, cliRoot: string): string {
  const env = process.env.NGWG_CORE;
  if (env) {
    if (isCoreDir(env)) return env;
    fail(`NGWG_CORE=${env} does not look like a Ngwg-core directory (missing src/index.ts)`);
  }
  const sibling = path.resolve(cliRoot, "..", "Ngwg-core");
  if (isCoreDir(sibling)) return sibling; // development inside the monorepo

  const store = path.join(rootDir, ".ngwg", "core");
  if (isCoreDir(store)) return store;
  downloadRepo(coreRepoUrl, store, isCoreDir);
  return store;
}

/**
 * Default theme resolution (for bare names like `theme: pacific`):
 *   $NGWG_DEFAULT_THEME → <cli>/../Ngwg-default-theme (dev checkout) →
 *   <root>/.ngwg/theme (auto-download, configurable via Ngwg.theme-repo-url)
 */
function resolveDefaultThemeDir(rootDir: string, themeRepoUrl: string, cliRoot: string): { name: string; dir: string } {
  const env = process.env.NGWG_DEFAULT_THEME;
  const candidates: string[] = [];
  if (env) candidates.push(env);
  candidates.push(path.resolve(cliRoot, "..", "Ngwg-default-theme"));
  for (const c of candidates) {
    if (existsSync(path.join(c, "theme.yaml"))) return { name: "pacific", dir: c };
  }
  const store = path.join(rootDir, ".ngwg", "theme");
  if (!existsSync(path.join(store, "theme.yaml"))) {
    downloadRepo(themeRepoUrl, store, (dir) => existsSync(path.join(dir, "theme.yaml")));
  }
  return { name: "pacific", dir: store };
}

async function main(): Promise<void> {
  const cliRoot = path.resolve(import.meta.dir, "..");
  const rootDir = process.env.NGWG_ROOT || process.cwd();
  const overrides = scrapeNgwgSection(rootDir);

  const coreDir = resolveCoreDir(rootDir, overrides["core-repo-url"] || DEFAULT_CORE_REPO, cliRoot);
  const defaultTheme = resolveDefaultThemeDir(rootDir, overrides["theme-repo-url"] || DEFAULT_THEME_REPO, cliRoot);
  // child processes (plugin fish script → plugin-urls.ts) use it too
  process.env.NGWG_DEFAULT_THEME = defaultTheme.dir;

  const defaultPlugins: Record<string, string> = {};
  for (const [key, url] of Object.entries(DEFAULT_PLUGINS)) {
    defaultPlugins[key] = process.env[`NGWG_${key.toUpperCase()}_PLUGIN`] || url;
  }

  const core = await import(pathToFileURL(path.join(coreDir, "src", "cli.ts")).href + "?t=" + Date.now());
  await core.cliMain({
    argv: process.argv.slice(2),
    coreDir,
    rootDir,
    defaultPlugins,
    defaultTheme,
  });
}

main();
