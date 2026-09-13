#!/usr/bin/env fish
# ngwg plugin — plugin store management, handled entirely by the CLI's
# ngwg-plugins.fish script. The core is resolved first because the script's
# declaration reader (plugin-urls.ts) uses the core's YAML parser.

source (realpath (status dirname)/../../lib/log.fish)
source (realpath (status dirname)/../../lib/config.fish)
source (realpath (status dirname)/../../lib/store.fish)
source (realpath (status dirname)/../../lib/core.fish)

ngwg_prepare

set -l rest
for a in $argv
    switch $a
        case ls
            set -a rest list
        case rm
            set -a rest remove
        case '*'
            set -a rest $a
    end
end

exec fish (ngwg_cli_root)/lib/ngwg-plugins.fish $rest $NGWG_ROOT
