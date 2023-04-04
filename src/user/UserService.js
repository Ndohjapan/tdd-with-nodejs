const User = require('./User');
const bcrypt = require('bcrypt');
const {
  sendAccountActivation,
  sendPasswordReset,
} = require('../email/emailService');
const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const EmailException = require('../email/emailException');
const InvalidTokenException = require('./invalidTokenException');
const { randomString } = require('../shared/generator');
const Token = require('../auth/Token');
const NotFoundException = require('../error/NotFoundException');
const { clearTokens } = require('../auth/TokenService');
const FileService = require('../file/FileService');

const attributes = ['id', 'username', 'email', 'image'];

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
    attributes,
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
    attributes,
  });

  if (!user) {
    throw new NotFoundException('user_not_found');
  }
  return user;
};

const updateUser = async (id, updateBody) => {
  const user = await User.findOne({ where: { id } });
  user.username = updateBody.username;
  if (updateBody.image) {
    if (user.image) {
      await FileService.deleteproFileImage(user.image);
    }
    user.image = await FileService.saveProfileImage(updateBody.image);
  }
  await user.save();
  return {
    id,
    username: user.username,
    email: user.email,
    image: user.image,
  };
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
    throw new NotFoundException('email_not_inuse');
  }
  user.passwordResetToken = randomString(16);
  await user.save();
  try {
    await sendPasswordReset(email, user.passwordResetToken);
  } catch (error) {
    throw new EmailException();
  }
};

const updatePassword = async (updateRequest) => {
  const user = await findByPasswordResetToken(updateRequest.passwordResetToken);
  const hash = await bcrypt.hash(updateRequest.password, 10);

  user.password = hash;
  user.passwordResetToken = null;
  user.inactive = false;
  user.activationToken = null;
  await user.save();
  await clearTokens(user.id);
};

const findByPasswordResetToken = (token) => {
  return User.findOne({ where: { passwordResetToken: token } });
};

module.exports = {
  save,
  activate,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  findByEmail,
  passwordResetRequest,
  updatePassword,
  findByPasswordResetToken,
};
