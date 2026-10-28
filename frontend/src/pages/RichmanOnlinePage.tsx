import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { getErrorMessage } from '../api/client';
import { netRequest } from '../features/richman/network/api';
import type { RoomChange, RoomView } from '../../../shared/richman/rooms';
import { CHARACTER_IDS } from '../../../shared/richman/content';
import { RichmanPage } from './RichmanPage';
import '../features/richman/richman.css';
import '../features/richman/network/rooms.css';
const names: Record<string, string> = { xiaomei: '孙小美', tuu: '阿土伯', chyan: '钱夫人', salonbus: '沙隆巴斯' };
type RoomLink = Pick<RoomView, 'id' | 'code' | 'status' | 'gameId'>;
export function RichmanNetworkGamePage() {
  const { gameId } = useParams();
  return <RichmanPage key={gameId} networkGameId={gameId} />;
}
export function RichmanOnlinePage() {
  const { roomId } = useParams(), auth = useAuth(), owner = useRef(auth.user!.id), navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomLink[]>([]), [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [code, setCode] = useState('');
  const creating = useRef(crypto.randomUUID()), blocked = useRef(false), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    const read = async () => {
      try {
        if (roomId) {
          const next = await netRequest<RoomView>(owner.current, `/rooms/${roomId}`, undefined, undefined, controller.signal);
          if (!controller.signal.aborted) setRoom(old => old?.id === next.id && old.revision > next.revision ? old : next);
        } else {
          const next = await netRequest<RoomLink[]>(owner.current, '/rooms', undefined, undefined, controller.signal);
          if (!controller.signal.aborted) setRooms(next);
        }
      } catch (e) { if (!controller.signal.aborted) setError(getErrorMessage(e)); }
      finally { if (!controller.signal.aborted) timer = setTimeout(() => void read(), roomId ? 1500 : 5000); }
    };
    void read(); return () => { controller.abort(); clearTimeout(timer); };
  }, [roomId, reload]);
  const run = async (task: () => Promise<unknown>) => {
    if (blocked.current) return; blocked.current = true; setBusy(true); setError('');
    try { await task(); } catch (e) { setError(getErrorMessage(e)); }
    finally { blocked.current = false; setBusy(false); setReload(n => n + 1); }
  };
  const change = (action: RoomChange) => void run(async () => {
    await netRequest(owner.current, `/rooms/${room!.id}/change`, { revision: room!.revision, action });
    if (action.type === 'leave') { setRoom(null); navigate('/modules/richman/online'); }
  });
  const current = room?.id === roomId ? room : null, me = current?.seats.find(s => s.self);
  return <main className="rm-online-page">
    <header><Link to="/modules/richman">← 单机游戏</Link><Link to="/">模块集合</Link></header>
    <section className="rm-room-banner"><div><small>RICHMAN · PRIVATE ROOM</small><h1>和朋友一起出发</h1><p>日本地图 · 2–4 位玩家或电脑 · 服务器持续保存</p></div><img src="/richman/generated/xiaomei.webp" alt="" /></section>
    {error && <p className="rm-room-error" role="alert">{error} <button onClick={() => { setError(''); setReload(n => n + 1); }}>刷新状态</button></p>}
    {!roomId ? <>
      <section className="rm-room-entry"><div><h2>创建私人房间</h2><p>把房间码告诉朋友。每人使用自己的账号，选好角色并准备后开始。</p><button className="rm-button" disabled={busy} onClick={() => void run(async () => {
        const created = await netRequest<RoomView>(owner.current, '/rooms', { id: creating.current }); creating.current = crypto.randomUUID(); setRoom(created); navigate(`/modules/richman/online/rooms/${created.id}`);
      })}>创建房间</button></div><form onSubmit={e => { e.preventDefault(); void run(async () => {
        const joined = await netRequest<RoomView>(owner.current, '/rooms/join', { code: code.trim().toUpperCase() }); setRoom(joined); navigate(`/modules/richman/online/rooms/${joined.id}`);
      }); }}><h2>加入朋友</h2><label>房间码<input aria-label="房间码" value={code} maxLength={12} placeholder="12 位房间码" autoComplete="off" onChange={e => setCode(e.target.value.replace(/\s/g, '').toUpperCase())} /></label><button className="rm-button" disabled={busy || !/^[A-F0-9]{12}$/.test(code)}>加入房间</button></form></section>
      <section className="rm-room-list"><h2>我的房间与对局</h2>{!rooms.length && <p>还没有房间。创建一个，或输入朋友的房间码。</p>}{rooms.map(r => <Link key={r.id} to={`/modules/richman/online/rooms/${r.id}`}><strong>{r.code}</strong><span>{r.status === 'finished' ? '查看已完成的对局 →' : r.gameId ? '返回已开局的房间 →' : '继续准备 →'}</span></Link>)}</section>
    </> : current ? <section className="rm-private-room" aria-label="私人房间">
      <div className="rm-room-heading"><div><small>房间码</small><h2 data-testid="room-code">{current.code}</h2></div><button onClick={() => void navigator.clipboard.writeText(current.code).catch(() => setError('复制失败，请手动选取房间码'))}>复制房间码</button><Link to="/modules/richman/online">房间列表</Link></div>
      <p>{current.gameId ? '座位和规则已锁定。离开页面后对局仍保留，返回即可继续。' : current.owner ? '你是房主。可开放座位、加入电脑或关闭空位，全部真人准备后开局。' : '选择自己的角色并准备，等待房主开局。'}</p>
      <div className="rm-room-seats">{current.seats.map(seat => <article key={seat.position} className={`rm-room-seat is-${seat.kind}${seat.self ? ' is-self' : ''}`}>
        <img src={`/richman/generated/${seat.characterId}.webp`} alt=""/><h3>{names[seat.characterId]}</h3><strong>{seat.kind === 'closed' ? '座位关闭' : seat.name}{seat.self ? '（你）' : ''}{seat.owner ? ' · 房主' : ''}</strong>
        <p>{seat.kind === 'human' ? `${seat.online ? '在线' : '离线'} · ${current.gameId ? '已入局' : seat.ready ? '已准备' : '未准备'}` : seat.kind === 'ai' ? '电脑 · 科研策略' : seat.kind === 'open' ? '等待朋友加入' : current.gameId ? '本局未使用' : '可由房主开放'}</p>
        {!current.gameId && seat.self && <label>选择角色<select aria-label="选择角色" disabled={busy} value={seat.characterId} onChange={e => change({ type: 'character', characterId: e.target.value })}>{CHARACTER_IDS.map(id => <option key={id} value={id} disabled={current.seats.some(s => s.characterId === id && !s.self && ['human', 'ai'].includes(s.kind))}>{names[id]}</option>)}</select></label>}
        {!current.gameId && current.owner && seat.kind !== 'human' && <label>座位 {seat.position + 1}<select aria-label={`座位 ${seat.position + 1}`} disabled={busy} value={seat.kind} onChange={e => change({ type: 'seat', position: seat.position, kind: e.target.value as 'open' | 'ai' | 'closed' })}><option value="open">等待真人</option><option value="ai">加入电脑</option><option value="closed">关闭座位</option></select></label>}
      </article>)}</div>
      <div className="rm-room-options"><label>初始资金<select aria-label="初始资金" value={current.initialFunds} disabled={busy || !current.owner || !!current.gameId} onChange={e => change({ type: 'funds', initialFunds: Number(e.target.value) })}>{[10000,30000,50000,100000,200000,300000].map(n => <option key={n} value={n}>{n.toLocaleString()} 元</option>)}</select></label><span>规则 v47 · 1998 年 1 月 1 日开始 · 随机种子由服务器生成</span></div>
      <div className="rm-room-actions">{current.gameId ? <Link className="rm-button" to={`/modules/richman/online/games/${current.gameId}`}>进入联机对局</Link> : <>
        <button className="rm-button" disabled={busy || !me} onClick={() => change({ type: 'ready', ready: !me?.ready })}>{me?.ready ? '取消准备' : '准备好了'}</button>
        {current.owner && <button className="rm-button" disabled={busy || current.seats.some(s => s.kind === 'open' || s.kind === 'human' && (!s.ready || !s.online)) || current.seats.filter(s => ['human','ai'].includes(s.kind)).length < 2} onClick={() => void run(async () => {
          const result = await netRequest<{ gameId: string }>(owner.current, `/rooms/${current.id}/start`, { revision: current.revision }); navigate(`/modules/richman/online/games/${result.gameId}`);
        })}>开始联机</button>}
        <button disabled={busy} onClick={() => change({ type: 'leave' })}>离开房间</button></>}
      </div><p className="rm-room-note">修改角色、资金或座位后，所有玩家需要重新准备。联机不读取个人 SAVE；离线不会由电脑替你决定。共同暂停与观战暂未开放。</p>
    </section> : <p role="status">正在读取房间…</p>}
  </main>;
}
