#!/usr/bin/env fish
# ngwg add — create a post (TS implementation; TUI or flag mode).

source (realpath (status dirname)/../../lib/log.fish)
source (realpath (status dirname)/../../lib/config.fish)
source (realpath (status dirname)/../../lib/store.fish)
source (realpath (status dirname)/../../lib/core.fish)

ngwg_prepare
ngwg_run_ts add $argv
