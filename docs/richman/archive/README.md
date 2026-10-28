# 大富翁历史与专项资料索引

更新：2026-10-19。日常从[项目总览](../README.md)进入；任务排期只看[现行路线图](../../richman-roadmap.md)。本页是资料目录，不是待办清单。

## 归档方式

旧总路线图和 UI 长计划冻结在本目录。其余阶段报告、JSON、截图和回放按原路径保留，通过本页作逻辑归档；不迁移机器证据或批量更改脚本路径。下列阶段报告中的“当前、下一步、禁止测试、未提交/部署”均需结合当时日期和范围阅读，不覆盖现行计划及用户新指示。

资源审计、美术/发布说明属于按需查阅的专项参考，不要求日常逐篇维护。历史验收不因为归档而失效，也不能扩大为未覆盖功能的验收。

## 按问题查资料

| 问题 | 优先入口 |
| --- | --- |
| 现在能玩什么、下一步做什么 | [总览](../README.md)、[路线图](../../richman-roadmap.md) |
| 存档与联机如何接 | [实现设计](../save-and-multiplayer.md) |
| UI 还有哪些缺口 | [UI 状态](../original-ui-restoration-plan.md)、[UI-08 原验收差异](../ui08-deferred.md) |
| 某条规则/某个历史版本为什么这样实现 | 下列 S1/S2/S3 对应报告及报告链接的 sources/results JSON |
| 如何复跑某个验证 | [脚本说明](../../../scripts/richman/README.md)，按任务选取 |
| 如何上线 | 根 [AGENTS.md](../../../AGENTS.md) 优先；[发布专项](../release-s3.md)提供历史命令参考 |

## S0：原型与旧总计划（3 篇）

- [大富翁网页技术验证](../../richman-technical-validation.md)
- [大富翁 4 Web 复刻计划与接续记录](roadmap-through-s3.md)
- [《大富翁4》原版 UI 还原实施计划](ui-restoration-through-ui08.md)

## S1：核心对局（5 篇）

- [S1-01 日本地图与经济规则核验](../s1-01-audit.md)
- [S1-02 对局引擎与回合接入](../s1-02-engine.md)
- [S1-03 地产闭环](../s1-03-properties.md)
- [S1-04 资金与结束条件](../s1-04-finance.md)
- [S1-05：日本地图对局验收](../s1-05-acceptance.md)

## S2：规则与经济（87 篇）

