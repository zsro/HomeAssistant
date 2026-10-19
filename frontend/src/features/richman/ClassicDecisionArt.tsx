import type { ReactNode } from 'react';

/** Local Data[476] frame 5; text and responsive sizing are Web adaptations. */
export function ClassicPrompt({ children }: { children: ReactNode }) {
  return <div className="rm-native-prompt"><div>{children}</div></div>;
}
/** Data[399]: normal, YES hover, NO hover. Keep explicit business labels accessible. */
export function ClassicDecisionActions({ accept, decline, disabled, declineDisabled, onAccept, onDecline }: {
  accept: string; decline?: string; disabled: boolean; declineDisabled?: boolean; onAccept: () => void; onDecline?: () => void;
}) {
  return <div className="rm-native-decisions">
    <button type="button" className="rm-native-yes" disabled={disabled} onClick={onAccept}><i aria-hidden="true" /><span>{accept}</span></button>
    {decline && <button type="button" className="rm-native-no" disabled={declineDisabled} onClick={onDecline}><i aria-hidden="true" /><span>{decline}</span></button>}
  </div>;
}

/** Original numeric keys, enlarged for pointer/touch input; input remains editable with a keyboard. */
export function ClassicNumberKeys({ value, onChange, maximum, disabled }: {
  value: string; onChange: (value: string) => void; maximum: number; disabled: boolean;
}) {
  const keys: [string, number][] = [['7', 7], ['8', 8], ['9', 9], ['4', 10], ['5', 11], ['6', 12], ['1', 13], ['2', 14], ['3', 15], ['C', 4], ['0', 5], ['←', 6]];
  return <fieldset className="rm-native-keypad" data-repeatable-input disabled={disabled} aria-label="金额数字键盘">
    {keys.map(([label, frame]) => <button key={label} type="button" aria-label={label === 'C' ? '清空金额' : label === '←' ? '删除末位' : `输入 ${label}`}
      onClick={() => onChange(label === 'C' ? '' : label === '←' ? value.slice(0, -1) : (value + label).replace(/^0+(?=\d)/, '').slice(0, 15))}>
      <img src={`/richman/generated/ui/Panel-21/${String(frame).padStart(3, '0')}.png`} alt="" draggable={false} />
    </button>)}
    <button type="button" className="rm-native-max" aria-label="填入最大金额" disabled={maximum === 0} onClick={() => onChange(String(maximum))}>
      <img src="/richman/generated/ui/Panel-21/002.png" alt="" draggable={false} />
    </button>
  </fieldset>;
}
