import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';
import { getConnection, Repository } from 'typeorm';
import { User, UserRole } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Podcast } from 'src/podcast/entities/podcast.entity';

const GRAPHQL_ENDPOINT = '/graphql';

const testUser = {
  email: 'immda@naver.com',
  password: '12345',
  role: UserRole.Host,
};

const testPodcast = {
  id: null,
  title: 'test-title',
  category: 'test-category',
};

describe('App (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let podcastsRepository: Repository<Podcast>;
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
    podcastsRepository = moduleFixture.get<Repository<Podcast>>(
      getRepositoryToken(Podcast),
    );
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
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

    describe('editProfile', () => {
      const NEW_EMAIL = 'imtherealk@gmail.com';
      const NEW_PASSWORD = '54321';

      it('should change email', () => {
        return privateTest(
          `mutation {
            editProfile(input: {email: "${NEW_EMAIL}"}) {
              ok
              error
            }
          }`,
        )
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { editProfile },
              },
            } = res;
            expect(editProfile).toEqual({
              ok: true,
              error: null,
            });
          });
      });

      it('should have new email', () => {
        return privateTest(`{ me { email } }`)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { me },
              },
            } = res;
            expect(me.email).toBe(NEW_EMAIL);
          });
      });

      it('should change password', () => {
        return privateTest(
          `mutation {
            editProfile(input: {password: "${NEW_PASSWORD}"}) {
              ok
              error
            }
          }`,
        )
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { editProfile },
              },
            } = res;
            expect(editProfile).toEqual({
              ok: true,
              error: null,
            });
          });
      });
      it('should login with new email and password', () => {
        return publicTest(`
          mutation {
            login(input:{
              email: "${NEW_EMAIL}",
              password: "${NEW_PASSWORD}",
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
    });
  });

  describe('Podcasts Resolver', () => {
    describe('createPodcast', () => {
      it('should create podcast', () => {
        return privateTest(`
          mutation {
            createPodcast(input: {
              title: "${testPodcast.title}", 
              category:"${testPodcast.category}"
            }){
              ok
              error
              id
            }
          }
        `)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { createPodcast },
              },
            } = res;
            expect(createPodcast).toEqual({
              ok: true,
              error: null,
              id: expect.any(Number),
            });
            testPodcast.id = createPodcast.id;
          });
      });
    });

    describe('getAllPodcasts', () => {
      it('should get all podcasts', () => {
        return publicTest(`
          {
            getAllPodcasts {
              ok
              error
              podcasts {
                id
                title
                category
              }
            }
          }
        `)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { getAllPodcasts },
              },
            } = res;
            expect(getAllPodcasts.ok).toBe(true);
            expect(getAllPodcasts.error).toBe(null);
            expect(getAllPodcasts.podcasts).toEqual([
              {
                id: testPodcast.id,
                title: testPodcast.title,
                category: testPodcast.category,
              },
            ]);
          });
      });
    });

    describe('getPodcast', () => {
      let podcastId: number;

      beforeAll(async () => {
        const [podcast] = await podcastsRepository.find();
        podcastId = podcast.id;
      });

      it('should get podcast by id', () => {
        return publicTest(`
          {
            getPodcast(input: {id: ${podcastId}}) {
              ok
              error
              podcast {
                id
                title
                category
              }
            }
          }
        `)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { getPodcast },
              },
            } = res;
            expect(getPodcast.ok).toBe(true);
            expect(getPodcast.error).toBe(null);
            expect(getPodcast.podcast).toEqual({
              id: podcastId,
              title: testPodcast.title,
              category: testPodcast.category,
            });
          });
      });

      it('should fail if podcast not found', () => {
        const NOT_FOUND_ID = 999;

        return publicTest(`
          {
            getPodcast(input: {id: ${NOT_FOUND_ID}}) {
              ok
              error
              podcast {
                id
                title
                category
              }
            }
          }
        `)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { getPodcast },
              },
            } = res;
            expect(getPodcast.ok).toBe(false);
            expect(getPodcast.error).toBe(
              `Podcast with id ${NOT_FOUND_ID} not found`,
            );
            expect(getPodcast.podcast).toBe(null);
          });
      });
    });

    describe('updatePodcast', () => {
      const NEW_TITLE = 'new-title';
      const NEW_CATEGORY = 'new-category';
      const RATING = 3;

      it('should update title, category and rating', () => {
        return privateTest(`
          mutation {
            updatePodcast(input:{
              id: ${testPodcast.id}
              payload:{
                title: "${NEW_TITLE}"
                category: "${NEW_CATEGORY}"
                rating: ${RATING}
              }
            }){
              ok
              error
            }
          }
        `)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { updatePodcast },
              },
            } = res;
            expect(updatePodcast.ok).toBe(true);
            expect(updatePodcast.error).toBe(null);
          });
      });

      it('should have new information', () => {
        return publicTest(`
          {
            getPodcast(input: {id: ${testPodcast.id}}) {
              ok
              error
              podcast {
                id
                title
                category
                rating
              }
            }
          }
        `)
          .expect(200)
          .expect(res => {
            const {
              body: {
                data: { getPodcast },
              },
            } = res;
            expect(getPodcast.ok).toBe(true);
            expect(getPodcast.error).toBe(null);
            expect(getPodcast.podcast).toEqual({
              id: testPodcast.id,
              title: NEW_TITLE,
              category: NEW_CATEGORY,
              rating: RATING,
            });
          });
      });
    });
    it.todo('createEpisode');
    it.todo('getEpisodes');
    it.todo('updateEpisode');
    it.todo('deleteEpisode');
    it.todo('deletePodcast');
  });
});
