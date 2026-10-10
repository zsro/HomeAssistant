import type { AudioStatus, RichmanAudio } from './audio';
export function AudioPanel({ audio, status }: { audio: RichmanAudio | null; status: AudioStatus | null }) {
  return <div className="rm-audio" role="group" aria-label="游戏声音">
    <button className="rm-button rm-button-light" disabled={!status?.ready} onClick={() => audio?.unlock()}>
      {!status?.unlocked ? '开启声音' : status.blocked || status.failed ? '重试播放' : '声音已开启'}
    </button>
    <button className="rm-button rm-button-light" disabled={!status?.ready} aria-pressed={status?.muted ?? false} onClick={() => audio?.preferences({ muted: !status?.muted })}>{status?.muted ? '取消静音' : '静音'}</button>
    <label>音乐 <input aria-label="音乐音量" type="range" min="0" max="100" value={Math.round((status?.music ?? .35) * 100)} onChange={e => audio?.preferences({ music: Number(e.target.value) / 100 })}/></label>
    <label>音效 <input aria-label="音效音量" type="range" min="0" max="100" value={Math.round((status?.effects ?? .65) * 100)} onChange={e => audio?.preferences({ effects: Number(e.target.value) / 100 })}/></label>
    <label>语音 <input aria-label="语音音量" type="range" min="0" max="100" value={Math.round((status?.voice ?? .8) * 100)} onChange={e => audio?.preferences({ voice: Number(e.target.value) / 100 })}/></label>
    {status?.failed && <span role="status">音频暂不可用，游戏可继续{!status.ready && '，重新加载可重试'}。</span>}
    {status?.blocked && <span role="status">请点击重试播放以允许声音。</span>}
  </div>;
}
