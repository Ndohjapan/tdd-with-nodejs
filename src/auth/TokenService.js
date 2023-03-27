const { randomString } = require('../shared/generator');
const Token = require('./Token');

exports.createToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token,
    userId: user.id,
  });
  return token;
};

exports.verify = async (token) => {
  const tokenInDB = await Token.findOne({ where: { token } });
  const userId = tokenInDB.userId;
  return { id: userId };
};

exports.deleteToken = async (token) => {
  await Token.destroy({ where: { token: token } });
};
