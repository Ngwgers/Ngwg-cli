// lib/default-plugins.ts — built-in plugin fallbacks shared by the build
// bridge and the plugin management reader.
//
// The CLI exports NGWG_DEFAULT_PLUGINS as one `<name>\t<url>` line per plugin
// (see lib/core.fish). It is applied as the *last* declaration layer: an
// explicit plugins.<name> in ngwg.yaml or theme.yaml always wins, so users
// can point either key at a third-party implementation.

export const DEFAULT_PLUGINS_ENV = "NGWG_DEFAULT_PLUGINS";

/** Parse the built-in fallback plugin declarations from the environment. */
export function defaultPluginDeclarations(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = env[DEFAULT_PLUGINS_ENV];
  if (raw === undefined) return out;

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const tab = line.indexOf("\t");
    if (tab <= 0) continue;
    const name = line.slice(0, tab).trim();
    const url = line.slice(tab + 1).trim();
    if (name && url) out[name] = url;
  }
  return out;
}
