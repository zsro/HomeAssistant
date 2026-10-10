# S3-01b：混合座位终局与非当前应答接续

**S3-01 日本普通玩家基础电脑候选范围收口。** 本批沿 `basic-v1` 做验收，游戏规则保持 `japan-events-candidate-v44 / f9dbb7e9`。没有修改产品运行时或策略，没有创建 v45。S2-03/04/05 候选收口、工人 UI 修复、43 项物品、36 条新闻、日本 37 槽命运及旧版本回放保持。

## 证据与判定方式

先读实际应答者选择、Session 输入保护、600ms 调度、退出公共处置和付款返回代码，再从原日本地图新局生成合法命令路线。人类座位由浏览器点击，电脑座位由真正的 Session 自行决策；动画正常速度，只有登录鉴权 fixture，没有游戏状态注入。计划只帮助选种子与操作，不能作为浏览器验收。成功下载的回放另做独立资金核对、应答者/策略匹配和关键前缀接续。

本批先前失败或中断的脚本轮次不计通过：终局页没有“掷骰出发”按钮，旧脚本仍等待该按钮；反应窗的 fieldset 应检查 disabled 属性及实际按钮，不能把 Playwright 对 fieldset 的 isDisabled 返回值当作游戏输入防护失败。两处均修正验收脚本；失败轮次增加截图/回放诊断。重新完整运行后才归档。本批未发现需要修改产品规则或 basic-v1 的问题。

## 实际路线

七条正常速度原图路线通过，5,743 条实际命令，其中 832 条电脑决策；40 个命名前缀与完整回放状态/事件一致（相同游标合并执行）。详情及哈希见 [结果 JSON](s3-01b-results.json)。

| 路线 | 人数 / 电脑座位 | 最后回合 | 实际命令 / 电脑决策 | 实际结果 |
| --- | --- | --- | --- | --- |
| terminal-2 | 2 / 第2位 | 77 | 566 / 117 | 电脑玩家2胜；终局不再发命令 |
| terminal-3 | 3 / 第2位 | 69 | 511 / 72 | 人类玩家1胜 |
| terminal-4 | 4 / 第2、4位 | 149 | 1020 / 217 | 电脑玩家2胜 |
| attack | 4 / 第4位 | 122 | 907 / 96 | 第1位攻击、第4位电脑反应，原行动者继续移动并换人 |
| debt | 4 / 第3位 | 217 | 1505 / 147 | 第4位嫁祸租金，第3位电脑实际从银行付3200元 |
| liquidation | 3 / 第3位 | 108 | 782 / 95 | 必要清股、随后股票税退出；电脑行动中等待人类竞拍并返回原新闻 |
| auction | 4 / 第2、4位 | 61 | 452 / 88 | 第1位行动中先第3位人类、再第4位电脑应答公共拍卖 |

每条路线均验暂停/恢复、重开取消与重置、人类新局替换、全电脑等待时新局/退出、全屏和390px；没有控制台错误，退出后 RAF/Canvas 都为0。本批未重跑打包页面专项，继承 S3-01a 未改动代码的打包证据，不另计通过。

新增4项领域与7份实际回放测试，全量 **1797测试 / 126文件**、132版本人数矩阵、lint/build通过；286份历史JSON逐字节保持。首次定点领域运行2过1失败1跳过：夹具把拍卖窗口中的暂停命令当作竞价命令；改为选择未暂停的实际动作后，全量中四项均通过。

人类路线可主动用卡、买股、挂牌与竞价；这些是测试参与者的合法行为，不代表 basic-v1 已实现高级策略。电脑仍不用可选反应卡、退出竞价；每条电脑命令都与该策略当时的合法决策一致。

## 规则登记

| 编号 | 核对内容 | 证据边界 |
| --- | --- | --- |
| R10-01b | 实际 payer/responder 决定输入控制；不同于当前行动座位 | 真实 UI 导出 + 非法角色命令原子拒绝 + Session 领域 |
| R10-02b | 2～4 人混合终局、唯一胜者、结束后不再自动发命令 | 正常速度原图 UI；不等同原版败北菜单/终局栈 |
| R10-03b | 暂停重新等待、新局/重开/退出取消旧自动应答 | UI 通用生命周期与非当前窗口暂停；定点替换/dispose 为领域 |
| R10-04b | 基础策略与实际命令/控制元数据一致，关键前缀与完整回放一致 | 电脑角色固定、策略 basic-v1，非存档载入功能 |
| R05-01b-ai | 租金实际付款、必要清股、退出原债实付与公共实收分离 | 1 股必要卖出与 18 股退出变现分列；不得用公共所得补原债 |
| R07-01b-ai | 电脑拒绝可选嫁祸不消耗卡，陷害入狱后返回原行动者 | 合法获取后真实反应；不宣称主动用卡策略 |

