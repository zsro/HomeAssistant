import type { SessionSnapshot } from './game/session';
import { disposalHelp, modeIncludes } from './mode-help';

export function GameHelp({ snapshot, expanded = false }: { snapshot: SessionSnapshot; expanded?: boolean }) {
  return <details className="rm-property rm-help rm-classic-help" open={expanded || undefined}>
    <summary>玩法与操作帮助</summary>
    <p>拖动地图浏览；使用放大、缩小按钮或鼠标滚轮调整视角。触屏可单指拖动，缩放请用按钮。点击“跟随当前角色”可找回人物。</p>
    <p>选择目标后先核对名称、路格和预览，再点击确认；选中或定位不会立即使用道具。可取消后重新选择。</p>
    <p>全屏后可用“退出全屏”按钮返回，键盘可按 Esc。暂停时先点击“继续”再操作；重开和换局会丢弃当前未导出的进度，刷新页面会重新开始。</p>
    {snapshot.economy ? <>
      <p>开局现金与存款各半。停在普通地产后可购买、升级或结算租金；资金不足按本模式规则处理，最后一位未退出玩家获胜。</p>
      <p>{snapshot.calendar?.business ? '本局物价随日期按资产核算，只升不降；实际费用见决策预览。' : '本局沿用固定物价。'}{snapshot.calendar ? '每轮推进一天；每月1日按贷款状态结息，贷款到期结算。' : '本模式不含日期推进和定期结息。'}</p>
      {modeIncludes(snapshot.mode, 'calendar') && <p>{disposalHelp(snapshot.mode)}</p>}
    </> : <p>{snapshot.mode === 'sandbox' ? '自由验证用于浏览地图、切换角色和检查移动，不进行经营结算。' : '仅移动模式不进行地产和资金结算。'}</p>}
    <p>当前为 Web 候选规则；历史模式保留当时的能力。车辆专属动画、原版转盘和部分表现仍有差异。</p>
  </details>;
}
