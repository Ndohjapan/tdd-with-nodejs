const profiles = require('../config/index');

const dbConfig = {};

Object.keys(profiles).forEach((profile) => {
  dbConfig[profile] = { ...profiles[profile].database };
});

module.exports = dbConfig;
