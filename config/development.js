module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-pass',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'bartholome92@ethereal.email',
      pass: 'TeCFv9fhfD8qvtKP5e',
    },
  },

  uploadDir: 'uploads-dev',
  profileDir: 'profile'
};
