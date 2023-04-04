module.exports = {
  database: {
    database: 'hoaxify',
    username: 'postgres',
    password: '12345678',
    dialect: 'postgres',
    uri: 'postgresql://postgres:AOJ27X6e1KYN7wlr0aEw@containers-us-west-118.railway.app:6491/railway',
    logging: false,
  },
  mail: {
    // service: 'Postmark',
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