- [S2-01 效果框架设计](../s2-01-design.md)
- [S2-01：效果清单、证据与框架验收](../s2-01-effects.md)
- [S2-02 分组交付计划](../s2-02-batches.md)
- [S2-02 首个道具闭环设计](../s2-02-design.md)
- [S2-02 首批：遥控骰子可玩闭环](../s2-02-items.md)
- [S2-02 物品清单与收口条件](../s2-02-progress.md)
- [S2-02 第二批设计：机器工人（当前地块限定版）](../s2-02b-design.md)
- [S2-02 第二批：机器工人·当前地块限定版](../s2-02b-worker.md)
- [S2-02 第三批设计：邻近建造候选版](../s2-02c-design.md)
- [S2-02 第三批：目标选择核验与邻近建造候选版](../s2-02c-targeting.md)
- [S2-02 第四批设计：遮挡核验与地图点选建造](../s2-02d-design.md)
- [S2-02 第四批：遮挡命中核验与地图点选建造](../s2-02d-picking.md)
- [S2-02 第五批：路障与机器娃娃](../s2-02e-design.md)
- [S2-02 第五批：路障＋机器娃娃可玩闭环](../s2-02e-road-tools.md)
- [S2-02 第六批：首张可玩卡片——均贫卡](../s2-02f-cards.md)
- [S2-02 第六批：均贫卡](../s2-02f-design.md)
- [S2-02 第七批：均富卡](../s2-02g-design.md)
- [S2-02 第七批：均富卡多人现金平均](../s2-02g-wealth.md)
- [G1 五卡设计](../s2-02h-design.md)
- [S2-02 第八批 / G1：基础地产与方向五卡](../s2-02h-g1.md)
- [G2 / S2-02 第九批设计](../s2-02i-design.md)
- [S2-02 第九批 / G2：行动状态与车辆七项](../s2-02i-g2.md)
- [G3 / S2-02 第十批设计](../s2-02j-design.md)
- [S2-02 第十批 / G3：反应与玩家交互（已实现，浏览器验收延期）](../s2-02j-g3.md)
- [G4 统一验收清单（全部待执行）](../s2-02k-acceptance.md)
- [G4 设计 / v10](../s2-02k-design.md)
- [S2-02 第十一批 / G4：地产经营五卡（已实现，待统一验收）](../s2-02k-g4.md)
- [G5 待统一验收清单（未执行）](../s2-02l-acceptance.md)
- [G5 设计：范围建拆、道路攻击与研究生产](../s2-02l-design.md)
- [S2-02 第十二批 / G5：建拆与道路攻击七项（已实现，待统一验收）](../s2-02l-g5.md)
- [G6 统一验收清单（未执行）](../s2-02m-acceptance.md)
- [G6 神仙与股票设计（v12）](../s2-02m-design.md)
- [S2-02 第十三批 / G6：神仙与股票四卡（已实现，待统一验收）](../s2-02m-g6.md)
- [G7及统一验收完成清单](../s2-02n-acceptance.md)
- [G7 实施设计](../s2-02n-design.md)
- [S2-02n / G7：时光机、传送机与核子飞弹](../s2-02n-g7.md)
- [S2-02o：43项统一验收](../s2-02o-unified.md)
- [S2-03a：随机得卡地点](../s2-03a-design.md)
- [S2-03a：地图事件目录核验与随机得卡](../s2-03a-map-events.md)
- [S2-03aa：商店经营者赠品与本次货架](../s2-03aa-shop-acquisition.md)
- [S2-03ab：日本三个小游戏](../s2-03ab-minigames.md)
- [S2-03ac：17码地点组合与候选范围收口](../s2-03ac-site-circuit.md)
- [S2-03b 新闻首组设计](../s2-03b-design.md)
- [S2-03b：新闻序列与资金/股票四事件](../s2-03b-news.md)
- [S2-03c 新闻地产组设计](../s2-03c-design.md)
- [S2-03c：地产拆除/降级与土地数量奖励](../s2-03c-property-news.md)
- [S2-03d 新闻经营组设计](../s2-03d-design.md)
- [S2-03d：地价调整、公共拍卖与地产税](../s2-03d-operating-news.md)
- [S2-03e 设计：拘留与交通新闻](../s2-03e-design.md)
- [S2-03e：拘留、行动与交通新闻](../s2-03e-status-news.md)
- [S2-03f：剩余十九条新闻统一完成](../s2-03f-complete-news.md)
- [S2-03f 设计：剩余十九条新闻统一闭环](../s2-03f-design.md)
- [S2-03g 命运资金与库存组设计](../s2-03g-design.md)
- [S2-03g：命运资金与库存组](../s2-03g-fortune.md)
- [S2-03h：地产、取卡与持股命运](../s2-03h-asset-fortune.md)
- [S2-03h 资产命运设计](../s2-03h-design.md)
- [S2-03i 交通与地区命运设计](../s2-03i-design.md)
- [S2-03i：交通与日本地区命运](../s2-03i-traffic-fortune.md)
- [S2-03j 设计约定](../s2-03j-design.md)
- [S2-03j：日本最后五槽命运](../s2-03j-final-fortune.md)
- [S2-03k 日期与银行结算](../s2-03k-calendar-bank.md)
- [S2-03k 设计约定](../s2-03k-design.md)
- [S2-03l 彩票与日期开奖设计](../s2-03l-design.md)
- [S2-03l 彩票与日期开奖](../s2-03l-lottery.md)
- [S2-03m 公司账本与日期分红](../s2-03m-company-dividends.md)
- [S2-03m 公司日期分红设计](../s2-03m-design.md)
- [S2-03n 公司地点营业与账本联动](../s2-03n-company-services.md)
- [S2-03n 公司营业首组设计](../s2-03n-design.md)
- [S2-03o 日产建造与公司现场认股](../s2-03o-commerce.md)
- [S2-03o 日产建造与现场认股设计](../s2-03o-design.md)
- [S2-03p 三井保险、期限与赔付](../s2-03p-insurance.md)
- [S2-03q：节日与日期经营（v30）](../s2-03q-calendar-business.md)
- [S2-03r：物价消费者与经营一致性](../s2-03r-indexed-economy.md)
- [S2-03s：地产挂牌、竞价与原处置边界](../s2-03s-estate-sales.md)
- [S2-03t：租金破产退出、资产处置与三块强拍](../s2-03t-bankruptcy.md)
- [S2-03u：公司、命运与贷款破产回调](../s2-03u-payment-callbacks.md)
- [S2-03v：多人税款、负分红与日期回调](../s2-03v-payment-batches.md)
- [S2-03w：日本地点盘点与魔法屋首组六效果](../s2-03w-magic-house.md)
- [S2-03x：魔法屋拘留、就地建拆与逐位接续](../s2-03x-magic-actions.md)
- [S2-03y：三连命运、当格拍卖与嵌套返回](../s2-03y-nested-magic.md)
- [S2-03z：设施探访与商店手动卖出](../s2-03z-site-services.md)
- [S2-04a：股票基础盘点与每日行情增量](../s2-04a-stock-market.md)
- [S2-04b：股票均价与持仓账本](../s2-04b-stock-ledger.md)
- [S2-04c：股票跨系统组合与候选收口](../s2-04c-stock-circuit.md)
- [S2-05a：资金、破产处置与日期组合](../s2-05a-finance-stress.md)
- [S2-05b：反应、实际付款人与回合接续](../s2-05b-reaction-circuit.md)
- [S2-05c：时光机恢复与跨系统接续](../s2-05c-restore-circuit.md)

