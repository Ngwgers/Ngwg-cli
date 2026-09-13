# lib/core.fish — core resolution, environment injection and the bridge to
# the TS command implementations (subcommands/<cmd>/<cmd>.ts) for commands
# fish alone cannot do
# (build/dev/init/add need the core's engine).

function ngwg_cli_root
    realpath (status dirname)/..
end

# URL for the core repo: Ngwg.core-repo-url in ngwg.yaml → official default
function ngwg_core_repo_url
    set -l url "$ngwg_cfg_core_url"
    if test -z "$url"
        set url (ngwg_official_url core)
    end
    ngwg_normalize_url "$url"
end

# URL for the official default theme repo
function ngwg_theme_repo_url
    ngwg_normalize_url (ngwg_official_url theme)
end

# resolve the Ngwg core: $NGWG_CORE → monorepo sibling checkout →
# <root>/.ngwg/core (downloaded when absent). Echoes the directory.
function ngwg_resolve_core
    if set -q NGWG_CORE
        if test -f "$NGWG_CORE/src/index.ts"
            echo $NGWG_CORE
            return 0
        end
        ngwg_error "NGWG_CORE=$NGWG_CORE does not look like a Ngwg-core directory (missing src/index.ts)"
        exit 1
    end
    set -l sibling (realpath (ngwg_cli_root)/../Ngwg-core)
    if test -f "$sibling/src/index.ts"
        echo $sibling
        return 0
    end
    set -l store "$NGWG_ROOT/.ngwg/core"
    if test -f "$store/src/index.ts"
        echo $store
        return 0
    end
    set -l url (ngwg_core_repo_url)
    if not ngwg_store_fetch "$url" "$store" src/index.ts
        ngwg_error "could not fetch $url into $store."
        echo "Set Ngwg.core-repo-url in ngwg.yaml (ngwg init scaffolds it) or NGWG_CORE in the environment to a local core directory." >&2
        exit 1
    end
    echo $store
end

# existing default-theme copy for bare theme names like `theme: pacific`:
# $NGWG_DEFAULT_THEME → project theme store.
# Echoes the directory, or nothing when no copy exists on disk.
function ngwg_default_theme_dir
    set -l candidates
    if set -q NGWG_DEFAULT_THEME
        set -a candidates $NGWG_DEFAULT_THEME
    end
    set -a candidates "$NGWG_ROOT/.ngwg/themes/pacific"
    for c in $candidates
        if test -f "$c/theme.yaml"
            echo $c
            return 0
        end
    end
end

# prepare everything the TS implementation and child scripts need:
# repo URLs (scraped + normalized), resolved core, default theme and the
# official default plugin sources (env overrides win)
function ngwg_prepare
    ngwg_ensure_root
    ngwg_scrape_ngwg_section
    set -gx NGWG_CORE_REPO_URL (ngwg_core_repo_url)
    if not set -q NGWG_FILES_PLUGIN
        set -gx NGWG_FILES_PLUGIN (ngwg_official_url files)
    end
    if not set -q NGWG_FEATURE_PLUGIN
        set -gx NGWG_FEATURE_PLUGIN (ngwg_official_url feature)
    end
    set -l theme (ngwg_default_theme_dir)
    if test -n "$theme"
        set -gx NGWG_DEFAULT_THEME "$theme"
    end
    set -gx NGWG_CORE (ngwg_resolve_core)
end

# hand a command over to its TS bridge: the sibling .ts of the calling
# main.fish (subcommands/<cmd>/<cmd>.ts), executed by bun
function ngwg_run_ts  # <main.fish path> [args...]
    if not type -q bun
        ngwg_error "bun is required but was not found in PATH"
        exit 1
    end
    set -l ts (string replace -r '\.fish$' '.ts' -- "$argv[1]")
    exec bun "$ts" $argv[2..-1]
end
