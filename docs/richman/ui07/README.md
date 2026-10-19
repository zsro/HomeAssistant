# UI-07 验证附件

[实施记录与边界](../ui07-menus-responsive.md) · [原图证据](native-evidence.json) · [开发页面结果](results.json) · [生产构建结果](built/results.json) · [事件回归结果](events/results.json) · [56 项测试](tests.log) · [构建日志](build.log) · [Lint 日志](lint.log)

真实流程使用本地页面、测试鉴权与新建对局，不访问生产数据库。原版 EXE 未运行。截图保留当前视口，较长窗口可在正文内滚动。

| 界面 | 桌面 | 手机 |
| --- | --- | --- |
| 原版主菜单 | [查看](built/title-desktop.png) | [查看](built/title-portrait.png) |
| 设置 | [查看](built/options-desktop.png) | [查看](built/options-portrait.png) |
| 帮助 | [查看](built/help-desktop.png) | 在系统窗口内滚动 |
| 开局 | [查看](built/setup-desktop.png)、[电脑配置](built/computer-setup.png) | [竖屏](built/setup-portrait.png)、[横屏](built/setup-landscape.png) |
| 主布局 | [查看](built/game-desktop.png) | [竖屏](built/game-portrait.png)、[横屏](built/game-landscape.png) |
| 结果 | [查看](built/result-desktop.png) | [查看](built/result-portrait.png) |

其他尺寸：[640×480](built/game-640x480.png)、[1280×960](built/game-1280x960.png)、[1440×900](built/game-1440x900.png)。小屏允许纵向滚动，原版像素布局与紧凑模式分别验收。

[结果回放](built/replay.json)核对认输次数和电脑策略；[事件回放](events/replay.json)另做了引擎重放。事件夹具的结果记录用于嵌套窗口和回调验证，不代表已从地图触发全部稀有事件。
