# S3-05c 代表性交互验收与 S3 候选收口

日期：2026-10-10。S3-05按本批及a/b的Web/Chrome代表性范围收口，S3-01～05均已完成各自候选范围。不是原版完全等价或全设备/全组合通过。游戏v47、十五policy、S3-04候选与全部历史规则/回放保持。

## 实际问题与修复

键盘在工人列表用Tab/Space选地，再用Enter取消时，面板被移除，焦点原来落回body。现在成功确认/取消道具后定位下一操作；确认重开/换局后清除工人选择/地图miss并定位新局操作区。

同一问题可发生于竞价与反应面板更换：记录游戏内focusin，状态提交后仅在旧焦点控件已经移除且当前焦点为body时定位当前决策。正常保留的输入焦点不抢占。原生dialog关闭的焦点恢复继续使用浏览器行为；取消不清除有效目标，已暂停时打开再取消也不会恢复游戏。以上只改焦点与UI临时状态，无游戏命令、RNG或结算变化。

## 真实验收矩阵

| 项目 | 结果 | 范围与限制 |
| --- | --- | --- |
| 键盘目标/取消 | 桌面1440×1000及390×844：Enter开启工人/当前操作，Tab到radio、Space选择、Enter取消后焦点到操作区，Tab可继续掷骰 | 代表性键盘片段；测试主动定位起始按钮，不称从应用入口全程仅Tab遍历 |
| 焦点可见 | 掷骰按钮有3px solid焦点轮廓，截图已看 | 不是全控件可访问性审计 |
| 弹窗取消 | 重开、新局Escape返回原按钮；选择保留；已暂停时新局取消仍暂停 | 使用原生dialog，Chrome已测 |
| 重开/换局 | 确认后定位新局操作区；再次进入工人无旧目标、不能未选确认；旧miss不显示，退出canvas0 | v47四人到两人；不把新局切换当作单个连续回放命令 |
| 非当前竞价 | 当前玩家2，由玩家1/2/3依次竞价；当前操作+Tab进入拍卖；下一竞价者焦点仍在拍卖，结束后到新闻结算 | 日本原图v17历史合法前30命令，正常速度；不是v47经济结算新增验收 |
| 非当前反应 | 当前玩家4，由玩家1应答嫁祸；当前操作+Tab进入反应，390px无横溢；应答后焦点到魔法屋 | 日本原图v37历史合法前284命令，正常速度；非租金反应，不冒充全部反应分支 |
| 非当前债务 | active玩家1、payer玩家2的FinancePanel，定位债务区、显示付款人2；暂停禁用，导航不提交清算 | 独立组件fixture，仅此范围。本批未重走原图非当前债务导航，S3-01b/S2-05历史付款验收保持 |
| 精确回放 | 8份导出、340命令/16前缀，每份完整导出重放状态与事件一致；v17/v37命令及最终状态/事件与历史前缀规范化gameId后精确一致 | 是完整导出前缀，不是8个完整对局；26条v47与314条历史模式明确分列 |

结果：[s3-05c-results.json](s3-05c-results.json)；来源：[s3-05c-sources.json](s3-05c-sources.json)。浏览器仅登录fixture、其他API阻断，没有注入世界状态，没有改变动画速度。

键盘脚本分三次导出（重开前9、重开后2、换局后2），两视口合计26条；导出后到重开边界之间的额外操作不计入340条归档数。焦点、弹窗和跨局UI断言来自浏览器执行结果，不能仅由回放证明。拍卖和反应只走已核验的短前缀，不重跑历史完整长局。

已查看：[窄屏键盘](s3-05c-keyboard-390.png)、[桌面键盘](s3-05c-keyboard-desktop.png)、[非当前竞价](s3-05c-auction.png)、[窄屏反应](s3-05c-reaction-390.png)。桌面两列下方空白仍存在，快捷导航使决策可达，本批未做视觉重排。

## 检查与复现

33项/4文件（decision-navigation、ItemPanel、FinancePanel、G3Choice）、lint、tsc/Vite及diff检查通过，既有chunk/import提示保留。开工761个游戏/生成资源文件、其中493个历史fixture SHA256不变，新增8条UI导出；声画长局未重跑。

```bash
frontend/node_modules/.bin/vite-node scripts/richman/prepare-polish-responders.ts
PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/polish-closure-browser.cjs
PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/polish-responders-browser.cjs
frontend/node_modules/.bin/vite-node scripts/richman/verify-polish-closure.ts
```

默认本地Vite5177，可设置RICHMAN_BASE_URL；应答脚本可设置RICHMAN_ROUTES=auction或reaction单独补验。路线盘点工具为audit-polish-routes.ts与find-polish-reaction.ts，只读旧回放，不将引擎状态注入浏览器。

失败/排除：首次键盘取消失焦是真实问题，修复后重验；pause字段、重复act声明、魔法按钮精确名称和组件预期文本等脚本问题修正后再计通过。原先按命令顺序猜测的255条反应实际仍是当前玩家，经过引擎核验改用284条魔法屋非当前反应。通用焦点处理修改触发热更新时中断了中间路线，最终在稳定代码上重新执行受影响短检查；这些中断不计入通过数。

## S3 收口与保留项

S3-01基础电脑、S3-02保守策略、S3-03普通座位神仙/交通、S3-04 Chrome声画及S3-05代表性交互均已有候选验收和差异表。本批没有发现该范围内剩余阻断问题，进入S4，不继续将S3滚动拆成全系统重验。

以下继续明确保留，不能理解为通过：真机/Safari、人工听感、全键盘路径与所有43项/所有座位/状态组合；自然短音拒播/原图竞争队列未触发；自然全屏拒绝未触发（b只有注入）；多指/双指缩放；非当前债务本批无原图导航；未映射车辆/事件/Panel/jump、原音乐栈/语音随机/队列/透明/遮挡、原退出栈/终局、原RNG/特殊角色/转盘、原AI/行情等差异。设备与跨地图稳定性按S4-04安排，不据此重开已验候选。退出后拍卖不救活玩家，公共所得不代付原债。

下一S4-01a：盘点本地原版地图/角色与现有转换器、资源清单，建立可追溯的内容覆盖表，核验第一组非日本地图或未开放角色的可复用入口，按证据确定并完成适量内容增量。先做清单，不默认重写日本规则、特殊角色行为或开始存档/发布。未提交、推送或部署。
