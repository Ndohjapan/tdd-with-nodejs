const sequelize = require('./src/config/database');
const FileAttachment = require('./src/file/FileAttachment');

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await sequelize.sync();
  }

});
