const { transporter } = require('../config/emailTransporter');
const nodemailer = require('nodemailer');

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
        <a href="localhost:3030/api/1.0/users/token/${token}">Activate</a>
      </div>
      Token is ${token}`,
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('url: ' + nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    throw new Error('Error From Inside');
  }
};