## 资金、状态与接续边界

三人清算路线先为租金卖出 `jp:30` 一股，446 元进入银行，剩余股份保持均价；后来电脑第 3 位行动中触发股票税，第 1 位应付 373 元、实付 146 元、未付 227 元。退出后其 18 股卖出 7,470 元进入公共资金；6 块土地释放并随机处理三块，其中人类第 2 位以 2,100 元取得一块，另两块由电脑正常放弃。最终公共资金增加 7,470 + 2,100 + 146 = 9,716 元，原债未付仍 227 元。第 1 位保持退出，持股均价/库存及经营权清理；返回原新闻批次后由电脑确认，日期和当前行动座位没有在拍卖中提前推进。

四人替代付款路线中，玩家 4 通过嫁祸将 3,200 元租金转给电脑玩家 3，实际从后者银行付款并进入地主玩家 1 的银行；随后正常交给下一位。

反应路线的电脑保留嫁祸卡，接受陷害进入监狱 5 次自身行动期限；原攻击者随后继续用遥控骰子、移动和离店，回到下一位。电脑在第 104 回合正常经过 13 号路格附身大福神并获得嫁祸卡，第 121 回合实际应答；未注入反应物品。

## 覆盖范围与保留差异

本批代表性 UI 覆盖不意味着所有座位排列和触发源穷举。非当前电脑“租金可支付”窗口与“债务不足”窗口须分开：后者、非当前魔法建造、所有付款调用者组合、全部状态/角色排列没有在本批逐一补 UI。旧领域与历史人类组合证据保留，不改写成新的混合 UI 通过。没有浏览器后台节流专项、控制元数据加载为存档、难度或原版 AI 对照。

原精度/RNG/图表输入、其他资产挂牌、特殊角色、原转盘、原退出调用栈/终局、小游戏表现/碰撞、原版内存快照差异继续保留。高级卡片/股票/融资/研究/竞价策略归 S3-02，不属于基础策略卡住或非法命令缺陷。

## 收口与下一步

基础候选的终局、同命令执行、实际应答者归属、暂停/替换/退出和回放已具备代表性 UI 与领域证据，S3-01 可收口；不声称原版 AI 全量一致。下一 S3-02a 先盘点库存/合法目标/费用与风险，以遥控骰子、机器工人为首组做主动策略闭环，新增宿主 policy 版本并保留 basic-v1。不读取隐藏新闻/命运序列，不改变游戏 RNG；无新游戏语义继续 v44。股票、攻击/防御与其他策略按后续组推进。

## 复跑

终局计划：`frontend/node_modules/.bin/vite-node scripts/richman/prepare-computer-circuit.ts`。

其余固定种子路线：

```sh
RICHMAN_QUICK_ATTACK=1 RICHMAN_INTERRUPT_SEARCH=attack RICHMAN_SEED_START=17 RICHMAN_INTERRUPT_LIMIT=1800 frontend/node_modules/.bin/vite-node scripts/richman/plan-computer-interrupts.ts
RICHMAN_INTERRUPT_SEARCH=debt RICHMAN_SEED_START=0 RICHMAN_INTERRUPT_LIMIT=1800 frontend/node_modules/.bin/vite-node scripts/richman/plan-computer-interrupts.ts
RICHMAN_LIQ_START=2 RICHMAN_LIQ_LIMIT=1800 frontend/node_modules/.bin/vite-node scripts/richman/plan-computer-liquidation.ts
frontend/node_modules/.bin/vite-node scripts/richman/prepare-computer-auction.ts
RICHMAN_ROUTES=attack,debt,liquidation,auction frontend/node_modules/.bin/vite-node scripts/richman/annotate-computer-circuit.ts
```

先完成生成，再注释同一计划文件，不能同时写。`debt` 是历史脚本路线名，最终覆盖的是有足够资金的替代租金付款，不把名称当成不足退出证据。

```sh
# route: terminal-2/terminal-3/terminal-4/attack/debt/liquidation/auction
# 对应人数: 2/3/4/4/4/3/4；使用已经启动的本地服务。
RICHMAN_ROUTE=terminal-2 RICHMAN_PLAYERS=2 RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/path/to/playwright node scripts/richman/computer-circuit-ui-browser.cjs
RICHMAN_ROUTES=terminal-2 frontend/node_modules/.bin/vite-node scripts/richman/archive-computer-circuit.ts
npm --prefix frontend test -- --maxWorkers=2
npm --prefix frontend run lint
npm --prefix frontend run build
```

归档脚本要求成功浏览器报告、实际导出与计划一致，再独立验账；截图/过程文件在 `/private/tmp/richman-computer-circuit-ui-<route>`，持久证据为仓库 replay/manifest。领域测试显式用这些回放前缀重建 Session，不计为额外浏览器注入路线。本轮不提交、推送或部署。
