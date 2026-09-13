// All ngwg command implementations (dispatch, init, add, clean, plugin and
// update management) live HERE, in the CLI — the core is a replaceable
// engine accessed only through its public API (src/index.ts), which the fish
// lib (lib/core.fish) resolves, downloads and injects as `core`. The
// plugin-management fish script ships with the CLI as well; the core only
// ever sees it as the injected `pluginScript` option (used for build-time
// auto-install).
//
//   import { cliMain } from "./cli.ts";
//   await cliMain({ core, argv, rootDir, coreDir, ... });
//
// The fish subcommands (subcommands/*/main.fish) prepare the environment
// (NGWG_CORE, NGWG_DEFAULT_THEME, NGWG_*_PLUGIN, NGWG_*_REPO_URL, NGWG_ROOT)
// and exec this file with `bun src/cli.ts <command> [args…]`; the entry at
// the bottom assembles CliOptions from that environment.

import { addCommand, setCoreApi } from "./commands/add.ts";
import type { CoreApi } from "./core-api.ts";
import { spawnSync } from "node:child_process";
import { renameSync, existsSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const USAGE = `ngwg — a quiet static site generator

usage:
  ngwg build                  generate public/ (full pipeline, steps 1-9)
  ngwg dev [--port N] [--speed KBPS]
                              dev daemon with live-reload; --speed simulates a
                              weak network (10 KB/s ≈ a 10 KB file in 1s;
                              0 or negative disables, the default)
  ngwg init                   scaffold ngwg.yaml + source/ in the current dir
  ngwg add [-L title] [-T tag...] [-C category...] [-D date]
                              create a post; without flags an interactive
                              form opens (-D defaults to today)
  ngwg plugin install <name> <url>
  ngwg plugin install-all     install every plugin declared in the configs
  ngwg plugin list
  ngwg plugin remove <name>
  ngwg plugin path
  ngwg update [core|theme [name...]|plugin [name...]]
                              update the CLI-managed copies in <root>/.ngwg/
                              (core, themes, installed plugins) to the
                              latest version; without a target everything is
                              updated. 'update core' and 'update theme <name>'
                              also install when the store copy is missing
                              (a theme's source comes from themes.<name> in
                              ngwg.yaml)
  ngwg clean                  remove public/ and the .ngwg/ directory
  ngwg help | version

options:
  --root=DIR                  project root (default: current directory)
  --quiet                     only errors and warnings
  --verbose                   trace every operation (reads, writes, parses…)

log levels: default prints the core version, loaded plugins, reload progress
and errors/warnings; --quiet keeps only errors/warnings; --verbose adds a
trace of all operations on top of the default output.

sources for the core, the default plugins (files, feature) and themes can be
overridden in ngwg.yaml:

  Ngwg:
    core-repo-url: https://github.com/Ngwgers/Ngwg-core
    theme-repo-url: https://github.com/Ngwgers/Ngwg-default-theme
  themes:
    pacific: https://github.com/Ngwgers/Ngwg-default-theme
    other:
      url: https://github.com/me/my-theme
      options:               # theme-config overrides applied when selected
        per_page: 5
  plugins:
    files: https://github.com/Ngwgers/Ngwg-files
    feature: https://github.com/Ngwgers/Ngwg-feature`;

export interface CliOptions {
  /** the resolved core's public API module (see core-api.ts) */
  core: CoreApi;
  argv: string[];
  /** resolved core directory (import origin + version display) */
  coreDir: string;
  /** project root (fish already resolved --root) */
  rootDir: string;
  /** official fallback plugin sources (CLI hardcodes/overrides them) */
  defaultPlugins: Record<string, string>;
  /** the CLI-owned plugin-management script (also injected into the core) */
  pluginScript: string;
  /** official fallback theme for bare theme names */
  defaultTheme?: { name: string; dir: string };
  /** repo URL used by `ngwg update core` (resolved/injected by the CLI) */
  coreRepoUrl?: string;
  /** repo URL used by `ngwg update theme` (resolved/injected by the CLI) */
  themeRepoUrl?: string;
}

export async function cliMain(opts: CliOptions): Promise<void> {
  const { argv, coreDir, rootDir } = opts;
  const core = opts.core;
  setCoreApi(core); // commands like `add` reach the core through this
  activeCore = core; // for helpers outside cliMain's scope (withExit)
  const log = new core.Logger("ngwg");

  const { rest } = extractLogFlags(argv, core);
  const cmd = rest[0];
  const args = rest.slice(1);

  switch (cmd) {
    case undefined:
    case "help":
    case "--help":
    case "-h":
      console.log(USAGE);
      return;
    case "version":
    case "--version":
    case "-v":
      console.log(`ngwg (core ${core.CORE_VERSION}, bun ${Bun.version}, core at ${coreDir})`);
      return;
    case "build":
      await withExit(() => core.build(rootDir, { log, defaultPlugins: opts.defaultPlugins, defaultTheme: opts.defaultTheme, pluginScript: opts.pluginScript }));
      return;
    case "dev": {
      const portIdx = args.indexOf("--port");
      const port = portIdx >= 0 ? parseInt(args[portIdx + 1], 10) : undefined;
      if (portIdx >= 0 && (isNaN(port) || port! <= 0)) {
        log.error("--port needs a positive number");
        process.exit(2);
      }
      const speedIdx = args.indexOf("--speed");
      const speed = speedIdx >= 0 ? parseFloat(args[speedIdx + 1]) : undefined;
      if (speedIdx >= 0 && isNaN(speed)) {
        log.error("--speed needs a number (KB/s; 0 or negative disables throttling)");
        process.exit(2);
      }
      await withExit(() =>
        core.startDevServer({
          rootDir,
          port,
          speed,
          log,
          defaultPlugins: opts.defaultPlugins,
          defaultTheme: opts.defaultTheme,
          pluginScript: opts.pluginScript,
        }),
      );
      return;
    }
    case "init":
      await withExit(() => cmdInit(rootDir, log, opts.coreRepoUrl, opts.themeRepoUrl));
      return;
    case "add":
    case "new":
      await withExit(() => addCommand(args, rootDir, log));
      // raw-mode stdin keeps the event loop alive after completion
      process.exit(0);
    case "clean":
      await withExit(() => cmdClean(rootDir, log));
      return;
    case "plugin":
    case "plugins":
      cmdPlugin(args, opts.pluginScript, rootDir, log);
      return;
    case "update":
      await withExit(() =>
        cmdUpdate(args, {
          rootDir,
          log,
          pluginScript: opts.pluginScript,
          coreRepoUrl: opts.coreRepoUrl,
          themeRepoUrl: opts.themeRepoUrl,
          defaultThemeName: opts.defaultTheme?.name,
        }),
      );
      return;
    default:
      log.error(`unknown command '${cmd}'`);
      console.log(USAGE);
      process.exit(2);
  }
}

/** the core injected into the current cliMain call (helpers outside its scope) */
let activeCore: CoreApi | null = null;

async function withExit(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    new (activeCore!.Logger)("ngwg").error((e as Error).message);
    process.exit(1);
  }
}

