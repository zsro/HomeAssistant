import type {SessionSnapshot} from './game/session';
import {GODS} from './game/g6-catalog';
import {godTrafficView} from './god-traffic-view';

export function GodTrafficPanel({snapshot: s}: {snapshot: SessionSnapshot}) {
  return <section className="rm-property" aria-label="神仙附身与地图位置">
    <h2>神仙与交通</h2>
    <p>地图金色圆环代表游离神仙；停在所在路格才附身，路过不触发。请神符召请附近最近一位，送神符只移除不利附身及携带炸弹。</p>
    <ul className="rm-god-seats">{s.participants.map((_, seat) => {
      const v = godTrafficView(s, seat);
      return <li key={v.id} aria-label={`玩家${seat + 1}神仙与交通`}>
        <strong>玩家 {seat + 1}{v.gone ? ' · 已退出' : v.actorIndex === s.active ? ' · 当前行动' : ''}</strong>
        {!v.gone && <>
          <p data-god-status={v.id}>{v.god ? `${v.name} · 剩余${v.god.remaining}次自身行动开始结算` : '未附身'}</p>
          {v.god && <details><summary>附身效果与命运影响</summary><p>{v.detail}</p>{v.fortune && <><p>{v.fortune}</p><p>仅影响带有神仙判定的命运；资金与状态/库存分别判定，具体取消、金额或期限以事件结算为准。</p></>}</details>}
          <p>{v.mobility}</p>
          {v.engineer && <p>{v.engineer}</p>}
        </>}
      </li>;
    })}</ul>
    <details><summary>期限如何推进</summary><p>附身在自身行动开始结算时扣1次；住院、监禁、冬眠或旅行仍会消耗期限。暂停不推进，与交易日无关。</p><p>工程车在自身行动结束时扣1次，梦游期间暂停。附身与车辆分别计时；工程车先结算落点，再执行拆除。</p></details>
    <details><summary>查看游离神仙位置与效果</summary><ul>{s.g6!.gods.filter(g => !g.carrier).map(g => <li key={g.id}>{GODS.find(d => d.type === g.type)?.name} · {g.node}号路格 · {GODS.find(d => d.type === g.type)?.detail}</li>)}</ul></details>
    {s.g6?.objects&&<details open><summary>特殊道路对象</summary><p>红方块11：步行住院3次，车辆避开；蓝方块13：抽取普通工具，满9件不重抽；绿方块14：增加500点。均停留触发，经过不触发。13/14每月重新布点。</p><ul>{s.g6.objects.map(g=><li key={g.id}>对象{g.type} · {g.node}号路格</li>)}</ul></details>}
    <details><summary>衰神与原版获取差异</summary>{s.mode==='surrender'?<p>认输退出后按人数条件选择衰神目标；共两个忙槽，附身清空装备与背包，无点数返还，期限13次自身行动开始。放弃附身不撤销退出。</p>:<p>当前衰神采用开局出现、每5轮补缺的Web候选规则，附身期限为13次自身行动开始。原版已定位到认输退出后的选人附身与双槽入口；该流程尚未接入。当前背包清空保留装备，与原入口处理装备的行为也有差异。</p>}<p>地图方向和移动动画不等于自主游走；当前对象不自行换路格。</p></details>
    <p className="rm-property-note">{s.mode==='surrender'?'普通五组及11/12配对，13/14月界刷新，衰神仅从认输入口获取。':s.g6?.objects ? '普通五组及11/12移除后配对补位；13/14月界刷新；衰神沿用旧补缺。' : s.g6?.pairing ? '普通五组神仙移除后尝试配对补位，不按五轮补缺；土地公与衰神仍沿用旧补缺。特殊对象未接入。' : '当前采用种子布点，每5轮补充缺席神仙；'}不主动游走。转盘由种子确定，神仙扣款不足时截断，不触发额外破产。地图标签显示附身与装备，车辆暂沿用人物步行动画。</p>
  </section>;
}
