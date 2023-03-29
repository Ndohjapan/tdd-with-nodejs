const { randomString } = require('../shared/generator');
const Token = require('./Token');
const Sequelize = require('sequelize');

const ONE_WEEK_IN_MILLI = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

exports.createToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token,
    userId: user.id,
    lastUsedAt: new Date(),
  });
  return token;
};

exports.verify = async (token) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const tokenInDB = await Token.findOne({
    where: { token, lastUsedAt: { [Sequelize.Op.gt]: oneWeekAgo } },
  });
  tokenInDB.lastUsedAt = new Date();
  await tokenInDB.save();
  const userId = tokenInDB.userId;
  return { id: userId };
};

exports.deleteToken = async (token) => {
  await Token.destroy({ where: { token: token } });
};

exports.scheduleCleanup = () => {
  setInterval(async () => {
    const oneWeekAgo = ONE_WEEK_IN_MILLI;
    await Token.destroy({
      where: {
        lastUsedAt: {
          [Sequelize.Op.lt]: oneWeekAgo,
        },
      },
    });
  }, 60*60*1000);
};
