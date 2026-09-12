// The contract between the CLI and the core it resolves at runtime.
//
// The CLI is fully decoupled from the core's internals: everything it needs
// (build/dev engine, config loading, theme store management) is consumed
// through this structural type, satisfied by the core's public API module
// (<coreDir>/src/index.ts). A different core works as long as it exports the
// same surface. Kept loose (`any` where shapes are wide) on purpose — this is
// a runtime contract, not a compile-time coupling.

export interface CoreApi {
  /** one-shot build (pipeline steps 1–9); accepts EngineOptions */
  build(rootDir: string, opts?: Record<string, any>): Promise<unknown>;
  /** dev daemon with live-reload; accepts DevOptions */
  startDevServer(opts: Record<string, any>): Promise<unknown>;
  Logger: new (name?: string, level?: string) => {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    ok(msg: string): void;
    debug(msg: string): void;
    child(name: string): any;
  };
  setLogLevel(level: string): void;
  CORE_VERSION: string;

  // config
  loadUserConfig(rootDir: string): Promise<Record<string, any>>;
  ConfigError: new (message: string) => Error;

  // theme management (store layout + declared-source resolution)
  slugify(s: string): string;
  themeStoreDir(rootDir: string, name: string): string;
  declaredThemeUrl(themes: Record<string, any> | undefined, name: string): string | undefined;
  declaredThemeLocalDir(name: string, rootDir: string, themes: Record<string, any> | undefined): Promise<string | undefined>;
  isLocalThemeUrl(url: string): boolean;
  cloneIntoStore(url: string, dest: string, validate: (dir: string) => boolean, failHint: string): Promise<void>;
}
