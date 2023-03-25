const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendAccountActivation } = require('../email/emailService');
const sequelize = require('../config/database');
const EmailException = require('../email/emailException');
const InvalidTokenException = require('./invalidTokenException');
const userNotFoundException = require('./userNotFoundException');

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
  if (!user) {
    throw new InvalidTokenException();
  }

  user.inactive = false;
  user.activationToken = null;

  await user.save();
};

exports.getUsers = async (page, size = 10) => {
  const users = await User.findAndCountAll({
    where: { inactive: false },
    attributes: ['id', 'username', 'email'],
    limit: size,
    offset: page * size,
  });
  return {
    content: users.rows,
    page,
    size,
    totalPages: Math.ceil(users.count / size),
  };
};

exports.getUser = async (id) => {
  const user = await User.findOne({
    where: { id: id, inactive: false },
    attributes: ['id', 'username', 'email'],
  });

  if (!user) {
    throw new userNotFoundException();
  }
  return user;
};

exports.findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};
