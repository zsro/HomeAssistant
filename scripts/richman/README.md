# Richman 技术验证资源工具

> 文档整理（2026-10-19）：本页保留阶段记录/专项参考，历史状态与下一步不代表当前排期。现状见[项目总览](../../docs/richman/README.md)，后续任务见[路线图](../../docs/richman-roadmap.md)。 下文各批次的默认版本、测试安排和进度只适用于对应历史阶段；按当前任务选择复跑命令。

本目录只负责离线转换用户提供的游戏资源；Web 端不加载或执行 Windows EXE。

## 生成素材

需要 C 编译器、Python 3、Pillow 和 NumPy。安装目录参数指向包含 `Data.mkf`、`map.mkf`、`MapDat.MKF` 的 `Game` 子目录：

```sh
python3 scripts/richman/export_assets.py --game /path/to/rich4/Game
```

默认生成 `frontend/public/richman/generated/`，包含：

- 日本地图 WebP、缩略图。
- 四个头像、379 个精灵帧的 WebP 图集。
- 地图节点、精灵矩形、原始锚点、动画分组、来源 SHA256 的 JSON 清单。

当前转换器针对本次核验的四地图本体文件。资料片的资源编号不同，不支持直接混用。S1-03 导出日本住宅五级 × 八朝向（40 帧），清除 49 个样例房屋，只保留 12 个地标布景；住宅按对局归属和等级显示。住宅等级资源与朝向是待原版运行对照的候选映射。人物使用八方向站立和行走序列，帧锚点保留原始坐标。

生成物被 Git 忽略，原安装目录只读；完整资源与音频包不进入源码仓库。当前功能仅用于本地技术验证，发布前需另外确定素材分发及构建流程，避免部署只有代码而没有资源的页面。转换所需的游戏文件不包含在这个仓库中。

## 依赖出处

`vendor/mkf_decompress.c` 与 `.h` 来自 https://github.com/mytbk/rich4/tree/master/csrc/mkf 。该项目的 GPL-3.0 许可文件保留为 `vendor/COPYING`。解压库仅在本机转换时编译成临时动态库，不编译或链接进网页。原版素材不适用该工具的代码许可证。

## 前端验证

```sh
npm --prefix frontend run test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run dev
```

入口 `/modules/richman` 受现有登录鉴权保护。S2-02 第二批默认进入建造对局（当前地块机器工人＋遥控骰子，限定规则），保留首批道具对局，保留 2–4 人地产对局，支持购买、升级、基础租金、银行存取款、债务/破产及最后存活者胜负，保留种子和回放；保留仅移动与自由验证模式；没有新增数据库模式或存档表，刷新页面重新开始。实现与测试见 [S1-04 记录](../../docs/richman/s1-04-finance.md)。

## S1 地图与经济字段审计

此命令只读原文件，独立生成审计数据，不改变当前网页 manifest 或建筑布景：

```sh
python3 scripts/richman/audit_map.py --game /Users/zsr/Documents/rich4/Game --output docs/richman/japan-map-audit.json
python3 -m unittest discover -s scripts/richman -p 'test_*.py' -v
RICHMAN_GAME_DIR=/Users/zsr/Documents/rich4/Game python3 -m unittest discover -s scripts/richman -p 'test_*.py' -v
```

第二条仅使用标准库，跳过本地安装文件测试；第三条启用本地文件测试，需要与素材转换相同的依赖，验证审计数据可再生成及道路数据与 S0 一致。当前机器也可使用已有含 Pillow/NumPy 的 Python：`/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`。

JSON 保留原始字段名、字节偏移和来源哈希。逆向仓库版本与当前 EXE 不同，部分头文件的价格字段标签存在冲突，不能直接把原始字段当作已确认的运行规则。数值事实、候选语义、待核实项和下一步结构见 [S1-01 报告](../../docs/richman/s1-01-audit.md)。

## S1-03 运行地产目录

```sh
python3 scripts/richman/build_properties.py
```

从已登记的审计 JSON 生成并提交 `frontend/src/features/richman/game/japan-properties.json`，保留来源哈希、候选证据状态、49 个普通地产和 5 个大型用地的独立 ID、多路格引用、价格、租金、朝向。大型用地仅保留共享状态，不启用普通住宅经济。此命令只需要 Python 标准库，不重新解包原游戏。

旧素材必须重新运行 `export_assets.py`：清单需要 `propertyArtVersion: 1` 及 `house-1-0` 至 `house-5-7` 帧。页面同时核对 MapDat 来源哈希和地产道路类型，缺失/混用会显示可重试错误，不会拿样例房屋静默开局。

S1-04 没有新增素材，无需重导 S1-03 资源。新的金融规则在纯前端引擎中实现，不创建独立测试账号、数据库模式或云端存档；利息、贷款与破产后随机拍卖暂未开放。

### S1 完整浏览器对局验收

`acceptance-browser.cjs` 使用原始日本地图，在本地 Vite 上操作 2、3、4 人完整对局，下载回放与引擎计划核对。仅在隔离上下文模拟鉴权和加速动画适配器，产品代码及道路数据不注入测试状态。完整说明见 `docs/richman/s1-05-acceptance.md`。

```sh
# 先启动 frontend 的 Vite；Chrome 与 Playwright 需已安装。
# 若 Playwright 不在 Node 模块搜索路径，可将 PLAYWRIGHT_MODULE 指向其模块目录。
RICHMAN_TEST_ORIGIN=http://127.0.0.1:5174 \
RICHMAN_TEST_OUTPUT=/private/tmp/richman-s1-05 \
node scripts/richman/acceptance-browser.cjs

npm --prefix frontend test -- src/features/richman/game/acceptance.test.ts
```

只允许 localhost / 127.0.0.1。截图、结果 JSON 与回放写入指定输出目录，不提交用户资源或浏览器测试令牌。长局动画加速不能替代正常速度暂停/播放回归。


### S2-01 效果目录只读核验

```sh
python3 scripts/richman/audit_effects.py \
  --game /Users/zsr/Documents/rich4/Game \
  --reference /private/tmp/rich4-tools-audit/rich4-master

RICHMAN_GAME_DIR=/Users/zsr/Documents/rich4/Game \
RICHMAN_REFERENCE_DIR=/private/tmp/rich4-tools-audit/rich4-master \
python3 -m unittest discover -s scripts/richman -p 'test_audit_effects.py'
```

参考目录必须来自记录中的固定快照；路径可按机器调整。只读核验 EXE 的 30 卡/13 道具表与 PE 名称指针，检查本地 MKF 事件资源目录，不转换新图片、不修改原文件。结果为 `docs/richman/effects-audit.json`；语义和实现边界见 `docs/richman/s2-01-effects.md`。原始字段匹配不等于本地原版行为已实测。生成的目录不直接启用任何游戏效果。

### S2-02 遥控骰子闭环与验证

规则、来源、限制及下一批接续见 [首批记录](../../docs/richman/s2-02-items.md)。首批仅开放遥控骰子；开局每人 1 个、0 点，可在点数格获得点数，三越百货以 30 点购买。不需要重导素材。

```sh
# 仅从既有审计生成 13 个点数格和 2 个商店入口，不重新扫描原文件。
python3 scripts/richman/build_item_nodes.py

# 完整原始地图 2/3/4 人道具对局；默认不传 MODE 时仍验证旧地产模式。
RICHMAN_TEST_MODE=tools RICHMAN_TEST_OUTPUT=/private/tmp/richman-s2-02 \
node scripts/richman/acceptance-browser.cjs

# 正常速度验证选择、取消、暂停、全屏、390px、回放和重开，固定本地 5174。
node scripts/richman/items-ui-browser.cjs
```

浏览器脚本均可用 `PLAYWRIGHT_MODULE` 指定已有模块目录，未添加项目依赖。测试鉴权仅在隔离 context 注入，产品仍使用网站已有登录。

### S2-02 第二批机器工人

第二批 `japan-tools-candidate-v2` 额外开局发放 1 个机器工人，仅在当前普通地产且未满 5 级时使用。工人不在商店出售，消费后仍可掷骰。首批 v1 模式、注册表与指纹保留，详见 [第二批报告](../../docs/richman/s2-02b-worker.md)。无新素材，无需重导或重扫资源。

```sh
# 本地 Vite 5174，正常速度实际页面按钮；仅隔离鉴权模拟。
# 可用 PLAYWRIGHT_MODULE 指定已有 Playwright，不增加项目依赖。
node scripts/richman/construction-ui-browser.cjs
npm --prefix frontend test -- src/features/richman/game/construction.test.ts src/features/richman/ItemPanel.test.tsx
```

默认截图/回放/结果输出 `/private/tmp/richman-s2-02b-ui`，可通过 `RICHMAN_TEST_OUTPUT` 修改。当前范围刻意限定，不能把该验收当作完整工人选地或原版运行一致性证明。


### S2-02 第三批邻近建造候选版

第三批当时默认 `japan-tools-candidate-v3`，使用已核验的方向 0 投影表列出角色周边普通地产候选，支持选择、地图定位、免费建造后继续掷骰。角色中心/固定方向/锚点筛选是 Web 约定，**不是原版像素遮挡命中的等价实现**。v2 当前地块模式与 v1 遥控骰子模式保留。证据、边界及下一批入口见 [第三批报告](../../docs/richman/s2-02c-targeting.md)。

```sh
# 只读已固定哈希的参考源码，提取方向 0 表；无需游戏资源重导。
python3 scripts/richman/build_worker_projection.py /private/tmp/rich4-tools-audit/rich4-master/asm/rich4.asm
python3 -m unittest discover -s scripts/richman -p 'test_build_worker_projection.py'
# 本地 Vite 5174；正常速度/原地图/隔离测试鉴权。
node scripts/richman/nearby-construction-ui-browser.cjs
```

测试脚本可通过 `PLAYWRIGHT_MODULE` 指定现有依赖，通过 `RICHMAN_TEST_OUTPUT` 指定结果目录，默认 `/private/tmp/richman-s2-02c-ui`。临时源码可能被系统清理；按 `s2-02c-sources.json` 固定提交 URL 恢复必要文件并验证 SHA，不重新下载完整仓库。没有参考源码时再生成测试明确跳过，不能记作已验证；其余纯规则/旧回放测试不依赖临时文件。

### S2-02 第四批遮挡核验与地图点选

邻近 v3 模式现在支持点击 Web 地图中的空地/住宅，再明确确认建造；使用现有图集 alpha 与实际绘制顺序处理透明穿透及前景遮挡，列表选择保留。**不改变 v3 合法集合/指纹，不新增 v4**。本地 MAP[26] 是 16 位 SMP，与参考字节命中接口的对应尚未确认；不能据此宣称原版选地已还原。详情见 [第四批报告](../../docs/richman/s2-02d-picking.md)。

```sh
# 定点解压一个条目，仅写格式/元数据 JSON；需既有 Pillow/NumPy 和 C 编译器。
python3 scripts/richman/audit_hit_source.py --game /Users/zsr/Documents/rich4/Game
# 纯格式检查和已记录证据回归，不重复扫描素材。
python3 -m unittest discover -s scripts/richman -p 'test_audit_hit_source.py'
# 本地 Vite 5174，正常速度 UI 点击、回放与清理；可用 PLAYWRIGHT_MODULE 指定依赖。
node scripts/richman/map-picking-ui-browser.cjs
```

