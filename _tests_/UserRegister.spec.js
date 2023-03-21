const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const SMTPServer = require('smtp-server').SMTPServer;
const en = require('../locales/en/translation.json');
const tr = require('../locales/tr/translation.json');
const sequelize = require('../src/config/database');
// const config = require('config');

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  await sequelize.sync();
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  await server.listen(8587, 'localhost');

  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
};

const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(user);
};

describe('User Registration', () => {
  it('returns 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe(en.user_create_success);
  });

  it('saves the user to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });

  it('returns 400 when username is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(400);
  });
  it('returns validationErrors field in response body when validation error occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'P4ssword',
    });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });
  it('returns errors for both when username and email is null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${en.username_null}
    ${'username'} | ${'usr'}           | ${en.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${en.username_size}
    ${'email'}    | ${null}            | ${en.email_null}
    ${'email'}    | ${'mail.com'}      | ${en.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${en.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${en.email_invalid}
    ${'password'} | ${null}            | ${en.password_null}
    ${'password'} | ${'P4ssw'}         | ${en.password_size}
    ${'password'} | ${'alllowercase'}  | ${en.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${en.password_pattern}
    ${'password'} | ${'1234567890'}    | ${en.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${en.password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${en.password_pattern}
    ${'password'} | ${'UPPER44444'}    | ${en.password_pattern}
  `('returns $expectedMessage when $field is $value', async ({ field, expectedMessage, value }) => {
    const user = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'P4ssword',
    };
    user[field] = value;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it(`returns ${en.email_inuse} when same email is already in use`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    expect(response.body.validationErrors.email).toBe(en.email_inuse);
  });

  it('returns errors for both username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });

    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });
  it('creates user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });
  it('creates user in inactive mode even the request body contains inactive as false', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });
  it('creates an activationToken for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });
  it('sends an Account activation email with activationToken', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });
  it('returns 502 Bad Gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });
  it('returns Email failure message when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(en.email_failure);
  });
  it('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });
});

describe('Internationalization', () => {
  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${tr.username_null}
    ${'username'} | ${'usr'}           | ${tr.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${tr.username_size}
    ${'email'}    | ${null}            | ${tr.email_null}
    ${'email'}    | ${'mail.com'}      | ${tr.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${tr.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${tr.email_invalid}
    ${'password'} | ${null}            | ${tr.password_null}
    ${'password'} | ${'P4ssw'}         | ${tr.password_size}
    ${'password'} | ${'alllowercase'}  | ${tr.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${tr.password_pattern}
    ${'password'} | ${'1234567890'}    | ${tr.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${tr.password_pattern}
    ${'password'} | ${'lower4nd5667'}  | ${tr.password_pattern}
    ${'password'} | ${'UPPER44444'}    | ${tr.password_pattern}
  `(
    'returns $expectedMessage when $field is $value when language is set as turkish',
    async ({ field, expectedMessage, value }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'P4ssword',
      };
      user[field] = value;
      const response = await postUser(user, { language: 'tr' });
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${tr.email_inuse} when same email is already in use when language is set as turkish`, async () => {
    await User.create({ ...validUser });
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.validationErrors.email).toBe(tr.email_inuse);
  });

  it(`returns success message of ${tr.user_create_success} when signup request is valid and language is set as turkish`, async () => {
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.message).toBe(tr.user_create_success);
  });

  it(`returns ${tr.email_failure} message when sending email fails and language is set as turkish`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'tr' });
    expect(response.body.message).toBe(tr.email_failure);
  });
});