const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendAccountActivation } = require('../email/emailService');
const sequelize = require('../config/database');
const EmailException = require('../email/emailException');
const InvalidTokenException = require('./invalidTokenException');

function randomString(length) {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

exports.save = async (body) => {
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: randomString(16),
  };
  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });
  try {
    await sendAccountActivation(email, user.activationToken);
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw new EmailException();
  }
};

exports.activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if(!user){
    throw new InvalidTokenException();
  }

  user.inactive = false;
  user.activationToken = null;

  await user.save();
};

exports.findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};