/** Split --quiet/--verbose out of argv and apply the log level. */
function extractLogFlags(args: string[], core: CoreApi): { rest: string[] } {
  const rest: string[] = [];
  for (const a of args) {
    if (a === "--quiet" || a === "-q") core.setLogLevel("quiet");
    else if (a === "--verbose" || a === "-V") core.setLogLevel("verbose");
    else rest.push(a);
  }
  return { rest };
}

async function cmdInit(root: string, log: { ok(msg: string): void; info(msg: string): void; error(msg: string): void }, coreRepoUrl?: string, themeRepoUrl?: string): Promise<void> {
  const configPath = path.join(root, "ngwg.yaml");
  if (existsSync(configPath)) {
    log.error(`ngwg.yaml already exists at ${configPath}`);
    process.exit(1);
  }
  mkdirSync(path.join(root, "source", "_posts"), { recursive: true });
  // sources are injected by the CLI (Core knows no default repos); the theme
  // source is declared via themes.pacific — theme-repo-url is the legacy
  // override and does not belong in a fresh scaffold
  const themeSource = themeRepoUrl
    ? `themes:\n  pacific: ${themeRepoUrl}\n`
    : `# declare where the theme comes from, e.g.:\n# themes:\n#   pacific: https://github.com/Ngwgers/Ngwg-default-theme\n`;
  const ngwgSection = coreRepoUrl
    ? `# repo sources used by the CLI\nNgwg:\n  core-repo-url: ${coreRepoUrl}\n`
    : `# Ngwg:\n#   core-repo-url: https://github.com/Ngwgers/Ngwg-core\n`;
  writeFileSync(
    configPath,
    `# ngwg configuration\ntitle: My Site\ndescription: 安静的站点\nbaseurl: /\ntheme: pacific\n${themeSource}${ngwgSection}source_dir: source\npublic_dir: public\n`,
  );
  writeFileSync(
    path.join(root, "source", "_posts", "2026-01-01-hello-world.md"),
    `---\ntitle: 你好，世界\ndate: 2026-01-01\ntags:\n  - 随笔\ncategories: 开始\n---\n\n# 你好，世界\n\n这是第一篇文章。风从海面吹过来。\n`,
  );
  log.ok(`scaffolded ngwg.yaml and source/_posts in ${root}`);
  log.info("run `ngwg build` to generate public/");
}

