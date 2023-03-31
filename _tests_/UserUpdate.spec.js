const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const tr = require('../locales/tr/translation.json');
const en = require('../locales/en/translation.json');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const config = require('config');
const { uploadDir, profileDir } = config;
const profileDirectory = path.join('.', uploadDir, profileDir);

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: { cascade: true } });
});

const readFileAsBase64 = (file = 'test-png.png') => {
  const filePath = path.join('.', '_tests_', 'resources', file);
  return fs.readFileSync(filePath, { encoding: 'base64' });
};

const activeUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P4ssword',
  inactive: false,
};
const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const putUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);
  let token;
  if (options.auth) {
    const response = await agent.post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }

  agent = request(app).put(`/api/1.0/users/${id}`);

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }

  return agent.send(body);
};

describe('User Update', () => {
  it('returns forbidden when request sent without basic authorization', async () => {
    const response = await putUser();

    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.unauthroized_user_update}
    ${'en'}  | ${en.unauthroized_user_update}
  `(
    'returns error body with $message for unauthorized request when language is $language ',
    async ({ language, message }) => {
      const nowInMills = new Date().getTime();
      const response = await putUser(5, null, { language });

      expect(response.body.path).toBe('/api/1.0/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMills);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns forbidden when request sent with incorrect email in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: { email: 'user1000@mail.com', password: 'P4ssword' },
    });
    expect(response.status).toBe(403);
  });

  it('returns forbidden when request sent with incorrect password in basic authorization', async () => {
    await addUser();
    const response = await putUser(5, null, {
      auth: { email: 'user1@mail.com', password: 'password' },
    });
    expect(response.status).toBe(403);
  });

  it('returns forbidden when update request is sent with correct credentials but for different user', async () => {
    await addUser();
    const userToBeUpdated = await addUser({
      ...activeUser,
      username: 'user2',
      email: 'user2@mail.com',
    });
    const response = await putUser(userToBeUpdated.id, null, {
      auth: credentials,
    });
    expect(response.status).toBe(403);
  });

  it('returns forbidden when update request is sent by inactive user with correct credentials for its own user', async () => {
    const inactiveUser = await addUser({ ...activeUser, inactive: true });
    const response = await putUser(inactiveUser.id, null, {
      auth: credentials,
    });
    expect(response.status).toBe(403);
  });

  it('returns 200 ok when valid update request sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(200);
  });

  it('updates the username in database when  valid update request sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated' };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.username).toBe(validUpdate.username);
  });

  it('returns 403 when the token is not valid', async () => {
    const response = await putUser(5, null, { token: '123' });

    expect(response.status).toBe(403);
  });

  it('saves the user image when the update conatains image as base64', async () => {
    const filePath = path.join('.', '_tests_', 'resources', 'test-png.png');
    const fileInBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.image).toBeTruthy();
  });

  it('returns success body have only id, username, email and image', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    expect(Object.keys(response.body)).toEqual([
      'id',
      'username',
      'email',
      'image',
    ]);
  });

  it('saves the user image to the upload folder stores filename in users when updates has image', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    const profileImagePath = path.join(profileDirectory, inDBUser.image);
    expect(fs.existsSync(profileImagePath)).toBeTruthy();
  });

  it('removes the old images after users uploads new one', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const firstImage = response.body.image;

    await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const profileImagePath = path.join(profileDirectory, firstImage);
    expect(fs.existsSync(profileImagePath)).toBeFalsy();
  });

  it.each`
    language | value             | message
    ${'en'}  | ${null}           | ${en.username_null}
    ${'en'}  | ${'usr'}          | ${en.username_size}
    ${'en'}  | ${'a'.repeat(33)} | ${en.username_size}
    ${'tr'}  | ${null}           | ${tr.username_null}
    ${'tr'}  | ${'usr'}          | ${tr.username_size}
    ${'tr'}  | ${'a'.repeat(33)} | ${tr.username_size}
  `(
    'returns bad request with $message when username is updated with $value when language is set as $language',
    async ({ language, value, message }) => {
      const savedUser = await addUser();
      const invalidUpdate = { username: value };
      const response = await putUser(savedUser.id, invalidUpdate, {
        auth: { email: savedUser.email, password: 'P4ssword' },
        language,
      });

      expect(response.status).toBe(400);
      expect(response.body.validationErrors.username).toBe(message);
    }
  );

  it('returns 200 whenr image size is excatly 2mb', async () => {
    const testPng = readFileAsBase64();
    const pngByte = Buffer.from(testPng, 'base64').length;
    const twoMB = 1024 * 1024 * 2;
    const filling = 'a'.repeat(twoMB - pngByte);
    const fillbase64 = Buffer.from(filling).toString('base64');
    const savedUser = await addUser();
    const validUpdate = {
      username: 'updated-user',
      image: testPng + fillbase64,
    };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    expect(response.status).toBe(200);
  });

  it('returns 400 whenr image size exceeds 2mb', async () => {
    const fileSizeExceeds2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const base64 = Buffer.from(fileSizeExceeds2MB).toString('base64');
    const savedUser = await addUser();
    const invalidUpdate = { username: 'updated-user', image: base64 };
    const response = await putUser(savedUser.id, invalidUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    expect(response.status).toBe(400);
  });

  it('keeps the old image after user onlyupdates username', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'user1-updated', image: fileInBase64 };
    const response = await putUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const firstImage = response.body.image;

    await putUser(
      savedUser.id,
      { username: 'user1-updated2' },
      {
        auth: { email: savedUser.email, password: 'P4ssword' },
      }
    );

    const profileImagePath = path.join(profileDirectory, firstImage);
    expect(fs.existsSync(profileImagePath)).toBeTruthy();

    const userInDB = await User.findOne({ where: { id: savedUser.id } });
    expect(userInDB.image).toBe(firstImage);
  });

  it.each`
    language | message
    ${'tr'}  | ${tr.profile_image_size}
    ${'en'}  | ${en.profile_image_size}
  `(
    'returns $message when file size exceeds 2mb when language is $language',
    async ({ language, message }) => {
      const fileSizeExceeds2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
      const base64 = Buffer.from(fileSizeExceeds2MB).toString('base64');
      const savedUser = await addUser();
      const invalidUpdate = { username: 'updated-user', image: base64 };
      const response = await putUser(savedUser.id, invalidUpdate, {
        auth: { email: savedUser.email, password: 'P4ssword' },
        language,
      });

      expect(response.body.validationErrors.image).toBe(message);
    }
  );

  it.each`
    file              | status
    ${'test-gif.gif'} | ${400}
    ${'test-pdf.pdf'} | ${400}
    ${'test-txt.txt'} | ${400}
    ${'test-png.png'} | ${200}
    ${'test-jpg.jpg'} | ${200}
  `(
    'returns $status when uploading $file as image',
    async ({ file, status }) => {
      const fileInBase64 = readFileAsBase64(file);
      const savedUser = await addUser();
      const updateBody = { username: 'user1-updated', image: fileInBase64 };
      const response = await putUser(savedUser.id, updateBody, {
        auth: { email: savedUser.email, password: 'P4ssword' },
      });

      expect(response.status).toBe(status);
    }
  );

  it.each`
    file              | language | message
    ${'test-gif.gif'} | ${'tr'}  | ${tr.unsupported_image_file}
    ${'test-gif.gif'} | ${'en'}  | ${en.unsupported_image_file}
    ${'test-pdf.pdf'} | ${'tr'}  | ${tr.unsupported_image_file}
    ${'test-pdf.pdf'} | ${'en'}  | ${en.unsupported_image_file}
    ${'test-txt.txt'} | ${'tr'}  | ${tr.unsupported_image_file}
    ${'test-txt.txt'} | ${'en'}  | ${en.unsupported_image_file}
  `(
    'returns $message when uploading $file as image when language is $language', async({file, language, message}) => {
      const fileInBase64 = readFileAsBase64(file);
      const savedUser = await addUser();
      const updateBody = { username: 'user1-updated', image: fileInBase64 };
      const response = await putUser(savedUser.id, updateBody, {
        auth: { email: savedUser.email, password: 'P4ssword' },
        language
      });

      expect(response.body.validationErrors.image).toBe(message);

    }
  );
});
