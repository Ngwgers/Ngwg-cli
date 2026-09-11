#!/usr/bin/env fish
# ngwg — Fish entry point for the Ngwg static site generator.
#
# Fish is a thin glue here: it checks for bun, resolves the project root and
# hands everything to the bootstrap (src/main.ts). The bootstrap resolves the
# Ngwg core at runtime — using the monorepo checkout when developing, or
# auto-downloading it into <root>/.ngwg/core on first use (see Ngwg-docs) —
# and dispatches all commands, including plugin management.
#
# Usage:
#   ngwg build | dev | init | clean | plugin <subcommand> | help | version
#   options: --root=DIR  --quiet  --verbose

if not type -q bun
    echo "ngwg: bun is required but was not found in PATH" >&2
    exit 1
end

# user config may override the project root (default: current directory)
set -l root $PWD
set -l user_args
for arg in $argv
    if set -l pair (string match -r '^--root=(.+)$' -- $arg)
        set root (realpath $pair[2])
    else
        set -a user_args $arg
    end
end
set -x NGWG_ROOT $root

exec bun run (realpath (status dirname)/../src/main.ts) $user_args
