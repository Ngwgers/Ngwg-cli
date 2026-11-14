# Ngwg-cli

Ngwg 的命令行入口。Fish 负责分发、依赖副本管理和环境准备；build、dev、add 经 Bun
调用 Core 公共 API。Core/CLI 不依赖 npm 包，插件和主题可以声明自己的 npm 依赖。

## 运行

准备 Fish（项目约定 >= 4.8）、支持 `Bun.YAML` 的 Bun、Git。安装归档形式插件还需
curl 和 tar。克隆 CLI 后可以直接调用，无需先安装 Core：

```fish
git clone https://github.com/Ngwgers/Ngwg-cli
mkdir my-site
cd my-site
fish ../Ngwg-cli/bin/ngwg.fish init
fish ../Ngwg-cli/bin/ngwg.fish build
fish ../Ngwg-cli/bin/ngwg.fish dev
```

`init` 生成配置和示例文章；第一次构建根据声明下载所需组件。需要网络的获取过程，
可通过配置中的本地组件路径及环境变量替代，见[配置说明](https://github.com/Ngwgers/Ngwg-docs/blob/main/configuration.md)。

下文 `ngwg` 表示对 `bin/ngwg.fish` 的调用。在 Fish 中可保存一个包装函数：

```fish
function ngwg
    fish /absolute/path/to/Ngwg-cli/bin/ngwg.fish $argv
end
funcsave ngwg
```

## 命令

| 命令 | 行为 |
| --- | --- |
| `ngwg init` | 在项目根生成 ngwg.yaml、source/_posts 和示例文章；已有 ngwg.yaml/yml 时拒绝覆盖 |
| `ngwg build` | 全量构建；每次删除并重建配置的 public_dir |
| `ngwg dev [--port N] [--speed KBPS]` | 构建后启动回环开发服务和 live-reload |
| `ngwg add` | TTY 交互表单：标题、日期、标签、分类；非终端输入须改用参数模式 |
| `ngwg add -L "标题" [-T 标签...] [-C 分类...] [-D YYYY-MM-DD]` | 直接创建文章；参数模式须提供标题，日期默认本地当天 |
| `ngwg plugin install <name> <url>` | 将插件安装到插件店；不自动修改站点配置 |
| `ngwg plugin install-all` | 安装声明读取器发现的必需插件及缺失的默认 files/feature |
| `ngwg plugin list` | 列出插件店中的副本 |
| `ngwg plugin remove <name>` | 删除插件店副本；不移除配置声明 |
| `ngwg plugin path` | 输出插件店路径 |
| `ngwg update` | 更新已有受管 Core/主题副本及插件；缺失的默认插件可被安装 |
| `ngwg update core` | 更新或安装项目 .ngwg/core；新 Core 下次命令生效 |
| `ngwg update theme [name...]` | 无名字时更新已有主题店副本；显式名字可安装缺失副本 |
| `ngwg update plugin [name...]` | 按声明重新抓取插件；无名字时处理声明读取器的更新集合 |
| `ngwg clean` | 删除项目根下固定的 public/ 和 .ngwg/ |
| `ngwg help` / `ngwg version` | 查看帮助或 CLI 版本 |

`new` 是 add 的别名，`plugins` 是 plugin 的别名。plugin 子操作支持 `ls` / `rm`。
CLI 命令的帮助输出是命令表，不会自动为每个子命令生成独立说明。

## 参数与输出

- `--root=DIR`：指定已有的项目根目录，默认当前工作目录。使用等号形式。
- `--quiet` / `-q`：减少日志。Core 保留错误和警告；Fish 侧的 warn 当前也会被 quiet
  抑制，依赖安装子进程仍可能输出自己的日志。
- `--verbose` / `-V`：增加操作跟踪；普通档输出版本、插件、构建/重载进度。
- dev 的 `--port N` 和 `--speed KBPS` 使用独立参数，不写成 `--port=N`。

开发服务固定监听 `127.0.0.1`，默认 4000 端口；CLI 参数优先于 `dev_port` /
`dev_speed`。正速度按响应字节数增加发送前延迟；0 或负数禁用。它是弱网延迟模拟，
不是逐块传输限速器。

add 写入 `<source_dir>/_posts/<date>-<slug>.md`，不覆盖已有文件；请先执行 init 或创建
配置和文章目录。交互表单支持上下键切换、Enter 前进/确认、Ctrl+C 取消，确认页支持
返回编辑。标签/分类在参数模式按空格收集，在表单里按中英文逗号分隔。

## 配置、依赖与清理

`theme` 选择主题；`themes.<name>` 声明来源，可附带 `options`。Core 来源由
`Ngwg.core-repo-url` 声明，插件由 `plugins.<key>` 声明。默认组件来源只在 CLI 注入，
Core 本身不内置官方插件或主题。

`update` 管理项目店副本，不会更新 `NGWG_CORE`、本地路径主题等外部检出。插件店可由
`NGWG_PLUGIN_DIR` 改址；本地路径插件在构建时直接加载，插件管理命令仍是在操作店
副本。更新/安装不会自动把插件声明写回 ngwg.yaml。

`clean` 当前固定删除 `<root>/public` 和 `<root>/.ngwg`，**不读取自定义 public_dir**，
也不清理外部插件店或本地检出。自定义产出目录需要自行清理。

URL 支持和管理命令与 Core 解析之间的差异见[插件管理](https://github.com/Ngwgers/Ngwg-docs/blob/main/plugin-declaration.md)。
配置文件不会把应用层插件信任开关变成代码沙箱：只运行你愿意在本机执行的插件和主题。

## CI 模板

仓库内提供 [GitHub Pages](actions/github/generate-website.yaml) 与
[Codeberg Pages](actions/codeberg/generate-website.yaml) 示例。使用前核对 Runner 的
Fish/Bun 版本、发布分支和站点 URL。模板默认上传 public/，自定义 public_dir 需修改
工作流；官方主题的根相对资源链接也不等于完整支持项目子路径部署。

## 文档与许可证

[用户与开发文档](https://github.com/Ngwgers/Ngwg-docs)。
[GNU General Public License v3.0 (GPL-3.0)](LICENSE)。
