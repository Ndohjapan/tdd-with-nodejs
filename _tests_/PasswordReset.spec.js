const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const tr = require('../locales/tr/translation.json');
const en = require('../locales/en/translation.json');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};
const postPasswordReset = (email = 'user1@mail.com', options = {}) => {
  const agent = request(app).post('/api/1.0/password-reset');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.send({ email });
};

describe('Password Reset Request', () => {
  it('returns 404 when password reset request is sent for unknown', async () => {
    const response = await postPasswordReset();

    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.email_not_inuse}
    ${'en'}  | ${en.email_not_inuse}
  `(
    'returns error body with $message for unknown email for password reset when language is $language ',
    async ({ language, message }) => {
      const nowInMills = new Date().getTime();
      const response = await postPasswordReset('user1@mail.com', { language });

      expect(response.body.path).toBe('/api/1.0/password-reset');
      expect(response.body.timestamp).toBeGreaterThan(nowInMills);
      expect(response.body.message).toBe(message);
    }
  );

  it.each`
    language | message
    ${'tr'}  | ${tr.email_invalid}
    ${'en'}  | ${en.email_invalid}
  `(
    'returns 400 with validation error response having $message when request does not have valid email and language is $language',
    async ({ language, message }) => {
      const response = await postPasswordReset(null, { language: language });
      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );

  it('returns 200 ok when a password reset request is sent for known email', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(200);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.password_reset_request_success}
    ${'en'}  | ${en.password_reset_request_success}
  `(
    'returns success response body with $message for known email for password reset when langugae is set as $langugae',
    async ({ language, message }) => {
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language });
      expect(response.body.message).toBe(message);
    }
  );

  it('creates password reset token when a password reset request is sent to a known mail', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({where: {email: user.email}})
    expect(userInDB.passwordResetToken).toBeTruthy()
  });
});
