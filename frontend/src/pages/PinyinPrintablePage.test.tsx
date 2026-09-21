import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { AuthContext } from '../auth/auth-context';
import type { AuthContextValue } from '../auth/auth-context';
import { readWordProgress } from '../features/pinyin-printables/progress';
import { commonWords } from '../features/pinyin-printables/words';
import { downloadBlob, renderPinyinPdf } from '../features/pinyin-printables/render';

vi.mock('../features/pinyin-printables/render', () => ({ renderPinyinPdf: vi.fn(), downloadBlob: vi.fn() }));
const rendered = vi.mocked(renderPinyinPdf);
const downloaded = vi.mocked(downloadBlob);
const value: AuthContextValue = {
  status: 'authenticated', user: { id: 'u1', username: 'tester', displayName: '测试用户', inviteCode: 'ABCDEFGHJK', invitedByUserId: null, status: 'active', createdAt: '2026-09-21T00:00:00Z' },
  signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
};
const open = (path = '/modules/printer/kindergarten/pinyin', authenticated = true) => render(
  <AuthContext.Provider value={authenticated ? value : { ...value, status: 'anonymous', user: null }}><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></AuthContext.Provider>,
);
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_key: string, work: () => Promise<unknown>) => work() } });
  vi.clearAllMocks(); rendered.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })); });
afterEach(cleanup);

describe('pinyin page and downloads', () => {
  it('adds a printer entry and protects the pinyin route', () => {
    const { unmount } = open('/modules/printer');
    expect(screen.getByRole('link', { name: /拼音.*认读/ })).toHaveAttribute('href', '/modules/printer/kindergarten/pinyin');
    unmount();
    open('/modules/printer/kindergarten/pinyin', false);
    expect(screen.queryByRole('heading', { name: '拼音练习打印' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '欢迎回来' })).toBeInTheDocument();
  });

  it('defaults to beginner, five topics and two pages, and enforces selection limits', async () => {
    const user = userEvent.setup();
    open();
    expect(screen.getByRole('radio', { name: /入门/ })).toBeChecked();
    expect(screen.getAllByRole('checkbox').every((box) => (box as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByLabelText('练习总页数')).toHaveValue('2');
    const boxes = screen.getAllByRole('checkbox');
    for (const box of boxes.slice(1)) await user.click(box);
    await user.selectOptions(screen.getByLabelText('练习总页数'), '1');
    await user.click(boxes[1]);
    await user.click(boxes[2]);
    expect(screen.getByLabelText('练习总页数')).toHaveValue('1');
    await user.click(boxes[3]);
    expect(screen.getByLabelText('练习总页数')).toHaveValue('2');
    for (const box of boxes) if ((box as HTMLInputElement).checked) await user.click(box);
    expect(screen.getByRole('alert')).toHaveTextContent('请至少选择一个栏目');
    expect(screen.getByRole('button', { name: /生成拼音练习/ })).toBeDisabled();
  });

  it('re-downloads the same words without advancing and continues after refresh or level change', async () => {
    const user = userEvent.setup();
    const { unmount } = open();
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: /生成拼音练习/ }));
    await screen.findByRole('button', { name: '重新下载' });
    const first = rendered.mock.calls[0][0];
    expect(first.words.map(({ text }) => text)).toEqual(commonWords.slice(0, 9).map(({ text }) => text));
    expect(readWordProgress('u1').completed).toHaveLength(9);
    expect(screen.queryByRole('button', { name: /答案|陪练/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重新下载' }));
    await waitFor(() => expect(rendered).toHaveBeenCalledTimes(2));
    expect(rendered.mock.calls[1]).toEqual([first]);
    expect(readWordProgress('u1').completed).toHaveLength(9);
    await user.click(screen.getByRole('button', { name: '换一套' }));
    await waitFor(() => expect(downloaded).toHaveBeenCalledTimes(3));
    expect(rendered.mock.calls[2][0].seed).not.toBe(first.seed);
    expect(rendered.mock.calls[2][0].words.map(({ text }) => text)).toEqual(commonWords.slice(9, 18).map(({ text }) => text));
    unmount();
    open();
    await user.click(screen.getByRole('radio', { name: /^拼读/ }));
    await user.click(screen.getByRole('button', { name: /生成拼音练习/ }));
    await waitFor(() => expect(downloaded).toHaveBeenCalledTimes(4));
    expect(rendered.mock.calls[3][0].words.map(({ text }) => text)).toEqual(commonWords.slice(18, 27).map(({ text }) => text));
    expect(rendered.mock.calls[3][0].level).toBe('blending');
  });

  it.each(['topic', 'pages'])('clears the old batch when changing %s', async (setting) => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole('button', { name: /生成拼音练习/ }));
    await screen.findByRole('button', { name: '重新下载' });
    if (setting === 'topic') await user.click(screen.getAllByRole('checkbox')[0]);
    else await user.selectOptions(screen.getByLabelText('练习总页数'), '3');
    expect(screen.queryByRole('button', { name: '重新下载' })).not.toBeInTheDocument();
  });

  it('blocks repeated downloads and configuration edits while rendering', async () => {
    let complete!: (blob: Blob) => void;
    rendered.mockReturnValueOnce(new Promise((resolve) => { complete = resolve; }));
    const user = userEvent.setup();
    open();
    await user.dblClick(screen.getByRole('button', { name: /生成拼音练习/ }));
    await waitFor(() => expect(rendered).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: /正在生成 PDF/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /^拼读/ })).toBeDisabled();
    expect(screen.getAllByRole('checkbox')[0]).toBeDisabled();
    await act(async () => { complete(new Blob(['pdf'])); });
    expect(await screen.findByRole('button', { name: '重新下载' })).toBeEnabled();
  });

  it('retains configuration and recovers after a PDF failure', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    rendered.mockRejectedValueOnce(new Error('Font unavailable'));
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole('radio', { name: /^拼读/ }));
    await user.click(screen.getByRole('button', { name: /生成拼音练习/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('你的练习设置已保留');
    expect(screen.getByRole('radio', { name: /^拼读/ })).toBeChecked();
    expect(downloaded).not.toHaveBeenCalled();
    expect(readWordProgress('u1').completed).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: /生成拼音练习/ }));
    await screen.findByRole('button', { name: '重新下载' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(rendered.mock.calls[1][0].level).toBe('blending');
    expect(rendered.mock.calls[1][0].words).toEqual(rendered.mock.calls[0][0].words);
    expect(readWordProgress('u1').completed).toHaveLength(9);
    errorLog.mockRestore();
  });
});
