# S3-05b 决策导航、地图反馈与手势保护

日期：2026-10-10。完成本组交互增量及定点检查，S3-05整体继续。v47、十五policy、S3-05a与S3-04 Chrome候选收口保持。未改游戏规则、金额/库存结算、RNG、音频或资源。

## 问题与改动

长页面过去只能上下翻找决策，地图提示还将所有决策称为“侧栏”。新增随页面滚动保持可见的“回到地图 / 当前操作 / 操作帮助”，根据实际phase选择面板；帮助自动展开，定位时转移键盘焦点，不自动点按钮，不发送命令。新地点/公司/认输等阶段补入操作提示。原两列布局与内容顺序保留，空白区域没有全面重排。

工人无效地图命中现在提示“此处未选中可建造地块”，保留原选择并指向列表。反馈按decisionId绑定，改选/取消后清除；新决策不会沿用旧提示。只涉及既有工人地图点选，不扩张其他卡片地图目标范围。

输入保护补齐：电脑实际应答期间地图不触发选路/选地/错误提示，列表选择回调再次核对归属。模型发布新状态时取消在途手势；捕获丢失、pointercancel会取消。定点检查发现：在pointerdown后、捕获正式生效前释放捕获，可能没有lostpointercapture，旧pointerup仍生成点击。现增加hasPointerCapture检查，已重跑受影响短流程通过。取消手势只影响视图输入，不撤销游戏命令。

## 本批真实矩阵

| 项目 | 结果与具体范围 | 保留边界 |
| --- | --- | --- |
| 长页导航 | 桌面1440×1000、390×844地图/工人/帮助定位与焦点通过，帮助自动展开；导航不增revision | 其他phase已按现有面板建立映射，尚未逐一浏览器触发 |
| 工人无效命中 | 原图开局合法库存进入，海域点击触发提示；此前列表选择保持，再改选清提示 | 不新增像素遮挡规则；没有宣称所有卡片地图反馈已测 |
| 拖动/取消 | 鼠标拖动、Chrome模拟单指touchStart/Move/End，截图显示地图平移且revision/所选地产不变；可信touchCancel无误选 | CDP触屏模拟不是真机；桌面释放捕获为显式故障注入；多指/双指缩放未测或未实现 |
| 暂停中断 | 接触尚未抬起时通过真实暂停/继续按钮提交命令，确认禁用，抬起不误选，之后新接触正常；取消重开工人清选择 | 按钮以DOM click执行以保留按下接触，未注入游戏状态；不是物理同时按键操作 |
| 电脑输入归属 | 两电脑tools-v1正常速度原图购地后进入工人，自动应答标记true；人类点图不改选/不生成miss、radio禁用，暂停800ms冻结、退出canvas0 | 原图当前工人应答者已测；非当前租金/反应/拍卖导航留后续定点 |
| 全屏回退 | 明确注入requestFullscreen的NotAllowedError，进入expanded、body锁滚动；内部地图/帮助导航、Esc退出与overflow恢复通过 | 不称自然拒绝；原生全屏沿用S3-05a通过记录，Safari另列 |
| 390px布局 | 页面无横向溢出，导航换行/44px按钮可用；回退全屏内地图和操作可达 | 未覆盖所有低高度/横屏/真机组合 |
| 回放 | 两条各6命令、各1/3/4前缀及完整回放；库存/经济不变、0消耗。电脑17命令、8/15/16前缀及完整回放，合法已购地、暂停待选工人未消耗 | 共29实际命令/9前缀独立登记，不混入历史声画长局或完整对局数 |

[结果含原始指针证据](s3-05b-results.json)、[来源及哈希](s3-05b-sources.json)。脚本只伪造本地登录并阻断其他API，未注入游戏世界。三个回放存于`frontend/src/features/richman/game/fixtures/polish-v47-navigation-*-replay.json`。

已人工查看截图：[桌面无效命中](s3-05b-desktop-invalid.png)、[390px拖动前](s3-05b-touch390-before-drag.png)、[拖动后](s3-05b-touch390-after-drag.png)、[全屏回退](s3-05b-touch390-fallback.png)、[电脑工人暂停](s3-05b-ownership.png)。导航、提示和窄屏按钮可读，拖动前后地图位置确实改变。

## 局部检查与复现

60项/4文件测试通过：decision-navigation、ItemPanel、map-picking、mode-help。lint、tsc/Vite构建及diff检查通过（既有chunk/import提示保留）。开工758个游戏/生成资源文件、其中490个既有fixture逐文件SHA256不变；新增三条短回放。S3-04已过声画长局未重跑。

启动本地Vite后运行：

```bash
RICHMAN_BASE_URL=http://127.0.0.1:5177 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/polish-navigation-browser.cjs
RICHMAN_BASE_URL=http://127.0.0.1:5177 PLAYWRIGHT_MODULE=/Users/zsr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright node scripts/richman/polish-ownership-browser.cjs
frontend/node_modules/.bin/vite-node scripts/richman/verify-polish-navigation.ts
```

失败尝试不计通过：重复点击已选radio不会触发change，脚本改为先换目标；错误的GameSession构造参数与种子输入精确标签定位已改正。捕获释放后误点击属于真实产品问题，修复后才记录通过。

## 下一步

后续记录：S3-05c代表性交互与S3候选已收口，见[最终矩阵](s3-05c-interaction-closure.md)。下段保留b结束时的历史安排。

S3-05c以代表性短流程补键盘导航、弹窗取消/返回焦点及非当前应答者的“当前操作”，优先租金反应/拍卖/债务中可用历史合法路线达到的组合；核对暂停/重开/换局时焦点和目标是否过期。先盘点现有回放/最短入口，只补实际缺口，不重跑已过声画长局、不重做卡片或结算。完成后判断S3-05 Chrome候选范围能否收口；不可达或未测设备独立列出，不滚动扩成全系统重验。

自然短音拒播、原图竞争队列仍未触发；人工听感/Safari、车辆/事件/Panel/jump未映射、原声音栈/随机/队列、透明/遮挡、退出栈/终局、原RNG、特殊角色、转盘与AI/行情等历史差异完整保留。退出后拍卖不能救活玩家，公共所得不能代付原债。未提交、推送、部署。
