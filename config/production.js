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
      user: 'helen.leannon@ethereal.email',
      pass: 'q5AV8N59hEH7zKsvr6',
    },
  },

  uploadDir: 'uploads-dev',
  profileDir: 'profile',
};
