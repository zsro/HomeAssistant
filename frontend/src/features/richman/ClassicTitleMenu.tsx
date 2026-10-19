import art from './classic-ui-art.json';

const labels: Record<string, string> = { start: 'START · 新建对局', load: 'LOAD · 读档（暂未接入）', options: 'OPTION · 设置', exit: 'EXIT · 返回模块集合' };
export function ClassicTitleMenu({ onSelect }: { onSelect: (id: string) => void }) {
  return <div className="rm-title-scene">
    <img className="rm-title-background" src="/richman/generated/ui/Data-1/000.png" alt="大富翁4" draggable={false} />
    <nav aria-label="原版开始菜单">{art.title.map(item => {
      const f = item.hover, [x, y] = item.position;
      // EXIT is enlarged to a touch target; the three character buttons retain native hover bounds.
      const width = item.id === 'exit' ? 100 : f.width, height = item.id === 'exit' ? 60 : f.height;
      const left = item.id === 'exit' ? x - 50 : x - f.anchorX, top = item.id === 'exit' ? y - 30 : y - f.anchorY;
      return <button type="button" key={item.id} className={`rm-title-button rm-title-${item.id}`} aria-label={labels[item.id]} title={labels[item.id]}
        style={{ left: `${left/640*100}%`, top: `${top/480*100}%`, width: `${width/640*100}%`, height: `${height/480*100}%` }} onClick={() => onSelect(item.id)}>
        {(['normal','hover'] as const).map(state => <img key={state} className={`rm-title-${state}`} alt="" draggable={false} src={`/richman/generated/ui/${item[state].path}`}
          style={{ left: `${(x-item[state].anchorX-left)/width*100}%`, top: `${(y-item[state].anchorY-top)/height*100}%`, width: `${item[state].width/width*100}%`, height: `${item[state].height/height*100}%` }} />)}
      </button>;
    })}</nav>
  </div>;
}
