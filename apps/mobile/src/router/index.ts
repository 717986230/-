import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    tabbar?: boolean;
    auth?: boolean;
    title?: string;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { tabbar: true } },
    {
      path: '/editor/:code',
      name: 'editor',
      component: () => import('@/views/EditorView.vue'),
      props: true,
      meta: { title: '编辑' },
    },
    { path: '/result', name: 'result', component: () => import('@/views/ResultView.vue'), meta: { title: '完成' } },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录' } },
    {
      path: '/mine',
      name: 'mine',
      component: () => import('@/views/MineView.vue'),
      meta: { tabbar: true, title: '我的' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
});

router.beforeEach((to) => {
  if (to.meta.auth && !useAuthStore().loggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 朋友圈拼图` : '朋友圈拼图';
});
