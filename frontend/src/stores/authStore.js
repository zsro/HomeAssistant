import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/config';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // 状态
      user: null,
      family: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登录
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ username, password });
          // 新错误码格式：code === 0 表示成功
          if (response.code === 0 || response.success) {
            const { user, family, token } = response.data;
            localStorage.setItem('token', token);
            set({
              user,
              family,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true };
          }
        } catch (error) {
          set({
            error: error.message || '登录失败',
            isLoading: false,
          });
          return { success: false, error: error.message };
        }
      },

      // 注册
      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          // 新错误码格式：code === 0 表示成功
          if (response.code === 0 || response.success) {
            const { user, family, token } = response.data;
            localStorage.setItem('token', token);
            set({
              user,
              family,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true };
          }
        } catch (error) {
          set({
            error: error.message || '注册失败',
            isLoading: false,
          });
          return { success: false, error: error.message };
        }
      },

      // 获取当前用户信息
      fetchUser: async () => {
        try {
          const response = await authApi.getMe();
          // 新错误码格式：code === 0 表示成功
          if (response.code === 0 || response.success) {
            const { user, family } = response.data;
            set({ user, family });
            return { success: true };
          }
        } catch (error) {
          // Token可能过期，清除状态
          get().logout();
          return { success: false };
        }
      },

      // 更新家庭信息
      setFamily: (family) => {
        set({ family });
      },

      // 退出登录
      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          family: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        family: state.family,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