## S3：电脑、声画与交互（30 篇）

- [S3-01a：基础电脑对手](../s3-01a-basic-computer.md)
- [S3-01b：混合座位终局与非当前应答接续](../s3-01b-computer-circuit.md)
- [S3-02a：主动遥控骰子与机器工人策略](../s3-02a-tool-strategy.md)
- [S3-02b：免费/嫁祸租金反应与实际付款风险](../s3-02b-rent-strategy.md)
- [S3-02c：陷害/梦游嫁祸防御策略](../s3-02c-defense-strategy.md)
- [S3-02d：主动地产卡策略](../s3-02d-estate-strategy.md)
- [S3-02e：主动现金卡策略](../s3-02e-cash-strategy.md)
- [S3-02f：主动状态卡策略](../s3-02f-status-strategy.md)
- [S3-02g：主动库存与关系策略](../s3-02g-inventory-strategy.md)
- [S3-02h：主动经营卡策略](../s3-02h-commerce-strategy.md)
- [S3-02i：主动范围建拆策略](../s3-02i-area-strategy.md)
- [S3-02j：主动道路与攻击策略](../s3-02j-road-strategy.md)
- [S3-02k：主动移动与车辆策略](../s3-02k-mobility-strategy.md)
- [S3-02l：公开附身与行情卡策略](../s3-02l-gods-strategy.md)
- [S3-02m：保守股票与融资策略](../s3-02m-capital-strategy.md)
- [S3-02n：保守高级科研策略](../s3-02n-research-strategy.md)
- [S3-02o：策略组合与长局收口验收](../s3-02o-strategy-circuit.md)
- [S3-03a：神仙/交通生命周期盘点与表现](../s3-03a-god-lifecycle.md)
- [S3-03b：普通神仙配对补位](../s3-03b-god-pairs.md)
- [S3-03c：特殊道路对象与月界补位](../s3-03c-special-objects.md)
- [S3-03d：衰神来源、对象移动与组合边界](../s3-03d-god-circuit.md)
- [S3-03e：认输后的衰神获取](../s3-03e-surrender.md)
- [S3-03f：神仙与车辆组合验收及候选收口](../s3-03f-god-closure.md)
- [S3-04a：音频资源与播放基础](../s3-04a-audio-foundation.md)
- [S3-04b：事件音效、角色语音与队列](../s3-04b-event-audio.md)
- [S3-04c：神仙与道路对象表现](../s3-04c-object-presentation.md)
- [S3-04d：a～c 统一声画验收](../s3-04d-presentation-acceptance.md)
- [S3-05a 帮助、模式说明与操作反馈](../s3-05a-help-polish.md)
- [S3-05b 决策导航、地图反馈与手势保护](../s3-05b-navigation-polish.md)
- [S3-05c 代表性交互验收与 S3 候选收口](../s3-05c-interaction-closure.md)

## UI：原版风格界面阶段记录（13 篇）

- [UI-00 联系表](../ui00/README.md)
- [UI-01：原版主界面骨架](../ui01-main-shell.md)
- [UI-02：人物资料与回合操作](../ui02-turn-information.md)
- [UI-03：工具入口与统一窗口](../ui03-window-host.md)
- [UI-04：地产、目标选择与基础银行窗口](../ui04-property-bank.md)
- [UI-05 · 库存与经营窗口](../ui05-inventory-business.md)
- [UI-06 验证附件](../ui06/README.md)
- [UI-06 · 事件与应答窗口](../ui06-events-responses.md)
- [UI-07 验证附件](../ui07/README.md)
- [UI-07：菜单、设置与多尺寸适配](../ui07-menus-responsive.md)
- [UI-08 验证附件](../ui08/README.md)
- [UI-08：总验收与发布准备](../ui08-acceptance-release.md)
- [UI-08：原版差异与业务挂起清单](../ui08-deferred.md)

## 专项参考：资源、地图与发布（4 篇）

- [原版美术分批接入流程（2026-10-10）](../art-integration-flow.md)
- [日本地图缺图核对与修复（2026-10-10）](../map-art-fix.md)
- [UI-00：原版 UI 资源与坐标审计](../original-ui-resource-audit.md)
- [前端本地构建与 Git 产物发布](../release-s3.md)
