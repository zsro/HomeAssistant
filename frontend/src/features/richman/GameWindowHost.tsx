import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject, SyntheticEvent } from 'react';
import type { SessionSnapshot } from './game/session';
import { WINDOW_EVENT, WINDOW_TITLES, decisionWindow } from './window-state';
import type { WindowRequest } from './window-state';

const SelectedPanel = createContext<string | null>(null);
export function WindowPanel({ id, children }: { id: string; children: ReactNode }) {
  const selected = useContext(SelectedPanel);
  return <div data-richman-panel={id} hidden={selected !== id}>{children}</div>;
}

/** A single mounted copy of every panel. Opening/closing windows never dispatches game commands. */
export function GameWindowHost({ root, snapshot, epoch, suspended, isCurrent, onPause, onNewGame, onSave, onLoad, connection, children }: {
  root: RefObject<HTMLElement | null>; snapshot: SessionSnapshot | null; epoch: number; suspended: boolean;
  isCurrent: () => boolean; onPause: () => void; onNewGame: () => void; children: ReactNode;
  onSave?: () => void; onLoad?: () => void; connection?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [request, setRequest] = useState<WindowRequest | null>(null);
  const [hint, setHint] = useState('');
  const [empty, setEmpty] = useState(false);
  const modal = useRef(false);
  const previous = useRef({ context: '', decision: '' });
  const decision = useMemo(() => decisionWindow(snapshot), [snapshot]), decisionKey = decision?.key ?? '';
  const context = `${epoch}:${snapshot?.seed}:${snapshot?.turn}:${snapshot?.active}`;
  const remember = () => {
    if (!dialog.current?.open) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };
  useEffect(() => {
    const element = root.current;
    const open = (event: Event) => {
      const { selector } = (event as CustomEvent<{ selector: string }>).detail;
      if (selector === '.rm-board') {
        event.preventDefault();
        if (decision?.required && !decision.map) { setRequest(decision); return; }
        setRequest(current => current?.map ? { ...current, minimized: true } : null);
        const board = element?.querySelector<HTMLElement>('.rm-board');
        if (board) { board.tabIndex = -1; board.focus({ preventScroll: true }); }
        return;
      }
      const target = element?.querySelector<HTMLElement>(selector);
      const panel = target?.closest<HTMLElement>('[data-richman-panel]')?.dataset.richmanPanel;
      if (!panel || !dialog.current?.contains(target ?? null)) return;
      event.preventDefault(); remember(); setHint('');
      const next = decision?.required ? decision : { panel, selector, title: WINDOW_TITLES[panel], key: `browse:${panel}`, required: false, map: false, decision: false };
      setRequest({ ...next, minimized: false });
    };
    element?.addEventListener(WINDOW_EVENT, open);
    return () => element?.removeEventListener(WINDOW_EVENT, open);
  }, [root, decision]);

  useEffect(() => {
    if (previous.current.context === context && previous.current.decision === decisionKey) return;
    const changedDecision = previous.current.decision !== decisionKey || previous.current.context !== context;
    previous.current = { context, decision: decisionKey };
    setHint('');
    if (decision && changedDecision) { remember(); setRequest(decision); }
    else setRequest(current => current?.decision || !decision ? null : current);
  }, [context, decisionKey, decision]);

  const focusMap = useCallback(() => {
    const board = root.current?.querySelector<HTMLElement>('.rm-board');
    if (board) { board.tabIndex = -1; board.focus({ preventScroll: true }); }
  }, [root]);
  useLayoutEffect(() => {
    const window = dialog.current;
    if (!window) return;
    if (!request || request.minimized || suspended) {
      if (window.open) window.close();
      if (!suspended) {
        if (request?.minimized) focusMap();
        else if (opener.current) {
          const previous = opener.current; opener.current = null;
          if (previous.isConnected && !previous.closest('[hidden],dialog:not([open])') && !previous.matches(':disabled')) previous.focus({ preventScroll: true });
          else focusMap();
        }
      }
      return;
    }
    const nextModal = !request.map;
    if (window.open && modal.current !== nextModal) window.close();
    if (!window.open) { if (nextModal) window.showModal(); else window.show(); }
    modal.current = nextModal;
    const panel = window.querySelector<HTMLElement>(`[data-richman-panel="${request.panel}"]`);
    setEmpty(!panel?.textContent?.trim());
    const target = panel?.querySelector<HTMLElement>(request.selector) ?? panel;
    if (target instanceof HTMLDetailsElement) target.open = true;
    panel?.querySelectorAll('details.rm-help, details.rm-diagnostics').forEach(detail => { (detail as HTMLDetailsElement).open = true; });
    for (let parent = target?.parentElement; parent && parent !== panel; parent = parent.parentElement) if (parent instanceof HTMLDetailsElement) parent.open = true;
    heading.current?.focus({ preventScroll: true });
    window.querySelector('.rm-window-body')?.scrollTo?.(0, 0);
  }, [request, suspended, focusMap]);

  const dismiss = () => {
    if (!request?.required) setRequest(null);
    else if (request.map) setRequest({ ...request, minimized: true });
    else setHint('当前操作尚未完成，请使用窗口中的按钮处理。');
  };
  const guard = (event: SyntheticEvent) => {
    // A stale rendered form must not address a newer revision/seat. The engine still validates decision IDs.
    if (!isCurrent()) { event.preventDefault(); event.stopPropagation(); setHint('状态已更新，请重新操作。'); }
  };
  const select = (panel: string) => {
    setHint(''); setRequest({ panel, title: WINDOW_TITLES[panel], selector: `[data-richman-panel="${panel}"]`, key: `browse:${panel}`, required: false, map: false, decision: false });
  };
  return <>
    {request?.minimized && !suspended && <div className="rm-window-resume" role="status">
      <span>{request.title} · 可在地图上浏览或选择，返回窗口确认</span>
      <button onClick={() => setRequest({ ...request, minimized: false })}>返回当前操作</button>
    </div>}
    <dialog ref={dialog} data-window-host data-panel={request?.panel} className={`rm-game-window${request?.map ? ' is-map-window' : ''}`} aria-labelledby="rm-window-title"
      onCancel={event => { event.preventDefault(); dismiss(); }}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(); } }}>
      <header className="rm-window-header">
        <h2 id="rm-window-title" ref={heading} tabIndex={-1}>{request?.title ?? '游戏窗口'}</h2>
        <div>
          {onSave && <button onClick={onSave}>存档</button>}
          {onLoad && <button onClick={onLoad}>读档</button>}
          {snapshot && <button onClick={onPause}>{snapshot.paused ? '继续' : '暂停'}</button>}
          <button disabled={!snapshot} onClick={onNewGame}>新建对局</button>
          <button onClick={dismiss} disabled={!!request?.required && !request.map} aria-label={request?.map ? '收起窗口，地图选点' : '关闭窗口'}>{request?.map ? '地图选点' : '关闭'}</button>
        </div>
      </header>
      {connection}
      {request?.required && <p className="rm-window-required">{snapshot?.paused ? '已暂停 · ' : ''}{snapshot?.computer?.automatic ? '电脑正在应答 · ' : ''}请完成当前操作{request.map ? '，或收起窗口查看地图' : ''}。</p>}
      {hint && <p className="rm-window-hint" role="status">{hint}</p>}
      <div className="rm-window-body" onClickCapture={guard} onSubmitCapture={guard} onChangeCapture={guard}>
        <SelectedPanel.Provider value={request?.panel ?? null}>
          <WindowPanel id="directory"><nav className="rm-window-directory" aria-label="全部功能">{Object.entries(WINDOW_TITLES).filter(([id]) => id !== 'directory').map(([id, title]) => <button key={id} onClick={() => select(id)}>{title}</button>)}</nav></WindowPanel>
          {children}
        </SelectedPanel.Provider>
        {empty && <p>当前模式或状态未启用此功能。入口已保留，尚未接入的业务暂时挂起。</p>}
      </div>
    </dialog>
  </>;
}
