module.exports = {
  database: {
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
};
