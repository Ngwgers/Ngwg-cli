# Ngwg-cli

Ngwg 的命令行入口。

## 使用

```fish
# 直接调用
fish bin/ngwg.fish build

# 或加入 PATH 后
ngwg build
```

### 调用

| 命令 | 说明 |
| --- | --- |
| `ngwg build` | 生成 public |
| `ngwg dev [--port N] [--speed KBPS]` | 启动开发服务器。 `--speed`: 控制服务器传输效率，可用于模拟弱网环境（10 ≈ 10KB 文件 1 秒，0/负数禁用），等同于配置文件的 `dev_speed` 项 |
| `ngwg init` | 在当前目录生成默认配置文件与基本目录 |
| `ngwg add [-L 标题] [-T 标签...] [-C 分类...] [-D 日期]` | 新建文章：不带参数时启动交互式表单；带参数时则直接创建。 |
| `ngwg plugin install <name> <url>` | 从远程仓库安装插件 |
| `ngwg plugin install-all` | 安装配置中声明的全部插件 |
| `ngwg plugin list / remove / path` | 插件目录管理 |
| `ngwg update [core\|theme [name...]\|plugin [name...]]` | 更新本地存储的依赖副本；不带参数时全部更新，`plugin`/`theme` 可追加 name 只更新指定项 |
| `ngwg clean` | 清理构建目录和本地存储的依赖副本 |
| `ngwg help` / `version` | 帮助与版本 |

主题管理：在配置文件中的 `themes.<name>: <url> | { url, options }` 声明主题来源，并使用 `theme` 项选择激活的主题；详见 [配置文档](https://github.com/Ngwgers/Ngwg-docs/blob/main/configuration.md) 的"主题解析规则"。


### 选项

`--root=DIR` 可指定项目根目录（默认当前目录）。

`--quiet` 指定日志打印级别为错误与警告。

`--verbose` 指定打印全部日志。

## 工作流模板

为 GitHub 与 Codeberg 提供的示例工作流位于 `actions/` 目录。

## 许可证 / License

本项目基于 [GNU General Public License v3.0 (GPL-3.0)](LICENSE) 发布。

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).

