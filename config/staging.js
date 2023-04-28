module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-pass',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
  },
  database1: {
    database: 'hoaxify',
    username: 'postgres',
    password: '12345678',
    dialect: 'postgres',
    host: 'localhost',
    logging: false,
  },
  mail: {
    host: 'localhost',
    port: Math.floor(Math.random() * 2000) + 10000,
    tls: {
      rejectUnauthorized: false,
    },
  },
  uploadDir: 'uploads-staging',
  profileDir: 'profile',
  attachmentDir: 'attachment',
};
