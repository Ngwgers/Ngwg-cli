# lib/config.fish — official default sources and best-effort ngwg.yaml
# scraping. The full YAML parser lives in the core; before it is available
# the CLI scrapes the few keys it needs itself (repo URLs, theme sources).

function ngwg_ensure_root
    if not set -q NGWG_ROOT
        set -x NGWG_ROOT $PWD
    end
end

function ngwg_official_url
    switch $argv[1]
        case core
            echo https://github.com/Ngwgers/Ngwg-core
        case theme
            echo https://github.com/Ngwgers/Ngwg-default-theme
        case files
            echo https://github.com/Ngwgers/Ngwg-files
        case feature
            echo https://github.com/Ngwgers/Ngwg-feature
    end
end

# the CLI's own version, read from its package.json
function ngwg_cli_version
    set -l file (realpath (status dirname))/../package.json
    if test -f "$file"
        string match -rg '"version":\s*"([^"]+)"' <$file
    end
end

# expand a `user/repo` shorthand into a full GitHub URL (official org)
function ngwg_normalize_url
    set -l url "$argv[1]"
    if string match -qr '^[\w.-]+/[\w.-]+$' -- "$url"
        echo "https://github.com/Ngwgers/$url"
    else
        echo "$url"
    end
end

# path of the project's ngwg.yaml (or .yml); prints nothing when absent
function ngwg_config_file
    for name in ngwg.yaml ngwg.yml
        if test -f "$NGWG_ROOT/$name"
            echo "$NGWG_ROOT/$name"
            return 0
        end
    end
    return 1
end

# value part of a "key: value" line, quotes stripped
function ngwg_yaml_value
    set -l v (string replace -r '^[^:]*:\s*' '' -- "$argv[1]")
    test -z "$v"; and return 0
    string replace -r '^["\x27]' '' -- "$v" | string replace -r '["\x27]$' ''
end

# scrape the top-level `Ngwg:` section: sets ngwg_cfg_core_url and
# ngwg_cfg_theme_url (empty when the key is absent)
function ngwg_scrape_ngwg_section
    set -g ngwg_cfg_core_url ""
    set -g ngwg_cfg_theme_url ""
    set -l file (ngwg_config_file); or return 0
    set -l in_ngwg 0
    while read -l line
        set -l clean (string replace -r '#.*$' '' -- $line)
        set -l key (string trim -- $clean)
        test -z "$key"; and continue
        set -l indent (string length -- (string replace -r '\S.*$' '' -- $clean))
        if test $indent -eq 0
            string match -qr '^[Nn]gwg:$' -- $key; and set in_ngwg 1; or set in_ngwg 0
            continue
        end
        if test $in_ngwg -eq 1
            switch $key
                case 'core-repo-url:*'
                    set -g ngwg_cfg_core_url (ngwg_yaml_value $key)
                case 'theme-repo-url:*'
                    set -g ngwg_cfg_theme_url (ngwg_yaml_value $key)
            end
        end
    end <$file
end

# echo the `themes.<name>` source URL from ngwg.yaml — plain URL form or
# object form with a nested `url:` key; prints nothing when undeclared
function ngwg_declared_theme_url
    set -l want "$argv[1]"
    set -l file (ngwg_config_file); or return 0
    set -l in_themes 0
    set -l in_entry 0
    while read -l line
        set -l clean (string replace -r '#.*$' '' -- $line)
        set -l key (string trim -- $clean)
        test -z "$key"; and continue
        set -l indent (string length -- (string replace -r '\S.*$' '' -- $clean))
        if test $indent -eq 0
            set in_entry 0
            string match -q 'themes:' -- $key; and set in_themes 1; or set in_themes 0
            continue
        end
        if test $in_themes -eq 1; and test $indent -le 2
            set -l entry (string split -m 1 ':' -- $key)[1]
            if test "$entry" = "$want"
                set -l v (ngwg_yaml_value $key)
                if test -n "$v"
                    echo "$v"
                    return 0
                end
                set in_entry 1
            else
                set in_entry 0
            end
            continue
        end
        if test $in_entry -eq 1; and test $indent -ge 4
            switch $key
                case 'url:*'
                    set -l v (ngwg_yaml_value $key)
                    if test -n "$v"
                        echo "$v"
                        return 0
                    end
            end
        end
    end <$file
end
