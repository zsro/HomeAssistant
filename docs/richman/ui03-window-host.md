# UI-03：工具入口与统一窗口

日期：2026-10-18。状态：**已完成本阶段，未部署**。前置：[UI-02 信息与回合操作](ui02-turn-information.md)。

## 本阶段交付

用单个 `GameWindowHost` 替代展开式长操作面板。已有业务组件各保留一个实例，工具栏、更多功能和当前操作导航都由窗口宿主管理；没有桌面/手机两套可提交表单。窗口边框和标题栏是本阶段的 Web 基础外框，逐窗原版背景、控件与内部布局从 UI-04 继续，不将这些窗口计为原版像素还原完成。

![主界面，实际运行的 640×480 逻辑画布](ui03/main-640x480.png)

[声音设置窗口](ui03/settings.png) · [功能目录](ui03/directory.png) · [手机地图选点窗口](ui03/map-selection-mobile.png) · [必答地产窗口](ui03/property-required.png)

## 入口迁移与业务边界

下表覆盖原长面板的组件及顶部工具入口。全部功能目录含 **29 个入口**；按当前模式和状态决定是否有可操作业务，空槽明确提示“当前模式或状态未启用此功能”，保留入口并挂起未接入业务。

| 旧入口 / 组件 | 新入口 | 接入与验收 |
| --- | --- | --- |
| `AudioPanel`、`GameHelp`、人物列表 | 工具栏设置、帮助、人物资料；功能目录 | 单实例，浏览不派发游戏命令；浏览器检查音频组、4 名人物和帮助展开 |
| `ItemPanel`、道具/卡片选择和商店 | 工具栏道具/卡片 → 道具与卡片窗口；商店决策自动打开 | 沿用合法目标、库存和确认回调；实图机器工人、遥控骰子回放通过 |
| `EstateSalesPanel`、`G6Panel` | 工具栏地产出售、股票；功能目录 | 原挂牌/交易组件迁移，业务条件不变；逐窗皮肤与交易流程详验留 UI-05 |
| `FinancePanel`、`PropertyPanel` | 银行与债务、地产；真实决策自动打开 | 必答操作不可用通用关闭/Escape 跳过；银行组件测试、真实地图购买验证通过 |
| 彩票、保险、公司服务/营业、日历分红 | 功能目录对应窗口；决策自动打开 | 原组件与命令复用；独立保险决策优先于粗粒度 phase；完整皮肤/场景留后续阶段 |
| 研究/道路状态、设施、魔法屋及其记录、商店记录 | 功能目录对应窗口；决策自动打开 | 复用原合法性判断与记录；不新增业务 |
| 命运、新闻、拍卖、反应、资产处置 | 功能目录对应窗口；决策自动打开 | 按决策 ID、实际应答人更新窗口；嵌套反应测试覆盖，完整外观/事件链留 UI-06 |
| 交通、旅途、岔路、认输与衰神、电脑状态 | 功能目录对应窗口；岔路/认输自动打开 | 保留原模式限制与回调；岔路可收起看地图 |
| `MinigamePanel` | 小游戏；决策自动打开 | 保留计时和快速输入，不套用普通按钮的双击过滤 |
| 回放、验证模式、诊断与错误重试 | 运行信息与验证工具 | 下载真实回放并重放；高级工具继续可达 |
| 小地图、托管设置 | 原工具栏小地图切换、托管设置打开开局配置 | 沿用 UI-02 行为；配置取消恢复原决策与原暂停状态 |
| LOAD / SAVE | 原工具栏读档 / 存档 | 保留原图标及未接入提示；浏览器确认不改变 revision；业务继续挂起 |
| 暂停、重开、新局 | 页面快捷入口及窗口标题栏 | 继续复用已有命令和确认框；不取消未完成的业务决策 |

窗口 UI 基础已迁移；本阶段没有把所有目录项目都实玩一遍。原有业务合法性与游戏规则保持不变，逐项业务场景及原图验收继续按 UI-04～UI-08 执行。

## 窗口交互

