import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Guild Management API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('ok');
      });
  });

  it('POST /api/auth/login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@guild.local', password: 'Admin@123456' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    accessToken = res.body.data.tokens.accessToken;
  });

  it('GET /api/members requires auth', () => {
    return request(app.getHttpServer()).get('/api/members').expect(401);
  });

  it('GET /api/members with token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/members')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.meta.total).toBeGreaterThan(0);
  });

  it('GET /api/reports/dashboard', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.members.total).toBeGreaterThan(0);
  });

  it('GET /api/search', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/search')
      .query({ search: 'M001' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
  });
});
