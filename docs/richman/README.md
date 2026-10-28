# 大富翁复刻：现状与文档入口

发布批次：2026-10-28，包含 SAVE-01～03、NET-01～03 及本页文档整理；按 Git 同步后部署流程执行。下文“未提交 / 未发布”保留的是各阶段验收时的历史状态，实际部署结果见本次发布回执。

更新：2026-10-20；原复刻基线：`6e84e79`，SAVE-01～03、NET-01～03 为本地未提交增量。当前是**日本地图、四名角色、2–4 座单机/私人房间联机的 Web 候选复刻版**。账号 SAVE/LOAD、私人房间、正式联机界面及断线/重启恢复已接入；2/3/4 人与人机恢复矩阵完成阶段验收。多人长局、公网/真机和负载仍待补验，尚未发布生产，不能称原版全部复刻完成。

## 日常只维护四份文档

| 文档 | 唯一职责 |
| --- | --- |
| 本页 | 当前能力、证据、限制和代码入口 |
| [后续路线图](../richman-roadmap.md) | 优先级、任务依赖、验收门槛、下一步 |
| [UI 还原状态](original-ui-restoration-plan.md) | 分别记录界面还原与业务接入，遵循原有 UI 优先原则 |
| [存档与联机设计](save-and-multiplayer.md) | 玩家流程、持久化边界、服务端权威及恢复协议 |

[历史与专项资料索引](archive/README.md)供定点查证，不再逐篇阅读接续。历史报告、JSON、截图和回放保留原路径，避免破坏脚本及证据引用；旧总路线图和 UI 长计划已冻结到 `archive/`。后续不再为每个小改动各建一份设计、进度和验收文档。

## 按实际能力看复刻程度

“已实现”表示当前代码有对应能力；“阶段验收”只代表报告列明的用例。没有原版完整功能分母，不给未经证实的总百分比。

| 领域 | 当前状态 | 边界与证据 |
| --- | --- | --- |
| 内容 | 日本地图、110 道路节点，孙小美/阿土伯/钱夫人/沙隆巴斯，2–4 人 | 其他地图、角色未开放；[内容与基础审计](s1-01-audit.md) |
| 对局 | 移动/岔路、地产购建与租金、银行/债务、破产/认输和结算已实现 | 默认 `surrender` / v47，保留旧候选规则；[规则阶段收口](s3-03f-god-closure.md) |
| 策略与经济 | 30 卡/13 道具候选实现、股票、公司、日历、新闻/命运、保险/彩票、魔法屋、科研、神仙与特殊对象 | 候选规则不等于原版逐项一致；[43 项收口](s2-02o-unified.md)、[地点收口](s2-03ac-site-circuit.md)、[股票收口](s2-04c-stock-circuit.md) |
| 电脑 | 15 个版本化策略，从基础行动到科研/经营组合 | Web 策略，不是原版 AI 复原；[策略收口](s3-02o-strategy-circuit.md) |
| 界面 | UI-00～UI-08 必做范围已完成；原版四区布局、工具栏、GO、业务窗口、菜单和横竖屏适配 | 字体/内部布局、插画、动画、小游戏内部皮肤仍有差异；[UI 状态](original-ui-restoration-plan.md) |
| 声音与演出 | 已接音乐、事件音效、部分语音及对象表现 | Chrome 候选验收；完整原生演出、听感与 Safari 范围另列；[声画验收](s3-04d-presentation-acceptance.md) |
| 回放与恢复基础 | 种子、版本指纹、命令日志、`replayGame` 可用于确定性重建与测试 | 下载回放不能在产品里读档；时光机领域回退也不是用户存档 |
| 存档 | SAVE-01～03 已实现并验收，尚未发布 | 原版入口接本人三个手动槽和一个自动槽，摘要/覆盖确认/重试/安全读档/保存退出可用；“继续当前对局”关闭菜单，“继续最近存档”读取云端；[产品验收](save-03-results.json) |
| 联机 | NET-01～03 宿主、私人房间、正式客户端与恢复已接入 | 原版地图/业务窗口消费安全投影，房间码/账号座位/准备/开局、服务端持久化、请求重试和旧窗口只读；已补持久请求、原地重连和后端重启，2/3/4 人与人机恢复矩阵通过；[恢复结果](net-03-results.json)。长局、真机/公网及负载仍待补验 |
| 发布 | UI 改动及前端包已进入本地提交 `6e84e79` | 历史 UI-08 记录本地打包校验通过；本次未核验远端或生产状态，不能沿用“未提交”或推断“已上线” |

## 证据与本次核对范围

