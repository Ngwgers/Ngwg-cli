# lib/log.fish — log levels and output helpers for fish-side subcommands.
#
# Levels mirror the core's Logger: --quiet keeps errors/warnings only,
# --verbose adds traces. TS-backed subcommands pass the flags through to the
# core's logger instead; fish-side subcommands call ngwg_take_log_flags first.

function ngwg_take_log_flags
    set -g ngwg_log_level default
    set -l rest
    for a in $argv
        switch $a
            case --quiet -q
                set ngwg_log_level quiet
            case --verbose -V
                set ngwg_log_level verbose
            case '*'
                set -a rest $a
        end
    end
    if test (count $rest) -gt 0
        printf '%s\n' $rest
    end
end

function ngwg_error
    echo "ngwg: $argv" >&2
end

function ngwg_warn
    test "$ngwg_log_level" = quiet; and return 0
    echo "ngwg: $argv" >&2
end

function ngwg_info
    test "$ngwg_log_level" = quiet; and return 0
    echo "ngwg: $argv"
end

function ngwg_ok
    test "$ngwg_log_level" = quiet; and return 0
    echo "ngwg: $argv"
end