浏览器默认输出 `/private/tmp/richman-s2-02d-ui`，可用 `RICHMAN_TEST_OUTPUT` 更改。新增原 v3 回放夹具只用于兼容测试，未引入存档/云端状态或产品鉴权绕过。


### S2-02 第五批路障与机器娃娃

第五批当时默认 v4 道具组合对局；开局两件各 1，商店路障 30 点/娃娃 15 点。支持放置、截停、九格清路和有限池回收；娃娃路线提前显示，分岔规则为显式 Web 候选。旧 v1/v2/v3 模式和回放保留。详见 [第五批报告](../../docs/richman/s2-02e-road-tools.md) 与 [43 项进度](../../docs/richman/s2-02-progress.md)。本批无需重导素材或重跑资源审计。

```sh
npm --prefix frontend test -- src/features/richman/game/road-tools.test.ts src/features/richman/RoadToolChoice.test.tsx
# Vite 127.0.0.1:5174，正常速度/原地图/隔离鉴权，含截图与下载回放验证。
node scripts/richman/road-tools-ui-browser.cjs
```

同样支持 `PLAYWRIGHT_MODULE`、`RICHMAN_TEST_OUTPUT`；默认输出 `/private/tmp/richman-s2-02e-ui`。171 项全量通过后新增商店 UI 一项，定点 18 项通过，累计 172；2–4 人 v4 完整局为纯引擎验收，浏览器仅跑本批组合闭环，不伪称重新完成全部长局。


### S2-02 第六批均贫卡

第六批当时默认 v5 卡片与道具对局；初始无卡，均贫卡在三越百货 200 点购买、全局供应 2、卡片共用 15 格。掷骰前选择附近对手平均现金，存款不变；目标范围是显式 Web 候选。详见 [第六批报告](../../docs/richman/s2-02f-cards.md)。v4 真实旧回放及修改前状态/事件哈希已入测试；无需重导素材。

```sh
npm --prefix frontend test -- src/features/richman/game/cards.test.ts src/features/richman/CardChoice.test.tsx
# 固定已验证种子，在纯引擎中生成公开命令计划（不会注入浏览器状态）。
frontend/node_modules/.bin/vite-node scripts/richman/plan-card-journey.ts
# Vite 127.0.0.1:5174；实际 UI 正常速度执行攒点/购卡/使用/回放。
node scripts/richman/cards-ui-browser.cjs
```

可用 `PLAYWRIGHT_MODULE` 指定已有 Playwright；`RICHMAN_CARD_PLAN` 指定计划文件（两脚本需相同路径），默认 `/private/tmp/richman-card-journey.json`；`RICHMAN_TEST_OUTPUT` 默认 `/private/tmp/richman-s2-02f-ui`。生成器默认固定 `card-six-16`，不重复搜种子；仅明确需要时设置 `RICHMAN_CARD_SEARCH=1`。浏览器脚本的预期数额绑定默认计划，改变策略/种子需更新相应断言。188 项全量、lint/build 通过；第 29 回合购卡、第 31 回合结算，不把这一闭环写作 v5 全胜负对局。

### S2-02 第七批均富卡

第七批当时默认 v6；均富卡 200 点/全局 1 张，均贫卡继续 200 点/2 张；共用卡片 15 格。全体未破产玩家（含使用者）仅现金平均，余数舍弃。Web 增加可取消的全员预览确认，独立版本保留 v5 与所有旧回放。规则来源与限制见 [第七批报告](../../docs/richman/s2-02g-wealth.md)。

```sh
npm --prefix frontend test -- src/features/richman/game/wealth.test.ts src/features/richman/WealthChoice.test.tsx
frontend/node_modules/.bin/vite-node scripts/richman/plan-wealth-journey.ts
# Vite 127.0.0.1:5174；三人原地图、正常速度、真实 UI 攒点/购买/确认/回放。
node scripts/richman/wealth-ui-browser.cjs
```

`PLAYWRIGHT_MODULE` 指定现有依赖；`RICHMAN_WEALTH_PLAN` 指定两脚本共用计划文件，默认 `/private/tmp/richman-wealth-journey.json`；`RICHMAN_TEST_OUTPUT` 默认 `/private/tmp/richman-s2-02g-ui`。计划默认固定 `card-six-96`，只有显式 `RICHMAN_WEALTH_SEARCH=1` 才重新搜种子。截图/完整浏览器回放保存在临时输出目录，可能被系统清理；验收摘要落盘到 docs，v5 冻结夹具保存在前端测试目录。没有向浏览器注入游戏状态，鉴权仅在隔离测试 context 模拟。

### G1 / S2-02 第八批：五卡整组

默认 v7 新增购地、换地、换屋、转向、拆除，普通地产/邻近锚点候选范围，价格/有限池各自核验。v6 实际回放与修改前状态/事件哈希已冻结，旧 profile 保留。见 [整组报告](../../docs/richman/s2-02h-g1.md)；引擎/组件及2026-10-04原地图正常速度浏览器验收通过，早先自动审批连接故障已解除。

```sh
npm --prefix frontend test -- src/features/richman/game/g1.test.ts src/features/richman/G1Choice.test.tsx
frontend/node_modules/.bin/vite-node scripts/richman/plan-g1-journey.ts
# 本地 Vite 127.0.0.1:5174；真实 UI 执行五卡和旧道具，不注入游戏状态。
node scripts/richman/g1-ui-browser.cjs
```

固定计划 `group-one-13`，仅显式 `RICHMAN_G1_SEARCH=1` 才搜索种子。支持 `RICHMAN_G1_PLAN`（两脚本一致，默认 `/private/tmp/richman-g1-journey.json`）、`RICHMAN_TEST_OUTPUT`（默认 `/private/tmp/richman-s2-02h-ui`）、`PLAYWRIGHT_MODULE`。计划由引擎公开命令生成，与实际浏览器结果分开记录。2026-10-04 已在5173服务完成原地图正常速度两人五卡组合验收，第55回合完成五卡，实际下载411条命令；七张截图已检查，全屏/窄屏/重开/旧v6/回放/清理通过。结果与实际回放保存在 `docs/richman/s2-02h-browser-results.json`、`docs/richman/s2-02h-browser-replay.json`，详情见本组报告。

G1 浏览器脚本可用 `RICHMAN_BASE_URL=http://localhost:5173` 复用已启动的本地 Vite，默认仍为 `http://127.0.0.1:5174`。隔离鉴权只允许本地地址；前台服务与浏览器测试需分别保持运行。

### G2 / S2-02 第九批：状态与车辆七项

v8新增停留、冬眠、梦游、陷害、乌龟、机车、汽车，共用行动计时、设施位置和车辆多骰基础。保留v7及所有旧模式/回放。范围、规则与真实验收以 [G2报告](../../docs/richman/s2-02i-g2.md) 为准。

```sh
npm --prefix frontend test -- src/features/richman/game/g2.test.ts src/features/richman/G2Choice.test.tsx
frontend/node_modules/.bin/vite-node scripts/richman/plan-g2-journey.ts
RICHMAN_BASE_URL=http://localhost:5173 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/g2-ui-browser.cjs
```

固定种子`group-two-7`，显式`RICHMAN_G2_SEARCH=1`才搜索24个种子。支持`RICHMAN_G2_PLAN`（默认`/private/tmp/richman-g2-journey.json`）、`RICHMAN_TEST_OUTPUT`（默认`/private/tmp/richman-s2-02i-ui`）；只允许本机URL、隔离鉴权替身，不注入游戏状态。正常速度，合法攒点/购买/使用全部七项，继续到所有状态解除；机车两骰及汽车三骰实际移动，集中检查暂停/取消/全屏/390px/重开/旧v7/回放/退出。纯引擎计划与实际下载回放分别保留，不混用验收身份。

### G3 / S2-02 第十批：反应与交互六卡（已实现，自动测试延期）

v9 / `g3`，指纹`6be76c90`。抢夺/复仇/嫁祸/免费/免罪/同盟及槽序、反应、关系、独立付款者已接入；[规则与真实验证状态](../../docs/richman/s2-02j-g3.md)。**用户要求全部43项实现后统一自动测试，现在不要自动执行下面命令。** 24项已实现、18项已验收；G3没有浏览器通过记录。

统一验收时复现：

```sh
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
frontend/node_modules/.bin/vite-node scripts/richman/plan-g3-journey.ts
RICHMAN_BASE_URL=http://localhost:5173 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/g3-ui-browser.cjs
```

固定种子`group-three-9`；`RICHMAN_G3_SEARCH=1`可重搜12种子。计划路径`RICHMAN_G3_PLAN`默认`/private/tmp/richman-g3-journey.json`；浏览器输出`RICHMAN_TEST_OUTPUT`默认`/private/tmp/richman-s2-02j-ui`。三人原地图、正常速度；合法获取六卡、卡/工具各一次抢夺、自动免罪/复仇、第三人嫁祸、免费租金、同盟敌对解除、工人/遥控、到期及共有UI检查。脚本尚未首次浏览器调试，后续需修复实际发现的问题。保留`fixtures/tools-v9-engine-*`纯引擎回放/金标准，禁止当作真实浏览器结果。

### G4 / S2-02 第十一批：地产经营五卡（已实现，测试延期）

新v10 / `g4`，指纹`d9e59846`，旧v9指纹`6be76c90`不变。当前29项已实现、18项已验收。实现与边界见 [G4报告](../../docs/richman/s2-02k-g4.md)。本轮仅静态TypeScript检查，没有执行测试、浏览器或对局回放。

G4组合脚本尚未编写，统一验收时按 [G4清单](../../docs/richman/s2-02k-acceptance.md) 补齐；不可将G3脚本/旧结果冒充G4通过。继续G5时使用新v11，保留所有旧规则与回放。**全部43项实现前不自动运行本README中的测试命令。**

### G5 / S2-02 第十二批：建拆与道路攻击七项（已实现，测试延期）

默认v11 / `g5`，指纹`a23a792b`；保留v10 `d9e59846`及旧模式/回放。累计36项已实现、18项已验收；七项和研究工人/工程车见[G5报告](../../docs/richman/s2-02l-g5.md)。本轮仅静态TypeScript检查、源码/代码审阅及规则常量读取，没有运行测试、浏览器或回放。

**按用户要求全部43项实现前不运行自动测试。** G5浏览器组合脚本尚未编写，统一验收按[G5清单](../../docs/richman/s2-02l-acceptance.md)补齐合法获取、正常速度组合和旧回放；不可写成已经通过。下一G6四项，用新v12。

## G6状态（2026-10-05）

默认g6/v12已实现送神/请神/红黑四卡及神仙/股票基础，累计40项已实现、18项历史验收。用户要求43项完成后统一自动测试，本轮只静态类型检查与规则注册常量读取，没有运行对局、浏览器或回放。G4～G7覆盖在统一验收时补齐，见[待验收清单](../../docs/richman/s2-02m-acceptance.md)；下一G7，新v13。

### G7与统一验收起点（2026-10-05）

G7/v13科研三工具已实现，43/43实现、18/43历史验收。`g7-smoke-browser.cjs`只检查原地图基础界面/股票交易/正常掷骰到岔路/全屏/窄屏/重开/旧G6/退出清理，**不等于科研工具效果或43项整组验收**。

```sh
RICHMAN_G7_TEST_OUTPUT=/private/tmp/richman-s2-02n-engine npm --prefix frontend test -- src/features/richman/game/g7.test.ts
RICHMAN_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/g7-smoke-browser.cjs
```

