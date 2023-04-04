const Sequelize = require('sequelize');
const config = require('config');
const logger = require('../shared/logger');

const dbConfig = config.get('database');

let sequelize;

console.log(dbConfig.uri)

if (!dbConfig.uri) {
  console.log('I do not have the uri '+ dbConfig.uri)
  logger.info(dbConfig.uri);
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      dialect: dbConfig.dialect,
      storage: dbConfig.storage,
      logging: dbConfig.logging,
    }
    );
  } else {
  console.log('I have the uri '+ dbConfig.uri)
  sequelize = new Sequelize(dbConfig.uri);
}

module.exports = sequelize;
