const Sequelize = require('sequelize');
const Token = require('../auth/Token');
const sequelize = require('../config/database');

const Model = Sequelize.Model;

class User extends Model {}

User.init(
  {
    username: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },
    password: {
      type: Sequelize.STRING,
    },
    inactive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    activationToken: {
      type: Sequelize.STRING,
    },
    passwordResetToken: {
      type: Sequelize.STRING,
    },
  },
  {
    sequelize,
    modelName: 'users',
    timestamps: true,
  }
);

User.hasMany(Token, { onDelete: 'cascade', foreignKey: 'userId' });

module.exports = User;