第一条使用小型测试地图合法命令生成科研/使用/回放证据，不注入库存；不是原图浏览器。后续按`docs/richman/s2-02n-acceptance.md`继续25项完整验收。

### S2-02o：统一验收及可复现回放

统一结果以 [报告](../../docs/richman/s2-02o-unified.md) 和结果 JSON 为准，前述逐组延期记录保留为历史。新增 `unified-domains.test.ts`、`replay-matrix.test.ts`、`G456Choice.test.tsx`、`unified-browser-replays.test.ts` 覆盖领域边界、2–4人长局、旧规则矩阵及实际浏览器回放哈希。

原地图路线由合法引擎命令规划，浏览器按命令点击真实控件，正常动画速度，仅模拟本地鉴权。需先运行 Vite；规划文件不是浏览器通过证据，也不注入游戏状态。

```sh
# G4/G6：46、4人、unified-0；G5：5、3人、unified-2；G7：7、2人、unified-1
RICHMAN_GROUP=7 RICHMAN_PLAYERS=2 RICHMAN_SEED=unified-1 RICHMAN_PLAN=/private/tmp/richman-unified-7.json frontend/node_modules/.bin/vite-node scripts/richman/plan-unified-journey.ts
RICHMAN_GROUP=7 RICHMAN_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
RICHMAN_REPLAY=/private/tmp/richman-unified-ui-7/replay.json RICHMAN_VERIFY_OUTPUT=/private/tmp/richman-g7-verified.json frontend/node_modules/.bin/vite-node scripts/richman/verify-unified-replays.ts
npm --prefix frontend test
```

各组浏览器结果、截图和实际下载回放位于 `/private/tmp/richman-unified-ui-{46,5,7}`。G3沿用 `g3-ui-browser.cjs`，证据位于 `/private/tmp/richman-s2-02j-ui`。通过的实际回放与 state/events SHA256 永久保存在 `frontend/src/features/richman/game/fixtures/tools-v9-replay.json`、`tools-v13-g*-replay.json` 及相应 golden；原 v9 引擎夹具保留。路线规划策略可继续改善，已验收回放不可用新路线覆盖。

资源审计测试需本地 Game 与完整固定版本参考源码；参考版本和每个文件哈希必须与 `docs/richman/effects-audit.json` 一致。参考源码不齐时如实记录跳过/错误，不以未执行代替通过。

### S2-03a：原地图随机得卡（v14）

默认新建“地图事件候选（随机得卡）”，继承v13并增加98号得卡地点。G7及旧版本选项保留。规则、事件目录现状与边界见[S2-03a报告](../../docs/richman/s2-03a-map-events.md)。无新素材或数据库依赖。

```sh
# 生成真实合法操作路线；固定seed已验收第5回合得卡、第7回合使用停留卡。
RICHMAN_SEED=map-event-1 frontend/node_modules/.bin/vite-node scripts/richman/plan-map-event-journey.ts
# 需保持本地Vite运行；仅本机、鉴权fixture，无游戏状态注入，正常动画速度。
RICHMAN_GROUP=03a RICHMAN_MODE=events RICHMAN_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
RICHMAN_REPLAY=/private/tmp/richman-unified-ui-03a/replay.json RICHMAN_VERIFY_OUTPUT=/private/tmp/richman-s203-verified.json frontend/node_modules/.bin/vite-node scripts/richman/verify-unified-replays.ts
```

原始截图/回放/结果在 `/private/tmp/richman-unified-ui-03a`；永久实际回放为 `game/fixtures/events-v14-replay.json` 和golden，`map-events.test.ts`覆盖回放哈希。规划路线51命令，实际浏览器含暂停/取消57命令，两者不能混写。统一浏览器脚本新增可选 `RICHMAN_MODE`，默认仍为g7，旧组脚本行为保留。


### S2-03b：新闻序列与资金/股票四条（v15）

页面默认新建“新闻事件候选（首批四条）”，继承v14得卡及43项。核验36项初始化/条件/分派，执行新闻11/23/24/25，其余32条明确跳过；日期/结息不在本批范围。规则与真实结果见[S2-03b报告](../../docs/richman/s2-03b-news.md)。

```sh
# 原日本地图三人、seed news-first，合法买股票并移动到新闻格；无状态注入。
frontend/node_modules/.bin/vite-node scripts/richman/plan-news-journey.ts
# 需保持本地Vite运行。脚本默认模式仍为g7，新闻验收必须明确指定news。
RICHMAN_GROUP=03b RICHMAN_MODE=news RICHMAN_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
RICHMAN_REPLAY=/private/tmp/richman-unified-ui-03b/replay.json RICHMAN_VERIFY_OUTPUT=/private/tmp/richman-news-verified.json frontend/node_modules/.bin/vite-node scripts/richman/verify-unified-replays.ts
```

规划文件 `/private/tmp/richman-unified-03b.json` 为341命令；实际正常速度浏览器加暂停/重开框等共345命令、46回合，四条均实际结算。原始结果/截图/回放在 `/private/tmp/richman-unified-ui-03b`；实际回放与SHA永久保存为 `game/fixtures/news-v15-replay.json` / `news-v15-golden.json`，由 `news.test.ts` 回归。领域/组件与版本矩阵覆盖详见报告，不把规划或小地图测试视为原图浏览器通过。


### S2-03c：地产拆除/降级与土地奖励（v16）

页面默认 `propertyNews`，新增新闻5/8/9/15，继承v15四条。规则证据、原条件的空候选矛盾和实际覆盖见[S2-03c报告](../../docs/richman/s2-03c-property-news.md)。默认种子 `property-news-4`，三人初始30万，通过工人、购地与正常移动建立候选；没有状态注入。

```sh
frontend/node_modules/.bin/vite-node scripts/richman/plan-property-news-journey.ts
RICHMAN_GROUP=03c RICHMAN_MODE=propertyNews RICHMAN_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
RICHMAN_REPLAY=/private/tmp/richman-unified-ui-03c/replay.json RICHMAN_VERIFY_OUTPUT=/private/tmp/richman-property-news-verified.json frontend/node_modules/.bin/vite-node scripts/richman/verify-unified-replays.ts
```

规划默认写 `/private/tmp/richman-unified-03c.json`，可用 `RICHMAN_PLAN` 指定另一个文件（浏览器也需指定同一文件）；规划500命令，实际浏览器含暂停/重开框等504命令、71回合；四条新新闻均实际结算。原始结果/截图/回放在 `/private/tmp/richman-unified-ui-03c`。浏览器合法路线不同于构造状态边界测试，未实际走到的研究所毁坏/住宿等仅登记领域覆盖。

S2-03c实际回放与SHA永久保存为 `game/fixtures/property-news-v16-replay.json` / `property-news-v16-golden.json`，由 `property-news.test.ts` 回归；验证脚本独立复核目标集合、其他地产不变、产权计数及现金奖励。首次浏览器发现的工人模式识别问题已修复并补齐v14/v15/v16界面回归，修复前证据单列保留。

### S2-03d：地价、公共拍卖与地产税（v17）

页面默认 `operatingNews`，开放十一条新闻并继承全部物品。动态基础地价影响购地/购地卡/拍卖/估值/地产税/大型初建；租金和后续建造费表不变。公共拍卖先确认进入竞价、成交后再确认结果，款进公共资金。地产税现金再存款，不先卖股救税。证据和候选清算差异见[S2-03d报告](../../docs/richman/s2-03d-operating-news.md)。

```sh
frontend/node_modules/.bin/vite-node scripts/richman/plan-operating-news-journey.ts
RICHMAN_GROUP=03d RICHMAN_MODE=operatingNews RICHMAN_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
RICHMAN_REPLAY=/private/tmp/richman-unified-ui-03d/replay.json RICHMAN_VERIFY_OUTPUT=/private/tmp/richman-operating-news-verified.json frontend/node_modules/.bin/vite-node scripts/richman/verify-unified-replays.ts
```

固定seed `operating-news-4`，原日本三人、每人初始30万；合法路线731条规划命令，原始实际回放/截图/结果写 `/private/tmp/richman-unified-ui-03d`。路线规划默认写 `/private/tmp/richman-unified-03d.json`，`RICHMAN_PLAN`可指定其他文件，浏览器也需指定同一文件。不要把该规划或构造状态测试当作浏览器通过。

S2-03d实际原地图三人正常速度验收为102回合735条UI命令，新闻7/12/6均真实结算，含暂停/重开框等额外操作；规划731条不计作浏览器结果。实际回放及SHA永久保存为 `frontend/src/features/richman/game/fixtures/operating-news-v17-replay.json` / `operating-news-v17-golden.json`，由 `operating-news.test.ts` 回归；独立验证公共拍卖现金归公共资金、地产税税基/支付及同名街区地价。领域专测与浏览器未覆盖范围见报告。

### S2-03e：设施期限与交通停留（v18）

默认模式 `statusNews`，十七条开放新闻。规则/证据与实际覆盖见[S2-03e报告](../../docs/richman/s2-03e-status-news.md)。设施名单与期限分开保存；0/2先清名单写释放标志、1/3只延长仍在名单者。16/17按当前交通直接停留一次，不是换车。

本批采用四条独立原地图四人合法路线。以下生成的是操作计划，浏览器必须另外执行；`RICHMAN_STOP_AFTER`只截取已合法执行的前缀，不注入状态。

```sh
# 监禁组：0/1；交通组使用STATUS_NEWS=16,17、seed=status-news-13。
RICHMAN_STATUS_NEWS=0,1 RICHMAN_SEED=status-news-10 RICHMAN_PLAN=/private/tmp/status-prison-10.json frontend/node_modules/.bin/vite-node scripts/richman/plan-status-news-journey.ts
# 住院释放：seed=status-news-3，STOP_AFTER=2；住院延长用seed=status-news-12、STOP_AFTER=3。
RICHMAN_STATUS_NEWS=2,3 RICHMAN_STOP_AFTER=2 RICHMAN_SEED=status-news-3 RICHMAN_PLAN=/private/tmp/richman-status-hospital-release.json frontend/node_modules/.bin/vite-node scripts/richman/plan-status-news-journey.ts
# 分组执行UI；每个group保存独立目录。另三组需对应替换PLAN、GROUP、STATUS_NEWS。
RICHMAN_GROUP=03e-prison RICHMAN_STATUS_NEWS=0,1 RICHMAN_PLAN=/private/tmp/status-prison-10.json RICHMAN_MODE=statusNews RICHMAN_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
RICHMAN_REPLAY=/private/tmp/richman-unified-ui-03e-prison/replay.json RICHMAN_VERIFY_OUTPUT=/private/tmp/richman-status-prison-verified.json frontend/node_modules/.bin/vite-node scripts/richman/verify-unified-replays.ts
```

本批四场实际浏览器分别为监禁602/84回合、交通497/61回合、住院释放415/59回合、住院延长487/72回合（共2001命令）；四份 `game/fixtures/status-news-v18-*-replay.json` 与golden由 `status-news.test.ts` 固定回归。浏览器未走到的溢出、时光机、工程车/梦游/旅馆冲突等只计领域覆盖。

### S2-03f：十九条新闻统一收口（v19）

`completeNews` / `japan-events-candidate-v19` / `a6124bc9`，累计36条。规则、原代码与文案差异、字段和实际范围见[报告](../../docs/richman/s2-03f-complete-news.md)。本批16条短/长组合路线合计2331条真实UI命令、全部独立回放验证通过，永久文件 `game/fixtures/complete-news-v19-*-{replay,golden}.json` 与manifest。

