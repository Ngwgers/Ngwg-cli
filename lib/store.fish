# lib/store.fish — managed git copies under <root>/.ngwg/ (core, themes).
# Every fetch goes into a temp dir next to the destination and is validated
# before the old copy is replaced, so a failed fetch never destroys anything.

function ngwg_store_valid  # <dir> <rel-path> → 0 when <dir>/<rel-path> exists
    test -e "$argv[1]/$argv[2]"
end

# clone <url> into <dest> (install). Fails when the clone is missing the
# <validate> path. Returns non-zero on failure; dest is untouched then.
function ngwg_store_fetch  # <url> <dest> <validate>
    set -l dest "$argv[2]"
    set -l validate "$argv[3]"
    set -l tmp "$dest.download"
    rm -rf "$tmp"
    mkdir -p (dirname "$dest")
    # git prints its own log ("Cloning into …", progress on a TTY, errors):
    # let it through instead of hiding it behind a spinner
    if not git clone --progress --depth 1 (ngwg_normalize_url "$argv[1]") "$tmp"
        rm -rf "$tmp"
        return 1
    end
    if not ngwg_store_valid "$tmp" "$validate"
        rm -rf "$tmp"
        return 1
    end
    if test -e "$dest"
        rm -rf "$dest"
    end
    mv "$tmp" "$dest"
end

# refresh an existing copy at <dest> from <url>: fetch into <dest>.update,
# validate, then swap. Returns non-zero on failure (old copy stays intact).
function ngwg_store_update  # <url> <dest> <validate>
    set -l dest "$argv[2]"
    set -l validate "$argv[3]"
    set -l tmp "$dest.update"
    rm -rf "$tmp"
    if not git clone --progress --depth 1 (ngwg_normalize_url "$argv[1]") "$tmp"
        rm -rf "$tmp"
        return 1
    end
    if not ngwg_store_valid "$tmp" "$validate"
        rm -rf "$tmp"
        return 1
    end
    rm -rf "$dest"
    mv "$tmp" "$dest"
end

# the git origin of a store copy, when it has one
function ngwg_git_origin
    git -C "$argv[1]" remote get-url origin 2>/dev/null
end
