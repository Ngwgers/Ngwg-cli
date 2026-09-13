// ngwg dev — dev daemon with live reload through the core engine.
// Fish (main.fish) resolves the core and injects the environment; this file
// parses the flags and wires the core's public API.

import { applyLogLevel, defaultPlugins, defaultTheme, loadCore, pluginScript, rootDir, runMain } from "../../lib/bridge.ts";

await runMain(async () => {
  const core = await loadCore();
  const rest = applyLogLevel(core, process.argv.slice(2));
  const log = new core.Logger("ngwg");

  const portIdx = rest.indexOf("--port");
  const port = portIdx >= 0 ? parseInt(rest[portIdx + 1], 10) : undefined;
  if (portIdx >= 0 && (isNaN(port) || port! <= 0)) {
    console.error("ngwg: --port needs a positive number");
    process.exit(2);
  }
  const speedIdx = rest.indexOf("--speed");
  const speed = speedIdx >= 0 ? parseFloat(rest[speedIdx + 1]) : undefined;
  if (speedIdx >= 0 && isNaN(speed)) {
    console.error("ngwg: --speed needs a number (KB/s; 0 or negative disables throttling)");
    process.exit(2);
  }

  await core.startDevServer({
    rootDir: rootDir(),
    port,
    speed,
    log,
    defaultPlugins: defaultPlugins(),
    defaultTheme: defaultTheme(),
    pluginScript: pluginScript(),
  });
});