- 最近 UI 总验收报告记录：188 个测试文件、2685 项用例通过，含复测及重复前缀优化边界；169 个大富翁资源、124 张 UI 图片、191 个正式包文件。详见 [UI-08 报告](ui08-acceptance-release.md)。这些是历史验收数，不是本次重新运行的结果。
- 2026-10-19 文档整理核对了代码和历史记录；2026-10-20 SAVE-01 新增恢复实现、合法命令/回放接续检查及耗时测量。71 项相关测试、133 项旧版本兼容检查、lint/build 通过；无新浏览器存读档流程、数据库或生产操作。
- SAVE-02 已在云 `homeAssistantDB_test` 验证迁移、账号隔离、并发/幂等、失败保留旧档和 8 MiB 往返；44 项后端/数据库检查与 47 项恢复回归通过；隔离 Worker 在 Node 20 云主机恢复 2,442 命令约 13.49 秒。详见[结果](save-02-results.json)。生产数据库、服务与 Nginx 未修改；公网请求限额须在发布时按设计配置。
- SAVE-03 在本机 Chrome + 真实云测试库通过新局、保存、退出/重登、读取、同一决策续玩及终局；覆盖丢应答、冲突、重登、坏档、取消及第二账号隔离。390 px 为浏览器视口模拟，并非手机真机；[结果与截图](save-03-results.json)。
- NET-01 将纯规则迁入 `shared/richman`，旧路径保留兼容导出；Node 检查点接续比较状态、事件、RNG、科研记忆和下一策略选择。云测试库覆盖授权、并发、回滚、丢提交应答、单宿主锁、重启与过载；浏览器三小游戏使用合法回放前缀进入，服务端实时计时并完成结算，不代表完整房间旅程或公网负载验收；[结果与截图](net-01-results.json)。
- NET-01 最终检查：前端 192 文件 / 2,747 项、后端 57 项、三小游戏网络流程和 12 条 SAVE/LOAD 浏览器回归通过；构建、typecheck、相关 lint 通过。前端使用线程 Worker 获得零错误退出，前两次 fork 通信超时及重复前缀优化边界保留在[验收记录](net-01-results.json)。
- NET-02：两独立登录 Chrome 通过私人房间、回合交接、丢回执重试、非当前玩家竞价、反应、射气球和连接接管；57 个前端文件 / 393 项、后端 65 项通过。回放前缀用于定点进入复杂窗口，并非声称四人完整旅程；[验收](net-02-results.json)。
- NET-03：持久待确认请求、原子回执核对、自动重连、原账号重登、窗口退役和重启恢复；真实 Chrome 关闭/重开及后端 SIGKILL、2/3/4 人/人机恢复矩阵、三小游戏与嵌套决策云库检查通过。76 项后端、58 文件 / 399 项前端、10 条恢复浏览器场景及 9 条原联机流程回归通过。人数恢复不等于全人数长局验收；[结果](net-03-results.json)。
- 后续优先级：**存档、宿主、私人房间、联机 UI 与断线恢复（已完成）→ 联机长局/公网/设备/负载验收 → 内容与表现扩展**。详见[路线图](../richman-roadmap.md)。

## 开发定位


| 路径 | 当前职责 / 后续注意事项 |
| --- | --- |
| [RichmanPage.tsx](../../frontend/src/pages/RichmanPage.tsx) | 页面、原版入口、云存档窗口、恢复继续屏障与保存退出；回放下载独立保留 |
| [cloud-saves.ts](../../frontend/src/features/richman/cloud-saves.ts)、[CloudSavePanel.tsx](../../frontend/src/features/richman/CloudSavePanel.tsx) | SAVE-03 稳定点/自动保存、不可变重试、隔离候选恢复和槽位界面 |
| [共享 engine.ts](../../shared/richman/game/engine.ts) | `GameState`、命令、去重、revision、规则、`replayGame` 与服务端检查点；前端旧路径仅兼容导出 |
| [共享 save.ts](../../shared/richman/game/save.ts) | SAVE-01 JSON 契约、稳定点、兼容校验和有界恢复；[测量结果](save-01-results.json) |
| [game/session.ts](../../frontend/src/features/richman/game/session.ts) | 浏览器宿主：动画完成、小游戏 tick、电脑执行、命令序号与科研记忆；不能只保存展示快照 |
| [computer-research.ts](../../shared/richman/game/computer-research.ts) | AI 的公开观察记忆与更新；恢复时须一并重建 |
| [src/app.ts](../../src/app.ts)、[鉴权](../../src/middleware/authenticate.ts) | 认证/用户及本人云存档路由；存档独立鉴权/大请求解析先于全局 32 KB 解析器 |
| [存档 API](../../src/modules/richman/save-routes.ts)、[Worker](../../workers/richman-save.ts) | SAVE-02 账号存档与完整恢复校验；尚不是实时联机宿主 |
| [room-service.ts](../../src/modules/richman/room-service.ts)、[RichmanOnlinePage.tsx](../../frontend/src/pages/RichmanOnlinePage.tsx) | 私人房间、成员权限、准备/原子开局及大厅界面 |
| [network/session.ts](../../frontend/src/features/richman/network/session.ts)、[network-presentation.ts](../../shared/richman/network-presentation.ts) | HTTP 网络会话、持久意图与恢复同步屏障；白名单 UI 投影，无本地权威引擎 |
| [host.ts](../../shared/richman/host.ts)、[projection.ts](../../shared/richman/projection.ts) | NET-01 纯宿主、内部时钟/AI、外部意图及用户可见投影 |
| [game-service.ts](../../src/modules/richman/game-service.ts)、[game-routes.ts](../../src/modules/richman/game-routes.ts) | 单宿主锁、MySQL 事务/恢复与本人对局 HTTP 协议；无公开创建接口 |
| [database/migrations](../../database/migrations/README.md) | 通过新迁移增加持久化；始终使用云 MySQL，不增加内存数据库模式 |
| [scripts/richman](../../scripts/richman/README.md) | 资源导出、规则审计和历史复跑命令，按任务定点使用 |

## 文档维护规则

状态变化更新本页；任务与验收结论更新路线图；界面/业务差异更新 UI 表；协议变更更新存档联机设计。详细日志、截图、回放继续进入任务证据目录，通过链接引用，不复制长日志到多个入口。

新任务先读四个入口中相关部分，再读所需历史证据。“待实现、已实现待验收、已验收、已发布”分开登记；本地检查、真实浏览器、原版运行对照和线上检查分别说明。上线始终遵守根 [AGENTS.md](../../AGENTS.md) 的 Git 同步后部署流程。
