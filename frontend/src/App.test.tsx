import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AuthContext } from './auth/auth-context';
import type { AuthContextValue } from './auth/auth-context';

const authenticatedUser = {
  id: 'test-user-id',
  username: 'tester',
  displayName: '测试用户',
  inviteCode: 'ABCDEFGHJK',
  invitedByUserId: null,
  status: 'active' as const,
  createdAt: '2026-08-27T00:00:00.000Z',
};

function renderApp(path: string, overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    status: 'authenticated',
    user: authenticatedUser,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  };

  return {
    value,
    ...render(
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthContext.Provider>,
    ),
  };
}

describe('authenticated app navigation', () => {
  it('redirects an authenticated login visit to the new home page', async () => {
    renderApp('/login');

    expect(await screen.findByRole('heading', { name: '欢迎回家，测试用户' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '进入测试用户的用户页面' })).toHaveAttribute('href', '/account');
  });

  it('keeps sign out inside the account information card', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderApp('/account', { signOut });

    const navigation = document.querySelector('.app-nav');
    const accountCard = screen.getByText('账户信息').closest('article');
    expect(navigation).not.toBeNull();
    expect(accountCard).not.toBeNull();
    expect(within(navigation as HTMLElement).queryByRole('button', { name: '退出登录' })).not.toBeInTheDocument();

    await user.click(within(accountCard as HTMLElement).getByRole('button', { name: '退出登录' }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('exposes the printer module and math configuration as protected pages', () => {
    renderApp('/modules/printer/kindergarten/math');

    expect(screen.getByRole('heading', { name: '数学练习打印' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);
    expect(screen.getByRole('button', { name: /生成练习卷/ })).toBeEnabled();
    expect(screen.getByLabelText('练习卷总页数')).toHaveValue('2');
  });

  it('enforces the dynamic minimum page count and disables an empty selection', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/modules/printer/kindergarten/math');
    const page = within(container);

    const checkboxes = page.getAllByRole('checkbox');
    const pageCountSelect = page.getByRole('combobox');
    for (const checkbox of checkboxes.slice(1)) await user.click(checkbox);
    await user.selectOptions(pageCountSelect, '1');
    expect(pageCountSelect).toHaveValue('1');

    await user.click(checkboxes[1] as HTMLElement);
    await user.click(checkboxes[2] as HTMLElement);
    await user.click(checkboxes[3] as HTMLElement);
    expect(pageCountSelect).toHaveValue('2');

    for (const checkbox of checkboxes) {
      if ((checkbox as HTMLInputElement).checked) await user.click(checkbox);
    }
    expect(page.getByRole('alert')).toHaveTextContent('请至少选择一个栏目');
    expect(page.getByRole('button', { name: /生成练习卷/ })).toBeDisabled();
  });
});
