# UI-06 验证附件

[实施记录和暂缓项](../ui06-events-responses.md) · [素材审计](additional-assets.json) · [浏览器结果](results.json) · [夹具回调记录](fixture-calls.json) · [真实认输回放](replay.json) · [191 项测试日志](tests.log) · [构建日志](build.log) · [Lint 日志](lint.log)

真实流程使用本地页面、固定测试鉴权和新建的四人对局，不访问生产数据库。新闻等稀有事件截图顶部有“独立展示测试”标识，使用独立 root 与实际窗口宿主；它们用于展示及回调验证，不能据此声称已经从地图走到该事件。原版 EXE 未执行。

| 窗口 | 桌面 | 手机 |
| --- | --- | --- |
| 新闻 | [查看](news-desktop.png) | [查看](news-mobile.png) |
| 命运取卡 | [查看](fortune-desktop.png) | [查看](fortune-mobile.png) |
| 魔法屋 | [查看](magic-desktop.png) | [查看](magic-mobile.png)、[结果](magic-result-mobile.png) |
| 拍卖 | [查看](auction-desktop.png) | [查看](auction-mobile.png) |
| 魔法接续反应 | [查看](reaction-desktop.png) | [查看](reaction-mobile.png) |
| 债务 | [查看](finance-desktop.png) | [查看](finance-mobile.png) |
| 真实资产处置 | [查看](disposal-desktop.png) | [查看](disposal-mobile.png) |
| 真实认输 | [确认](surrender-confirm-desktop.png)、[选人](surrender-target-desktop.png) | [选人](surrender-target-mobile.png) |
| 小游戏 | [开始](minigame-desktop.png) | [开始](minigame-mobile.png)、[结果](minigame-result-mobile.png) |

长窗口在窗口正文内滚动；截图保留当前视口。手机截图检查无页面横向溢出，浏览器脚本实际滚动并点击确认/退出按钮。

构建产物真实流程的结果与截图保存在 [built/](built/results.json)。其 `replayVerified: false` 表示该轮没有从开发模块导入重放器；已检查下载回放的命令次数，同一流程在开发验证中另做了引擎重放。
