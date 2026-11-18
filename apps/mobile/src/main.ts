import { createPinia } from 'pinia';
import { createApp } from 'vue';
import 'vant/es/toast/style';
import 'vant/es/dialog/style';
import 'vant/es/notify/style';
import App from './App.vue';
import { router } from './router';
import './styles/global.css';

createApp(App).use(createPinia()).use(router).mount('#app');
