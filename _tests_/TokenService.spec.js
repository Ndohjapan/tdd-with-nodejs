const Token = require('../src/auth/Token');
const { scheduleCleanup } = require('../src/auth/TokenService');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await Token.destroy({ truncate: true });
});

describe('Scheduled Schedule cleanup', () => {
  it('clears the expired token with scheduled task', async () => {
    jest.useFakeTimers()
    const token = 'test-token';
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await Token.create({
      token,
      lastUsedAt: eightDaysAgo,
    });

    await scheduleCleanup();
    jest.advanceTimersByTime(60 * 60 *1000 + 5000)
    const tokenInDB = await Token.findOne({ where: { token } });
    expect(tokenInDB).toBeNull();
  });
});