- 浏览窗口使用原生模态 dialog；Tab 留在窗口内，关闭返回工具栏触发按钮。触发按钮失效时返回地图。
- 必答窗口由真实快照推导。保险独立字段、拍卖/反应应答人、付款人和命运领取进度参与身份判断，普通账户 revision 变化不会重置银行输入或抢走焦点。
- 必答窗口优先于浏览请求。关闭按钮禁用，Escape 只提示通过业务按钮完成，不擅自离开银行、付款或结束回合。
- 地图相关选择使用非模态窗口。“地图选点”、Escape 或页面返回地图快捷入口收起窗口，显示“返回当前操作”；不取消、不消费。已选目标在手机尺寸和全屏切换中保留。
- 手机选点窗口高于快捷导航，实际点击命中检查防止底层导航遮挡窗口内容。窗口内部可滚动，地图可以先收起窗口再操作。
- 开局/重开/未接入提示保留现有原生确认框，打开期间暂停显示业务窗口，关闭后恢复。取消开局会恢复原先暂停状态，原本已暂停的对局不会自动继续。
- 窗口先处理 Escape，再处理回退全屏退出。新局使用独立 epoch 清理旧窗口，避免同种子/回合/revision 重用旧操作。
- 窗口正文提交前核对渲染 revision 和新局 epoch；过期界面操作不传到命令回调。普通按钮过滤双击的第二次 click 和持续按住提交键，小游戏快速输入除外；引擎原有决策 ID 校验保留。

## 实现与验证

新增 `GameWindowHost.tsx`、`window-state.ts`、`window-input.ts`；`RichmanPage.tsx` 组合既有业务组件，`decision-navigation.ts` 将隐藏窗口内的目标交给宿主打开。没有修改游戏引擎规则。本阶段未新增原图，沿用 **47 张 UI 图片 / 92 个发布资源文件**。

- 8 个测试文件、**53 项通过**。新增窗口测试覆盖单实例、草稿和焦点、必答优先级、地图收起、嵌套应答、独立保险、配置暂停显示、新局清理、空槽提示、过期操作和银行重复点击。银行验证使用组件快照夹具，不声称浏览器实玩了原版地图银行路线。
- lint、TypeScript/Vite build、资源哈希检查及 `git diff --check` 通过。既有大 chunk 和数学/PDF 模块混合导入提示仍存在。
- [浏览器结果](ui03/browser-results.json)：桌面、精确 640×480、640×480 视口、1280×960、844×390、390×844、原生/回退全屏；真实日本地图上机器工人选点、暂停恢复、双击只建造一次、遥控骰子、落点地产必答窗口、开局取消恢复暂停状态。
- [回放](ui03/window-replay.json)：重放确认仅消耗 1 个机器工人和 1 个遥控骰子，建造一次，停留在第 1 回合 turnEnd；浏览/收起不插入业务命令。
- [构建产物结果](ui03/built-browser-results.json)：独立 preview 验证打包 JS、图片、全部目录入口、模态 Tab、Escape 焦点恢复及尺寸布局。两轮浏览器错误为空；离开路由后 canvas 与 RAF 均为 0。

复跑命令：

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend test -- src/features/richman/GameWindowHost.test.tsx src/features/richman/ClassicTurnUI.test.tsx src/features/richman/ClassicToolbar.test.tsx src/features/richman/decision-navigation.test.tsx src/features/richman/map-picking.test.ts src/features/richman/map-geometry.test.ts src/features/richman/MinigamePanel.test.tsx src/features/richman/game/session.test.ts
node scripts/richman/check-release-assets.cjs
# 本地 dev 服务 5174，Playwright 路径按环境设置。
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/richman/classic-window-browser.cjs
# build 后另启 preview 5175：
RICHMAN_TEST_BASE_URL=http://127.0.0.1:5175 RICHMAN_BUILT_SMOKE=1 RICHMAN_TEST_OUTPUT=/private/tmp/richman-ui03-built PLAYWRIGHT_MODULE=/path/to/playwright node scripts/richman/classic-window-browser.cjs
```

## 下一阶段

UI-04 在该宿主上还原地产、目标选择与基础银行窗口的原版外观，核对窗口资源身份、热区及字段。未实现功能继续保留入口，业务挂起。本阶段未提交、推送、制作正式发布包或部署。
