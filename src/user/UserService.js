const User = require('./User');
const bcrypt = require('bcrypt');
const { sendAccountActivation } = require('../email/emailService');
const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const EmailException = require('../email/emailException');
const InvalidTokenException = require('./invalidTokenException');
const { randomString } = require('../shared/generator');
const Token = require('../auth/Token');
const NotFoundException = require('../error/NotFoundException');

const save = async (body) => {
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

const activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenException();
  }

  user.inactive = false;
  user.activationToken = null;

  await user.save();
};

const getUsers = async (page, size = 10, authenticatedUser) => {
  const id = authenticatedUser ? authenticatedUser.id : 0;

  const users = await User.findAndCountAll({
    where: {
      inactive: false,
      id: {
        [Sequelize.Op.not]: id,
      },
    },
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

const getUser = async (id) => {
  const user = await User.findOne({
    where: { id: id, inactive: false },
    attributes: ['id', 'username', 'email'],
  });

  if (!user) {
    throw new NotFoundException('user_not_found');
  }
  return user;
};

const updateUser = async (id, updateBody) => {
  const user = await User.findOne({ where: { id } });
  user.username = updateBody.username;
  await user.save();
};

const deleteUser = async (id) => {
  await User.destroy({ where: { id } });
  await deleteTokensOfUser(id);
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

async function deleteTokensOfUser(userId) {
  await Token.destroy({ where: { userId } });
}
const passwordResetRequest = async (email) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new NotFoundException('email_not_inuse')
  }
  user.passwordResetToken = randomString(16)
  await user.save()
};

module.exports = {
  save,
  activate,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  findByEmail,
  passwordResetRequest
};
