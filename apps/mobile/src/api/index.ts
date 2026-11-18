import type { Paginated, TemplateDTO } from '@moments/shared';
import { request } from './http';

export interface UserView {
  id: string;
  username: string;
  nickname: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserView;
}

export interface WorkFile {
  url: string;
  width: number;
  height: number;
}

export interface WorkView {
  id: string;
  title: string;
  files: WorkFile[];
  createdAt: string;
  template?: { id: string; code: string; name: string } | null;
}

export const templatesApi = {
  list: () => request<TemplateDTO[]>({ url: '/templates' }),
  get: (code: string) => request<TemplateDTO>({ url: `/templates/${encodeURIComponent(code)}` }),
};

export const authApi = {
  login: (username: string, password: string) =>
    request<AuthResult>({ url: '/auth/login', method: 'POST', data: { username, password } }),
  register: (username: string, password: string, nickname?: string) =>
    request<AuthResult>({ url: '/auth/register', method: 'POST', data: { username, password, nickname } }),
  refresh: (refreshToken: string) =>
    request<AuthResult>({ url: '/auth/refresh', method: 'POST', data: { refreshToken } }),
  logout: () => request<null>({ url: '/auth/logout', method: 'POST' }),
  me: () => request<UserView>({ url: '/users/me' }),
};

export const worksApi = {
  list: (page = 1, pageSize = 20) => request<Paginated<WorkView>>({ url: '/works', params: { page, pageSize } }),
  create: (title: string, template: string, blobs: Blob[]) => {
    const form = new FormData();
    form.append('title', title);
    form.append('template', template);
    blobs.forEach((b, i) => form.append('files', b, `${i + 1}.jpg`));
    return request<WorkView>({ url: '/works', method: 'POST', data: form, timeout: 120_000 });
  },
  remove: (id: string) => request<null>({ url: `/works/${id}`, method: 'DELETE' }),
};
