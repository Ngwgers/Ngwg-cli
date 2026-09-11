#!/usr/bin/env fish
# ngwg — Fish entry point for the Ngwg static site generator.
#
# Fish is the glue; the commands themselves are implemented in TypeScript
# and run with Bun. Usage:
#
#   ngwg build                    generate public/ (full pipeline, steps 1-9)
#   ngwg dev [--port N]           dev daemon with live-reload
#   ngwg init                     scaffold ngwg.yaml + source/ in the CWD
#   ngwg plugin <subcommand>      manage plugins (fish script from Ngwg-core)
#   ngwg clean                    remove public/ and the plugin store
#   ngwg help | version

set -l here (status dirname)
set -l cli_root (realpath "$here/..")
set -l core_root (realpath "$cli_root/../Ngwg-core")

if not type -q bun
    echo "ngwg: bun is required but was not found in PATH" >&2
    exit 1
end

# user config may override the project root (default: current directory);
# --quiet/--verbose pass through to the TS side, which applies the log level
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

# first non-flag argument is the command
set -l cmd ""
for arg in $user_args
    if not string match -q -- '-*' $arg
        set cmd $arg
        break
    end
end

switch $cmd
    case build dev init clean help version '' --help -h -v --version
        exec bun run "$cli_root/src/main.ts" $user_args

    case plugin plugins
        set -l sub $user_args[2]
        set -l script "$core_root/scripts/ngwg-plugins.fish"
        switch $sub
            case install
                exec fish "$script" install $user_args[3] $user_args[4] $root
            case install-all
                exec fish "$script" install-all $root
            case list ls
                exec fish "$script" list $root
            case remove rm
                exec fish "$script" remove $user_args[3] $root
            case path
                exec fish "$script" path $root
            case '*'
                echo "usage: ngwg plugin {install <name> <url>|install-all|list|remove <name>|path}"
                exit 2
        end

    case '*'
        echo "ngwg: unknown command '$cmd'" >&2
        echo "run 'ngwg help' for usage" >&2
        exit 2
end
