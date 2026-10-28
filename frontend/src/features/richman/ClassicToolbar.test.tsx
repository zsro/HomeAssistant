import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ClassicToolbar } from './ClassicToolbar';

afterEach(cleanup);

it('keeps all original entries, including save/load, accessible and in audited order', () => {
  const open = vi.fn();
  render(<ClassicToolbar onOpen={open} />);
  const toolbar = screen.getByRole('navigation', { name: '原版工具栏' });
  expect(within(toolbar).getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual([
    '帮助', '设置', '托管设置', '读档', '存档', '小地图', '人物资料', '道具', '卡片', '地产出售', '股票',
  ]);
  fireEvent.click(within(toolbar).getByRole('button', { name: '读档' }));
  fireEvent.click(within(toolbar).getByRole('button', { name: '存档' }));
  expect(open.mock.calls).toEqual([['load', '读档'], ['save', '存档']]);
  expect(toolbar.querySelectorAll('button img')).toHaveLength(22);
});
