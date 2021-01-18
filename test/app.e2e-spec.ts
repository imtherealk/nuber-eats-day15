import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';
import { getConnection } from 'typeorm';
import { UserRole } from 'src/users/entities/user.entity';

const GRAPHQL_ENDPOINT = '/graphql';

const testUser = {
  email: 'immda@naver.com',
  password: '12345',
  role: UserRole.Host,
};

describe('App (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string, token: string = jwtToken) =>
    baseTest().set('x-jwt', token).send({ query });

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  describe('Podcasts Resolver', () => {
    it.todo('getAllPodcasts');
    it.todo('getPodcast');
    it.todo('getEpisodes');
    it.todo('createPodcast');
    it.todo('deletePodcast');
    it.todo('updatePodcast');
    it.todo('createEpisode');
    it.todo('updateEpisode');
    it.todo('deleteEpisode');
  });
  describe('Users Resolver', () => {
    it.todo('me');
    it.todo('seeProfile');
    describe('createAccount', () => {
      it('should create account', () => {
        return publicTest(`
          mutation {
            createAccount(input:{
              email: "${testUser.email}",
              password: "${testUser.password}",
              role: ${testUser.role}
            }
            ){
              ok
              error
            }
          }
        `)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { createAccount },
              },
            } = res;
            expect(createAccount).toEqual({
              ok: true,
              error: null,
            });
          });
      });

      it('should fail if account already exists', () => {
        return publicTest(`
          mutation {
            createAccount(input:{
              email: "${testUser.email}",
              password: "${testUser.password}",
              role: ${testUser.role}
            }
            ){
              ok
              error
            }
          }
        `)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { createAccount },
              },
            } = res;
            expect(createAccount).toEqual({
              ok: false,
              error: 'There is a user with that email already',
            });
          });
      });
    });
    it.todo('login');
    it.todo('editProfile');
  });
});
