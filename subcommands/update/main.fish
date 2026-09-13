#!/usr/bin/env fish
# ngwg update [core|theme [name...]|plugin [name...]]
#
# Refresh the CLI-managed copies under <root>/.ngwg/. Pure fish — the stores
# are plain git clones, so updating them needs nothing beyond git and the
# plugin-management script (which is fish itself).
#
#   update            refresh every existing copy (core, themes, plugins)
#   update core       refresh the core store; installs it when missing
#   update theme [n]  refresh theme stores (or install the named ones)
#   update plugin [n] re-fetch installed plugins via ngwg-plugins.fish

source (realpath (status dirname)/../../lib/log.fish)
source (realpath (status dirname)/../../lib/config.fish)
source (realpath (status dirname)/../../lib/store.fish)
source (realpath (status dirname)/../../lib/core.fish)

# full preparation: the plugin-management script's declaration reader uses
# the core's YAML parser, so the core must be resolved (and downloaded when
# absent) even though the update logic itself is plain git
ngwg_prepare
set -l args (ngwg_take_log_flags $argv)

# update (or install) one managed copy
function update_one  # <label> <dest> <validate> <url> → 0 ok / 1 failed
    set -l label "$argv[1]"
    set -l dest "$argv[2]"
    set -l validate "$argv[3]"
    set -l url "$argv[4]"
    if not test -e "$dest/$validate"
        ngwg_info "no CLI-managed $label at $dest — nothing to update"
        return 0
    end
    if test -z "$url"
        ngwg_error "cannot update $label: no source known for it. Set Ngwg.core-repo-url or a themes.<name> declaration in ngwg.yaml, then rerun ngwg update."
        return 1
    end
    if not ngwg_store_update "$url" "$dest" "$validate"
        ngwg_error "could not update $label from $url. Check the theme declaration or Ngwg.core-repo-url in ngwg.yaml, then rerun ngwg update."
        return 1
    end
    ngwg_ok "updated $label → $dest"
    test "$label" = core; and ngwg_info "the new core is picked up on the next ngwg run"
    return 0
end

function is_local_url
    string match -q '/*' -- "$argv[1]"; or string match -q './*' -- "$argv[1]"; or string match -q '../*' -- "$argv[1]"
end

# source for a theme store copy: themes.<name> declaration → CLI default
# theme URL (pacific) → the copy's own git origin. The local-path skip applies
# only to declarations — a git origin is always fetchable.
# Prints two lines: the source kind, then the URL (empty output = no source).
function theme_source  # <name> <storeDir>
    set -l name "$argv[1]"
    set -l store "$argv[2]"
    set -l declared (ngwg_declared_theme_url "$name")
    if test -n "$declared"
        echo decl
        echo "$declared"
        return 0
    end
    if test "$name" = pacific
        echo default
        ngwg_theme_repo_url
        return 0
    end
    set -l origin (ngwg_git_origin "$store")
    if test -n "$origin"
        echo origin
        echo "$origin"
    end
end

function update_themes  # [name...]
    set -l names $argv
    set -l themes_dir "$NGWG_ROOT/.ngwg/themes"
    set -l failed 0

    if test (count $names) -gt 0
        for name in $names
            set -l store "$themes_dir/$name"
            set -l src (theme_source "$name" "$store")
            set -l kind "$src[1]"
            set -l url "$src[2]"
            if test -z "$url"
                ngwg_error "cannot update theme \"$name\": no source known. Declare themes.$name: <repo-url> in ngwg.yaml (or keep the store copy's git origin), then rerun ngwg update theme $name."
                set failed 1
                continue
            end
            if test "$kind" = decl; and is_local_url "$url"
                ngwg_info "theme \"$name\" is declared as a local path ($url) — used directly, nothing to fetch"
                continue
            end
            if test -f "$store/theme.yaml"
                update_one "theme \"$name\"" "$store" theme.yaml "$url"; or set failed 1
            else
                if not ngwg_store_fetch "$url" "$store" theme.yaml
                    ngwg_error "could not fetch theme \"$name\" from $url into $store. The fetched repository is not a Ngwg theme (missing theme.yaml). Check themes.$name in ngwg.yaml."
                    set failed 1
                    continue
                end
                ngwg_ok "installed theme \"$name\" → $store"
            end
        end
        return $failed
    end

    # bare refresh: every existing store copy, nothing installed
    set -l updated 0
    if test -d "$themes_dir"
        for entry in (command ls -1 "$themes_dir")
            set -l store "$themes_dir/$entry"
            if not test -f "$store/theme.yaml"
                continue
            end
            set -l src (theme_source "$entry" "$store")
            set -l kind "$src[1]"
            set -l url "$src[2]"
            if test -z "$url"
                ngwg_warn "theme \"$entry\" has no known source — skipped. Declare themes.$entry: <repo-url> in ngwg.yaml to make it updatable."
                continue
            end
            if test "$kind" = decl; and is_local_url "$url"
                ngwg_info "theme \"$entry\" is declared as a local path ($url) — used directly, nothing to fetch"
                continue
            end
            update_one "theme \"$entry\"" "$store" theme.yaml "$url"; or set failed 1
            set updated (math $updated + 1)
        end
    end
    if test $updated -eq 0
        ngwg_info "no CLI-managed themes — nothing to update"
    end
    return $failed
end

function update_plugins  # [name...]
    set -l names $argv
    set -l script (ngwg_cli_root)/lib/ngwg-plugins.fish
    if test (count $names) -eq 0
        fish "$script" update-all $NGWG_ROOT
        return $status
    end
    for name in $names
        fish "$script" update "$name" $NGWG_ROOT
        if test $status -ne 0
            return $status
        end
    end
    return 0
end

set -l target "$args[1]"
switch $target
    case ''
        # bare update refreshes what exists — it never installs anything new
        set -l failed 0
        update_one core "$NGWG_ROOT/.ngwg/core" src/index.ts (ngwg_core_repo_url); or set failed 1
        update_themes; or set failed 1
        update_plugins; or set failed 1
        exit $failed
    case core
        set -l store "$NGWG_ROOT/.ngwg/core"
        if not test -e "$store/src/index.ts"
            set -l url (ngwg_core_repo_url)
            if test -z "$url"; or not ngwg_store_fetch "$url" "$store" src/index.ts
                ngwg_error "cannot install core from $url. The fetched repository is not a Ngwg-core (missing src/index.ts). Check Ngwg.core-repo-url in ngwg.yaml, then rerun ngwg update."
                exit 1
            end
            ngwg_ok "installed core → $store"
            ngwg_info "it is picked up on the next ngwg run"
            exit 0
        end
        update_one core "$store" src/index.ts (ngwg_core_repo_url)
        exit $status
    case theme themes
        update_themes $args[2..-1]
        exit $status
    case plugin plugins
        update_plugins $args[2..-1]
        exit $status
    case '*'
        ngwg_error "unknown update target '$target' (use core, theme or plugin)"
        echo "usage: ngwg update [core|theme [name...]|plugin [name...]]"
        exit 2
end
