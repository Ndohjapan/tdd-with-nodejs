module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-pass',
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },
  mail: {
    host: 'localhost',
    port: Math.floor(Math.random() * 2000) + 10000,
    tls: {
      rejectUnauthorized: false,
    },
  },
  uploadDir: 'uploads-test',
  profileDir: 'profile',
  attachmentDir: 'attachment',
};
