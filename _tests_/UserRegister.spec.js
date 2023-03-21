const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

// This will be used to start the database
beforeAll(() => {
  return sequelize.sync();
});

// This will set a state before each test is conducted
beforeEach(() => {
  return User.destroy({ truncate: true });
});

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'Password1',
};

// jest.mock('../src/email/emailService')

const postValidUsers = (users = validUser, options = {}) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(users);
};



describe('User Registration', () => {
  it('returns 200 OK when signup is valid', async () => {
    const response = await postValidUsers();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup is valid', async () => {
    const response = await postValidUsers();
    expect(response.body.message).toBe('User created');
  });

  it('Saves the user to the database', async () => {
    await postValidUsers();
    // Query the user table
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('Saves the username and email to the database', async () => {
    await postValidUsers();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('check if it hashes the password in database', async () => {
    await postValidUsers();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('Password');
  });

  it('returns 400 when username is null', async () => {
    const response = await postValidUsers({
      username: null,
      email: 'user1@mail.com',
      password: 'Password',
    });
    expect(response.status).toBe(400);
  });

  it('returns validationErrprs field in the response body when the validation error occurs', async () => {
    const response = await postValidUsers({
      username: null,
      email: 'user1@mail.com',
      password: 'Password',
    });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('return error for both when the username and email are null', async () => {
    const response = await postValidUsers({
      username: null,
      email: null,
      password: 'Password1',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  const username_null = 'Username cannot be null';
  const username_size = 'Must have minimum of 4 and max of 32';
  const email_null = 'Email cannot be null';
  const email_invalid = 'Email is not valid';
  const password_null = 'Password cannot be null';
  const password_size = 'Password must be at least 6 characters';
  const password_constraint =
    'Password must have at least 1 lower case 1 uppercase and 1 number';
  const email_in_use = 'Email is in use';

  it.each`
    field         | value              | expected
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'w'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'mail@com'}      | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P45w'}          | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_constraint}
    ${'password'} | ${'ELLUPPPPPPPPP'} | ${password_constraint}
    ${'password'} | ${'lowerand1232'}  | ${password_constraint}
    ${'password'} | ${'UPPERAND1232'}  | ${password_constraint}
  `(
    'return $expected when $field is $value',
    async ({ field, value, expected }) => {
      const user = {
        uername: 'user1',
        email: 'user1@mail.com',
        password: 'Password',
      };
      user[field] = value;
      const response = await postValidUsers(user);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expected);
    }
  );

  it(`returns ${email_in_use}  when some email is already in use`, async () => {
    await User.create({ ...validUser });
    const response = await postValidUsers();
    expect(response.body.validationErrors.email).toBe(email_in_use);
  });

  it('returns errors for both username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postValidUsers({
      username: null,
      email: validUser.email,
      password: 'Password1',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it('creates user inactive mode', async () => {
    await postValidUsers();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user inactive mode', async () => {
    const newUser = { ...validUser, inactive: false };
    await postValidUsers(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates activation token', async () => {
    await postValidUsers();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });
});

describe('Internationalization', () => {
  const postValidUsers = (users = validUser) => {
    return request(app)
      .post('/api/1.0/users')
      .set('Accept-Language', 'tr')
      .send(users);
  };

  const username_null = 'Kullanıcı adı boş olamaz';
  const username_size = 'Minimum 4 ve maksimum 32 olmalıdır.';
  const email_null = 'E-posta boş olamaz';
  const email_invalid = 'E-posta geçerli değil';
  const password_null = 'Parola boş olamaz';
  const password_size = 'Şifre en az 6 karakter olmalıdır';
  const password_constraint =
    'Şifre en az 1 küçük harf 1 büyük harf ve 1 rakamdan oluşmalıdır.';
  const email_in_use = 'E-posta kullanımda';
  const user_created = 'Kullanıcı oluşturuldu';

  it.each`
    field         | value              | expected
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'w'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'mail@com'}      | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'P45w'}          | ${password_size}
    ${'password'} | ${'alllowercase'}  | ${password_constraint}
    ${'password'} | ${'ELLUPPPPPPPPP'} | ${password_constraint}
    ${'password'} | ${'lowerand1232'}  | ${password_constraint}
    ${'password'} | ${'UPPERAND1232'}  | ${password_constraint}
  `(
    'return $expected when $field is $value when language is set to Turkish',
    async ({ field, value, expected }) => {
      const user = {
        uername: 'user1',
        email: 'user1@mail.com',
        password: 'Password',
      };
      user[field] = value;
      const response = await postValidUsers(user, { language: 'tr' });
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expected);
    }
  );

  it(`returns ${email_in_use}  when some email is already in use when language is et is Turkish`, async () => {
    await User.create({ ...validUser });
    const response = await postValidUsers(validUser, { language: 'tr' });
    expect(response.body.validationErrors.email).toBe(email_in_use);
  });

  it(`returns success message of ${user_created} when signup is valid when ;anguage is Turkish`, async () => {
    const response = await postValidUsers();
    expect(response.body.message).toBe(user_created);
  });
});
