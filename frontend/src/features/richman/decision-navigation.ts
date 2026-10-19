import type { SessionSnapshot } from './game/session';

// Presentation only: scroll to the live responder's panel without submitting a command.
export function decisionSelector(state: Pick<SessionSnapshot, 'phase' | 'insuranceDecision'>) {
  if (state.insuranceDecision) return '[aria-label="保险办理"]';
  const selectors: Partial<Record<SessionSnapshot['phase'], string>> = {
    effect: '.rm-items', shop: '.rm-items', choosing: '[aria-label="选择岔路"]',
    property: '[aria-label="当前地产决策"]', bank: '[aria-label="银行存取款"]',
    debt: '[aria-label="债务处理"]', reaction: '[aria-label="反应决策"]',
    auction: '[aria-label="地产拍卖"]', news: '[aria-label="新闻结算"]',
    fortune: '[aria-label="命运结算"]', magic: '[aria-label="魔法屋"]',
    lottery: '[aria-label="彩票购买"]', company: '[aria-label="公司营业结算"]',
    commerce: '[aria-label="日产建造与现场认股"]', facility: '[aria-label="设施探访"]',
    surrender: '[aria-label="认输与衰神"]', minigame: '.rm-minigame',
    finished: '[aria-label="对局结果"]',
  };
  return selectors[state.phase] ?? '.rm-action-bar';
}

export function navigateGame(root: HTMLElement, selector: string) {
  const target = root.querySelector<HTMLElement>(selector);
  if (!target) return false;
  if (selector === '.rm-board' && !root.dispatchEvent(new CustomEvent('richman:open-window', { cancelable: true, detail: { selector } }))) return true;
  // The host owns visibility and focus; never focus a still-hidden dialog child.
  if (target.closest('[data-window-host]')) {
    return !target.dispatchEvent(new CustomEvent('richman:open-window', { bubbles: true, cancelable: true, detail: { selector } }));
  }
  // UI-01 keeps each existing panel mounted once inside the collapsed workbench.
  for (let ancestor: HTMLElement | null = target; ancestor && ancestor !== root; ancestor = ancestor.parentElement) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
  }
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'start', behavior: 'instant' });
  return true;
}
