import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Smoke (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / returns basic service response', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('GET /users/:id rejects anonymous access', () => {
    return request(app.getHttpServer()).get('/users/smoke-user-id').expect(401);
  });

  it('GET /admin/overview rejects anonymous access', () => {
    return request(app.getHttpServer()).get('/admin/overview').expect(401);
  });

  it('POST /auth/login validates payload', () => {
    return request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
  });

  it('POST /auth/refresh validates payload', () => {
    return request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400);
  });
});
