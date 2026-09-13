#!/usr/bin/env fish
# ngwg clean — remove public/ and the .ngwg/ directory. Pure fish.

source (realpath (status dirname)/../../lib/log.fish)
source (realpath (status dirname)/../../lib/config.fish)

ngwg_ensure_root
ngwg_take_log_flags $argv >/dev/null

rm -rf "$NGWG_ROOT/public" "$NGWG_ROOT/.ngwg"
ngwg_ok "removed public/ and .ngwg/"