合法计划与真实浏览器分开执行；示例资产组为4人seed47，其他seed/人数/目标见报告表。初始资金30万，初始工人正常使用，股票真实买入，公司前置利润由新闻31合法建立。

```sh
RICHMAN_NEWS=10,14,22 RICHMAN_SEED=complete-news-47 RICHMAN_PLAYERS=4 RICHMAN_PLAN=/private/tmp/richman-unified-03f-47.json frontend/node_modules/.bin/vite-node scripts/richman/plan-complete-news-journey.ts
RICHMAN_GROUP=03f-47 RICHMAN_NEWS=10,14,22 RICHMAN_MODE=completeNews RICHMAN_BASE_URL=http://127.0.0.1:5174 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
RICHMAN_REPLAY=/private/tmp/richman-unified-ui-03f-47/replay.json RICHMAN_VERIFY_OUTPUT=/private/tmp/richman-03f-47-verified.json frontend/node_modules/.bin/vite-node scripts/richman/verify-unified-replays.ts
```

银行借还路线用`RICHMAN_NEWS=29 RICHMAN_SEED=complete-news-45 RICHMAN_PLAYERS=2 RICHMAN_REQUIRE_LOAN=1`；限制路线用`RICHMAN_NEWS=21,22,31,32 RICHMAN_SEED=complete-news-162 RICHMAN_PLAYERS=2 RICHMAN_REQUIRE_RESTRICTED_BANK=1`。分别指定独立PLAN/GROUP和相同NEWS。`RICHMAN_STEPS`控制搜索上限，`RICHMAN_EFFECTIVE=0`可只探测触发，**不能用其无实际变化的结果冒充灾害验收**；`RICHMAN_KEEP_PARTIAL`只保存失败规划用于检查，不计浏览器通过。批量前缀准备脚本`prepare-complete-news-routes.ts`读取`RICHMAN_SELECTIONS`或本批临时搜索清单，不改任何游戏状态。

`verify-complete-news.ts`用于实际回放的独立字段/资金/账本核对，计入先于新闻的神仙付款；旧核验器与golden继续运行。原始图、完整事件与核验输出保存`/private/tmp/richman-unified-ui-03f-*`，临时目录消失后使用仓库永久回放和上述合法计划重新生成。

### S2-03g：命运资金/库存组（v20）

`fortune` / `japan-events-candidate-v20` / `45905600`，开放命运17～32共16项，保留全部新闻及物品。规则及未测试范围见[报告](../../docs/richman/s2-03g-fortune.md)。8条2–4人正常速度路线359条真实命令；永久回放在 `game/fixtures/fortune-v20-*`。

```bash
frontend/node_modules/.bin/vite-node scripts/richman/prepare-fortune-routes.ts
RICHMAN_GROUP=03g-0 RICHMAN_MODE=fortune RICHMAN_BASE_URL=http://localhost:5174 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
# 逐条重复03g-1至03g-7；只有真实浏览器完成后再收集验收：
frontend/node_modules/.bin/vite-node scripts/richman/save-fortune-acceptance.ts
```

`plan-fortune-journey.ts`是合法命令计划，不能单独称浏览器验收。`verify-fortune.ts`独立核对实际回放资金/公共资金/变卖算式。8场覆盖基础效果，车辆/科研库存变卖、神仙抵消/加倍、破产等仅领域测试，详见results。


### S2-03i / v22 交通与日本地区命运

证据与实际验收：`docs/richman/s2-03i-traffic-fortune.md`、`s2-03i-sources.json`、`s2-03i-results.json`。`plan-traffic-fortune-journey.ts`通过正常命令合法攒点/买车/装备/选骰/移动；`prepare-traffic-fortune-routes.ts`搜索短路线。计划不计浏览器通过。

```bash
frontend/node_modules/.bin/vite-node scripts/richman/prepare-traffic-fortune-routes.ts
RICHMAN_REACTION=redirect RICHMAN_TARGETS=12 RICHMAN_PLAYERS=2 frontend/node_modules/.bin/vite-node scripts/richman/prepare-traffic-fortune-routes.ts
RICHMAN_GROUP=03i-12 RICHMAN_MODE=trafficFortune RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
```

浏览器组合使用当前已有通用UI脚本，输出`/private/tmp/richman-unified-ui-03i-{路线}/results.json`、实际下载回放与截图。`12-redirect`为独立嫁祸路线，正常路线为10/11/12/13/14/15/16/41/42/43/44；根据当前服务替换`RICHMAN_BASE_URL`。`verify-traffic-fortune.ts`独立核对车辆供应、实际期限/目标/设施名册、罚款与公共资金。所有路线确实通过后执行：

```bash
RICHMAN_ROUTES=10,11,12,13,14,15,16,41,42,43,44,12-redirect frontend/node_modules/.bin/vite-node scripts/richman/save-traffic-fortune-acceptance.ts
```

永久保存于`game/fixtures/traffic-fortune-v22-*`，`traffic-fortune-browser.test.ts`回归真实命令与state/events SHA。构建/领域测试不代替上述浏览器运行；不从计划生成器注入游戏状态。

### S2-03j / v23 日本最后五槽命运

`finalFortune` / `japan-events-candidate-v23` / `54aa29d1`。设计、9份固定来源和真实结果见`docs/richman/s2-03j-*`。领域/版本/实际回放757项通过；日本37/37槽是候选基础验收，日期与贷款到期仍未完成。

```bash
# 五条基础路线：2/3/4/6/7；只生成合法操作计划，不注入游戏。
frontend/node_modules/.bin/vite-node scripts/richman/prepare-final-fortune-routes.ts
# 旅行嫁祸独立路线7-redirect：合法攒点及购卡。
RICHMAN_REACTION=redirect RICHMAN_TARGETS=7 RICHMAN_SEEDS=100 frontend/node_modules/.bin/vite-node scripts/richman/prepare-final-fortune-routes.ts
# 三条后续组合：冒贷还款、银行拒绝、旅行返回。
RICHMAN_FOLLOWUP=1 RICHMAN_RUN_FINAL_PLAN=1 RICHMAN_FORTUNE=2 RICHMAN_SEED=final-group-9 RICHMAN_PLAYERS=4 RICHMAN_PLAN=/private/tmp/richman-unified-03j-2-repay.json frontend/node_modules/.bin/vite-node scripts/richman/plan-final-fortune-journey.ts
RICHMAN_FOLLOWUP=1 RICHMAN_RUN_FINAL_PLAN=1 RICHMAN_FORTUNE=3 RICHMAN_SEED=final-group-42 RICHMAN_PLAYERS=2 RICHMAN_PLAN=/private/tmp/richman-unified-03j-3-bank.json frontend/node_modules/.bin/vite-node scripts/richman/plan-final-fortune-journey.ts
RICHMAN_FOLLOWUP=1 RICHMAN_RUN_FINAL_PLAN=1 RICHMAN_FORTUNE=6 RICHMAN_SEED=final-group-12 RICHMAN_PLAYERS=2 RICHMAN_PLAN=/private/tmp/richman-unified-03j-6-return.json frontend/node_modules/.bin/vite-node scripts/richman/plan-final-fortune-journey.ts
# GROUP分别用03j-2、3、4、6、7、2-repay、3-bank、6-return、7-redirect；地址改成当前本地服务。
RICHMAN_GROUP=03j-6-return RICHMAN_MODE=finalFortune RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
# 必须九条实际浏览器成功后再保存真实下载回放；不可直接从计划伪造结果。
frontend/node_modules/.bin/vite-node scripts/richman/save-final-fortune-acceptance.ts
```

本次9条原图正常速度共1567条实际命令，2–4人。独立`verify-final-fortune.ts`核对本金、银行转账与float32舍入、拒绝字节、实际旅行目标/期限/原格/车辆/名单；先处理同命令`nodeEntered`再判断旅行不位移。旧验证器和golden保持。永久`game/fixtures/final-fortune-v23-*`保存回放及SHA，由`final-fortune-browser.test.ts`回归；临时截图/完整报告位于`/private/tmp/richman-unified-ui-03j-*`。

### S2-03k / v24 日期与银行日历

`plan-calendar-journey.ts`生成三条原图合法命令路线：双人1998-01-28开局到真实借款90天后催收、三人跨年、四人2000闰年。自定义开局日期是正式新建配置；不注入对局状态。正常速度操作脚本增加新建日期、休市按钮及日期面板全屏/390px核对。

```bash
RICHMAN_RUN_CALENDAR_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-calendar-journey.ts
# 三条分别指定 03k-loan、03k-year、03k-leap；保持本地Vite服务运行
RICHMAN_GROUP=03k-loan RICHMAN_MODE=calendar RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
frontend/node_modules/.bin/vite-node scripts/richman/save-calendar-acceptance.ts
python3 scripts/richman/audit_calendar_source.py --tree /private/tmp/richman-news-tree.json --asm /private/tmp/rich4-tools-audit/rich4-master/asm/rich4.asm
```

`verify-calendar.ts`用独立UTC日期算法核对实际回放逐日推进、月息参与集合/金额、首次贷款期限与追加不延期、3/2/1提示和到期先银行后现金、休市持价以及真实交易日；不调用生产日期/银行处理器。原地图实际回放与SHA放在`game/fixtures/calendar-v24-*`；`calendar-browser.test.ts`回归。临时完整UI结果/截图在`/private/tmp/richman-unified-ui-03k-*`，保存脚本仅接受实际完成结果，不将纯引擎计划算UI验收。

### S2-03l / v25 彩票与日期开奖

```bash
RICHMAN_RUN_LOTTERY_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-lottery-journey.ts
# 分别运行03l-2、03l-3、03l-4，Vite服务保持运行
RICHMAN_GROUP=03l-2 RICHMAN_MODE=lottery RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
frontend/node_modules/.bin/vite-node scripts/richman/save-lottery-acceptance.ts
```

三条原图2–4人正常速度共544实际命令；日期1998-01-07，真实28号购彩后走到15日。种子`lottery-2-128`、`lottery-3-3`、`lottery-4-49`分别中奖/结转/非当前玩家中奖。`verify-lottery.ts`独立逐笔核对号码归属、现金1000/公共资金、候选集合、全额现金领奖及清票/无人中奖保留；实际回放与SHA在`game/fixtures/lottery-v25-*`。临时截图/UI结果在`/private/tmp/richman-unified-ui-03l-*`。88号、>10票分支、破产/时光机等组合仅领域覆盖，不能将它们记为本次浏览器通过。

### S2-03m 公司日期分红（v26）

固定来源/规则见 `docs/richman/s2-03m-company-dividends.md` 与 `s2-03m-sources.json`。合法计划用真实股票交易、原地图公司新闻和日期轮转，不修改运行中的游戏状态：

```sh
RICHMAN_RUN_DIVIDEND_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-dividend-journey.ts
RICHMAN_GROUP=03m-2 RICHMAN_MODE=dividends RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
```

三人/四人分别将group换为 `03m-3` / `03m-4`。服务端口按实际本地服务设置。全部完成后：

```sh
frontend/node_modules/.bin/vite-node scripts/richman/save-dividend-acceptance.ts
```

