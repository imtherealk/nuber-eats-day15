import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';
import { getConnection, Repository } from 'typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

const GRAPHQL_ENDPOINT = '/graphql';

const testUser = {
  email: 'immda@naver.com',
  password: '12345',
  role: UserRole.Host,
};

describe('App (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
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
    usersRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
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

    describe('login', () => {
      it('should login with correct credentials', () => {
        return publicTest(`
          mutation {
            login(input:{
              email: "${testUser.email}",
              password: "${testUser.password}",
            }
            ){
              ok
              error
              token
            }
          }
        `)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { login },
              },
            } = res;
            expect(login).toEqual({
              ok: true,
              error: null,
              token: expect.any(String),
            });
            jwtToken = login.token;
          });
      });

      it('should not be able to login with wrong credentials.', () => {
        return publicTest(`
          mutation {
            login(input:{
              email: "${testUser.email}",
              password: "fail",
            }
            ){
              ok
              error
              token
            }
          }
        `)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { login },
              },
            } = res;
            expect(login).toEqual({
              ok: false,
              error: 'Wrong password',
              token: null,
            });
          });
      });
    });

    describe('seeProfile', () => {
      let userId: number;

      beforeAll(async () => {
        const [user] = await usersRepository.find();
        userId = user.id;
      });

      it("should see a user's profile", () => {
        return privateTest(
          `
        {
          seeProfile(userId: ${userId}){
            ok
            error
            user{
              id
            }
          }
        }
      `,
        )
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { seeProfile },
              },
            } = res;
            expect(seeProfile).toEqual({
              ok: true,
              error: null,
              user: { id: userId },
            });
          });
      });

      it('should fail if user not found', () => {
        return privateTest(
          `
        {
          seeProfile(userId: 100){
            ok
            error
            user{
              id
            }
          }
        }
      `,
        )
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { seeProfile },
              },
            } = res;

            expect(seeProfile).toEqual({
              ok: false,
              error: 'User Not Found',
              user: null,
            });
          });
      });

      it('should fail if token is invalid', () => {
        return privateTest(
          `
        {
          seeProfile(userId: ${userId}){
            ok
            error
            user{
              id
            }
          }
        }
      `,
          'invalid-token',
        )
          .expect(200)
          .expect(res => {
            const {
              body: {
                errors: [{ message }],
              },
            } = res;
            expect(message).toEqual('Forbidden resource');
          });
      });
    });

    describe('me', () => {
      it('should find my profile', () => {
        return privateTest(`{ me { email } }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { me },
              },
            } = res;
            expect(me.email).toBe(testUser.email);
          });
      });

      it('should fail if token is invalid', () => {
        return privateTest(`{ me { email } }`, 'invalid-token')
          .expect(200)
          .expect(res => {
            const {
              body: {
                errors: [{ message }],
              },
            } = res;
            expect(message).toEqual('Forbidden resource');
          });
      });
    });
    it.todo('editProfile');
  });
});