async function cmdClean(root: string, log: { ok(msg: string): void }): Promise<void> {
  const rm = (dir: string) => existsSync(dir) && rmSync(dir, { recursive: true, force: true });
  rm(path.join(root, "public"));
  rm(path.join(root, ".ngwg"));
  log.ok("removed public/ and .ngwg/");
}

/** plugin management is Fish's job; the script ships with the CLI. */
function cmdPlugin(args: string[], pluginScript: string, root: string, log: { error(msg: string): void }): void {
  const script = pluginScript;
  const sub = args[0];
  const full = [script];
  switch (sub) {
    case "install":
      full.push("install", args[1] ?? "", args[2] ?? "", root);
      break;
    case "install-all":
      full.push("install-all", root);
      break;
    case "list":
    case "ls":
      full.push("list", root);
      break;
    case "remove":
    case "rm":
      full.push("remove", args[1] ?? "", root);
      break;
    case "path":
      full.push("path", root);
      break;
    default:
      log.error("usage: ngwg plugin {install <name> <url>|install-all|list|remove <name>|path}");
      process.exit(2);
  }
  const res = spawnSync("fish", full, { stdio: "inherit" });
  process.exit(res.status ?? 1);
}

/** `ngwg update` — refresh the CLI-managed copies under <root>/.ngwg/.
 * Core and theme stores are re-cloned from their repo URLs (core: the URL
 * the CLI resolved; themes: the themes.<name> declaration in ngwg.yaml, the
 * CLI-resolved default theme URL, or the store copy's git origin); plugin
 * stores are re-fetched by the management fish script, which knows every
 * declaration flavour (git, tarball, local copy). */
async function cmdUpdate(
  args: string[],
  o: {
    rootDir: string;
    log: { info(msg: string): void; ok(msg: string): void; warn(msg: string): void; error(msg: string): void };
    pluginScript: string;
    coreRepoUrl?: string;
    themeRepoUrl?: string;
    defaultThemeName?: string;
  },
): Promise<void> {
  const coreValidate = (d: string) => existsSync(path.join(d, "src", "index.ts"));
  const themeValidate = (d: string) => existsSync(path.join(d, "theme.yaml"));
  const target = args[0];
  if (target === undefined) {
    // bare `update` refreshes what exists — it never installs anything new
    await updateManagedCopy("core", path.join(o.rootDir, ".ngwg", "core"), o.coreRepoUrl, coreValidate, o.log);
    await updateManagedCopy("theme", path.join(o.rootDir, ".ngwg", "theme"), o.themeRepoUrl, themeValidate, o.log);
    await updateThemes([], o);
    const status = updatePlugins([], o.pluginScript, o.rootDir);
    if (status !== 0) process.exit(status);
    return;
  }
  switch (target) {
    case "core": {
      const store = path.join(o.rootDir, ".ngwg", "core");
      if (!existsSync(store)) {
        if (!o.coreRepoUrl) {
          throw new Error("cannot install core: the CLI did not provide a repo URL for it. Set Ngwg.core-repo-url in ngwg.yaml, then rerun ngwg update.");
        }
        await activeCore.cloneIntoStore(o.coreRepoUrl, store, coreValidate, " The fetched repository is not a Ngwg-core (missing src/index.ts). Check Ngwg.core-repo-url in ngwg.yaml.");
        o.log.ok(`installed core → ${store}`);
        o.log.info("it is picked up on the next ngwg run");
        return;
      }
      await updateManagedCopy("core", store, o.coreRepoUrl, coreValidate, o.log);
      return;
    }
    case "theme":
    case "themes":
      await updateThemes(args.slice(1), o);
      return;
    case "plugin":
    case "plugins": {
      const status = updatePlugins(args.slice(1), o.pluginScript, o.rootDir);
      if (status !== 0) process.exit(status);
      return;
    }
    default:
      o.log.error(`unknown update target '${target}' (use core, theme or plugin)`);
      console.log("usage: ngwg update [core|theme [name...]|plugin [name...]]");
      process.exit(2);
  }
}