该脚本只读取真实浏览器目录中的回放/results，检查错误/清理状态、独立重算公司新闻资金/合法持仓交易/15日分配及最终银行现金，写入 `game/fixtures/dividends-v26-*`，供回归测试使用。计划生成不算浏览器通过；负分红破产、同日贷款、跨月无人持股结转等领域场景与实际浏览器覆盖分别列出。

### S2-03n 公司营业首组（v27）

来源/规则见 `docs/richman/s2-03n-company-services.md` 与 `s2-03n-sources.json`。计划沿原地图攒点、购买并使用机车、合法买股建立经营权、落点丰田/SEGA实际收费，并走到15日分红；不注入游戏状态。

```sh
RICHMAN_RUN_COMPANY_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-company-journey.ts
RICHMAN_GROUP=03n-2 RICHMAN_MODE=company RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
```

三人/四人分别改group为 `03n-3` / `03n-4`；端口使用实际Vite服务。全部浏览器完成后才归档：

```sh
frontend/node_modules/.bin/vite-node scripts/richman/save-company-acceptance.ts
```

读取真实results/replay，逐命令用 `verify-company.ts` 独立重算车辆/点数/已过日期费用、实际现金/银行与公司本期/累计，并复用独立分红/交易核对。保存 `game/fixtures/company-v27-*` 及SHA；临时截图在 `/private/tmp/richman-unified-ui-03n-*`。计划不算浏览器通过；免费/嫁祸/衰神、工程车暂停、资金不足退出等仅领域覆盖时单独列明。

### S2-03o 日产建造/现场认股（v28）

固定源码与范围见 `docs/richman/s2-03o-commerce.md`。准备合法命令路线：

```sh
RICHMAN_RUN_COMMERCE_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-commerce-journey.ts
RICHMAN_GROUP=03o-2 RICHMAN_MODE=commerce RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
```

三/四人改group为`03o-3`/`03o-4`。实际服务端口可替换。真实浏览器均完成后归档：

```sh
frontend/node_modules/.bin/vite-node scripts/richman/save-commerce-acceptance.ts
```

`verify-commerce.ts`独立核对建造前后类型/等级/费用、取消、实际收费、现金认股/独立余股/持仓/经营权和后续分红，复用v27其他公司及v26分红账目核对。实际回放/SHA写入`game/fixtures/commerce-v28-*`。计划输出不能代替真实浏览器，未触发组合单独列为领域覆盖。

本批额外保存了界面修正短路线，复用双人合法计划直到第一次现金认股：

```sh
RICHMAN_COMMERCE_UI=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-commerce-journey.ts
RICHMAN_GROUP=03o-ui RICHMAN_MODE=commerce RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
RICHMAN_ROUTES=2,3,4,ui frontend/node_modules/.bin/vite-node scripts/richman/save-commerce-acceptance.ts
```

短路线验证地点名称账单、选地后390px、暂停禁用建造/认股；不把它记作额外一次整月分红验收。

### S2-03p 三井保险与赔付（v29）

规则/候选差异见 `docs/richman/s2-03p-insurance.md`。源码审计使用已有固定提交缓存，缺失缓存时须先恢复同一提交文件和树清单，不能将哈希不符的文件当成已核实来源：

```sh
python3 scripts/richman/audit-insurance-source.py
RICHMAN_RUN_INSURANCE_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-insurance-journey.ts
RICHMAN_GROUP=03p-2 RICHMAN_MODE=insurance RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
```

三/四人改为`03p-3`/`03p-4`。规划器固定已验收种子`insurance-2-0 / insurance-3-0 / insurance-4-2`，通过买股建立经营权、原图停留抽保险、命运赔付和15日分红。计划本身不构成浏览器验收。保险转盘专属暂停/390px/重开短路线：

```sh
RICHMAN_INSURANCE_UI=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-insurance-journey.ts
RICHMAN_GROUP=03p-ui RICHMAN_MODE=insurance RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
RICHMAN_ROUTES=2,3,4,ui frontend/node_modules/.bin/vite-node scripts/richman/save-insurance-acceptance.ts
```

`verify-insurance.ts`独立核算期限回绕、行动时钟、神仙/反应/代付、现金/银行实付、事故期限或损失金额、赔款现金入账及公司账本；复用独立`verify-dividends.ts`检查15日全部公司、彩票和到期催收顺序。归档实际回放及SHA到`game/fixtures/insurance-v29-*`，未触发的冒贷/酒店/爆炸/破产等组合单列领域覆盖。短路线只验转盘界面，不记作额外赔付/分红长局。


## S2-03q：日期活动与经营物价（v30）

证据：[日期经营报告](../../docs/richman/s2-03q-calendar-business.md)、[来源](../../docs/richman/s2-03q-sources.json)、[真实结果](../../docs/richman/s2-03q-results.json)。日本12月25日按在局座位发有限池卡，元旦仅日期提示；每日净资产指数只升不降，接公司与期限保险费用，其余物价消费者保留。

```sh
python3 scripts/richman/audit-date-business-source.py
RICHMAN_RUN_DATE_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-date-business-journey.ts
RICHMAN_GROUP=03q-2 RICHMAN_MODE=dateBusiness RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
frontend/node_modules/.bin/vite-node scripts/richman/save-date-business-acceptance.ts
```

3/4人使用03q-3、03q-4；规划只生成合法命令，不等于浏览器通过。归档脚本仅读实际浏览器结果与回放，独立重算净资产、顺序、赠卡库存、公司保费和分红。

### S2-03r / v31 物价消费者

- `python3 scripts/richman/audit-indexed-economy-source.py`：读取固定参考commit的`/private/tmp/richman-price-reference`及`richman-news-tree.json`，校验31来源、166引用及指数1/3/7算术，输出`docs/richman/s2-03r-sources.json`。临时参考来源不入库。
- `RICHMAN_RUN_INDEX_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-indexed-economy-journey.ts`：重建已选三人原图合法命令路线，不能代替浏览器验收。`RICHMAN_SEARCH_INDEX_PLAN=1`只用于可选路线搜索。
- `RICHMAN_GROUP=03r-3 RICHMAN_MODE=indexedEconomy RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs`：本地原图正常速度UI；认证fixture无对局注入。
- `frontend/node_modules/.bin/vite-node scripts/richman/save-indexed-economy-acceptance.ts`：独立逐命令核对价格、实际付款、租金神仙顺序、税与命运，归档真实浏览器回放和哈希。未通过的UI不得运行此步骤冒充完成。

### S2-03s 地产挂牌、竞价与处置边界（v32）

- `audit-estate-sales-source.py`：固定参考8份blob/SHA256、19个入口；挂牌7×12字节、估价/收款/计时及原破产强拍边界，输出`s2-03s-sources.json`。
- `plan-estate-sales-journey.ts`：`RICHMAN_RUN_ESTATE_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-estate-sales-journey.ts`，固定`estate-73`原图三人合法计划78命令，无注入状态。
- `unified-ui-browser.cjs`：`RICHMAN_GROUP=03s RICHMAN_MODE=estateSales RICHMAN_BASE_URL=http://127.0.0.1:5175`，另设`PLAYWRIGHT_MODULE`；真实UI100命令。覆盖公共拍卖、挂牌/改价/撤回/跨玩家现金成交、日龄、暂停/全屏/390px/重开/清理。须先运行本地Vite。
- `archive-estate-sales-browser.ts`与`verify-estate-sales.ts`：逐命令独立核算实际回放，归档v32 replay/manifest及5类账目检查；领域测试43项、面板2项，不冒充所有组合UI。
- 全量1170测试/83文件、v1～v32×2/3/4人96矩阵。发现并只在v32补接后续版漏掉的九条新闻资格；旧回放冻结。原破产强拍未接入，下一S2-03t，见`docs/richman/s2-03s-estate-sales.md`。

### S2-03t 租金破产处置（v33）

- `audit-disposal-source.py`：8份固定源码/hash、26个入口；最后存活提前结束、股票卖款公共入账、库存变卖返回点数被忽略、>3地块随机三场及共享支付回调，输出`s2-03t-sources.json`。
- `plan-disposal-journey.ts`：`RICHMAN_RUN_DISPOSAL_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-disposal-journey.ts`，`disposal-2`原图三人合法计划781命令/127行动，先取得5块地产再租金破产。计划不作为浏览器通过。
- `unified-ui-browser.cjs`：`RICHMAN_GROUP=03t RICHMAN_MODE=disposal`，复用本地服务/Playwright参数；普通速度真实UI、无游戏状态注入，三场公拍与延后债权收款，日志/截图/回放写`/private/tmp/richman-unified-ui-03t`。
- `verify-disposal.ts`：独立核账不调用生产估价/处置函数；`archive-disposal-browser.ts`验证实际下载回放后归档v33 replay与SHA256 manifest。
- 本批只迁移租金破产回调。新闻/命运/公司/分红/贷款退出仍待S2-03u分组迁移；本轮真实验收以`docs/richman/s2-03t-results.json`为准。

### S2-03u 公司、命运与贷款付款回调（v34）

- `audit-payment-source.py`：13份固定源码hash、24入口；flags、公司/公共/银行收款、保险时点、批量税/分红顺序，输出`s2-03u-sources.json`。
- `RICHMAN_RUN_PAYMENT_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-payment-journey.ts`：生成`payment-5`命运1142及`payment-17`公司558条原图合法计划；计划不是浏览器通过。
- `unified-ui-browser.cjs`：`RICHMAN_GROUP=03u-fortune`或`03u-company`、`RICHMAN_MODE=payments`，复用本地URL/Playwright环境；正常速度实跑1750命令，暂停/全屏/390px/清理与真实回放通过。
- `verify-payments.ts`和`archive-payment-browser.ts`：独立逐命令核账，真实回放及SHA256保存`fixtures/payments-v34-*`。贷款与其他公司/命运组合UI未验收；不要套用两个已测入口。
- 全量1241测试/89文件、102版本人数矩阵。33领域＋3面板＋3矩阵＋2实际回放新增。新闻税/负分红多人回调仅审计，下一S2-03v/v35，见`docs/richman/s2-03u-payment-callbacks.md`。

### S2-03v：多人付款批次与外层日期（v35）

规则 `japan-events-candidate-v35`，指纹 `a37c797f`，界面模式 `batches`。新闻12/13冻结税额，15日分红冻结公司分配和玩家净额；逐座退出处置完成后才继续，外层日期等待同日彩票与下一行动贷款。

- `python3 scripts/richman/audit-batch-source.py`：核对13个固定源码blob、25个入口，输出 `s2-03v-sources.json`。纠正旧审计的新闻12/13入口标注；不是Windows运行证明。
- `frontend/node_modules/.bin/vite-node scripts/richman/prepare-batch-routes.ts`：生成四条合法原图计划；`RICHMAN_VERIFY_PLANS=1`比对已有计划，计划不能写作浏览器通过。保留三/四人、`batch-0/1/67/21`、初始10000/30000合法资金。
- `RICHMAN_GROUP=03v-dividend RICHMAN_MODE=batches RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs`：原地图正常速度浏览器操作。group另可选 `03v-terminal`、`03v-landTax`、`03v-stockTax`；仅鉴权夹具，不注入游戏状态。
- `frontend/node_modules/.bin/vite-node scripts/richman/archive-batch-browser.ts`：只接受已完成、errors空且资源清理成功的实际浏览器输出；逐命令调用独立算账器，存入 `batches-v35-*-replay.json` 和manifest。
- `verify-batches.ts`独立核验冻结税基/float32分红、现时余额实付、逐座/日历暂停、退出股票实收、公共资金与彩票差额、终局停止；不调用生产税费/分红/支付计算器。
- `payment-batches.test.ts`、`DisposalPanel.test.tsx`及 `payment-batches-browser.test.ts` 分别覆盖领域、界面和真实回放；版本矩阵扩为35版×2/3/4人。未测试的UI交叉组合单列于 [结果](../../docs/richman/s2-03v-results.json)。

