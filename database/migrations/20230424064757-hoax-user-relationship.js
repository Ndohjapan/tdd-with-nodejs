'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('hoaxes', 'userId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'cascade',
    });
  },

  // eslint-disable-next-line no-unused-vars
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('hoaxes', 'userId');
  },
};
