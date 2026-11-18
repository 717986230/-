import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi, type AuthResult, type UserView } from '@/api';
import { safeStorage } from '@/core/storage';

const KEY = 'moments.auth';

interface Persisted {
  accessToken: string;
  refreshToken: string;
  user: UserView;
}

export const useAuthStore = defineStore('auth', () => {
  const saved = safeStorage.get<Persisted>(KEY);
  const accessToken = ref(saved?.accessToken ?? '');
  const refreshToken = ref(saved?.refreshToken ?? '');
  const user = ref<UserView | null>(saved?.user ?? null);
  const loggedIn = computed(() => !!accessToken.value && !!user.value);

  function apply(r: AuthResult) {
    accessToken.value = r.accessToken;
    refreshToken.value = r.refreshToken;
    user.value = r.user;
    safeStorage.set(KEY, { accessToken: r.accessToken, refreshToken: r.refreshToken, user: r.user });
  }

  function clear() {
    accessToken.value = '';
    refreshToken.value = '';
    user.value = null;
    safeStorage.remove(KEY);
  }

  async function login(username: string, password: string) {
    apply(await authApi.login(username, password));
  }

  async function register(username: string, password: string, nickname?: string) {
    apply(await authApi.register(username, password, nickname));
  }

  async function refresh() {
    if (!refreshToken.value) return false;
    try {
      apply(await authApi.refresh(refreshToken.value));
      return true;
    } catch {
      clear();
      return false;
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      clear();
    }
  }

  return { accessToken, refreshToken, user, loggedIn, login, register, refresh, logout, clear };
});
