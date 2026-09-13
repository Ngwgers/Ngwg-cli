#!/usr/bin/env fish
# ngwg init — scaffold ngwg.yaml + source/_posts. Pure fish: the scaffold is
# plain file writing; repo sources come from lib/config.fish (scraped or
# official defaults). The theme source is declared via themes.pacific — the
# legacy Ngwg.theme-repo-url override stays out of fresh scaffolds.

source (realpath (status dirname)/../../lib/log.fish)
source (realpath (status dirname)/../../lib/config.fish)
source (realpath (status dirname)/../../lib/store.fish)
source (realpath (status dirname)/../../lib/core.fish)

ngwg_ensure_root
ngwg_take_log_flags $argv >/dev/null

set -l root $NGWG_ROOT
if test -f "$root/ngwg.yaml"; or test -f "$root/ngwg.yml"
    ngwg_error "ngwg.yaml already exists at $root/ngwg.yaml"
    exit 1
end

ngwg_scrape_ngwg_section
set -l core_url (ngwg_core_repo_url)
set -l theme_url (ngwg_theme_repo_url)

mkdir -p "$root/source/_posts"

set -l theme_block
if test -n "$theme_url"
    set theme_block "themes:
  pacific: $theme_url
"
else
    set theme_block "# declare where the theme comes from, e.g.:
# themes:
#   pacific: https://github.com/Ngwgers/Ngwg-default-theme
"
end

printf '# ngwg configuration\ntitle: My Site\ndescription: 安静的站点\nbaseurl: /\ntheme: pacific\n%s# repo sources used by the CLI\nNgwg:\n  core-repo-url: %s\nsource_dir: source\npublic_dir: public\n' "$theme_block" "$core_url" > "$root/ngwg.yaml"

# echo lines, not printf — a leading "---" format string mangles printf
begin
    echo ---
    echo "title: 你好，世界"
    echo "date: 2026-01-01"
    echo "tags:"
    echo "  - 随笔"
    echo "categories: 开始"
    echo ---
    echo ""
    echo "# 你好，世界"
    echo ""
    echo "这是第一篇文章。风从海面吹过来。"
end > "$root/source/_posts/2026-01-01-hello-world.md"

ngwg_ok "scaffolded ngwg.yaml and source/_posts in $root"
ngwg_info "run `ngwg build` to generate public/"
