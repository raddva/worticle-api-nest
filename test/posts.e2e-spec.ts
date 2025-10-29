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

describe('PostsController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let postRepository: Repository<Post>;
  let accessToken: string;
  let testUser: User;

  const userData = {
    username: 'post-test-user',
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
    postRepository = moduleFixture.get('PostRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await postRepository.clear();
    await userRepository.clear();

    testUser = userRepository.create(userData);
    await userRepository.save(testUser);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send(userData)
      .expect(201);

    accessToken = (loginRes.body as { access_token: string }).access_token;
  });

  it('POST /posts - harus berhasil membuat post baru saat diautentikasi', async () => {
    const postData = { title: 'Postingan Tes Saya', content: 'Ini kontennya.' };

    await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(postData)
      .expect(201)
      .expect((res: Response) => {
        const body = res.body as Post;
        expect(body.title).toEqual(postData.title);
        expect(body.content).toEqual(postData.content);
        expect(body.author).toBeDefined();
        expect(body.author.id).toEqual(testUser.id);
      });
  });

  it('POST /posts - harus gagal (401 Unauthorized) saat tidak diautentikasi', async () => {
    const postData = { title: 'Post Gagal', content: 'Konten gagal' };

    await request(app.getHttpServer())
      .post('/posts')
      .send(postData)
      .expect(401);
  });

  it('POST /posts - harus gagal (400 Bad Request) dengan data tidak valid', async () => {
    const invalidData = { title: 'a' };

    await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(invalidData)
      .expect(400)
      .expect((res: Response) => {
        const body = res.body as { message: string[] };
        expect(body.message).toBeInstanceOf(Array);
        expect(body.message.some((msg) => msg.includes('title'))).toBeTruthy();
        expect(
          body.message.some((msg) => msg.includes('content')),
        ).toBeTruthy();
      });
  });

  it('GET /posts - harus mengembalikan semua post (endpoint publik)', async () => {
    await postRepository.save({
      title: 'Postingan Publik',
      content: 'Siapa saja bisa lihat',
      author: testUser,
    });

    await request(app.getHttpServer())
      .get('/posts')
      .expect(200)
      .expect((res: Response) => {
        const body = res.body as Post[];
        expect(body).toBeInstanceOf(Array);
        expect(body.length).toBe(1);
        expect(body[0].title).toEqual('Postingan Publik');
        expect(body[0].author).toBeDefined();
        expect(body[0].author.username).toEqual(testUser.username);
      });
  });
});
