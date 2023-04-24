'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hoaxes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      content: {
        type: Sequelize.STRING,
      },
      timestamp: {
        type: Sequelize.BIGINT,
      }
    });
  },

  // eslint-disable-next-line no-unused-vars
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('hoaxes');
  },
};