/** Update (or, with explicit names, install) CLI-managed theme copies.
 * With names, each named theme is updated or — when absent from the project
 * store — installed from its declared source. Without names, every existing
 * store copy is refreshed: the legacy default-theme store (.ngwg/theme) and
 * each theme under .ngwg/themes/. */
async function updateThemes(
  names: string[],
  o: {
    rootDir: string;
    log: { info(msg: string): void; ok(msg: string): void; warn(msg: string): void };
    themeRepoUrl?: string;
    defaultThemeName?: string;
  },
): Promise<void> {
  const themeValidate = (d: string) => existsSync(path.join(d, "theme.yaml"));
  const themesDir = path.join(o.rootDir, ".ngwg", "themes");
  const legacyDir = path.join(o.rootDir, ".ngwg", "theme");

  // theme sources may live in ngwg.yaml; update must work without a site too
  let declared: Record<string, string | { url: string; options?: Record<string, any> }> = {};
  try {
    declared = (await activeCore.loadUserConfig(o.rootDir)).themes ?? {};
  } catch {
    // no config file (or unreadable) — fall back to the CLI-provided URL
  }

  /** source for a store copy: themes.<name> declaration → CLI default-theme
   * URL → the copy's own git origin */
  const urlFor = (name: string, storeDir: string): string | undefined =>
    activeCore.declaredThemeUrl(declared, name) ??
    (name === o.defaultThemeName ? o.themeRepoUrl : undefined) ??
    gitOrigin(storeDir);

  if (names.length > 0) {
    for (const name of names) {
      const store = activeCore.themeStoreDir(o.rootDir, name);
      const url = urlFor(name, store);
      if (!url) {
        throw new Error(
          `cannot update theme "${name}": no source known. Declare themes.${name}: <repo-url> in ngwg.yaml ` +
            `(or keep the store copy's git origin), then rerun ngwg update theme ${name}.`,
        );
      }
      // a local-path declaration is used directly (no store copy) — there is
      // nothing to fetch; the checkout is edited in place
      if (activeCore.isLocalThemeUrl(url) && (await activeCore.declaredThemeLocalDir(name, o.rootDir, declared))) {
        o.log.info(`theme "${name}" is declared as a local path (${url}) — used directly, nothing to fetch`);
        continue;
      }
      if (existsSync(path.join(store, "theme.yaml"))) {
        await updateManagedCopy(`theme "${name}"`, store, url, themeValidate, o.log);
      } else {
        await activeCore.cloneIntoStore(
          url,
          store,
          themeValidate,
          ` The fetched repository is not a Ngwg theme (missing theme.yaml). Check themes.${name} in ngwg.yaml.`,
        );
        o.log.ok(`installed theme "${name}" → ${store}`);
      }
    }
    return;
  }

  let updated = 0;
  if (existsSync(path.join(legacyDir, "theme.yaml"))) {
    await updateManagedCopy("theme", legacyDir, o.themeRepoUrl, themeValidate, o.log);
    updated++;
  }
  if (existsSync(themesDir)) {
    for (const entry of readdirSync(themesDir).sort()) {
      const store = path.join(themesDir, entry);
      if (!existsSync(path.join(store, "theme.yaml"))) continue;
      const url = urlFor(entry, store);
      if (!url) {
        o.log.warn(
          `theme "${entry}" has no known source — skipped. Declare themes.${entry}: <repo-url> in ngwg.yaml to make it updatable.`,
        );
        continue;
      }
      // local-path declarations resolve directly to the checkout; a store
      // copy (e.g. left over from an earlier remote declaration) is unused
      if (activeCore.isLocalThemeUrl(url)) {
        o.log.info(`theme "${entry}" is declared as a local path (${url}) — used directly, nothing to fetch`);
        continue;
      }
      await updateManagedCopy(`theme "${entry}"`, store, url, themeValidate, o.log);
      updated++;
    }
  }
  if (updated === 0) o.log.info("no CLI-managed themes — nothing to update");
}

