#!/usr/bin/env fish
# ngwg init — scaffold a new site (TS implementation writes the files).

source (realpath (status dirname)/../../lib/log.fish)
source (realpath (status dirname)/../../lib/config.fish)
source (realpath (status dirname)/../../lib/store.fish)
source (realpath (status dirname)/../../lib/core.fish)

ngwg_prepare
ngwg_run_ts init $argv
