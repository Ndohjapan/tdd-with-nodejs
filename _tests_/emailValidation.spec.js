const emailService = require('../src/email/emailService');
const request = require('supertest');
const app = require('../src/app');
const sequelize = require('../src/config/database');
const User = require('../src/user/User');

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

const postValidUsers = (users = validUser, options = {}) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(users);
};

jest.mock('../src/email/emailService');

describe('Forcing Email Failure', () => {
  it('returns 502 Bad Gateway when sending email fails', async () => {
    const mockSendAccountActivation = jest
      .spyOn(emailService, 'sendAccountActivation')
      .mockRejectedValueOnce({ message: 'Failed to send Email' });

    const response = await postValidUsers();
    expect(response.status).toBe(502);
    expect(mockSendAccountActivation).toHaveBeenCalledTimes(1);
    mockSendAccountActivation.mockRestore();
  });

  it('Does not save user in the database if the email is not sent', async () => {
    const mockSendAccountActivation = jest
      .spyOn(emailService, 'sendAccountActivation')
      .mockRejectedValue({ message: 'Failed to deliver email' });

    await postValidUsers();
    const users = await User.findAll();
    expect(users.length).toBe(0);
    mockSendAccountActivation.mockRestore();
  });

  it('returns Email failuer message when sending email fails', async () => {
    const mockSendAccountActivation = jest
      .spyOn(emailService, 'sendAccountActivation')
      .mockRejectedValue({ message: 'Failed to deliver email' });

    const response = await postValidUsers();
    expect(response.body.message).toBe('Failed to deliver email');
    mockSendAccountActivation.mockRestore();
  });
});