/** The git origin of a store copy, when it has one. */
function gitOrigin(dir: string): string | undefined {
  const res = spawnSync("git", ["-C", dir, "remote", "get-url", "origin"], { encoding: "utf8" });
  const url = res.status === 0 ? res.stdout.trim() : "";
  return url || undefined;
}

/** Re-clone a CLI-managed store copy (core/theme) from its repo URL. The
 * fresh clone is fetched and validated in a temp dir first, so a failed
 * update never destroys the working copy. */
async function updateManagedCopy(
  name: string,
  storeDir: string,
  repoUrl: string | undefined,
  validate: (dir: string) => boolean,
  log: { info(msg: string): void; ok(msg: string): void },
): Promise<void> {
  if (!existsSync(storeDir)) {
    log.info(`no CLI-managed ${name} at ${storeDir} — nothing to update`);
    return;
  }
  if (!repoUrl) {
    throw new Error(
      `cannot update ${name}: no source known for it. Set Ngwg.core-repo-url / Ngwg.theme-repo-url or a ` +
        `themes.<name> declaration in ngwg.yaml, then rerun ngwg update.`,
    );
  }
  const tmp = `${storeDir}.update`;
  rmSync(tmp, { recursive: true, force: true });
  const res = spawnSync("git", ["clone", "--depth", "1", repoUrl, tmp], { stdio: "pipe" });
  if (res.status !== 0 || !validate(tmp)) {
    rmSync(tmp, { recursive: true, force: true });
    throw new Error(
      `could not update ${name} from ${repoUrl}:\n${res.stderr?.toString() || ""}` +
        `Check Ngwg.core-repo-url / Ngwg.theme-repo-url in ngwg.yaml, then rerun ngwg update.`,
    );
  }
  rmSync(storeDir, { recursive: true, force: true });
  renameSync(tmp, storeDir);
  log.ok(`updated ${name} → ${storeDir}`);
  if (name === "core") log.info("the new core is picked up on the next ngwg run");
}

/** Plugin updates go through the management fish script (fetch flavours and
 * declaration lookup live there). Returns the script's exit status. */
function updatePlugins(names: string[], pluginScript: string, root: string): number {
  const script = pluginScript;
  if (names.length === 0) {
    const res = spawnSync("fish", [script, "update-all", root], { stdio: "inherit" });
    return res.status ?? 1;
  }
  for (const name of names) {
    const res = spawnSync("fish", [script, "update", name, root], { stdio: "inherit" });
    if (res.status !== 0) return res.status ?? 1;
  }
  return 0;
}

// Standalone entry: the fish subcommands prepared the environment and exec
// this file (`bun src/cli.ts <command> [args…]`). Only commands that need
// the core's engine land here — plugin/update/clean/help/version are pure
// fish under subcommands/.
if (import.meta.main) {
  const cliRoot = path.resolve(import.meta.dir, "..");
  const coreDir = process.env.NGWG_CORE;
  if (!coreDir) {
    console.error("ngwg: NGWG_CORE is not set — invoke through bin/ngwg.fish");
    process.exit(1);
  }
  const core = (await import(pathToFileURL(path.join(coreDir, "src", "index.ts")).href)) as CoreApi;
  const defaultPlugins: Record<string, string> = {};
  for (const key of ["files", "feature"]) {
    const v = process.env[`NGWG_${key.toUpperCase()}_PLUGIN`];
    if (v) defaultPlugins[key] = v;
  }
  const themeDir = process.env.NGWG_DEFAULT_THEME;
  await cliMain({
    core,
    argv: process.argv.slice(2),
    coreDir,
    rootDir: process.env.NGWG_ROOT || process.cwd(),
    defaultPlugins,
    pluginScript: path.join(cliRoot, "scripts", "ngwg-plugins.fish"),
    defaultTheme: themeDir ? { name: "pacific", dir: themeDir } : undefined,
    coreRepoUrl: process.env.NGWG_CORE_REPO_URL,
    themeRepoUrl: process.env.NGWG_THEME_REPO_URL,
  });
}
