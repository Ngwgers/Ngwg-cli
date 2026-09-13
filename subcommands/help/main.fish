#!/usr/bin/env fish
# ngwg help — print the usage text. Pure fish; no core needed.

echo "ngwg — a quiet static site generator

usage:
  ngwg build                  generate public/ (full pipeline, steps 1-9)
  ngwg dev [--port N] [--speed KBPS]
                              dev daemon with live-reload; --speed simulates a
                              weak network (10 KB/s ≈ a 10 KB file in 1s;
                              0 or negative disables, the default)
  ngwg init                   scaffold ngwg.yaml + source/ in the current dir
  ngwg add [-L title] [-T tag...] [-C category...] [-D date]
                              create a post; without flags an interactive
                              form opens (-D defaults to today)
  ngwg plugin install <name> <url>
  ngwg plugin install-all     install every plugin declared in the configs
  ngwg plugin list
  ngwg plugin remove <name>
  ngwg plugin path
  ngwg update [core|theme [name...]|plugin [name...]]
                              update the CLI-managed copies in <root>/.ngwg/
                              (core, themes, installed plugins) to the
                              latest version; without a target everything is
                              updated. 'update core' and 'update theme <name>'
                              also install when the store copy is missing
                              (a theme's source comes from themes.<name> in
                              ngwg.yaml)
  ngwg clean                  remove public/ and the .ngwg/ directory
  ngwg help | version

options:
  --root=DIR                  project root (default: current directory)
  --quiet                     only errors and warnings
  --verbose                   trace every operation (reads, writes, parses…)

log levels: default prints the core version, loaded plugins, reload progress
and errors/warnings; --quiet keeps only errors/warnings; --verbose adds a
trace of all operations on top of the default output.

sources for the core, the default plugins (files, feature) and themes can be
overridden in ngwg.yaml:

  Ngwg:
    core-repo-url: https://github.com/Ngwgers/Ngwg-core
  themes:
    pacific: https://github.com/Ngwgers/Ngwg-default-theme
    other:
      url: https://github.com/me/my-theme
      options:               # theme-config overrides applied when selected
        per_page: 5
  plugins:
    files: https://github.com/Ngwgers/Ngwg-files
    feature: https://github.com/Ngwgers/Ngwg-feature"
