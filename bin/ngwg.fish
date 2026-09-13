#!/usr/bin/env fish
# ngwg — Fish entry point for the Ngwg static site generator.
#
# Thin dispatcher: resolves the project root (--root=DIR, default CWD),
# picks the subcommand and hands over to subcommands/<cmd>/main.fish.
# Shared plumbing (config scraping, core resolution, repo fetch, logging)
# lives in lib/; every subcommand is self-contained — they never call each
# other. Commands that need the core's engine (build/dev/init/add) bridge
# to the TS implementation via `bun src/cli.ts`; plugin/update/clean/help/
# version run in pure fish.
#
# Usage: ngwg <command> [args…]   — see `ngwg help`

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

set -l sub (realpath (status dirname)/../subcommands)

# the command is the first non-flag argument; --help/--version aliases map
# to their subcommand wherever they appear
set -l cmd
for a in $user_args
    switch $a
        case --version -v
            set cmd version
            break
        case --help -h
            set cmd help
            break
        case new
            set cmd add
            break
        case plugins
            set cmd plugin
            break
        case '-*'
            continue
        case '*'
            set cmd $a
            break
    end
end

if test -z "$cmd"; or test "$cmd" = help
    exec fish $sub/help/main.fish
end

if not test -f $sub/$cmd/main.fish
    echo "ngwg: unknown command '$cmd'" >&2
    fish $sub/help/main.fish
    exit 2
end

# everything except the command token itself
set -l rest
set -l dropped 0
for a in $user_args
    if test $dropped -eq 0
        switch $a
            case '-*'
                set -a rest $a
                continue
            case '*'
                set dropped 1
                continue
        end
    end
    set -a rest $a
end

exec fish $sub/$cmd/main.fish $rest
