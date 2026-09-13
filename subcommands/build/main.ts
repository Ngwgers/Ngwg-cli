// ngwg build — full build through the core engine.
// Fish (main.fish) resolves the core and injects the environment; this file
// only wires the core's public API.

import { applyLogLevel, defaultPlugins, defaultTheme, loadCore, pluginScript, rootDir, runMain } from "../../lib/bridge.ts";

await runMain(async () => {
  const core = await loadCore();
  applyLogLevel(core, process.argv.slice(2));
  const log = new core.Logger("ngwg");
  await core.build(rootDir(), {
    log,
    defaultPlugins: defaultPlugins(),
    defaultTheme: defaultTheme(),
    pluginScript: pluginScript(),
  });
});
