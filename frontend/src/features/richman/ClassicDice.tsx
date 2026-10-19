import { OriginalDie } from './OriginalDie';
import { diceResult } from './classic-presentation';
import type { SessionSnapshot } from './game/session';
export function ClassicDice({ snapshot }: { snapshot: SessionSnapshot | null }) {
  const faces = diceResult(snapshot), rolling = snapshot?.phase === 'rolling';
  return <div className="rm-classic-dice" aria-label="本次掷骰结果">
    {rolling ? <span role="status">掷骰中…</span> : faces.length ? <>
      <div className="rm-dice-faces">{faces.map((face, i) => <span className="rm-die" key={i} aria-label={`第 ${i + 1} 颗：${face} 点`}><OriginalDie value={face} /></span>)}</div>
      <strong>总步数 {snapshot!.dice}</strong>
    </> : <span>{snapshot?.phase === 'idle' ? '尚未掷骰' : '本回合未掷骰'}</span>}
  </div>;
}