### S2-03w / 魔法屋六效果与地点目录

固定来源核验：`python3 scripts/richman/audit-magic-source.py`。需要前批已下载的固定源码目录 `/private/tmp/richman-price-reference` 与提交树 `/private/tmp/richman-news-tree.json`；工具核对 blob/SHA256，不能把缺少缓存误当成来源已通过。

生成合法原图路线（默认 `magic-1`，四人）：

```bash
RICHMAN_RUN_MAGIC_PLAN=1 frontend/node_modules/.bin/vite-node scripts/richman/plan-magic-journey.ts
```

路线只有正常命令，不注入世界；默认100000初始资金，合法走路/岔路/遥控以及原池得卡，涵盖35和73号魔法屋六项真实变化。生成计划不等于浏览器已通过。

```bash
RICHMAN_GROUP=03w RICHMAN_MODE=magic RICHMAN_BASE_URL=http://127.0.0.1:5175 RICHMAN_TEST_OUTPUT=/private/tmp/richman-unified-ui-03w-final PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs
RICHMAN_TEST_OUTPUT=/private/tmp/richman-unified-ui-03w-final frontend/node_modules/.bin/vite-node scripts/richman/archive-magic-browser.ts
RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/magic-default-ui.cjs
```

浏览器脚本只夹具化本地身份，正常速度；面板验证冻结目标、六效果账单、暂停、取消重置、全屏/390px、下一行动、下载实际回放及退出清理。归档器要求浏览器结果存在且清理/错误记录通过，再独立核对六项非空效果、逐位金额/点数/停止位并存金标准。报告见 `docs/richman/s2-03w-magic-house.md`，未覆盖的原转盘动画、六个剩余效果、其他小游戏/地点和复杂联动不得写通过。

## S2-03x / v37 魔法屋拘留与建拆

`audit-magic-actions-source.py` 校验固定来源；`find-magic-actions-route.ts` 与 `find-magic-continuation-route.ts` 用 vite-node 生成 `/private/tmp/richman-unified-03x{,-nested}.json` 合法路线。计划不等于浏览器通过。

`RICHMAN_MODE=magicActions RICHMAN_GROUP=03x`（第二条 `03x-nested`）运行 `unified-ui-browser.cjs`，其余本地服务/Playwright环境变量沿上文。`magic-actions-default-ui.cjs` 验默认模式。`verify-magic-actions.ts` 独立核对实际前后世界；`archive-magic-actions-browser.ts` 仅归档无报错、正常速度且逐笔核账通过的真实浏览器输出。第二条归档设置 `RICHMAN_NESTED=1 RICHMAN_TEST_OUTPUT=/private/tmp/richman-unified-ui-03x-nested`。

本批两条实际路线360/307命令，保留v36旧黄金。范围/未覆盖/下一步见 `docs/richman/s2-03x-magic-actions.md`，不要把全部1358领域/历史测试或111矩阵记作全场景UI验收。

## S2-03ab / v41 日本小游戏

先运行 `python3 scripts/richman/audit-minigame-source.py` 核对固定2份来源、33入口和64有效冰面；缓存目录沿此前审计。`frontend/node_modules/.bin/vite-node scripts/richman/find-minigame-routes.ts` 生成3条原图合法路线（仅计划，不能计作浏览器验收）。

分别设置 `RICHMAN_GROUP=03ab-22`、`03ab-24`、`03ab-26`，并设置 `RICHMAN_MODE=minigames`、本地 `RICHMAN_BASE_URL`、`PLAYWRIGHT_MODULE`，运行 `node scripts/richman/unified-ui-browser.cjs`。共享脚本在路线结束后调用 `minigame-ui-runner.cjs`，正常速度、390px真实输入并等待自然结算；无游戏世界注入。认证仍只用本地夹具。不要在这些测试运行中编辑运行时代码，以免HMR重开对局。

随后 `frontend/node_modules/.bin/vite-node scripts/richman/archive-minigame-browser.ts` 独立核账/前缀续接并归档实际回放；`minigame-default-ui.cjs` 检查默认模式、指纹和清理，支持本地打包预览。原图基线1106实际命令；实际分数和操作数量可能受计时输入变化，重新归档需核对范围，不能把计划覆盖写成浏览器覆盖。报告/候选差异/未覆盖见 `docs/richman/s2-03ab-minigames.md`。

## S2-03ac / v41 地点组合与收口

`frontend/node_modules/.bin/vite-node scripts/richman/find-site-circuits.ts` 生成2/3/4人原图经营路线；`find-dream-circuit.ts`补合法购卡/梦游门控路线。两者只生成计划，不能标记UI通过。

分别设置 `RICHMAN_MODE=minigames RICHMAN_GROUP=03ac-2`（或 `03ac-3`、`03ac-4`、`03ac-dream`），配合本地 `RICHMAN_BASE_URL`、`PLAYWRIGHT_MODULE`，运行 `node scripts/richman/unified-ui-browser.cjs`。这里小游戏不输入、自然计时结束，专测返回/连续地点；ab的真实玩法输入验收继续保留。共享脚本跳过计划中的tick，等待真实帧循环产生tick并出现结果按钮，不注入游戏状态。

`frontend/node_modules/.bin/vite-node scripts/richman/archive-site-circuits.ts`要求四份真实UI结果、正常速度、无错误/清理为零，再逐命令核账和重建前缀续接，归档 `site-circuit-v41-*`。`python3 scripts/richman/audit-site-coverage.py`用固定来源哈希、17码/110节点历史目录及实际回放生成覆盖/差异矩阵。领域到达夹具与真实原图路线严格分列；不得用矩阵中的“经过”或空设施“停留”冒充成功服务。

范围、规则登记、未测与接续见 `docs/richman/s2-03ac-site-circuit.md`；v41指纹和旧黄金均不变。本轮无需启动新的游戏规则版本。

## S2-04a / v42 股票行情与交易边界

`python3 scripts/richman/audit-stock-market.py` 核对固定缓存4份来源、22入口和日本12股字段，生成来源/差异表；沿用 `/private/tmp/richman-price-reference` 和 `/private/tmp/richman-news-tree.json`。缺少缓存不能标记来源通过。

`frontend/node_modules/.bin/vite-node scripts/richman/plan-stock-market.ts` 生成2/3/4人原图计划 `/private/tmp/richman-unified-04a-{2,3,4}.json`。计划只含合法命令，不是浏览器验收。

分别设置 `RICHMAN_MODE=stockMarket RICHMAN_GROUP=04a-2`（或 `04a-3`、`04a-4`），配合本地 `RICHMAN_BASE_URL`、`PLAYWRIGHT_MODULE`，运行 `node scripts/richman/unified-ui-browser.cjs`。默认输出 `/private/tmp/richman-unified-ui-04a-{2,3,4}`，正常速度、认证夹具、不注入游戏状态；等待真实行情/闭市/恢复和涨跌停按钮检查，下载实际回放。途中小游戏自然结束，不增加小游戏输入验收计数。运行中不编辑运行时代码。

`frontend/node_modules/.bin/vite-node scripts/richman/archive-stock-market.ts` 要求三份实际UI通过结果，独立核对每笔交易和每日12股公式/顺序、闭市以及五类前缀续接后归档 `stock-market-v42-*`。核账器不调用实现的报价/估值函数生成预期。`stock-market-default-ui.cjs` 支持开发页和打包预览，单独验证默认v42/3d941ac1与清理。

最终全量采用 `npm --prefix frontend test -- --maxWorkers=2`，与Chrome长路线错开，避免旧长回放负载超时；不修改原测试超时/断言。`report-stock-market.py` 从最终 `/private/tmp/richman-04a-{tests,lint,build}.log`、默认页结果及实际黄金生成 `s2-04a-results.json`，不能凭计划生成通过记录。打包默认页输出目录为 `/private/tmp/richman-stock-build-default`。

行情纯函数与规则指纹分别在 `stock-market.ts` / `stock-market-rules.ts`，避免反向导入整条历史规则链；引擎工具先导入engine。旧v1～v41指纹/黄金保持。种子RNG、整数分报价不宣称与原CRT/时间重播种/x87逐位等价，原均价/损益留S2-04b，范围见 `docs/richman/s2-04a-stock-market.md`。

## S2-04b / v43 股票均价与持仓账本

`python3 scripts/richman/audit-stock-ledger.py` 核对固定7份来源、18入口、原float均价/卖出flags/显示及调用者，输出 `s2-04b-sources.json`。缓存与固定提交沿S2-04a。

`frontend/node_modules/.bin/vite-node scripts/richman/plan-stock-ledger.ts` 生成2/3/4人正常路线与逐笔显示预期，仅为计划。分别用 `RICHMAN_MODE=stockLedger RICHMAN_GROUP=04b-2`（或 `04b-3`、`04b-4`），配合本地URL/Playwright环境运行 `unified-ui-browser.cjs`。脚本实际反复买、部分卖、清仓再买，逐笔核对持仓显示并检查窄屏/暂停/清理，不注入游戏状态；最终实际命令数可因正常帧计时不同于计划。

`frontend/node_modules/.bin/vite-node scripts/richman/archive-stock-ledger.ts` 独立复算实际均价/剩余成本、资金/供给及每个交易日行情，保存 `stock-ledger-v43-*` 黄金。它只接受三条完整通过的UI结果，不能将脚本末尾失败但已导出的回放算通过。**等归档结束后再构建/运行全量测试**，避免测试导入尚不存在的黄金JSON。

`stock-ledger-default-ui.cjs` 分别验开发页与打包页；后者设 `RICHMAN_TEST_OUTPUT=/private/tmp/richman-stock-ledger-build-default`。全量 `npm --prefix frontend test -- --maxWorkers=2` 与长浏览器路线错开，日志 `richman-04b-{tests,lint,build}.log` 保存在 `/private/tmp`；最后 `python3 scripts/richman/report-stock-ledger.py` 汇总已通过证据。历史黄金不重写。

三条UI本批未经过现金认股或持股命运/破产；这些仅领域覆盖，不能凭共用函数写成UI通过。原价格乘法/聚合浮点边界及原图表保留差异，下一S2-04c组合验收与收口盘点，详见 `docs/richman/s2-04b-stock-ledger.md`。

## S2-04c / v44 股票跨系统组合

`python3 scripts/richman/audit-stock-circuit.py` 核验固定提交3份来源、19入口，记录公司新闻调用00429040同步持久涨跌幅的证据及原图表/输入差异矩阵。仅v44新增公司新闻非零红黑幅度同步，旧规则/黄金保持。

`RICHMAN_FIND_CIRCUIT=commerce frontend/node_modules/.bin/vite-node scripts/richman/plan-stock-circuit.ts` 搜索真实可达路线（或fortune/time）。固定路线种子分别`stock-circuit-commerce-4`、`stock-circuit-fortune-8`、`stock-circuit-time-0`，2/3/4人、合法初始资金300000、1998-01-09。种子搜索仅生成命令，不修改世界/序列；科研通过买地/升级研究所/等待生产，商店按实际有限货架购买。

