/* eslint-disable @typescript-eslint/no-require-imports */
import request = require('supertest');
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Response } from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { PostsModule } from '../src/posts/posts.module';
import { User } from '../src/users/entities/user.entity';
import { Post } from '../src/posts/entities/post.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let accessToken: string;

  const testUser = {
    username: 'testuser_e2e',
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        AuthModule,
        UsersModule,
        PostsModule,

        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, Post],
          synchronize: true,
          dropSchema: true,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userRepository = moduleFixture.get('UserRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await userRepository.clear();
    accessToken = '';
  });

  it('/auth/register (POST) - harus berhasil mendaftarkan user baru', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201)
      .expect((res: Response) => {
        const body = res.body as User;
        expect(body.username).toEqual(testUser.username);
        expect(body.password).toBeUndefined();
      });
  });

  it('/auth/login (POST) - harus gagal dengan kredensial salah', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'wrong', password: 'wrong' })
      .expect(401);
  });

  it('/auth/login (POST) - harus berhasil login dan mengembalikan token', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(testUser)
      .expect(201);

    const body = res.body as { access_token: string };
    expect(body.access_token).toBeDefined();
    accessToken = body.access_token;
  });

  it('/auth/profile (GET) - harus gagal tanpa token', async () => {
    await request(app.getHttpServer()).get('/auth/profile').expect(401);
  });

  it('/auth/profile (GET) - harus berhasil dengan token yang valid', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(testUser);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(testUser)
      .expect(201);

    const loginBody = loginRes.body as { access_token: string };
    const token = loginBody.access_token;

    await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res: Response) => {
        const profileBody = res.body as { userId: number; username: string };
        expect(profileBody.username).toEqual(testUser.username);
        expect(profileBody.userId).toBeDefined();
      });
  });

  it('/posts (POST) - harus berhasil membuat post dengan token valid', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(testUser);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(testUser)
      .expect(201);

    const loginBody = loginRes.body as { access_token: string };
    const token = loginBody.access_token;

    const postData = { title: 'Post E2E', content: 'Ini konten E2E' };
    await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send(postData)
      .expect(201)
      .expect((res: Response) => {
        const postBody = res.body as Post;
        expect(postBody.title).toEqual(postData.title);
        expect(postBody.author).toBeDefined();
      });
  });
});
