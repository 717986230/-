import { validateEnv } from './env';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('validateEnv', () => {
  it('填充默认值并转换类型', () => {
    const env = validateEnv({ ...base, PORT: '8080' });
    expect(env.PORT).toBe(8080);
    expect(env.JWT_ACCESS_TTL).toBe('2h');
  });

  it('生产环境拒绝示例密钥', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production', JWT_ACCESS_SECRET: 'change-me-access-secret-at-least-32-chars' }),
    ).toThrow('生产环境必须替换 JWT_ACCESS_SECRET');
  });

  it('密钥过短时启动失败', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow('JWT_ACCESS_SECRET');
  });
});