生成 `/private/tmp/richman-unified-04c-{commerce,fortune,time}.json` 后，用 `RICHMAN_MODE=stockCircuit RICHMAN_GROUP=04c-commerce RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs`（另两组改group）。正常速度真实UI、认证夹具、无世界状态注入；最终命令数包含自然动画/小游戏计时。

`frontend/node_modules/.bin/vite-node scripts/richman/archive-stock-circuit.ts` 只接受完整UI报告及清理通过的实际回放，独立核账、复算记录随机数的行情、前缀续接及G7恢复后冻结`stock-circuit-v44-*`。等归档完成再构建/全测。长四人逐命令/多前缀校验保留90秒测试预算，不修改历史测试阈值。

`stock-circuit-default-ui.cjs` 分别检查开发/打包默认页（打包结果目录`/private/tmp/richman-stock-circuit-build-default`）。全量测试`npm --prefix frontend test -- --maxWorkers=2`、lint/build日志为`/private/tmp/richman-04c-{tests,lint,build}.log`；`python3 scripts/richman/report-stock-circuit.py`核验并汇总真实证据。走势图和原输入仍在差异矩阵，负分红/贷款/破产与新行情的UI组合交S2-05a，不写成此次通过。

## S2-05a / v44 资金、退出与日期压力组合

本批不改产品规则或默认模式。`python3 scripts/richman/audit-finance-stress.py` 核验固定5份来源/14入口，记录历史覆盖和非租金不得提前清股的区别。`finance-stress.test.ts`使用明确领域夹具覆盖2～4人均价/最后存活/准确耗尽/逐位冻结、竞价影响后人、负分红→有奖彩票→下一贷款的双处置；这些不写成原图UI通过。

`frontend/node_modules/.bin/vite-node scripts/richman/prepare-finance-stress.ts` 生成三条固定合法计划：两人`stress-rent-6`资金30000、四人`batch-9`资金10000、三人`stress-loan-0`资金100000，均从1998-01-01开始。可用`RICHMAN_PLAN_KIND=rent-2|dividend-4|loan-3`只生成一条。计划分别1012/2696/4966命令；只构建命令，未直接设置世界、贷款、持仓或日期。

用`RICHMAN_MODE=stockCircuit RICHMAN_GROUP=05a-rent-2 RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/unified-ui-browser.cjs`运行（另两条改group）。正常速度包括小游戏自然计时及实际90日到期；无游戏状态注入，只有本地认证夹具。实际命令数包含暂停等，不能以计划数代替。

`frontend/node_modules/.bin/vite-node scripts/richman/archive-finance-stress.ts`只接受完整UI结果；可设`RICHMAN_ARCHIVE_KIND=rent|dividend|loan`逐条归档。独立核对资金/均价、逐位净额、公共处置、竞价与彩票、贷款回执及关键前缀；保存`finance-stress-v44-*`冻结回放/manifest。全部归档完毕后再运行完整测试和构建。旧262份fixture不得重写。

测试`npm --prefix frontend test -- --maxWorkers=2`与长Chrome路线错开，日志`/private/tmp/richman-05a-{tests,lint,build}.log`。`python3 scripts/richman/report-finance-stress.py`在检查完成后汇总实际证据。运行时/默认仍v44，沿用04c默认开发/打包页证据，不重复宣称新验。S2-05整体不收口，下一组反应与效果连锁见接续卡。

### S2-05b reaction / payer circuits (v44)

`plan-reaction-circuit.ts` searches only legal original-map commands and finite shop shelves. `prepare-reaction-circuit.ts` reproduces the selected two-player attack, three-player free/alliance and four-player substitute-debt routes. Plans are not browser evidence.

```bash
python3 scripts/richman/audit-reaction-circuit.py
frontend/node_modules/.bin/vite-node scripts/richman/prepare-reaction-circuit.ts
RICHMAN_GROUP=05b-waiver RICHMAN_MODE=stockCircuit RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/path/to/playwright node scripts/richman/unified-ui-browser.cjs
frontend/node_modules/.bin/vite-node scripts/richman/archive-reaction-circuit.ts
python3 scripts/richman/report-reaction-circuit.py
```

Run the browser separately for `05b-attack`, `05b-waiver` and `05b-debt`. `RICHMAN_PLAN_KIND` and `RICHMAN_ARCHIVE_KIND` can select one route. The verifier independently checks final payer cash/bank/shares, average clearing, company ranking, public auction sums per command (including multiple automatic settlements), passive-card pools, attack targets/durations, original actor return and JSON-roundtripped replay prefixes. It yields between chunks so Vitest worker communication remains responsive.

`reaction-default-ui.cjs` checks default v44 and the repaired nearby-worker entry on development and built preview pages. Use `RICHMAN_BASE_URL` and `RICHMAN_TEST_OUTPUT` to distinguish them. No world injection or animation acceleration. Six new golden files preserve actual exported browser commands; the 268 existing JSON fixtures, including S2-05a, remain unchanged. Same-day double disposal, remote protected third-target insurance and solvent substitute liquidation remain domain-only for this batch; see the report for exact scope.

### S3-02g inventory / relationship strategy (v44)

`prepare-inventory-routes.ts` reproduces legal 2/3/4-player mixed-seat routes and the three-player manual cancel/reconfirm route. Plans are not browser acceptance. New host policy `inventory-v1` inherits `status-v1`; world rules remain v44 and all older policies/replays remain available.

```bash
frontend/node_modules/.bin/vite-node scripts/richman/prepare-inventory-routes.ts
RICHMAN_PLAYERS=2 RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/path/to/playwright node scripts/richman/computer-inventory-ui-browser.cjs
# Repeat with players=3 and players=4; extra players=3 RICHMAN_ROUTE=manual.
frontend/node_modules/.bin/vite-node scripts/richman/archive-computer-inventory.ts
npm --prefix frontend test -- --maxWorkers=2
npm --prefix frontend run lint
npm --prefix frontend run build
# Start a local preview before running computer-inventory-built-browser.cjs.
```

Browser runner clicks human commands and waits for actual Session computer decisions at normal speed, using only an authentication fixture. `verify-computer-inventory.ts` independently recomputes inventory transfer, ordered discard/consumption, finite-pool credits, mutual relationships, clocks, unchanged financial/world fields and exact serialized prefixes/full replay. Archive requires a complete actual UI report and downloaded commands matching the plan before writing new fixtures. `RICHMAN_ROUTES=2,3,4,manual` can select archives. Full-bag/tool-cap boundaries are domain tests unless an actual UI receipt explicitly covers them; alliance7 is an initial clock, not a guarantee against hostility or exit.

### S3-02h commerce card strategy (v44)

`prepare-commerce-routes.ts` reproduces legal 2/3/4-player routes for price/seal, remodel and a paid card auction, plus the three-player human cancel/reconfirm route. `commerce-v1` inherits inventory-v1 and keeps the eight older policies independent. Plans never count as browser evidence.

```bash
frontend/node_modules/.bin/vite-node scripts/richman/prepare-commerce-routes.ts
RICHMAN_PLAYERS=2 RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/path/to/playwright node scripts/richman/computer-commerce-ui-browser.cjs
# Repeat players=3 / 4; extra players=3 RICHMAN_ROUTE=manual.
frontend/node_modules/.bin/vite-node scripts/richman/archive-computer-commerce.ts
npm --prefix frontend test -- --maxWorkers=2
npm --prefix frontend run lint
npm --prefix frontend run build
# Local preview: computer-commerce-built-browser.cjs
```

`verify-computer-commerce.ts` independently checks property changes, whole-street status, ordered card consumption, finite supply, auction participants and actual cash/bank receipts, unchanged public funds and price clocks. Every computer command is matched to the host policy; actual exported prefixes and full state/events must agree. Archives require a complete normal-speed UI report and matching downloaded commands. Use `RICHMAN_ROUTES=2,3,4,manual` to select archives. Only card auctions gain new bidding choices; public, bankruptcy and nested magic auctions retain older policies. Facilities and no-bid/invalid-target cases remain domain-only unless explicitly present in the actual UI result.

### S3-02i 范围建拆电脑策略

`area-v1`在v44上继承commerce-v1，只增加天使/恶魔/怪兽的整组产权、建筑投资/静态租金、同盟与科研风险判断。先生成合法原图计划，计划不等于浏览器验收：

```bash
frontend/node_modules/.bin/vite-node scripts/richman/prepare-area-routes.ts
frontend/node_modules/.bin/vite-node scripts/richman/check-area-plans.ts
RICHMAN_PLAYERS=2 RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/path/to/playwright node scripts/richman/computer-area-ui-browser.cjs
# 再分别players=3/4；额外players=3 RICHMAN_ROUTE=manual
frontend/node_modules/.bin/vite-node scripts/richman/archive-computer-area.ts
npm --prefix frontend test -- computer-area --maxWorkers=2
# 本地生产preview后可运行computer-area-built-browser.cjs
```

实际UI只替换鉴权；电脑命令由Session正常等待执行、人类按计划点击，不注入游戏状态/加速。归档器核对去暂停/令牌后的真实命令与计划、每条电脑决策、整街或单地建拆、楼型/产权/科研、现金/库存/供应、命名前缀与完整回放。领域人工边界、计划及真实UI分开登记，见`docs/richman/s3-02i-area-strategy.md`。

### S3-02j 道路与攻击电脑策略

`roads-v1`继承area-v1，v44保持；新清路、拦截、地雷/炸弹放置及飞弹策略。机器娃娃预览另修正未携带危险物漏计。

```bash
frontend/node_modules/.bin/vite-node scripts/richman/prepare-roads-routes.ts
frontend/node_modules/.bin/vite-node scripts/richman/check-roads-plans.ts
RICHMAN_PLAYERS=2 RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/path/to/playwright node scripts/richman/computer-roads-ui-browser.cjs
# 再分别players=3/4；额外players=3 RICHMAN_ROUTE=manual及players=2 RICHMAN_ROUTE=bomb
frontend/node_modules/.bin/vite-node scripts/richman/archive-computer-roads.ts
npm --prefix frontend test -- computer-roads --maxWorkers=2
# 本地preview后运行computer-roads-built-browser.cjs
```

计划只有合法命令，不注入世界状态，不等于实际UI通过。实际UI只替换鉴权，正常速度/600ms策略等待；核对放置/清除/范围伤害、保险账本、路障截停、炸弹拾取/移动倒数及前缀/完整回放，范围见`docs/richman/s3-02j-road-strategy.md`。

### S3-02k：移动与车辆策略

`mobility-v1`继承`roads-v1`，世界仍为v44/f9dbb7e9。转向卡只在自身所有候选新previous均改善公开路线时使用；装备机车/汽车后独立选择骰数，工程车沿现有四级科研楼补产。原11个策略与历史回放不改写。

```bash
frontend/node_modules/.bin/vite-node scripts/richman/prepare-mobility-routes.ts
# 仅生成原日本图合法计划，不代表浏览器验收。
RICHMAN_PLAYERS=2 RICHMAN_BASE_URL=http://127.0.0.1:5175 PLAYWRIGHT_MODULE=/path/to/playwright node scripts/richman/computer-mobility-ui-browser.cjs
# 同样运行players=3/4；另players=2 RICHMAN_ROUTE=manual和engineer。
frontend/node_modules/.bin/vite-node scripts/richman/archive-computer-mobility.ts
npm --prefix frontend test -- --maxWorkers=1
npm --prefix frontend run lint
npm --prefix frontend run build
# 启动本地preview后：
RICHMAN_BASE_URL=http://127.0.0.1:5186 PLAYWRIGHT_MODULE=/path/to/playwright node scripts/richman/computer-mobility-built-browser.cjs
```

