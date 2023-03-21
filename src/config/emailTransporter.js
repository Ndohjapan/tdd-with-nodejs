const nodemailer = require('nodemailer');

exports.transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 8587,
  tls: {
    rejectUnauthorized: false,
  },
});
