const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const tr = require('../locales/tr/translation.json');
const en = require('../locales/en/translation.json');
const bcrypt = require('bcrypt');
const Token = require('../src/auth/Token');
const attributeMessage = 'only user id, username, image and token'
const attributes = ['id', 'username', 'image', 'token']


beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  jest.setTimeout(5000);
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'Pass4ord',
  inactive: false,
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const postLogout = async (options = {}) => {
  const agent = request(app).post('/api/1.0/logout');
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return await agent.send();
};

const postAuthentication = async (credentials, options = {}) => {
  let agent = request(app).post('/api/1.0/auth');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send(credentials);
};

describe('Authentication', () => {
  it('returns 200 when credentials are created successfully', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'Pass4ord',
    });
    expect(response.status).toBe(200);
  });

  it(`returns ${attributeMessage} when login success`, async () => {
    const user = await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'Pass4ord',
    });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(attributes);
  });

  it('returns 401 when the user does not exist', async () => {
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'Pass4ord',
    });
    expect(response.status).toBe(401);
  });

  it('returns proper error body when authentication fails', async () => {
    const nowInMills = new Date().getTime();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'Pass4ord',
    });

    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMills);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.authentication_failure}
    ${'en'}  | ${en.authentication_failure}
  `(
    'returns $message for wrong authentication when language is set to $language',
    async ({ language, message }) => {
      const response = await postAuthentication(
        {
          email: 'user1@mail.com',
          password: 'Pass4ord',
        },
        { language }
      );
      expect(response.body.message).toBe(message);
    }
  );

  it('return 401 if the password is wrong', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'Password',
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 when logging in with inactive account', async () => {
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'Pass4ord',
    });
    expect(response.status).toBe(403);
  });

  it('returns proper error body when inactive authentication', async () => {
    await addUser({ ...activeUser, inactive: true });
    const nowInMills = new Date().getTime();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'Pass4ord',
    });

    const error = response.body;
    expect(error.path).toBe('/api/1.0/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMills);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.inactive_authentication_failure}
    ${'en'}  | ${en.inactive_authentication_failure}
  `(
    'returns $message for inactive user authentication failure when language is set to $language',
    async ({ language, message }) => {
      await addUser({ ...activeUser, inactive: true });
      const response = await postAuthentication(
        {
          email: 'user1@mail.com',
          password: 'Pass4ord',
        },
        { language }
      );
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 401 when email is not valid ', async () => {
    const response = await postAuthentication({ password: 'Pass4ord' });

    expect(response.status).toBe(401);
  });

  it('returns 401 when password is not valid ', async () => {
    const response = await postAuthentication({ email: 'hello@mail.com' });

    expect(response.status).toBe(401);
  });

  it('returns token in response body when credentials are correct ', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'Pass4ord',
    });

    expect(response.body.token).not.toBeUndefined();
  });
});

describe('Logout', () => {
  it('returns 200 ok when unauthorized request for logout', async () => {
    const response = await postLogout();
    expect(response.status).toBe(200);
  });

  it('removes user token from the database', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'user1@mail.com',
      password: 'Pass4ord',
    });

    const token = response.body.token;
    await postLogout({ token: token });

    const storedToken = await Token.findOne({ where: { token: token } });

    expect(storedToken).toBeNull();
  });
});

describe('Token Expiration', () => {
  const putUser = async (id = 5, body = null, options = {}) => {
    let agent = request(app);

    agent = request(app).put(`/api/1.0/users/${id}`);

    if (options.token) {
      agent.set('Authorization', `Bearer ${options.token}`);
    }

    return agent.send(body);
  };

  it('returns 403 when token is older than 1 week', async () => {
    const savedUser = await addUser();

    const token = 'test-token';
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1);
    await Token.create({
      token: token,
      userId: savedUser.id,
      lastUsedAt: oneWeekAgo,
    });
    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(savedUser.id, validUpdate, { token: token });
    expect(response.status).toBe(403);
  });

  it('refreshes lastUsedAt when unexpired token is used', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: fourDaysAgo,
    });

    const validUpdate = { username: 'user1-update' };
    const rightBeforeSendingRequest = new Date();

    await putUser(savedUser.id, validUpdate, { token });

    const tokenInDB = await Token.findOne({ where: { token } });
    expect(tokenInDB.lastUsedAt.getTime()).toBeGreaterThan(
      rightBeforeSendingRequest.getTime()
    );
  });

  it('refreshes lastUsedAt when unexpired token is used in unautheticated u endpoint', async () => {
    const savedUser = await addUser();
    const token = 'test-token';
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

    await Token.create({
      token,
      userId: savedUser.id,
      lastUsedAt: fourDaysAgo,
    });

    const rightBeforeSendingRequest = new Date();

    await request(app).get('/api/1.0/users/5').set('Authorization', `Bearer ${token}`)

    const tokenInDB = await Token.findOne({ where: { token } });
    expect(tokenInDB.lastUsedAt.getTime()).toBeGreaterThan(
      rightBeforeSendingRequest.getTime()
    );
  });
});
