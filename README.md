# Ngwg-cli

Ngwg 的命令行入口。Fish 是入口与胶水，命令实现是 TypeScript（Bun 运行）。

## 使用

```fish
# 直接调用
fish bin/ngwg.fish build

# 或加入 PATH 后
ngwg build
```

| 命令 | 说明 |
| --- | --- |
| `ngwg build` | 生成 public/（完整九步管线） |
| `ngwg dev [--port N] [--speed KBPS]` | dev daemon + 实时重载；`--speed` 模拟弱网（10 ≈ 10KB 文件 1 秒，0/负数禁用），也可在 ngwg.yaml 用 `dev_speed` 配置 |
| `ngwg init` | 在当前目录生成 ngwg.yaml 与 source/_posts 脚手架 |
| `ngwg plugin install <name> <url>` | 安装插件（调 Ngwg-core 的 fish 脚本） |
| `ngwg plugin install-all` | 安装配置中声明的全部插件 |
| `ngwg plugin list / remove / path` | 插件目录管理 |
| `ngwg clean` | 删除 public/ 与 .ngwg/ |
| `ngwg help` / `version` | 帮助与版本 |

`--root=DIR` 可指定项目根目录（默认当前目录）。

日志三档：默认打印 Core 版本、插件列表、dev 重载进度与错误警告；
`--quiet` 只留错误与警告；`--verbose` 追加所有操作的 trace（读/写/解析/加载）。
标志可放在命令前后任意位置，如 `ngwg --verbose build`。

## 许可证 / License

本项目基于 [GNU General Public License v3.0 (GPL-3.0)](LICENSE) 发布。
This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).

---

## English

# Ngwg-cli

The command-line entry point for Ngwg. Fish is the entry and glue; commands are implemented in TypeScript (run with Bun).

## Usage

```fish
# Invoke directly
fish bin/ngwg.fish build

# Or add it to PATH
ngwg build
```

| Command | Description |
| --- | --- |
| `ngwg build` | Generate public/ (the full nine-step pipeline) |
| `ngwg dev [--port N] [--speed KBPS]` | dev daemon + live reload; `--speed` simulates a slow network (10 ≈ a 10 KB file takes 1 second; 0/negative disables it), also configurable as `dev_speed` in ngwg.yaml |
| `ngwg init` | Scaffold ngwg.yaml and source/_posts in the current directory |
| `ngwg plugin install <name> <url>` | Install a plugin (calls Ngwg-core's fish script) |
| `ngwg plugin install-all` | Install all plugins declared in the configuration |
| `ngwg plugin list / remove / path` | Plugin directory management |
| `ngwg clean` | Remove public/ and .ngwg/ |
| `ngwg help` / `version` | Help and version |

`--root=DIR` selects the project root directory (defaults to the current directory).

Logging has three levels: by default the Core version, plugin list, dev reload progress, errors and warnings are printed; `--quiet` keeps only errors and warnings; `--verbose` additionally traces every operation (reads/writes/parsing/loading). Flags may appear anywhere before or after the command, e.g. `ngwg --verbose build`.

## License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
