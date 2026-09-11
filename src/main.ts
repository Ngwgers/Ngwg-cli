// Ngwg-cli command implementation (run by bin/ngwg.fish via Bun).
// Thin layer: argument parsing + dispatch into Ngwg-core.

import { build, startDevServer, Logger, setLogLevel, ConfigError, PluginLoadError, ThemeError } from "../../Ngwg-core/src/index.ts";
import { rimraf, ensureDir, writeText, exists } from "../../Ngwg-core/src/util/fs.ts";
import * as path from "node:path";

const log = new Logger("ngwg");

const USAGE = `ngwg — a quiet static site generator

usage:
  ngwg build                  generate public/ (full pipeline, steps 1-9)
  ngwg dev [--port N] [--speed KBPS]
                              dev daemon with live-reload; --speed simulates a
                              weak network (10 KB/s ≈ a 10 KB file in 1s;
                              0 or negative disables, the default)
  ngwg init                   scaffold ngwg.yaml + source/ in the current dir
  ngwg plugin install <name> <url>
  ngwg plugin install-all     install every plugin declared in the configs
  ngwg plugin list
  ngwg plugin remove <name>
  ngwg plugin path
  ngwg clean                  remove public/ and the plugin store
  ngwg help | version

options:
  --root=DIR                  project root (default: current directory)
  --quiet                     only errors and warnings
  --verbose                   trace every operation (reads, writes, parses…)

log levels: default prints the core version, loaded plugins, reload progress
and errors/warnings; --quiet keeps only errors/warnings; --verbose adds a
trace of all operations on top of the default output.`;

function rootDir(): string {
  return process.env.NGWG_ROOT || process.cwd();
}

function fail(e: Error): never {
  log.error(e.message);
  process.exit(1);
}

/** Split --quiet/--verbose out of argv and apply the log level. */
function extractLogFlags(args: string[]): { rest: string[] } {
  const rest: string[] = [];
  for (const a of args) {
    if (a === "--quiet" || a === "-q") setLogLevel("quiet");
    else if (a === "--verbose" || a === "-V") setLogLevel("verbose");
    else rest.push(a);
  }
  return { rest };
}

async function cmdBuild(): Promise<void> {
  const root = rootDir();
  try {
    await build(root, { log });
  } catch (e) {
    if (
      e instanceof ConfigError ||
      e instanceof PluginLoadError ||
      e instanceof ThemeError
    ) {
      fail(e);
    }
    fail(e as Error);
  }
}

async function cmdDev(port: number | undefined, speed: number | undefined): Promise<void> {
  try {
    await startDevServer({ rootDir: rootDir(), port, speed, log });
  } catch (e) {
    fail(e as Error);
  }
  // stay alive: the dev server and watcher run forever
  await new Promise(() => {});
}

async function cmdInit(): Promise<void> {
  const root = rootDir();
  const configPath = path.join(root, "ngwg.yaml");
  if (await exists(configPath)) {
    log.error(`ngwg.yaml already exists at ${configPath}`);
    process.exit(1);
  }
  await ensureDir(path.join(root, "source", "_posts"));
  await writeText(
    configPath,
    `# ngwg configuration\ntitle: My Site\ndescription: 安静的站点\nbaseurl: /\ntheme: pacific\nsource_dir: source\npublic_dir: public\n`,
  );
  await writeText(
    path.join(root, "source", "_posts", "2026-01-01-hello-world.md"),
    `---\ntitle: 你好，世界\ndate: 2026-01-01\ntags:\n  - 随笔\ncategories: 开始\n---\n\n# 你好，世界\n\n这是第一篇文章。风从海面吹过来。\n`,
  );
  log.ok(`scaffolded ngwg.yaml and source/_posts in ${root}`);
  log.info("run `ngwg build` to generate public/");
}

async function cmdClean(): Promise<void> {
  const root = rootDir();
  await rimraf(path.join(root, "public"));
  await rimraf(path.join(root, ".ngwg"));
  log.ok("removed public/ and .ngwg/");
}

async function main(): Promise<void> {
  const { rest } = extractLogFlags(process.argv.slice(2));
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
      console.log("ngwg 0.1.0 (core " + "0.1.0" + ", bun " + Bun.version + ")");
      return;
    case "build":
      await cmdBuild();
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
      await cmdDev(port, speed);
      return;
    }
    case "init":
      await cmdInit();
      return;
    case "clean":
      await cmdClean();
      return;
    case "plugin":
    case "plugins":
      // plugin management is Fish's job (Ngwg-core/scripts/ngwg-plugins.fish);
      // the fish entry point handles it before reaching here.
      log.error("plugin commands are handled by the fish entry: run via bin/ngwg.fish");
      process.exit(2);
    default:
      log.error(`unknown command '${cmd}'`);
      console.log(USAGE);
      process.exit(2);
  }
}

main();
