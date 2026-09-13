#!/usr/bin/env fish
# ngwg version — print version info. Pure fish; reads the core's version
# from its package.json when a copy is already available on disk, and never
# downloads one just for this.

source (realpath (status dirname)/../../lib/log.fish)
source (realpath (status dirname)/../../lib/config.fish)
source (realpath (status dirname)/../../lib/store.fish)
source (realpath (status dirname)/../../lib/core.fish)

ngwg_ensure_root

set -l bun_version (bun --version 2>/dev/null)
set -l cli_version (ngwg_cli_version)

# resolve the core without downloading: env → monorepo sibling → store
set -l core_dir
if set -q NGWG_CORE; and test -f "$NGWG_CORE/src/index.ts"
    set core_dir $NGWG_CORE
else
    set -l sibling (realpath (ngwg_cli_root)/../Ngwg-core)
    if test -f "$sibling/src/index.ts"
        set core_dir $sibling
    else
        set -l store "$NGWG_ROOT/.ngwg/core"
        if test -f "$store/src/index.ts"
            set core_dir $store
        end
    end
end

if test -n "$core_dir"
    set -l core_version (string match -rg '"version":\s*"([^"]+)"' <$core_dir/package.json)
    echo "ngwg $cli_version (core $core_version, bun $bun_version, core at $core_dir)"
else
    echo "ngwg $cli_version (bun $bun_version, no core on disk yet)"
end
