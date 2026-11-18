// e2e 使用独立的测试库，避免污染开发数据；CI 中通过 DATABASE_URL 覆盖
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://moments:moments@localhost:5432/moments_test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-test-access-secret-0001';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-test-refresh-secret-01';
process.env.UPLOAD_DIR ??= './uploads-test';
process.env.ADMIN_USERNAME ??= 'admin';
process.env.ADMIN_PASSWORD ??= 'AdminPass123';
