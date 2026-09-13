#!/usr/bin/env fish
# ngwg dev — dev daemon through the core engine (TS implementation).

source (realpath (status dirname)/../../lib/log.fish)
source (realpath (status dirname)/../../lib/config.fish)
source (realpath (status dirname)/../../lib/store.fish)
source (realpath (status dirname)/../../lib/core.fish)

ngwg_prepare
ngwg_run_ts (status filename) $argv
