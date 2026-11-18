import { rm } from 'node:fs/promises';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { PRESET_TEMPLATES, photoCountOf } from '@moments/shared';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { AppConfig } from '../src/config/app-config.service';
import { PrismaService } from '../src/prisma/prisma.service';

/** 1x1 PNG */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('API (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let userToken: string;
  let refreshToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, app.get(AppConfig));
    prisma = app.get(PrismaService);
    await prisma.work.deleteMany();
    await prisma.template.deleteMany();
    await prisma.user.deleteMany({ where: { NOT: { username: 'admin' } } });
    for (const p of PRESET_TEMPLATES) {
      await prisma.template.create({
        data: {
          code: p.code,
          name: p.name,
          category: p.category,
          kind: p.definition.kind,
          photoCount: photoCountOf(p.definition),
          sort: p.sort,
          status: 'published',
          definition: p.definition as object,
        },
      });
    }
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await rm('./uploads-test', { recursive: true, force: true });
  });

  describe('健康检查', () => {
    it('ready 返回数据库状态', async () => {
      const res = await http.get('/api/v1/health/ready').expect(200);
      expect(res.body.data.info.database.status).toBe('up');
      expect(res.headers['x-request-id']).toBeTruthy();
    });
  });

  describe('认证', () => {
    it('注册成功返回令牌，且不泄露密码哈希', async () => {
      const res = await http
        .post('/api/v1/auth/register')
        .send({ username: 'alice_01', password: 'Passw0rd!', nickname: '爱丽丝' })
        .expect(201);
      expect(res.body.code).toBe(0);
      expect(res.body.data.user.nickname).toBe('爱丽丝');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      userToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('重复用户名返回 40901', async () => {
      const res = await http
        .post('/api/v1/auth/register')
        .send({ username: 'alice_01', password: 'Passw0rd!' })
        .expect(409);
      expect(res.body.code).toBe(40901);
    });

    it('弱密码与多余字段被参数校验拦截', async () => {
      const res = await http
        .post('/api/v1/auth/register')
        .send({ username: 'bob_01', password: 'short', role: 'ADMIN' })
        .expect(400);
      expect(res.body.code).toBe(40001);
      expect(res.body.details.join()).toContain('role');
    });

    it('错误密码返回 40102', async () => {
      const res = await http.post('/api/v1/auth/login').send({ username: 'alice_01', password: 'wrong1234' }).expect(401);
      expect(res.body.code).toBe(40102);
    });

    it('未登录访问受保护接口返回 40100', async () => {
      const res = await http.get('/api/v1/users/me').expect(401);
      expect(res.body.code).toBe(40100);
    });

    it('获取当前用户', async () => {
      const res = await http.get('/api/v1/users/me').set('Authorization', `Bearer ${userToken}`).expect(200);
      expect(res.body.data.username).toBe('alice_01');
    });

    it('refresh 可换新令牌；登出后旧 refresh token 失效', async () => {
      const r1 = await http.post('/api/v1/auth/refresh').send({ refreshToken }).expect(200);
      userToken = r1.body.data.accessToken;
      await http.post('/api/v1/auth/logout').set('Authorization', `Bearer ${userToken}`).expect(200);
      await http.post('/api/v1/auth/refresh').send({ refreshToken: r1.body.data.refreshToken }).expect(401);
    });

    it('access token 不能当 refresh token 用', async () => {
      await http.post('/api/v1/auth/refresh').send({ refreshToken: userToken }).expect(401);
    });

    it('管理员账号在启动时自动创建', async () => {
      const res = await http.post('/api/v1/auth/login').send({ username: 'admin', password: 'AdminPass123' }).expect(200);
      expect(res.body.data.user.role).toBe('ADMIN');
      adminToken = res.body.data.accessToken;
    });
  });

  describe('模板', () => {
    it('公开列表只返回上架模板，可按分类过滤', async () => {
      const all = await http.get('/api/v1/templates').expect(200);
      expect(all.body.data).toHaveLength(PRESET_TEMPLATES.length);
      const split = await http.get('/api/v1/templates?category=split').expect(200);
      expect(split.body.data.every((t: { kind: string }) => t.kind === 'split')).toBe(true);
    });

    it('按 code 获取详情', async () => {
      const res = await http.get('/api/v1/templates/grid-3x3').expect(200);
      expect(res.body.data.photoCount).toBe(9);
    });

    it('普通用户无法访问管理接口', async () => {
      const res = await http.get('/api/v1/admin/templates').set('Authorization', `Bearer ${userToken}`).expect(403);
      expect(res.body.code).toBe(40300);
    });

    it('管理员新建模板：非法定义被拒绝', async () => {
      const res = await http
        .post('/api/v1/admin/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'bad-one',
          name: '坏模板',
          category: 'grid',
          definition: { version: 1, kind: 'layout', aspectRatio: 1, baseWidth: 1080, slots: [], style: {} },
        })
        .expect(400);
      expect(res.body.code).toBe(40001);
    });

    it('管理员新建、上架、归档模板', async () => {
      const def = PRESET_TEMPLATES[0].definition;
      const created = await http
        .post('/api/v1/admin/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'custom-1', name: '自定义', category: 'grid', definition: def })
        .expect(201);
      const id = created.body.data.id;
      expect(created.body.data.status).toBe('draft');
      await http.get('/api/v1/templates/custom-1').expect(404);

      await http
        .patch(`/api/v1/admin/templates/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'published', sort: 1 })
        .expect(200);
      await http.get('/api/v1/templates/custom-1').expect(200);

      const dup = await http
        .post('/api/v1/admin/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'custom-1', name: '重复', category: 'grid', definition: def })
        .expect(409);
      expect(dup.body.code).toBe(40902);

      await http.delete(`/api/v1/admin/templates/${id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
      await http.get('/api/v1/templates/custom-1').expect(404);

      const list = await http
        .get('/api/v1/admin/templates?status=archived&pageSize=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(list.body.data.total).toBe(1);
    });
  });

  describe('作品', () => {
    let workId: string;
    let fileUrl: string;

    it('上传作品并能访问文件', async () => {
      const res = await http
        .post('/api/v1/works')
        .set('Authorization', `Bearer ${userToken}`)
        .field('title', '测试作品')
        .field('template', 'grid-3x3')
        .attach('files', PNG, { filename: 'a.png', contentType: 'image/png' })
        .attach('files', PNG, { filename: 'b.png', contentType: 'image/png' })
        .expect(201);
      expect(res.body.data.files).toHaveLength(2);
      expect(res.body.data.files[0]).toMatchObject({ width: 1, height: 1 });
      expect(res.body.data.template.code).toBe('grid-3x3');
      workId = res.body.data.id;
      fileUrl = res.body.data.files[0].url;
      await http.get(fileUrl).expect(200).expect('content-type', /png/);
    });

    it('伪装成图片的文件被拒绝', async () => {
      const res = await http
        .post('/api/v1/works')
        .set('Authorization', `Bearer ${userToken}`)
        .field('title', '假图片')
        .attach('files', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' })
        .expect(415);
      expect(res.body.code).toBe(41500);
    });

    it('其他用户看不到我的作品', async () => {
      const other = await http
        .post('/api/v1/auth/register')
        .send({ username: 'mallory', password: 'Passw0rd!' })
        .expect(201);
      await http.get(`/api/v1/works/${workId}`).set('Authorization', `Bearer ${other.body.data.accessToken}`).expect(404);
    });

    it('分页列表与删除（同时删除文件）', async () => {
      const list = await http.get('/api/v1/works?page=1&pageSize=10').set('Authorization', `Bearer ${userToken}`).expect(200);
      expect(list.body.data.total).toBe(1);
      await http.delete(`/api/v1/works/${workId}`).set('Authorization', `Bearer ${userToken}`).expect(200);
      await http.get(fileUrl).expect(404);
    });
  });
});
