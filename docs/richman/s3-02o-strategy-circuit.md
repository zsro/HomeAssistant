# S3-02o：策略组合与长局收口验收

本批沿 `research-v1` 和 a～n 既有合法路线补组合验收。世界保持 `stockCircuit / japan-events-candidate-v44 / f9dbb7e9`，十五个 policy 不改行为，默认全人类/basic-v1、娃娃预览修复及历史候选范围保持。S3-02的保守Web策略候选范围收口；真实结果与保留差异见[结果](s3-02o-results.json)，不等同于原版AI完整复刻。

## 规则登记与边界

| 登记 | 本批核对 |
|---|---|
| R10-01o 策略组合 | research-v1沿同一命令接口运行，十四旧policy原样保留；逐电脑动作重算策略，区分当前行动者与反应/实际付款/拍卖应答者。策略不读隐藏序列、不抽游戏RNG；本批不新增策略权重或版本。 |
| R10-02o 生命周期 | 正常600ms电脑等待与原动画；暂停保持revision，恢复重新等待；重开对话框取消、真正重开、换全人类新局和离开销毁。浏览器核对电脑窗口控件禁用，领域覆盖非当前电脑反应/付款/拍卖及人类应答窗口。 |
| R05-01o 必要清股 | 原图合法购股后，必要数量卖出进入实际付款人的银行；数量向上满足缺口，实收按价格乘数量取整，剩余均价保持、零持仓归零。该玩家正常付款后仍可继续行动。 |
| R05-02o 退出公共处置 | 原债应付、实收、未付从退出开始冻结；最后存活分支不冒充普通资产清理。非最后分支持地>3抽三块拍卖，所有公共所得独立记账；退出不能复活、公共所得不补原债。命运付款回调必须在处置完成后返回。 |
| R06-01o 股票与经营权 | 普通买卖核对现金不变、银行实付、成本/均价；逐命令核对公司持股排名与经营者、退出清零。沿用v42行情/v43账本/v44幅度，不改变原精度和RNG差异。 |
| R07-01o 时光与公开观察 | 既有合法科研生产与使用后，核对世界恢复、全部观察/快照失效，RNG/命令revision/行动编号不回退；逐前缀从已接受命令折叠公开观察，再核对下一电脑决策及完整回放。不从隐藏快照装入策略记忆。 |
| R07-02o 恢复后连续性 | 三人路线从4月15日恢复到14日，继续越过15日并正常行动至328回合。观察仅在持有时光机的已接受出发命令形成；本条后续没有再次取得时光机，因此观察保持空，不声称浏览器验证了“重新科研获得第二台后的新观察”。 |

来源、代码摘要及十四组历史登记见[来源](s3-02o-sources.json)。本轮是已有Web候选的组合验收，没有新增原版运行证据；原生AI与Web启发式不等价。

## 原图路线

所有新浏览器路线使用原日本图、正常速度、正式Session电脑动作，仅登录fixture；计划只指导人类合法点击，不注入库存、产权、资金或游戏状态。开局资金通过原新局菜单选择；低资金终局与高资金科研路线分别记录，不能合称同一场景。

| 路线 | 座位与准备 | 核对范围 |
|---|---|---|
| terminal-2 | 2人、1电脑，10000资金，1998-01-14 | 196回合终局、命运费用不足、最后存活与终局停止行动 |
| terminal-3 | 3人、1电脑，10000资金，1998-01-14 | 72回合、两次退出、普通/最后退出分支、人机归属 |
| terminal-4 | 4人、2电脑，10000资金，1998-01-14 | 502回合终局、当前人类反应/债务/拍卖应答、三块无人购买 |
| restore-3 | 延用S3-02n三人科研原图，300000资金 | 自有研究所合法生产时光机、25次股票交易、公开损失触发恢复、继续24个以上行动与日期 |
| liquidation | 4人、1电脑，30000资金，1998-01-01 | 人类以合法买卖/挂牌形成资金压力；玩家1必要卖1股764元后继续，玩家2另因命运17应付12000、实付7927、未付4073退出，三块拍卖实收1600；非当前电脑拍卖应答 |

压力路线的人类动作是为了到达边界，不代表自然或最优玩法。必要清股与退出涉及不同玩家；公开拍卖收入和原债回调分别断言。新终局路线不覆盖贷款不足/负分红所有分支，这些保留S2-05a及S3-02m领域/既有原图证据，不写成新浏览器已执行。

## 验收方法

新增 `strategy-circuit.test.ts` 以历史真实回放前缀恢复到非当前应答点，再在Session领域验证研究策略归属、拒绝人类抢答、暂停重新计时、换局/销毁使等待失效；这些是领域用例，不冒充新UI路线。

`verify-strategy-circuit.ts` 对实际导出逐命令检查：合法actor、电脑策略匹配、反应卡消耗/供应、必要卖股、租金收款、退出账单冻结、公共处置、付款回调及持股/经营权。恢复断言可以在验收器读取G7世界快照；策略本身不能读取它预知收益。每个命名关键前缀以公开命令重建观察，并重放至最终状态、事件与记忆一致。完整回放、JSON摘要和哈希另归档；这不是新增存档导入功能。

新路线实际非当前人机应答发生在liquidation公开拍卖。terminal-4的反应/债务/拍卖窗口仍由当前玩家应答；runner的历史字段`crossChecks`只是窗口检查标签，不保证actor与active不同，以归档器`cross`逐命令判断为准。非当前电脑反应/付款保持历史回放和本批领域证据。