五条原图路线分别覆盖2/3/4混合座位、人工购车取消/电脑换车、日产合法造楼后电脑科研获取工程车及付租后拆楼/七次到期。人工日产建造不当作电脑高级投资策略。车辆到期恢复有车/缺车、梦游暂停/恢复等领域与实际UI分列，见[本批报告](../../docs/richman/s3-02k-mobility-strategy.md)。

`verify-computer-mobility.ts`独立核对有限货架/点数、装备退包/不返池、方向/骰数、科研与工程车付款/拆楼顺序；序列化关键前缀续接和完整回放逐状态/事件一致。`archive-computer-mobility.ts`还要求实际下载命令去暂停/令牌后等于合法计划，错误为空、退出RAF/canvas为0，才写入专用fixture。浏览器只模拟鉴权，禁止游戏状态注入或动画加速。


## S3-03c 特殊道路对象（v46）

- `python3 scripts/richman/audit-special-objects.py`：固定参考commit的9文件/12事实静态审计；不代表Windows运行。
- `frontend/node_modules/.bin/vite-node scripts/richman/prepare-special-objects.ts`：生成2～4人原图合法引擎路线到`/private/tmp/special-objects-{2,3,4}.json`，不计浏览器通过。
- `RICHMAN_BASE_URL=http://127.0.0.1:5176 RICHMAN_PLAYERS=2 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/special-objects-ui-browser.cjs`：人数依次2/3/4；正常速度、真实Session电脑、仅认证替身。脚本仅接受本地地址。保存原图截图、回放与实际检查记录。
- `frontend/node_modules/.bin/vite-node scripts/richman/verify-special-objects.ts`：实际与合法计划命令/世界核对、8关键前缀/完整state/events，归档`special-objects-v46-*`六文件。
- 结果及未覆盖场景见`docs/richman/s3-03c-special-objects.md`和对应sources/results JSON；434旧fixture不变。13满包仍返回工具ID并移除、月界按旧位置采样，不能简写成“只有收到才移除”或“月界无原点”。

## S3-03d 衰神来源与组合边界（保持v46）

- `python3 scripts/richman/audit-god-circuit.py`：读取固定commit缓存，输出13文件/18事实及有界调用清单。没有Windows执行，不证明全EXE不存在自主游走。
- `frontend/node_modules/.bin/vite-node scripts/richman/prepare-god-circuit.ts`生成三条固定合法计划；`plan-god-circuit.ts` / `plan-god-restore.ts`：原图、纯合法命令规划；两人车辆/11↔12、三人有限货架满包、四人合法科研后恢复特殊对象。规划不是UI证据；三人失败搜索不能算领取失败UI已通过。
- `god-circuit-ui-browser.cjs`：`RICHMAN_ROUTE=pair|full-known|restore`和相应`RICHMAN_PLAYERS=2|3|4`，读取`/private/tmp/god-circuit-{route}.json`，正常速度逐操作执行；小游戏tick/动画由游戏自行产生，人工输入前检查revision，导出命令须逐条等于原合法计划。仅本地地址与鉴权替身，无游戏状态注入。结果在`/private/tmp/richman-god-circuit-ui-{route}/`。
- `RICHMAN_VERIFY_ROUTES=pair,full-known,restore frontend/node_modules/.bin/vite-node scripts/richman/verify-god-circuit.ts`：核对实际命令/世界、效果不变量、命名前缀/完整回放，才写`god-circuit-v46-*`fixtures。
- `god-circuit-domain.test.ts`是构造边界，`god-circuit-browser.test.ts`只固定实际导出的golden；最终范围与未验收项见`docs/richman/s3-03d-god-circuit.md`及results。

衰神原入口为认输后的目标选择，不是魔法屋十二效果或任意破产附送。15原双槽、装备清理与候选初始/五轮补缺差异留下一批版本化，不用改旧回放的方式修正。

### S3-03e 认输与衰神（v47）

- `python3 scripts/richman/audit-surrender.py`：核对9份缓存原来源的固定hash并生成13项事实；需已有`/private/tmp/richman-price-reference`。
- `frontend/node_modules/.bin/vite-node scripts/richman/prepare-surrender.ts`：生成2/3/4人原图合法计划；计划不是UI验收。
- 保持本地Vite运行，分别以`RICHMAN_PLAYERS=2`、`3`、`4`运行：
  `RICHMAN_BASE_URL=http://127.0.0.1:5176 RICHMAN_PLAYERS=4 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/surrender-ui-browser.cjs`
- `frontend/node_modules/.bin/vite-node scripts/richman/verify-surrender.ts`：核对实际命令、世界、关键前缀和完整回放，并归档六份fixture。与计划比对规范化gameId/revision及暂停引起的lastBoundary日志游标；实际回放自身状态/事件始终精确比较。
- 结果目录 `/private/tmp/richman-surrender-ui-{2,3,4}`；报告 `docs/richman/s3-03e-surrender.md`。历史fixture不得改写为新版本。
- `surrender-confirm-ui.cjs`（同上本地环境变量，`RICHMAN_PLAYERS=3`）：补认输确认在重开/换局菜单取消后的失效冒烟，独立于三条完整回放统计。

## S3-04a 音频资源与局部检查

`python3 scripts/richman/export_audio.py` 只读本机rich4安装目录，依赖`cc`、`ffmpeg`、`ffprobe`，扫描资源/格式并导出已核验的8首背景音乐和2条WAV到Git忽略的`frontend/public/richman/generated/audio/`。`--source`指定包含Game/Media的安装目录，`--reference`指定既有原汇编缓存。不会覆盖地图/人物资源，不上传原安装目录；本地EXE和相关表不匹配时停止。

`frontend/node_modules/.bin/vite-node scripts/richman/verify-audio-foundation.ts` 核对110路格映射、清单/哈希并用ffmpeg完整解码10个输出，不播放、不启动浏览器。资源/规则/待验收矩阵见`docs/richman/s3-04a-audio-foundation.md`。用户安排a～c先实现，d统一浏览器验收；局部检查不能写成实际播放通过。

## S3-04b 事件音效与角色语音

已有S3-04a音频后执行 `python3 scripts/richman/export_event_audio.py`，从本地原文前缀/角色事件表核验并增量导出16条语音、Effect49/50，扩展生成清单，登记33停留路格。新目录先运行`export_audio.py`再运行此脚本；重新运行基础导出后也需再运行本脚本以恢复扩展清单。两个脚本只写生成目录/本批索引文档，不改原安装文件。

`frontend/node_modules/.bin/vite-node scripts/richman/verify-event-audio.ts` 验证110格当前映射、16语音索引、18新文件/10旧文件哈希。完整PCM解码在增量导出时完成；不打开浏览器、不播放声音。基础核验脚本保留23个继承映射检查，不再把本批新增映射当作应静音的旧空位。浏览器统一留S3-04d，详细限制见`docs/richman/s3-04b-event-audio.md`。

## S3-04d 定点声画验收

历史七路线与近景结果见`docs/richman/s3-04d-presentation-acceptance.md`，定点补验不要重复这些路线。变化集合G7路线使用`RICHMAN_RESTORE_SEARCH=2 RICHMAN_RESTORE_RULES=japan-events-candidate-v47 node --import tsx scripts/richman/plan-god-restore.ts`搜索合法计划（固定两人种子`god-restore-2-0`），在`/private/tmp/presentation-v47-g7-change-2.json`的索引2102/2103加`before-g7-change`/`after-g7-change`标记后，按该JSON运行`presentation-ui-browser.cjs`，设置`RICHMAN_CAPTURE_ONLY=1`及`RICHMAN_FOCUS_MARKS=before-g7-change,after-g7-change`；最后运行`node --import tsx scripts/richman/verify-presentation-g7-change.ts`归档实际导出回放和精确端口清单。脚本只以本地地址和认证替身操作真实UI，不注入状态或加速；浏览器结果目录为`/private/tmp/richman-presentation-ui-g7change-changed-set/`。

普通付费地产4→5语音用`RICHMAN_UPGRADE_CHARACTERS=xiaomei,tuu node --import tsx scripts/richman/plan-presentation-upgrade.ts`等配置搜索原图合法计划，计划本身不算浏览器验收。角色组合必须遵守新建页面的固定顺序：`xiaomei,tuu,chyan,salonbus`中取子序列；沙隆巴斯需作后位目标，设置`RICHMAN_UPGRADE_TARGET=player-2`。分别用`RICHMAN_PLAN=/private/tmp/presentation-paid-upgrade-<角色>-voice.json`、`RICHMAN_ROUTE=upgrade`、`RICHMAN_OUTPUT_TAG=<角色>`运行同一UI脚本，`RICHMAN_CHARACTER=<角色> node --import tsx scripts/richman/verify-presentation-upgrade.ts`核对实际座位、付费事件、对应语音`playing`、计划命令、前缀/完整回放后才归档。原图同回合优先队列与真隐藏只在实际触发时登记通过；媒体包或伪造`visibilitychange`不能替代。


## S3-04d 原生Chrome最后定点

`presentation-native-server.cjs` 是仅127.0.0.1:5178的临时验收代理，要求Vite在127.0.0.1:5177。原样提供应用模块和资源，仅在HTML加登录夹具与被动媒体/可见性观察；所有`/api/`在代理内部截住，不访问生产。通过原生UI新开 `http://127.0.0.1:5178/modules/richman`，开启声音后真实新建/关闭空白标签，检查 `/private/tmp/richman-native-tab/result.json` 是否真正hidden及可信事件；不得改写hidden或合成事件。通过正常原图UI购地，再用“运行信息与验证工具 → 下载回放记录”保存真实命令（代理被动复制下载Blob为replay.json）。退出到模块集合，确认全部媒体端口释放后把result.json保存为final.json；最后关闭仅本次测试标签页、停止代理/Vite。

`audit-presentation-competition.ts` 只读重建已归档的presentation回放，按回合、声道和flush段列潜在竞争；扫描不是浏览器定时队列验收。`verify-presentation-native.ts` 验证本批特定6命令/3前缀及真实媒体记录，归档native-final回放和文档；要求上一步competition-audit.json存在。两者用 `frontend/node_modules/.bin/vite-node scripts/richman/<脚本名>.ts` 执行。本批已完成，不为下一阶段自动重跑；自然短音拒绝与原图竞争仍未触发，用户已同意按Chrome候选收口保留限制。


## S3-05a 帮助与操作短验收

在本地Vite5177运行 `PLAYWRIGHT_MODULE=<playwright模块路径> node scripts/richman/polish-help-browser.cjs`：桌面与390px Chrome触屏模拟检查当前帮助、工人选择/定位/暂停/取消、原生全屏、按钮缩放和换旧economy/退出。只注入登录夹具，真实游戏命令导出到 `/private/tmp/richman-polish-help`，不运行声画长局。模拟tap不能算触屏拖动/真机验收。

随后 `frontend/node_modules/.bin/vite-node scripts/richman/verify-polish-help.ts` 核对两条6命令实际回放、每条3前缀、资金/库存不变后归档。报告和边界见 `docs/richman/s3-05a-help-polish.md`；这组已通过，不需下一批默认重复。
