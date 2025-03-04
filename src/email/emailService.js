const { transporter } = require('../config/emailTransporter');
const nodemailer = require('nodemailer');
const logger = require('../shared/logger');

exports.sendAccountActivation = async (email, token) => {
  try {
    const info = await transporter.sendMail({
      from: 'My App <info@my-app.com>',
      to: email,
      subject: 'Account Activation',
      html: `
      <div>
        <b> Please click below link to activate your accunt </b>
      </div>
      <div>
        <a href="http://localhost:8080/#/login?token=${token}">Activate</a>
      </div>
      Token is ${token}`,
    });

    logger.info('url: ' + nodemailer.getTestMessageUrl(info));
  } catch (error) {
    throw new Error('Error From Inside');
  }
};

exports.sendPasswordReset = async (email, token) => {
  try {
    const info = await transporter.sendMail({
      from: '',
      to: email,
      subject: 'Password Reset',
      html: `
      <div>
        <b> Please click below link to reset your password </b>
      </div>
      <div>
        <a href="http://localhost:8080/#/password-reset?reset=${token}">Reset</a>
      </div>
      Token is ${token}`,
    });
    logger.info('url: ' + nodemailer.getTestMessageUrl(info));
  } catch (error) {
    throw new Error('Error From Inside');
  }
};
