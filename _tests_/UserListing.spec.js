const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const tr = require('../locales/tr/translation.json');
const en = require('../locales/en/translation.json');
const bcrypt = require('bcrypt');
const attributes = ['id', 'username', 'email', 'image']
const attributeMessage = 'only id, username, email and image'

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  jest.setTimeout(5000);
});

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app)
      .post('/api/1.0/auth')
      .send(options.auth);
    token = response.body.token;
  }

  return token;
};

const getUsers = (options = {}) => {
  const agent = request(app).get('/api/1.0/users');

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent;
};

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  const hash = await bcrypt.hash('P4ssword', 10);
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@mail.com`,
      inactive: i >= activeUserCount,
      password: hash,
    });
  }
};

describe('Listing Users', () => {
  it('returns 200 ok when there are no users in the databse', async () => {
    const response = await getUsers();

    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getUsers();

    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('returns 10 users in page content when there are 11 users in the database', async () => {
    await addUsers(11);
    const response = await getUsers();
    expect(response.body.content.length).toBe(10);
  });

  it('returns 6 users in page content when there are active 6 users and inactive 5 users in database', async () => {
    await addUsers(6, 5);

    const response = await getUsers();
    expect(response.body.content.length).toBe(6);
  });

  it(`returns ${attributeMessage} in the content array for each user`, async () => {
    await addUsers(11);
    const response = await getUsers();
    const user = response.body.content[0];
    expect(response.body.content.length).toBe(10);
    expect(Object.keys(user)).toEqual(attributes);
  });

  it('return 2 as total pages when there are 15 active and 7 inactive users', async () => {
    await addUsers(15, 7);

    const response = await getUsers();

    expect(response.body.totalPages).toBe(2);
  });

  it('returns second page users and pahe indicators when page is set as 1 in request parameters ', async () => {
    await addUsers(11);
    const response = await getUsers().query({ page: 1 });
    expect(response.body.content[0].username).toBe('user11');
    expect(response.body.page).toBe(1);
  });

  it('returns first page when page is set below zero as request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ page: -5 });
    expect(response.body.page).toBe(0);
  });

  it('returns 5 users and corresponding size indicator when size is set as 5 in request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 5 });
    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });

  it('returns 10 users and corresponding size indicator when size is et to 1000', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 1000 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns 10 users and corresponding size indicator when size is et to 0', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 0 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('it returns page as 0 and size as 10 when non numeric query params provided for both', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 'size', page: 'page' });
    expect(response.body.page).toBe(0);
    expect(response.body.size).toBe(10);
  });

  it('returbs user page without logged in user when request has a valid authorization', async () => {
    await addUsers(11);
    const token = await auth({
      auth: { email: 'user1@mail.com', password: 'P4ssword' },
    });
    const response = await getUsers({token});

    expect(response.body.totalPages).toBe(1);
  });
});

describe('Get Users', () => {
  const getUser = (id = 5) => {
    return request(app).get(`/api/1.0/users/${id}`);
  };

  it('returns 404 when a users is not found', async () => {
    const response = await getUser();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.user_not_found}
    ${'en'}  | ${en.user_not_found}
  `(
    'returns $message for unknown users when language is set to $language',
    async ({ language, message }) => {
      const response = await getUser().set('Accept-Language', language);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns the proper error body when the user is not found', async () => {
    const nowInMills = new Date().getTime();
    const response = await getUser();
    const error = response.body;
    expect(error.path).toBe('/api/1.0/users/5');
    expect(error.timestamp).toBeGreaterThan(nowInMills);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns 200 ok when an active user exists', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail.com',
      inactive: false,
    });

    const response = await getUser(user.id);
    expect(response.status).toBe(200);
  });

  it(`returns ${attributeMessage} in response body  when an active user exists`, async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail.com',
      inactive: false,
    });

    const response = await getUser(user.id);
    expect(Object.keys(response.body)).toEqual(attributes);
  });

  it('returns 404 when the user is inactive', async () => {
    const user = await User.create({
      username: 'user1',
      email: 'user1@mail.com',
      inactive: true,
    });

    const response = await getUser(user.id);
    expect(response.status).toBe(404);
  });
});
