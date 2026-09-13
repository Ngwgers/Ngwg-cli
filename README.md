# Ngwg-cli

Ngwg 的命令行入口。

## 结构

```
bin/ngwg.fish              主入口：解析 --root、分发子命令
lib/                       共享库（fish）：日志档位、配置刮取、core 解析/下载、
                           受管 git 副本的抓取与更新
subcommands/<cmd>/main.fish  每个子命令一个入口，彼此不依赖，
                             只调用 lib（build/dev/init/add 经 bun 桥接到
                             src/cli.ts 的 TS 实现，其余为纯 fish）
src/cli.ts                 TS 实现（经 CoreApi 只依赖 Core 公共 API）
src/commands/add.ts        ngwg add 的 TS 实现
scripts/ngwg-plugins.fish  插件管理脚本（plugin/update 子命令与构建期自动安装共用）
```

调用链：`bin → subcommands/<cmd>/main.fish → lib`；需要 Core 引擎的命令由 lib
准备环境（`NGWG_CORE`、默认主题、默认插件源、仓库 URL）后 `bun src/cli.ts <cmd>`。

## 使用

```fish
# 直接调用
fish bin/ngwg.fish build

# 或加入 PATH 后
ngwg build
```

| 命令 | 说明 |
| --- | --- |
| `ngwg build` | 生成 public |
| `ngwg dev [--port N] [--speed KBPS]` | dev daemon + 实时重载；`--speed` 模拟弱网（10 ≈ 10KB 文件 1 秒，0/负数禁用），也可在 ngwg.yaml 用 `dev_speed` 配置 |
| `ngwg init` | 在当前目录生成 ngwg.yaml 与 source/_posts 脚手架（含默认主题源引用与 `Ngwg.core-repo-url`/`theme-repo-url`） |
| `ngwg add [-L 标题] [-T 标签...] [-C 分类...] [-D 日期]` | 新建文章：不带参数时启动交互式表单（TUI，日期自动填今天，↑↓ 切换、Enter 确认、`e` 返回编辑）；带参数时直接创建（`-D` 缺省今天，`source_dir` 读取自配置） |
| `ngwg plugin install <name> <url>` | 安装插件 |
| `ngwg plugin install-all` | 安装配置中声明的全部插件 |
| `ngwg plugin list / remove / path` | 插件目录管理 |
| `ngwg update [core\|theme [name...]\|plugin [name...]]` | 更新 `.ngwg/` 下由 CLI 管理的副本至最新版；不带参数时全部更新，`plugin`/`theme` 可追加 name 只更新指定项；`update core` 与 `update theme <name>` 在副本缺失时会直接安装（主题来源见 `themes.<name>` 声明） |
| `ngwg clean` | 删除 public/ 与 .ngwg/ |
| `ngwg help` / `version` | 帮助与版本 |

主题管理：`themes.<name>: <url> | { url, options }` 声明主题来源，`theme` 选择；远程/file:// 声明自动安装到 `.ngwg/themes/<name>`，本地路径直接使用（详见 [Ngwg-docs/configuration.md](../Ngwg-docs/configuration.md) 的"主题解析规则"）。

`--root=DIR` 可指定项目根目录（默认当前目录）。

日志三档：默认打印 Core 版本、插件列表、dev 重载进度与错误警告；
`--quiet` 只留错误与警告；`--verbose` 追加所有操作的 trace（读/写/解析/加载）。
标志可放在命令前后任意位置，如 `ngwg --verbose build`。

## 工作流

为 GitHub 与 Codeberg 提供的实例工作流位于 `actions/` 目录。

## 许可证 / License

本项目基于 [GNU General Public License v3.0 (GPL-3.0)](LICENSE) 发布。
This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).

---

## English

# Ngwg-cli

The command-line entry point for Ngwg.

## Layout

```
bin/ngwg.fish              main entry: resolves --root, dispatches subcommands
lib/                       shared library (fish): log levels, config scraping,
                           core resolution/download, managed git store fetch
subcommands/<cmd>/main.fish  one entry per subcommand, no cross-dependencies,
                             lib only (build/dev/init/add bridge to the TS
                             implementation in src/cli.ts via bun; the rest
                             are pure fish)
src/cli.ts                 TS implementation (depends on the core's public API only)
src/commands/add.ts        TS implementation of ngwg add
scripts/ngwg-plugins.fish  plugin management script (used by plugin/update and
                           build-time auto-install)
```

Call chain: `bin → subcommands/<cmd>/main.fish → lib`; commands that need the
core engine have lib prepare the environment (`NGWG_CORE`, default theme,
default plugin sources, repo URLs) and then run `bun src/cli.ts <cmd>`.

## Usage

```fish
# Invoke directly
fish bin/ngwg.fish build

# Or add it to PATH
ngwg build
```

| Command | Description |
| --- | --- |
| `ngwg build` | Generate public |
| `ngwg dev [--port N] [--speed KBPS]` | dev daemon + live reload; `--speed` simulates a slow network (10 ≈ a 10 KB file takes 1 second; 0/negative disables it), also configurable as `dev_speed` in ngwg.yaml |
| `ngwg init` | Scaffold ngwg.yaml and source/_posts in the current directory |
| `ngwg plugin install <name> <url>` | Install a plugin |
| `ngwg plugin install-all` | Install all plugins declared in the configuration |
| `ngwg plugin list / remove / path` | Plugin directory management |
| `ngwg update [core\|theme [name...]\|plugin [name...]]` | Update the CLI-managed copies under `.ngwg/` to the latest version; without arguments everything is updated, `theme`/`plugin` accept names to update only the given items; `update core` and `update theme <name>` also install when the store copy is missing (theme sources come from `themes.<name>` declarations) |
| `ngwg clean` | Remove public/ and .ngwg/ |
| `ngwg help` / `version` | Help and version |

`--root=DIR` selects the project root directory (defaults to the current directory).

Logging has three levels: by default the Core version, plugin list, dev reload progress, errors and warnings are printed; `--quiet` keeps only errors and warnings; `--verbose` additionally traces every operation (reads/writes/parsing/loading). Flags may appear anywhere before or after the command, e.g. `ngwg --verbose build`.

## Workflow

Example workflows for GitHub and Codeberg are stored in `actions/` .

## License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
