const User = require('./User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendAccountActivation } = require('../email/emailService');
const sequelize = require('../config/database');

function generateToken(length) {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

exports.save = async (body) => {
  let hash = await bcrypt.hash(body.password, 10);

  body = { ...body, password: hash };
  const { username, email, password } = body;
  const transaction = await sequelize.transaction();
  let user = await User.create(
    {
      username,
      email,
      password,
      activationToken: generateToken(16),
    },
    { transaction }
  );
  await sendAccountActivation(email, user.activationToken);
  try {
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new Error(error);
  }
};

exports.findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};
