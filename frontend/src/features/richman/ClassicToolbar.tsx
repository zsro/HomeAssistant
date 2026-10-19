import art from './classic-ui-art.json';

const root = '/richman/generated/ui/Panel-1/';

export function ClassicToolbar({ onOpen }: { onOpen: (id: string, label: string) => void }) {
  return <nav className="rm-classic-toolbar" aria-label="原版工具栏">
    <img className="rm-classic-toolbar-base" src={root + '000.png'} alt="" draggable={false} />
    {art.toolbar.map(button => <button key={button.id} type="button" title={button.label}
      aria-label={button.label} data-tool={button.id} onClick={() => onOpen(button.id, button.label)}>
      {(['normal', 'hover'] as const).map(state => {
        const { frame, drawRect: [x, y, width, height] } = button.states[state];
        return <img key={state} className={`rm-classic-icon-${state}`} alt="" draggable={false}
          src={`${root}${String(frame).padStart(3, '0')}.png`}
          style={{ left: x - button.index * 40, top: y, width, height }} />;
      })}
      <span className="rm-classic-tool-label">{button.label}</span>
    </button>)}
  </nav>;
}
