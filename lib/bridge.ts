// lib/bridge.ts — shared plumbing for the TS-backed subcommands (build/dev/add).
//
// The fish lib (lib/core.fish) resolves the core and injects the environment:
// NGWG_CORE, NGWG_ROOT, NGWG_DEFAULT_THEME, NGWG_FILES_PLUGIN, NGWG_FEATURE_PLUGIN.
// These plain functions turn that environment into calls on the core's public
// API. No interfaces, no classes — the core module is consumed structurally at
// runtime; anything the core exports is whatever its src/index.ts decides.

import { existsSync } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

export function cliRoot(): string {
  return path.resolve(import.meta.dir, "..");
}

export function rootDir(): string {
  return process.env.NGWG_ROOT || process.cwd();
}

/** The resolved core's public API module; exits when the fish lib did not run. */
export async function loadCore(): Promise<any> {
  const coreDir = process.env.NGWG_CORE;
  if (!coreDir || !existsSync(path.join(coreDir, "src", "index.ts"))) {
    console.error("ngwg: NGWG_CORE is not set — invoke through bin/ngwg.fish");
    process.exit(1);
  }
  return import(pathToFileURL(path.join(coreDir, "src", "index.ts")).href);
}

/** Strip --quiet/--verbose from argv and apply the level to the core logger. */
export function applyLogLevel(core: any, argv: string[]): string[] {
  const rest: string[] = [];
  for (const a of argv) {
    if (a === "--quiet" || a === "-q") core.setLogLevel("quiet");
    else if (a === "--verbose" || a === "-V") core.setLogLevel("verbose");
    else rest.push(a);
  }
  return rest;
}

/** Official fallback plugin sources (env overrides win; fish lib sets defaults). */
export function defaultPlugins(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ["files", "feature"]) {
    const v = process.env[`NGWG_${key.toUpperCase()}_PLUGIN`];
    if (v) out[key] = v;
  }
  return out;
}

/** Existing disk copy for bare theme names (env-injected or project store). */
export function defaultTheme(): { name: string; dir: string } | undefined {
  const dir = process.env.NGWG_DEFAULT_THEME;
  return dir ? { name: "pacific", dir } : undefined;
}

/** The CLI-owned plugin-management script (injected into the core). */
export function pluginScript(): string {
  return path.join(cliRoot(), "lib", "ngwg-plugins.fish");
}

/** Engine/build options assembled from the injected environment. */
export function engineOptions(): Record<string, any> {
  return {
    defaultPlugins: defaultPlugins(),
    defaultTheme: defaultTheme(),
    pluginScript: pluginScript(),
  };
}

/** Run a command body: log failures and exit non-zero, like every command. */
export async function runMain(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`ngwg: ${(e as Error).message}`);
    process.exit(1);
  }
}
