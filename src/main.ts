// Ngwg-cli bootstrap.
//
// The CLI resolves the Ngwg core at runtime: $NGWG_CORE → the monorepo
// sibling checkout (development) → <root>/.ngwg/core, which is downloaded
// from Ngwg.core-repo-url when absent (`ngwg update core` refreshes the same
// copy). Themes are declared via themes.<name> in ngwg.yaml and fetched by
// the core's theme management; for bare theme names this bootstrap only
// injects an existing disk copy ($NGWG_DEFAULT_THEME or the project theme
// store). The official default plugins (files, feature) are hardcoded here
// and can be overridden:
//
//   ngwg.yaml:  Ngwg.core-repo-url / Ngwg.theme-repo-url / themes.<name> /
//               plugins.<key>
//   environment: NGWG_CORE, NGWG_DEFAULT_THEME, NGWG_FILES_PLUGIN,
//                NGWG_FEATURE_PLUGIN
//
// Once the core is resolved, the command implementations are loaded from
// <core>/src/cli.ts and handed everything they need.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

// --- official default sources ------------------------------------------------

const OFFICIAL_ORG = "github.com/Ngwgers";
const DEFAULT_CORE_REPO = `https://github.com/Ngwgers/Ngwg-core`;
const DEFAULT_THEME_REPO = `https://github.com/Ngwgers/Ngwg-default-theme`;
const DEFAULT_PLUGINS: Record<string, string> = {
  files: "https://github.com/Ngwgers/Ngwg-files",
  feature: "https://github.com/Ngwgers/Ngwg-feature",
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

/** Expand a `user/repo` shorthand into a full GitHub URL (official org). */
function normalizeRepoUrl(url: string): string {
  return /^[\w.-]+\/[\w.-]+$/.test(url) ? `${OFFICIAL_ORG}/${url}` : url;
}

/** git clone --depth 1 into a temp dir, validate, then move into place. */
function downloadRepo(url: string, dest: string, validate: (dir: string) => boolean): void {
  const cloneUrl = normalizeRepoUrl(url);
  const tmp = `${dest}.download`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(path.dirname(dest), { recursive: true });
  const res = spawnSync("git", ["clone", "--depth", "1", cloneUrl, tmp], { stdio: "pipe" });
  if (res.status !== 0 || !validate(tmp)) {
    rmSync(tmp, { recursive: true, force: true });
    fail(
      `could not fetch ${cloneUrl} into ${dest}.\n` +
        (res.stderr?.toString() || "") +
        `Set Ngwg.core-repo-url in ngwg.yaml (ngwg init scaffolds it) or NGWG_CORE in the environment to a local core directory.`,
    );
  }
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  renameSync(tmp, dest);
}

/**
 * Core resolution order:
 *   $NGWG_CORE → <cli>/../Ngwg-core (monorepo dev checkout) →
 *   <root>/.ngwg/core (downloaded from Ngwg.core-repo-url when absent)
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
 * Existing copy for bare theme names like `theme: pacific` (not covered by a
 * themes.<name> declaration): $NGWG_DEFAULT_THEME → the project theme store
 * (<root>/.ngwg/themes/pacific) → the legacy <root>/.ngwg/theme store.
 * Only resolves what is already on disk; undefined when nothing is.
 */
function resolveDefaultThemeDir(rootDir: string): { name: string; dir: string } | undefined {
  const candidates: string[] = [];
  const env = process.env.NGWG_DEFAULT_THEME;
  if (env) candidates.push(env);
  candidates.push(path.join(rootDir, ".ngwg", "themes", "pacific"));
  candidates.push(path.join(rootDir, ".ngwg", "theme"));
  for (const c of candidates) {
    if (existsSync(path.join(c, "theme.yaml"))) return { name: "pacific", dir: c };
  }
  return undefined;
}

async function main(): Promise<void> {
  const cliRoot = path.resolve(import.meta.dir, "..");
  const rootDir = process.env.NGWG_ROOT || process.cwd();
  const overrides = scrapeNgwgSection(rootDir);

  const coreRepoUrl = normalizeRepoUrl(overrides["core-repo-url"] || DEFAULT_CORE_REPO);
  const themeRepoUrl = normalizeRepoUrl(overrides["theme-repo-url"] || DEFAULT_THEME_REPO);
  const coreDir = resolveCoreDir(rootDir, coreRepoUrl, cliRoot);
  const defaultTheme = resolveDefaultThemeDir(rootDir);
  // child processes use it too: plugin fish script → plugin-urls.ts imports
  // the YAML parser from the core; the fish script resolves declarations with it
  process.env.NGWG_CORE = coreDir;
  if (defaultTheme) process.env.NGWG_DEFAULT_THEME = defaultTheme.dir;

  const defaultPlugins: Record<string, string> = {};
  for (const [key, url] of Object.entries(DEFAULT_PLUGINS)) {
    defaultPlugins[key] = process.env[`NGWG_${key.toUpperCase()}_PLUGIN`] || url;
  }

  // the CLI talks to the core ONLY through its public API (src/index.ts);
  // the plugin-management script is CLI-owned and injected into the core
  const core = await import(pathToFileURL(path.join(coreDir, "src", "index.ts")).href + "?t=" + Date.now());
  const { cliMain } = await import(pathToFileURL(path.join(cliRoot, "src", "cli.ts")).href);
  await cliMain({
    core,
    argv: process.argv.slice(2),
    coreDir,
    rootDir,
    defaultPlugins,
    pluginScript: path.join(cliRoot, "scripts", "ngwg-plugins.fish"),
    defaultTheme,
    // consumed by `ngwg update core|theme` and the init scaffold
    coreRepoUrl,
    themeRepoUrl,
  });
}

main();
