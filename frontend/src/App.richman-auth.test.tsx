import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { App } from './App';
import { AuthContext } from './auth/auth-context';
import type { AuthContextValue } from './auth/auth-context';

vi.mock('./pages/RichmanPage', () => ({ RichmanPage: function LocalGame() {
  const [decision, setDecision] = useState('等待购买');
  return <button onClick={() => setDecision('购买草稿')}>{decision}</button>;
} }));

describe('running Richman game authentication boundary', () => {
  it('keeps local state through token expiry and reauthentication', async () => {
    const value = { status: 'authenticated', user: null, signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn() } as AuthContextValue;
    const tree = (status: AuthContextValue['status']) => <AuthContext.Provider value={{ ...value, status }}>
      <MemoryRouter initialEntries={['/modules/richman']}><App /></MemoryRouter>
    </AuthContext.Provider>;
    const view = render(tree('authenticated'));
    fireEvent.click(await screen.findByRole('button', { name: '等待购买' }));
    view.rerender(tree('anonymous'));
    expect(screen.getByRole('button', { name: '购买草稿' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '欢迎回来' })).not.toBeInTheDocument();
    view.rerender(tree('authenticated'));
    expect(screen.getByRole('button', { name: '购买草稿' })).toBeInTheDocument();
  });
});