浏览器路线核对暂停/继续、重开对话框取消、重开、换全人类局、终局停止、全屏、390px和离开后的RAF/Canvas清理。真正取消工具、瞬时目标失效等仍由对应分组领域覆盖，不把禁用取消按钮等同于人类取消成功。

## 真实验收与收口判定

五条2～4人原图11002实际命令/2043电脑决策、78命名前缀与完整回放通过；含196/72/502回合三条终局、三人科研恢复后至328回合和四人必要清股/公共处置。相关测试去重953项/30文件通过（非全前端重跑）；132跨版本矩阵、lint/构建/十五策略打包UI通过，412旧fixture及所有既有运行代码保持。

新增4项Session领域用例包含在945项相关回归中；另重新校验3条历史科研回放和5条新实际回放，共953项。所有新归档完整验证各自关键前缀；Vitest随后以`RICHMAN_SKIP_REPEATED_PREFIXES=1`复核逐命令、全回放与哈希，避免重复同一前缀。历史科研回放重验不计作本轮重新跑过浏览器。

| 实际路线 | 命令 | 电脑决策 | 命名前缀 | 结果 |
|---|---:|---:|---:|---|
| terminal-2 | 1448 | 287 | 9 | 终局 |
| terminal-3 | 551 | 86 | 11 | 终局 |
| terminal-4 | 3782 | 702 | 21 | 终局 |
| restore-3 | 2556 | 672 | 16 | 连续行动/处置接续 |
| liquidation | 2665 | 296 | 21 | 连续行动/处置接续 |

五条正常速度原图UI错误均为0、退出RAF/Canvas均为0。实际公开处置拍卖实收1600，原债实收7927及未付4073保持不变；三人时光恢复后继续跨日期，宿主观察清空且未误用旧观察。四人路线额外核对娃娃清除1个地雷、1个未携带炸弹的预览修复。

本轮未发现需改变游戏或策略行为的阻断问题，无新policy、无v45。修正了新增验收代码的结果类型收窄，补强必要清股/均价/经营权、回调实收与公开观察断言；没有借验收重写旧系统。

判定：a～n分组策略加本批2～4人组合、完整终局、生命周期与回放证据，足以收口当前保守Web策略候选。下列原AI及未测UI仍独立保留；不将有限路线视为所有种子/所有角色/全部联动穷举。下一进入 **S3-03a：神仙/车辆已有规则与剩余原版差异盘点**，优先核验神仙运气消费者、刷新游走与生命周期。已有规则/策略保持，新规则有证据才另设版本。

## 保留差异

- 原AI权重、长期经营/陷阱、全角色与完整难度没有复刻；路线仍是局部公开启发式，不保证最优或必胜。
- 时光机只使用宿主已有公开观察；不预读隐藏新闻/命运或快照收益。新宿主只有引擎快照时不会凭空恢复观察；当前无存档导入/逐座不同policy/后台节流验收。
- 核子非空道路物件/神仙命中、全部盟友与科研保护、非自身传送对象仍保留前批领域和UI覆盖差异，不宣称穷举通过。
- 原行情精度/RNG/走势图、其他资产挂牌、特殊角色、原转盘、原退出调用栈/终局和小游戏表现/碰撞继续单列。当前胜负仍是最后未破产玩家获胜的限定玩法。

## 复现

```sh
RICHMAN_PLAN_STRATEGY=1 node_modules/.bin/vite-node scripts/richman/plan-strategy-circuit.ts
RICHMAN_PLAN_STRATEGY=1 RICHMAN_EXTEND=1 RICHMAN_COUNTS=3 node_modules/.bin/vite-node scripts/richman/plan-strategy-circuit.ts
RICHMAN_PLAN_STRATEGY_LIQUIDATION=1 RICHMAN_PLAYERS=4 RICHMAN_LIQ_START=4 RICHMAN_LIQ_END=5 node_modules/.bin/vite-node scripts/richman/plan-strategy-liquidation.ts
RICHMAN_ROUTES=liquidation node_modules/.bin/vite-node scripts/richman/annotate-strategy-circuit.ts
# 本地服务5175；PLAYWRIGHT_MODULE指向本机已安装模块。依次指定五个route/players。
RICHMAN_ROUTE=terminal-2 RICHMAN_PLAYERS=2 node scripts/richman/strategy-circuit-ui-browser.cjs
RICHMAN_ROUTE=terminal-3 RICHMAN_PLAYERS=3 node scripts/richman/strategy-circuit-ui-browser.cjs
RICHMAN_ROUTE=terminal-4 RICHMAN_PLAYERS=4 node scripts/richman/strategy-circuit-ui-browser.cjs
RICHMAN_ROUTE=restore-3 RICHMAN_PLAYERS=3 node scripts/richman/strategy-circuit-ui-browser.cjs
RICHMAN_ROUTE=liquidation RICHMAN_PLAYERS=4 node scripts/richman/strategy-circuit-ui-browser.cjs
RICHMAN_ROUTES=terminal-2,terminal-3,terminal-4,restore-3,liquidation node_modules/.bin/vite-node scripts/richman/archive-strategy-circuit.ts
npm --prefix frontend test -- --maxWorkers=1 strategy-circuit-browser.test.ts
```

归档器默认完整验证关键前缀。若已完成同批全前缀归档，可在Vitest设置`RICHMAN_SKIP_REPEATED_PREFIXES=1`，仍逐命令检查、完整重放和核对归档哈希，不再次重复同一前缀计算。相关回归的实际范围与结果记入JSON，不声称全前端全部用例重跑。

本批保留累计工作区；不提交、推送、部署，不操作数据库或重新导出素材。
